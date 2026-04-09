import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { useData, useDataMutations, useOfflineStatus } from '@/hooks';
import { Card, Modal, Button, Input, ProgressBar, EmptyState } from '@/components/ui';
import { Goal } from '@/types';
import { COLLECTIONS, GOAL_COLORS } from '@/utils/constants';
import { formatCurrency, formatDate, parseCurrencyInput, formatPercentage, calculateDaysRemaining } from '@/utils/formatters';

const GoalsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isOffline } = useOfflineStatus();

  const { data: goalsData, loading, refetch } = useData<Goal[]>('goals');
  const goals = goalsData && Array.isArray(goalsData) ? goalsData : [];
  const { create: createGoal, update: updateGoal, delete: deleteGoal } = useDataMutations('goals');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [addAmount, setAddAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currency = user?.currency || 'USD';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setName('');
    setTarget('');
    setSaved('0');
    setDeadline('');
    setSelectedColor(GOAL_COLORS[0]);
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTarget(goal.target.toString());
    setSaved(goal.saved.toString());
    setDeadline(goal.deadline || '');
    setSelectedColor(goal.color);
    setModalVisible(true);
  };

  const openAddMoneyModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setAddAmount('');
    setAddMoneyModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Please enter a goal name');
      return;
    }

    const parsedTarget = parseCurrencyInput(target);
    const parsedSaved = parseCurrencyInput(saved);

    if (parsedTarget <= 0) {
      showError('Please enter a valid target amount');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        uid: user!.uid,
        name: name.trim(),
        target: parsedTarget,
        saved: parsedSaved,
        deadline: deadline || undefined,
        color: selectedColor,
        isCompleted: parsedSaved >= parsedTarget,
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
        showSuccess('Goal updated');
      } else {
        await createGoal(goalData);
        showSuccess('Goal created');
      }

      setModalVisible(false);
      await refetch();
    } catch (error) {
      showError('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoney = async () => {
    if (!selectedGoal) return;

    const amount = parseCurrencyInput(addAmount);
    if (amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const newSaved = selectedGoal.saved + amount;
      await updateGoal(selectedGoal.id, {
        saved: newSaved,
        isCompleted: newSaved >= selectedGoal.target,
      });
      showSuccess(`Added ${formatCurrency(amount, currency)}`);
      setAddMoneyModalVisible(false);
    } catch (error) {
      showError('Failed to add money');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert('Delete Goal', `Delete "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
            showSuccess('Goal deleted');
            await refetch();
          } catch (error) {
            showError('Failed to delete goal');
          }
        },
      },
    ]);
  };

  const markAsComplete = async (goal: Goal) => {
    try {
      await updateGoal(goal.id, {
        saved: goal.target,
        isCompleted: true,
      });
      showSuccess('Goal completed! 🎉');
    } catch (error) {
      showError('Failed to update goal');
    }
  };

  const renderGoalItem = ({ item }: { item: Goal }) => {
    const percentage = item.target > 0 ? (item.saved / item.target) * 100 : 0;
    const daysRemaining = item.deadline ? calculateDaysRemaining(item.deadline) : null;
    const remaining = item.target - item.saved;

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        style={[styles.goalItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Color indicator */}
        <View style={[styles.colorBar, { backgroundColor: item.color }]} />

        <View style={styles.goalContent}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <Text style={[styles.goalName, { color: colors.text }]}>{item.name}</Text>
              {item.isCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.completedText, { color: colors.success }]}>Complete</Text>
                </View>
              )}
            </View>
            <Text style={[styles.goalAmount, { color: colors.textMuted }]}>
              {formatCurrency(item.saved, currency)} / {formatCurrency(item.target, currency)}
            </Text>
          </View>

          <ProgressBar progress={percentage} color={item.color} />

          <View style={styles.goalFooter}>
            {daysRemaining !== null && (
              <Text
                style={[
                  styles.deadline,
                  { color: daysRemaining < 0 ? colors.danger : colors.textMuted },
                ]}
              >
                {daysRemaining < 0
                  ? `Overdue by ${Math.abs(daysRemaining)} days`
                  : daysRemaining === 0
                  ? 'Due today'
                  : `${daysRemaining} days left`}
              </Text>
            )}

            {!item.isCompleted && (
              <TouchableOpacity
                style={[styles.addMoneyBtn, { backgroundColor: item.color }]}
                onPress={() => openAddMoneyModal(item)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.addMoneyText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {!item.isCompleted && remaining > 0 && (
            <Text style={[styles.remainingText, { color: colors.textMuted }]}>
              {formatCurrency(remaining, currency)} to go
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Stats
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const completedGoals = goals.filter((g) => g.isCompleted).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
          <Ionicons name="cloud-offline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline - Data from cache</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack?.()) {
            navigation.goBack();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Overview Card */}
      {goals.length > 0 && (
        <Card style={styles.overviewCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(totalSaved, currency)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(totalTarget, currency)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Target</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {completedGoals}/{goals.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Goals List */}
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title="No Goals Yet"
            description="Set savings goals and track your progress"
            actionLabel="Create Goal"
            onAction={openAddModal}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
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
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingGoal ? 'Update' : 'Create'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Goal Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Emergency Fund"
          />

          <Input
            label="Target Amount"
            value={target}
            onChangeText={setTarget}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
          />

          <Input
            label="Already Saved (Optional)"
            value={saved}
            onChangeText={setSaved}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
          />

          <Input
            label="Deadline (Optional)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
          <View style={styles.colorGrid}>
            {GOAL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSelected,
                ]}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>

      {/* Add Money Modal */}
      <Modal
        visible={addMoneyModalVisible}
        onClose={() => setAddMoneyModalVisible(false)}
        title={`Add to ${selectedGoal?.name || 'Goal'}`}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setAddMoneyModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title="Add Money"
              onPress={handleAddMoney}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        {selectedGoal && (
          <>
            <View style={[styles.goalPreview, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Current Progress</Text>
              <Text style={[styles.previewAmount, { color: colors.text }]}>
                {formatCurrency(selectedGoal.saved, currency)} / {formatCurrency(selectedGoal.target, currency)}
              </Text>
              <ProgressBar
                progress={(selectedGoal.saved / selectedGoal.target) * 100}
                color={selectedGoal.color}
              />
            </View>

            <Input
              label="Amount to Add"
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
            />
          </>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  overviewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  goalItem: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  colorBar: {
    width: 6,
  },
  goalContent: {
    flex: 1,
    padding: 16,
  },
  goalHeader: {
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalAmount: {
    fontSize: 13,
    marginTop: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  deadline: {
    fontSize: 12,
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addMoneyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  goalPreview: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
});

export default GoalsScreen;
