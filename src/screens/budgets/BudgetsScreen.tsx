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
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Modal, Button, Input, ProgressBar, EmptyState } from '@/components/ui';
import { Budget, Transaction, TransactionCategory } from '@/types';
import { getUserBudgets, getUserTransactions, createDocument, updateDocument, deleteDocument } from '@/services/firebase';
import { COLLECTIONS, TRANSACTION_CATEGORIES, EXPENSE_CATEGORIES } from '@/utils/constants';
import { formatCurrency, getMonthKey, parseCurrencyInput, formatPercentage } from '@/utils/formatters';

const BudgetsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('food');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);

  const currentMonth = getMonthKey();
  const currency = user?.currency || 'USD';

  useEffect(() => {
    if (!user) return;

    const unsubBudgets = getUserBudgets(user.uid, (data) => {
      setBudgets(data.filter((b) => b.month === currentMonth));
      setLoading(false);
    });

    const unsubTransactions = getUserTransactions(user.uid, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubBudgets();
      unsubTransactions();
    };
  }, [user, currentMonth]);

  // Calculate spent amount per category
  const budgetsWithSpent = useMemo(() => {
    return budgets.map((budget) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category === budget.category &&
            getMonthKey(new Date(t.date)) === currentMonth
        )
        .reduce((sum, t) => sum + t.amount, 0);

      return { ...budget, spent };
    });
  }, [budgets, transactions, currentMonth]);

  // Overall stats
  const stats = useMemo(() => {
    const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    return { totalBudget, totalSpent, percentage };
  }, [budgetsWithSpent]);

  // Categories without budgets
  const availableCategories = useMemo(() => {
    const usedCategories = budgets.map((b) => b.category);
    return EXPENSE_CATEGORIES.filter((c) => !usedCategories.includes(c));
  }, [budgets]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openAddModal = () => {
    if (availableCategories.length === 0) {
      showError('All categories have budgets');
      return;
    }
    setEditingBudget(null);
    setSelectedCategory(availableCategories[0]);
    setLimit('');
    setModalVisible(true);
  };

  const openEditModal = (budget: Budget & { spent: number }) => {
    setEditingBudget(budget);
    setSelectedCategory(budget.category);
    setLimit(budget.limit.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsedLimit = parseCurrencyInput(limit);
    if (parsedLimit <= 0) {
      showError('Please enter a valid budget limit');
      return;
    }

    setSaving(true);
    try {
      const budgetData = {
        uid: user!.uid,
        category: selectedCategory,
        limit: parsedLimit,
        spent: 0,
        month: currentMonth,
      };

      if (editingBudget) {
        await updateDocument(COLLECTIONS.BUDGETS, editingBudget.id, { limit: parsedLimit });
        showSuccess('Budget updated');
      } else {
        await createDocument(COLLECTIONS.BUDGETS, budgetData);
        showSuccess('Budget created');
      }

      setModalVisible(false);
    } catch (error) {
      showError('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert('Delete Budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(COLLECTIONS.BUDGETS, budget.id);
            showSuccess('Budget deleted');
          } catch (error) {
            showError('Failed to delete budget');
          }
        },
      },
    ]);
  };

  const renderBudgetItem = ({ item }: { item: Budget & { spent: number } }) => {
    const category = TRANSACTION_CATEGORIES[item.category];
    const percentage = item.limit > 0 ? (item.spent / item.limit) * 100 : 0;
    const isOverBudget = percentage > 100;

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        style={[styles.budgetItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.budgetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon as any} size={20} color={category.color} />
          </View>
          <View style={styles.budgetInfo}>
            <Text style={[styles.categoryName, { color: colors.text }]}>{category.label}</Text>
            <Text style={[styles.budgetAmount, { color: colors.textMuted }]}>
              {formatCurrency(item.spent, currency)} / {formatCurrency(item.limit, currency)}
            </Text>
          </View>
          <Text style={[styles.percentage, { color: isOverBudget ? colors.danger : colors.primary }]}>
            {formatPercentage(Math.min(percentage, 999), 0)}
          </Text>
        </View>
        <ProgressBar
          progress={percentage}
          color={isOverBudget ? colors.danger : category.color}
          showOverflow
        />
        {isOverBudget && (
          <Text style={[styles.overBudgetText, { color: colors.danger }]}>
            Over budget by {formatCurrency(item.spent - item.limit, currency)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Overview Card */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Monthly Overview</Text>
          <Text style={[styles.overviewPercentage, { color: stats.percentage > 100 ? colors.danger : colors.primary }]}>
            {formatPercentage(stats.percentage, 0)}
          </Text>
        </View>
        <ProgressBar progress={stats.percentage} showOverflow />
        <View style={styles.overviewStats}>
          <Text style={[styles.overviewStat, { color: colors.text }]}>
            Spent: {formatCurrency(stats.totalSpent, currency)}
          </Text>
          <Text style={[styles.overviewStat, { color: colors.textMuted }]}>
            Budget: {formatCurrency(stats.totalBudget, currency)}
          </Text>
        </View>
      </Card>

      {/* Budget List */}
      <FlatList
        data={budgetsWithSpent}
        keyExtractor={(item) => item.id}
        renderItem={renderBudgetItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pie-chart-outline"
            title="No Budgets"
            description="Set spending limits for different categories"
            actionLabel="Create Budget"
            onAction={openAddModal}
          />
        }
      />

      {/* FAB */}
      {availableCategories.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingBudget ? 'Edit Budget' : 'New Budget'}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingBudget ? 'Update' : 'Create'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        {/* Category Selector (only for new budgets) */}
        {!editingBudget && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {availableCategories.map((cat) => {
                const category = TRANSACTION_CATEGORIES[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? category.color : colors.inputBackground,
                        borderColor: isSelected ? category.color : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={18}
                      color={isSelected ? '#ffffff' : category.color}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#ffffff' : colors.text },
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Input
          label="Budget Limit"
          value={limit}
          onChangeText={setLimit}
          placeholder="0.00"
          keyboardType="decimal-pad"
          leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
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
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 14,
  },
  overviewPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  overviewStat: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  budgetItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 13,
    marginTop: 2,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  overBudgetText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default BudgetsScreen;
