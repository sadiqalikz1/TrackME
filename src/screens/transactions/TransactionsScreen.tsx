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
import { useRoute } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Input, Modal, Button, CategoryGrid, EmptyState } from '@/components/ui';
import { TransactionItem } from '@/components/common';
import { Transaction, TransactionCategory, TransactionType } from '@/types';
import { getUserTransactions, createDocument, updateDocument, deleteDocument } from '@/services/firebase';
import { COLLECTIONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/constants';
import { parseCurrencyInput, isValidAmount } from '@/utils/formatters';

type FilterType = 'all' | 'income' | 'expense';

const TransactionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getUserTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
    return transactions.filter((t) => {
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
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setTransactionType('expense');
    setAmount('');
    setCategory('food');
    setNote('');
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setNote(transaction.note);
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
        date: new Date(),
        isRecurring: false,
      };

      if (editingTransaction) {
        await updateDocument(COLLECTIONS.TRANSACTIONS, editingTransaction.id, transactionData);
        showSuccess('Transaction updated');
      } else {
        await createDocument(COLLECTIONS.TRANSACTIONS, transactionData);
        showSuccess('Transaction added');
      }
      
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
              await deleteDocument(COLLECTIONS.TRANSACTIONS, transaction.id);
              showSuccess('Transaction deleted');
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
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
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
        <CategoryGrid
          type="transaction"
          selected={category}
          onSelect={(c) => setCategory(c as TransactionCategory)}
          filter={transactionType}
        />

        {/* Note */}
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          multiline
        />
      </Modal>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
});

export default TransactionsScreen;
