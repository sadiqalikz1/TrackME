import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Modal, Button, Input, EmptyState } from '@/components/ui';
import { GoalCard } from '@/components/common';
import { Goal, GoalFormData } from '@/types';
import { formatCurrency, parseCurrencyInput, formatDate } from '@/utils/formatters';
import { GOAL_COLORS } from '@/utils/constants';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firebase';
import { where, orderBy, Timestamp } from 'firebase/firestore';
import { addMonths } from 'date-fns';

const GoalsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addAmountModal, setAddAmountModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const currency = user?.currency || 'USD';

  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    deadline: addMonths(new Date(), 6),
    color: GOAL_COLORS[0],
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection<Goal>(
      'goals',
      [where('uid', '==', user.uid), orderBy('deadline', 'asc')],
      (data) => {
        setGoals(
          data.map((g) => ({
            ...g,
            deadline: typeof (g.deadline as any)?.toDate === 'function' ? (g.deadline as any).toDate() : new Date(g.deadline),
            createdAt: typeof (g.createdAt as any)?.toDate === 'function' ? (g.createdAt as any).toDate() : new Date(),
            updatedAt: typeof (g.updatedAt as any)?.toDate === 'function' ? (g.updatedAt as any).toDate() : new Date(),
          }))
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openAddModal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      deadline: addMonths(new Date(), 6),
      color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
    });
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: new Date(goal.deadline),
      color: goal.color,
    });
    setModalVisible(true);
  };

  const openAddAmountModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setAddAmount('');
    setAddAmountModal(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.name.trim()) {
      showError('Please enter a goal name');
      return;
    }

    const targetAmount = parseCurrencyInput(formData.targetAmount);
    if (targetAmount <= 0) {
      showError('Please enter a valid target amount');
      return;
    }

    try {
      const goalData = {
        uid: user.uid,
        name: formData.name.trim(),
        targetAmount,
        currentAmount: editingGoal?.currentAmount || 0,
        deadline: Timestamp.fromDate(formData.deadline),
        color: formData.color,
      };

      if (editingGoal) {
        await updateDocument('goals', editingGoal.id, goalData);
        showSuccess('Goal updated');
      } else {
        await createDocument('goals', goalData);
        showSuccess('Goal created');
      }

      setModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save goal');
    }
  };

  const handleAddAmount = async () => {
    if (!selectedGoal) return;

    const amount = parseCurrencyInput(addAmount);
    if (amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      const newAmount = selectedGoal.currentAmount + amount;
      await updateDocument('goals', selectedGoal.id, {
        currentAmount: newAmount,
      });
      showSuccess(`Added ${formatCurrency(amount, currency)} to goal`);
      setAddAmountModal(false);
    } catch (error: any) {
      showError(error.message || 'Failed to add amount');
    }
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument('goals', goal.id);
            showSuccess('Goal deleted');
          } catch (error: any) {
            showError(error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderGoal = ({ item }: { item: Goal }) => (
    <GoalCard
      goal={item}
      onPress={() => {
        Alert.alert(item.name, 'What would you like to do?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Money', onPress: () => openAddAmountModal(item) },
          { text: 'Edit', onPress: () => openEditModal(item) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        ]);
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={goals}
        renderItem={renderGoal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title="No savings goals"
            description="Set financial goals and track your progress"
            action={<Button title="Create Goal" onPress={openAddModal} />}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Goal Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingGoal ? 'Edit Goal' : 'New Goal'}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setModalVisible(false)}
              style={{ flex: 1 }}
            />
            <Button title="Save" onPress={handleSave} style={{ flex: 2 }} />
          </View>
        }
      >
        <Input
          label="Goal Name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Emergency Fund"
          variant="filled"
        />

        <Input
          label="Target Amount"
          value={formData.targetAmount}
          onChangeText={(text) => setFormData({ ...formData, targetAmount: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          leftIcon="cash-outline"
          variant="filled"
        />

        {/* Color Picker */}
        <Text style={[styles.label, { color: colors.text }]}>Color</Text>
        <View style={styles.colorGrid}>
          {GOAL_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.color === color && styles.colorSelected,
              ]}
              onPress={() => setFormData({ ...formData, color })}
            >
              {formData.color === color && (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Add Amount Modal */}
      <Modal
        visible={addAmountModal}
        onClose={() => setAddAmountModal(false)}
        title="Add to Goal"
        size="sm"
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setAddAmountModal(false)}
              style={{ flex: 1 }}
            />
            <Button title="Add" onPress={handleAddAmount} style={{ flex: 2 }} />
          </View>
        }
      >
        <Text style={[styles.goalName, { color: colors.text }]}>{selectedGoal?.name}</Text>
        <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
          Current: {formatCurrency(selectedGoal?.currentAmount || 0, currency)} /{' '}
          {formatCurrency(selectedGoal?.targetAmount || 0, currency)}
        </Text>

        <Input
          label="Amount to Add"
          value={addAmount}
          onChangeText={setAddAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          leftIcon="add-circle-outline"
          variant="filled"
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  goalName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 14,
    marginBottom: 16,
  },
});

export default GoalsScreen;
