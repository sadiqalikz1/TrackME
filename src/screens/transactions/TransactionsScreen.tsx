import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Card, Modal, Button, Input, CategoryPicker, EmptyState } from '@/components/ui';
import { TransactionItem } from '@/components/common';
import { Transaction, TransactionType, TransactionCategory, TransactionFormData } from '@/types';
import { formatDate, parseCurrencyInput, isValidAmount } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firebase';
import { where, orderBy, Timestamp } from 'firebase/firestore';

const TransactionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    type: 'expense',
    category: 'other',
    note: '',
    date: new Date(),
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection<Transaction>(
      'transactions',
      [where('uid', '==', user.uid), orderBy('date', 'desc')],
      (data) => {
        setTransactions(
          data.map((t) => ({
            ...t,
            date: typeof (t.date as any)?.toDate === 'function' ? (t.date as any).toDate() : new Date(t.date),
            createdAt: typeof (t.createdAt as any)?.toDate === 'function' ? (t.createdAt as any).toDate() : new Date(),
            updatedAt: typeof (t.updatedAt as any)?.toDate === 'function' ? (t.updatedAt as any).toDate() : new Date(),
          }))
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        TRANSACTION_CATEGORIES[t.category]?.label.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || t.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      type: 'expense',
      category: 'other',
      note: '',
      date: new Date(),
    });
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      note: transaction.note,
      date: new Date(transaction.date),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;

    const amount = parseCurrencyInput(formData.amount);
    if (!isValidAmount(formData.amount)) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      const transactionData = {
        uid: user.uid,
        amount,
        type: formData.type,
        category: formData.category,
        note: formData.note.trim(),
        date: Timestamp.fromDate(formData.date),
      };

      if (editingTransaction) {
        await updateDocument('transactions', editingTransaction.id, transactionData);
        showSuccess('Transaction updated');
      } else {
        await createDocument('transactions', transactionData);
        showSuccess('Transaction added');
      }

      setModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save transaction');
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
              await deleteDocument('transactions', transaction.id);
              showSuccess('Transaction deleted');
            } catch (error: any) {
              showError(error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDelete(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Search & Filter */}
      <View style={styles.filterContainer}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterTabs}>
          {(['all', 'income', 'expense'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filterType === type ? colors.primary : colors.card,
                },
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterType === type ? '#fff' : colors.textSecondary },
                ]}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No transactions"
            description={searchQuery ? 'Try a different search' : 'Add your first transaction'}
            action={
              !searchQuery && (
                <Button title="Add Transaction" onPress={openAddModal} />
              )
            }
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

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
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
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: formData.type === 'expense' ? colors.danger : colors.card,
                borderColor: colors.danger,
              },
            ]}
            onPress={() => setFormData({ ...formData, type: 'expense' })}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={formData.type === 'expense' ? '#fff' : colors.danger}
            />
            <Text
              style={[
                styles.typeButtonText,
                { color: formData.type === 'expense' ? '#fff' : colors.danger },
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: formData.type === 'income' ? colors.success : colors.card,
                borderColor: colors.success,
              },
            ]}
            onPress={() => setFormData({ ...formData, type: 'income' })}
          >
            <Ionicons
              name="arrow-down"
              size={18}
              color={formData.type === 'income' ? '#fff' : colors.success}
            />
            <Text
              style={[
                styles.typeButtonText,
                { color: formData.type === 'income' ? '#fff' : colors.success },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Input
          label="Amount"
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          leftIcon="cash-outline"
          variant="filled"
        />

        {/* Category */}
        <CategoryPicker
          selectedCategory={formData.category}
          onSelect={(category) => setFormData({ ...formData, category })}
          showIncomeCategories={formData.type === 'income'}
        />

        {/* Note */}
        <Input
          label="Note (optional)"
          value={formData.note}
          onChangeText={(text) => setFormData({ ...formData, note: text })}
          placeholder="Add a note..."
          leftIcon="create-outline"
          variant="filled"
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
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
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
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
    borderWidth: 1.5,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TransactionsScreen;
