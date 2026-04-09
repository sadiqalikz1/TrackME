import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Input, Modal, Button, CategoryGrid, EmptyState, DateTimePicker, BankAccountSelector } from '@/components/ui';
import { TransactionItem } from '@/components/common';
import { Transaction, TransactionCategory, TransactionType, BankAccount, BankType } from '@/types';
import { useData, useDataMutations } from '@/hooks';
import { transactionService } from '@/services/dataService';
import { COLLECTIONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/constants';
import { formatDate, parseCurrencyInput, isValidAmount } from '@/utils/formatters';

type FilterType = 'all' | 'income' | 'expense';
type PaymentMode = 'cash' | 'bank' | 'wallet' | 'card';

const PAYMENT_MODES: { mode: PaymentMode; label: string; icon: string; color: string }[] = [
  { mode: 'cash', label: 'Cash', icon: 'cash', color: '#10b981' },
  { mode: 'bank', label: 'Bank', icon: 'swap-horizontal', color: '#3b82f6' },
  { mode: 'wallet', label: 'Wallet', icon: 'wallet', color: '#8b5cf6' },
  { mode: 'card', label: 'Card', icon: 'card', color: '#f59e0b' },
];

const TransactionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();

  // Fetch transactions using offline-first hook
  const { data: transactions, loading, refetch } = useData('transactions');

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [dateTimePickerVisible, setDateTimePickerVisible] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [note, setNote] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [transactionTime, setTransactionTime] = useState<string>('12:00');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Handle opening add modal from navigation
  useEffect(() => {
    const openModalParam = (route.params as any)?.openAddModal;
    if (openModalParam) {
      setTimeout(() => {
        openAddModal();
      }, 100);
    }
  }, [route.params]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t: Transaction) => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesSearch =
        searchQuery === '' ||
        t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, filterType, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setTransactionType('expense');
    setAmount('');
    setCategory('food');
    setNote('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setTransactionTime('12:00');
    setPaymentMode('cash');
    setSelectedAccountId(undefined);
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setNote(transaction.note);
    setTransactionDate(transaction.date);
    setTransactionTime(transaction.time || '12:00');
    setPaymentMode((transaction.bankAccount as PaymentMode) || 'cash');
    // TODO: Load accountId from transaction when saving to DB
    setSelectedAccountId(undefined);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsedAmount = parseCurrencyInput(amount);
    
    if (!isValidAmount(parsedAmount)) {
      showError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const transactionData = {
        uid: user!.uid,
        amount: parsedAmount,
        type: transactionType,
        category,
        note,
        date: transactionDate,
        time: transactionTime,
        bankAccount: paymentMode,
        isRecurring: false,
      };

      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, transactionData);
        showSuccess('Transaction updated');
      } else {
        await transactionService.create(transactionData);
        showSuccess('Transaction added');
      }
      
      // Refresh data from local SQLite
      await refetch();
      setModalVisible(false);
    } catch (error) {
      showError('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.delete(transaction.id);
              showSuccess('Transaction deleted');
              // Refresh data from local SQLite
              await refetch();
            } catch (error) {
              showError('Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const renderFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      onPress={() => setFilterType(type)}
      style={[
        styles.filterButton,
        {
          backgroundColor: filterType === type ? colors.primary : colors.card,
          borderColor: filterType === type ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.filterText,
          { color: filterType === type ? '#ffffff' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {navigation.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
          containerStyle={styles.searchInput}
        />
        <View style={styles.filterRow}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('income', 'Income')}
          {renderFilterButton('expense', 'Expense')}
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => openEditModal(item)}
            onLongPress={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Transactions"
            description="Start tracking your income and expenses"
            actionLabel="Add Transaction"
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
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingTransaction ? 'Update' : 'Add'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            onPress={() => {
              setTransactionType('expense');
              setCategory('food');
            }}
            style={[
              styles.typeButton,
              {
                backgroundColor: transactionType === 'expense' ? colors.danger : colors.card,
                borderColor: transactionType === 'expense' ? colors.danger : colors.border,
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={transactionType === 'expense' ? '#ffffff' : colors.text}
            />
            <Text
              style={[
                styles.typeText,
                { color: transactionType === 'expense' ? '#ffffff' : colors.text },
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setTransactionType('income');
              setCategory('salary');
            }}
            style={[
              styles.typeButton,
              {
                backgroundColor: transactionType === 'income' ? colors.success : colors.card,
                borderColor: transactionType === 'income' ? colors.success : colors.border,
              },
            ]}
          >
            <Ionicons
              name="arrow-down"
              size={20}
              color={transactionType === 'income' ? '#ffffff' : colors.text}
            />
            <Text
              style={[
                styles.typeText,
                { color: transactionType === 'income' ? '#ffffff' : colors.text },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
        />

        {/* Category */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <View style={{ maxHeight: 250, overflow: 'hidden', marginBottom: 16 }}>
          <CategoryGrid
            type="transaction"
            selected={category}
            onSelect={(c) => setCategory(c as TransactionCategory)}
            filter={transactionType}
          />
        </View>

        {/* Payment Mode */}
        <View style={styles.paymentModeContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Mode</Text>
          <View style={styles.paymentModeRow}>
            {PAYMENT_MODES.map((pm) => (
              <TouchableOpacity
                key={pm.mode}
                onPress={() => setPaymentMode(pm.mode)}
                style={[
                  styles.paymentModeButton,
                  {
                    backgroundColor: paymentMode === pm.mode ? pm.color : colors.card,
                    borderColor: paymentMode === pm.mode ? pm.color : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={pm.icon as any}
                  size={20}
                  color={paymentMode === pm.mode ? '#ffffff' : pm.color}
                />
                <Text
                  style={[
                    styles.paymentModeText,
                    { color: paymentMode === pm.mode ? '#ffffff' : colors.text },
                  ]}
                >
                  {pm.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Selection (show when payment mode is not cash) */}
        {paymentMode !== 'cash' && bankAccounts.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Select Account</Text>
            <TouchableOpacity
              onPress={() => setAccountSelectorVisible(true)}
              style={[
                styles.accountButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="wallet" size={20} color={colors.primary} />
              <Text style={[styles.accountButtonText, { color: colors.text }]}>
                {selectedAccountId
                  ? bankAccounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'
                  : 'Choose a ' + paymentMode}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Date & Time */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setDateTimePickerVisible(true)}
                style={[
                  styles.dateTimeButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                  {formatDate(transactionDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Time <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setDateTimePickerVisible(true)}
                style={[
                  styles.dateTimeButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                  {transactionTime}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Note */}
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          multiline
        />
      </Modal>

      {/* Date Time Picker Modal */}
      <DateTimePicker
        visible={dateTimePickerVisible}
        onClose={() => setDateTimePickerVisible(false)}
        onDateTimeSelected={(date, time) => {
          setTransactionDate(date.toISOString().split('T')[0]);
          setTransactionTime(time);
        }}
        initialDate={new Date(transactionDate)}
        initialTime={transactionTime}
        title="Select Transaction Date & Time"
        showTime={true}
      />

      {/* Bank Account Selector Modal */}
      <BankAccountSelector
        visible={accountSelectorVisible}
        onClose={() => setAccountSelectorVisible(false)}
        onSelect={(account) => setSelectedAccountId(account.id)}
        accounts={bankAccounts}
        paymentMode={paymentMode as BankType}
        selectedAccountId={selectedAccountId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
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
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateTimeContainer: {
    marginBottom: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentModeContainer: {
    marginBottom: 20,
  },
  paymentModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentModeButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  paymentModeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TransactionsScreen;
