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
import { Card, Modal, Button, Input, EmptyState } from '@/components/ui';
import { BillReminder, TransactionCategory, RecurringFrequency, BillReminderFormData } from '@/types';
import { formatCurrency, formatDate, getDaysUntil } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES, FREQUENCY_OPTIONS, NOTIFICATION_DAYS_OPTIONS } from '@/utils/constants';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firebase';
import { where, orderBy, Timestamp } from 'firebase/firestore';
import { addMonths } from 'date-fns';

const BillRemindersScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<BillReminder | null>(null);

  const currency = user?.currency || 'USD';

  const [formData, setFormData] = useState<BillReminderFormData>({
    title: '',
    amount: '',
    category: 'bills',
    dueDate: new Date(),
    frequency: 'monthly',
    notificationEnabled: true,
    notificationDaysBefore: 1,
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection<BillReminder>(
      'billReminders',
      [where('uid', '==', user.uid), orderBy('dueDate', 'asc')],
      (data) => {
        setReminders(
          data.map((r) => ({
            ...r,
            dueDate: typeof (r.dueDate as any)?.toDate === 'function' ? (r.dueDate as any).toDate() : new Date(r.dueDate),
            lastPaidDate: typeof (r.lastPaidDate as any)?.toDate === 'function' ? (r.lastPaidDate as any).toDate() : undefined,
            createdAt: typeof (r.createdAt as any)?.toDate === 'function' ? (r.createdAt as any).toDate() : new Date(),
            updatedAt: typeof (r.updatedAt as any)?.toDate === 'function' ? (r.updatedAt as any).toDate() : new Date(),
          }))
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openAddModal = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      amount: '',
      category: 'bills',
      dueDate: new Date(),
      frequency: 'monthly',
      notificationEnabled: true,
      notificationDaysBefore: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (reminder: BillReminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      amount: reminder.amount.toString(),
      category: reminder.category,
      dueDate: new Date(reminder.dueDate),
      frequency: reminder.frequency,
      notificationEnabled: reminder.notificationEnabled,
      notificationDaysBefore: reminder.notificationDaysBefore,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.title.trim()) {
      showError('Please enter a title');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      const reminderData = {
        uid: user.uid,
        title: formData.title.trim(),
        amount,
        category: formData.category,
        dueDate: Timestamp.fromDate(formData.dueDate),
        frequency: formData.frequency,
        isPaid: false,
        notificationEnabled: formData.notificationEnabled,
        notificationDaysBefore: formData.notificationDaysBefore,
      };

      if (editingReminder) {
        await updateDocument('billReminders', editingReminder.id, reminderData);
        showSuccess('Reminder updated');
      } else {
        await createDocument('billReminders', reminderData);
        showSuccess('Bill reminder created');
      }

      setModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save reminder');
    }
  };

  const handleMarkAsPaid = async (reminder: BillReminder) => {
    try {
      // Calculate next due date based on frequency
      const nextDueDate = (() => {
        const current = new Date(reminder.dueDate);
        switch (reminder.frequency) {
          case 'daily':
            current.setDate(current.getDate() + 1);
            break;
          case 'weekly':
            current.setDate(current.getDate() + 7);
            break;
          case 'monthly':
            current.setMonth(current.getMonth() + 1);
            break;
          case 'yearly':
            current.setFullYear(current.getFullYear() + 1);
            break;
        }
        return current;
      })();

      await updateDocument('billReminders', reminder.id, {
        isPaid: false,
        lastPaidDate: Timestamp.fromDate(new Date()),
        dueDate: Timestamp.fromDate(nextDueDate),
      });

      // Create a transaction for the paid bill
      await createDocument('transactions', {
        uid: user?.uid,
        amount: reminder.amount,
        type: 'expense',
        category: reminder.category,
        note: `Bill payment: ${reminder.title}`,
        date: Timestamp.fromDate(new Date()),
      });

      showSuccess('Bill marked as paid & transaction created');
    } catch (error: any) {
      showError(error.message || 'Failed to mark as paid');
    }
  };

  const handleDelete = (reminder: BillReminder) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this bill reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument('billReminders', reminder.id);
            showSuccess('Reminder deleted');
          } catch (error: any) {
            showError(error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderReminder = ({ item }: { item: BillReminder }) => {
    const daysUntil = getDaysUntil(item.dueDate);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil <= 3 && daysUntil >= 0;
    const categoryInfo = TRANSACTION_CATEGORIES[item.category];

    return (
      <Card
        style={styles.reminderCard}
        onPress={() => {
          Alert.alert(item.title, 'What would you like to do?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark as Paid', onPress: () => handleMarkAsPaid(item) },
            { text: 'Edit', onPress: () => openEditModal(item) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
          ]);
        }}
      >
        <View style={styles.reminderHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color + '20' }]}>
            <Ionicons name="calendar" size={20} color={categoryInfo.color} />
          </View>
          <View style={styles.reminderInfo}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.reminderCategory, { color: colors.textSecondary }]}>
              {categoryInfo.label}
            </Text>
          </View>
          <View style={styles.reminderAmount}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatCurrency(item.amount, currency)}
            </Text>
            <Text
              style={[
                styles.dueDate,
                {
                  color: isOverdue ? colors.danger : isDueSoon ? colors.warning : colors.textMuted,
                },
              ]}
            >
              {isOverdue
                ? `${Math.abs(daysUntil)}d overdue`
                : daysUntil === 0
                ? 'Due today'
                : `${daysUntil}d left`}
            </Text>
          </View>
        </View>

        <View style={styles.reminderFooter}>
          <View style={styles.frequencyBadge}>
            <Ionicons name="repeat" size={14} color={colors.textMuted} />
            <Text style={[styles.frequencyText, { color: colors.textMuted }]}>
              {FREQUENCY_OPTIONS.find((f) => f.value === item.frequency)?.label}
            </Text>
          </View>
          {item.notificationEnabled && (
            <View style={styles.notificationBadge}>
              <Ionicons name="notifications" size={14} color={colors.primary} />
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={reminders}
        renderItem={renderReminder}
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
            icon="alarm-outline"
            title="No bill reminders"
            description="Set up reminders for recurring bills"
            action={<Button title="Add Reminder" onPress={openAddModal} />}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingReminder ? 'Edit Reminder' : 'New Bill Reminder'}
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
          label="Bill Title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="e.g., Electricity Bill"
          variant="filled"
        />

        <Input
          label="Amount"
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          leftIcon="cash-outline"
          variant="filled"
        />

        {/* Frequency */}
        <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
        <View style={styles.frequencyGrid}>
          {FREQUENCY_OPTIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.frequencyChip,
                {
                  backgroundColor: formData.frequency === value ? colors.primary : colors.card,
                },
              ]}
              onPress={() => setFormData({ ...formData, frequency: value as RecurringFrequency })}
            >
              <Text
                style={{
                  color: formData.frequency === value ? '#fff' : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
  reminderCard: {
    marginBottom: 12,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderCategory: {
    fontSize: 13,
  },
  reminderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  dueDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reminderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frequencyText: {
    fontSize: 12,
  },
  notificationBadge: {
    marginLeft: 'auto',
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
  frequencyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default BillRemindersScreen;
