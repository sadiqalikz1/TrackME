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
import { Card, Modal, Button, Input, CategoryPicker, EmptyState } from '@/components/ui';
import { BillReminder, TransactionCategory, BillFrequency, Transaction } from '@/types';
import { COLLECTIONS, TRANSACTION_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatDate, parseCurrencyInput, calculateDaysRemaining } from '@/utils/formatters';

const FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const BillRemindersScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isOffline } = useOfflineStatus();

  // Offline-first data fetching
  const { data: billsData, loading, refetch } = useData<BillReminder[]>('billReminders');
  const { create: createBill, update: updateBill, delete: deleteBill } = useDataMutations('billReminders');
  const { create: createTransaction } = useDataMutations('transactions');

  // Sort bills by due date when they load
  const bills = billsData && Array.isArray(billsData)
    ? billsData.sort((a, b) => {
        const daysA = calculateDaysRemaining(a.dueDate);
        const daysB = calculateDaysRemaining(b.dueDate);
        return daysA - daysB;
      })
    : [];

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('utilities');
  const [selectedFrequency, setSelectedFrequency] = useState<BillFrequency>('monthly');
  const [isAutoPay, setIsAutoPay] = useState(false);
  const [saving, setSaving] = useState(false);

  const currency = user?.currency || 'USD';

  const onRefresh = async () => {
    await refetch();
  };

  const openAddModal = () => {
    setEditingBill(null);
    setName('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setSelectedCategory('utilities');
    setSelectedFrequency('monthly');
    setIsAutoPay(false);
    setModalVisible(true);
  };

  const openEditModal = (bill: BillReminder) => {
    setEditingBill(bill);
    setName(bill.name);
    setAmount(bill.amount.toString());
    setDueDate(bill.dueDate);
    setSelectedCategory(bill.category);
    setSelectedFrequency(bill.frequency);
    setIsAutoPay(bill.isAutoPay);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Please enter a bill name');
      return;
    }

    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!dueDate) {
      showError('Please enter a due date');
      return;
    }

    setSaving(true);
    try {
      const billData = {
        uid: user!.uid,
        name: name.trim(),
        amount: parsedAmount,
        dueDate,
        category: selectedCategory,
        frequency: selectedFrequency,
        isAutoPay,
        isPaid: false,
        notifyDaysBefore: 3,
      };

      if (editingBill) {
        await updateBill(editingBill.id, billData);
        showSuccess('Bill updated');
      } else {
        await createBill(billData);
        showSuccess('Bill reminder created');
      }

      setModalVisible(false);
      await refetch(); // Refresh list after save
    } catch (error) {
      showError('Failed to save bill');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (bill: BillReminder) => {
    Alert.alert('Delete Bill', `Delete "${bill.name}" reminder?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBill(bill.id);
            showSuccess('Bill reminder deleted');
            await refetch(); // Refresh list after delete
          } catch (error) {
            showError('Failed to delete bill');
            console.error('Delete error:', error);
          }
        },
      },
    ]);
  };

  const markAsPaid = async (bill: BillReminder) => {
    try {
      // Calculate next due date based on frequency
      let nextDueDate = new Date(bill.dueDate);
      switch (bill.frequency) {
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
        case 'once':
          // For one-time bills, mark as paid
          await updateBill(bill.id, { isPaid: true });
          showSuccess('Bill marked as paid');
          await refetch();
          return;
      }

      // Create transaction for this payment
      await createTransaction({
        uid: user!.uid,
        type: 'expense',
        amount: bill.amount,
        category: bill.category,
        note: `${bill.name} payment`,
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
      });

      // Update bill with next due date
      await updateBill(bill.id, {
        dueDate: nextDueDate.toISOString().split('T')[0],
        lastPaidDate: new Date().toISOString().split('T')[0],
      });

      showSuccess('Marked as paid & transaction recorded');
      await refetch();
    } catch (error) {
      showError('Failed to process payment');
    }
  };

  const renderBillItem = ({ item }: { item: BillReminder }) => {
    const category = TRANSACTION_CATEGORIES[item.category];
    const daysUntil = calculateDaysRemaining(item.dueDate);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil <= 3 && daysUntil >= 0;

    const getStatusColor = () => {
      if (item.isPaid) return colors.success;
      if (isOverdue) return colors.danger;
      if (isDueSoon) return colors.warning;
      return colors.textMuted;
    };

    const getStatusText = () => {
      if (item.isPaid) return 'Paid';
      if (isOverdue) return `${Math.abs(daysUntil)} days overdue`;
      if (daysUntil === 0) return 'Due today';
      if (daysUntil === 1) return 'Due tomorrow';
      return `Due in ${daysUntil} days`;
    };

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        style={[
          styles.billItem,
          {
            backgroundColor: colors.card,
            borderColor: isOverdue ? colors.danger : isDueSoon ? colors.warning : colors.border,
            borderWidth: isOverdue || isDueSoon ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.billHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon as any} size={20} color={category.color} />
          </View>
          <View style={styles.billInfo}>
            <Text style={[styles.billName, { color: colors.text }]}>{item.name}</Text>
            <View style={styles.billMeta}>
              <Text style={[styles.billFrequency, { color: colors.textMuted }]}>
                {FREQUENCIES.find((f) => f.value === item.frequency)?.label}
              </Text>
              {item.isAutoPay && (
                <View style={[styles.autoPayBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="sync" size={10} color={colors.success} />
                  <Text style={[styles.autoPayText, { color: colors.success }]}>Auto</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.billAmount, { color: colors.text }]}>
            {formatCurrency(item.amount, currency)}
          </Text>
        </View>

        <View style={styles.billFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={getStatusColor()} />
            <Text style={[styles.dueText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>

          {!item.isPaid && (
            <TouchableOpacity
              style={[styles.markPaidBtn, { backgroundColor: colors.success }]}
              onPress={() => markAsPaid(item)}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.markPaidText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Stats
  const activeBills = bills.filter((b) => !b.isPaid);
  const totalUpcoming = activeBills.reduce((sum, b) => sum + b.amount, 0);
  const dueSoon = activeBills.filter((b) => calculateDaysRemaining(b.dueDate) <= 7 && calculateDaysRemaining(b.dueDate) >= 0);
  const overdue = activeBills.filter((b) => calculateDaysRemaining(b.dueDate) < 0);

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bill Reminders</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      {bills.length > 0 && (
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(totalUpcoming, currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{dueSoon.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Due Soon</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{overdue.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Overdue</Text>
          </Card>
        </View>
      )}

      {/* Bills List */}
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        renderItem={renderBillItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="alarm-outline"
            title="No Bill Reminders"
            description="Add bills to track due dates and avoid late fees"
            actionLabel="Add Bill"
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

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingBill ? 'Edit Bill' : 'New Bill Reminder'}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingBill ? 'Update' : 'Create'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Bill Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Electricity Bill"
          />

          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
          />

          <Input
            label="Due Date"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
          />

          <CategoryPicker
            label="Category"
            value={selectedCategory}
            onChange={(cat) => setSelectedCategory(cat as TransactionCategory)}
            type="expense"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Frequency</Text>
          <View style={styles.frequencyGrid}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyOption,
                  {
                    backgroundColor: selectedFrequency === freq.value ? colors.primary : colors.inputBackground,
                    borderColor: selectedFrequency === freq.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedFrequency(freq.value)}
              >
                <Text
                  style={[
                    styles.frequencyText,
                    { color: selectedFrequency === freq.value ? '#ffffff' : colors.text },
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.autoPayRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={() => setIsAutoPay(!isAutoPay)}
          >
            <View style={styles.autoPayLeft}>
              <Ionicons name="sync" size={20} color={colors.primary} />
              <View style={styles.autoPayInfo}>
                <Text style={[styles.autoPayTitle, { color: colors.text }]}>Auto-Pay</Text>
                <Text style={[styles.autoPayDesc, { color: colors.textMuted }]}>
                  Bill is automatically paid
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isAutoPay ? colors.primary : 'transparent',
                  borderColor: isAutoPay ? colors.primary : colors.border,
                },
              ]}
            >
              {isAutoPay && <Ionicons name="checkmark" size={14} color="#ffffff" />}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  billItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  billFrequency: {
    fontSize: 12,
  },
  autoPayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoPayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  markPaidText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  frequencyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  autoPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  autoPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoPayInfo: {},
  autoPayTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoPayDesc: {
    fontSize: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BillRemindersScreen;
