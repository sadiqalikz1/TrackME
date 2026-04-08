import React, { useState, useEffect, useMemo } from 'react';
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
import { Card, Modal, Button, Input, ProgressBar, EmptyState } from '@/components/ui';
import { Budget, TransactionCategory, BudgetFormData, Transaction } from '@/types';
import { formatCurrency, getMonthKey, calculateProgress } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firebase';
import { where, orderBy, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const BudgetsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const currentMonth = getMonthKey();
  const currency = user?.currency || 'USD';

  const [formData, setFormData] = useState<BudgetFormData>({
    category: 'food',
    limit: '',
    month: currentMonth,
  });

  useEffect(() => {
    if (!user) return;

    const unsubBudgets = subscribeToCollection<Budget>(
      'budgets',
      [where('uid', '==', user.uid), where('month', '==', currentMonth)],
      (data) => {
        setBudgets(data);
        setIsLoading(false);
      }
    );

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const unsubTransactions = subscribeToCollection<Transaction>(
      'transactions',
      [where('uid', '==', user.uid), where('type', '==', 'expense')],
      (data) => {
        const monthTransactions = data.filter((t) => {
          const date = typeof (t.date as any)?.toDate === 'function' ? (t.date as any).toDate() : new Date(t.date);
          return date >= monthStart && date <= monthEnd;
        });
        setTransactions(
          monthTransactions.map((t) => ({
            ...t,
            date: typeof (t.date as any)?.toDate === 'function' ? (t.date as any).toDate() : new Date(t.date),
          }))
        );
      }
    );

    return () => {
      unsubBudgets();
      unsubTransactions();
    };
  }, [user, currentMonth]);

  // Calculate spent amount for each category
  const budgetsWithSpent = useMemo(() => {
    return budgets.map((budget) => {
      const spent = transactions
        .filter((t) => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions]);

  // Categories without budgets
  const unusedCategories = useMemo(() => {
    const usedCategories = budgets.map((b) => b.category);
    return (Object.keys(TRANSACTION_CATEGORIES) as TransactionCategory[]).filter(
      (cat) => !usedCategories.includes(cat) && !['salary', 'investment'].includes(cat)
    );
  }, [budgets]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
  const overallProgress = calculateProgress(totalSpent, totalBudget);

  const openAddModal = () => {
    setEditingBudget(null);
    setFormData({
      category: unusedCategories[0] || 'other',
      limit: '',
      month: currentMonth,
    });
    setModalVisible(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      month: budget.month,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;

    const limit = parseFloat(formData.limit);
    if (isNaN(limit) || limit <= 0) {
      showError('Please enter a valid budget amount');
      return;
    }

    try {
      const budgetData = {
        uid: user.uid,
        category: formData.category,
        limit,
        month: formData.month,
      };

      if (editingBudget) {
        await updateDocument('budgets', editingBudget.id, budgetData);
        showSuccess('Budget updated');
      } else {
        await createDocument('budgets', budgetData);
        showSuccess('Budget created');
      }

      setModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save budget');
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument('budgets', budget.id);
            showSuccess('Budget deleted');
          } catch (error: any) {
            showError(error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderBudgetItem = ({ item }: { item: Budget & { spent: number } }) => {
    const categoryInfo = TRANSACTION_CATEGORIES[item.category];
    const progress = calculateProgress(item.spent, item.limit);
    const isOverBudget = item.spent > item.limit;

    return (
      <TouchableOpacity
        style={[styles.budgetCard, { backgroundColor: colors.card }]}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.budgetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color + '20' }]}>
            <Text style={{ fontSize: 18 }}>{categoryInfo.icon}</Text>
          </View>
          <View style={styles.budgetInfo}>
            <Text style={[styles.categoryName, { color: colors.text }]}>
              {categoryInfo.label}
            </Text>
            <Text style={[styles.budgetAmount, { color: colors.textSecondary }]}>
              {formatCurrency(item.spent, currency)} / {formatCurrency(item.limit, currency)}
            </Text>
          </View>
          <View
            style={[
              styles.percentBadge,
              { backgroundColor: isOverBudget ? colors.danger + '20' : colors.primary + '20' },
            ]}
          >
            <Text
              style={[
                styles.percentText,
                { color: isOverBudget ? colors.danger : colors.primary },
              ]}
            >
              {progress}%
            </Text>
          </View>
        </View>
        <ProgressBar
          progress={progress}
          color={isOverBudget ? colors.danger : categoryInfo.color}
          height={6}
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
      {/* Overview Card */}
      <Card style={styles.overviewCard}>
        <Text style={[styles.overviewTitle, { color: colors.textSecondary }]}>
          {format(new Date(), 'MMMM yyyy')} Budget
        </Text>
        <View style={styles.overviewRow}>
          <View>
            <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Spent</Text>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View>
            <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Budget</Text>
            <Text style={[styles.overviewValue, { color: colors.primary }]}>
              {formatCurrency(totalBudget, currency)}
            </Text>
          </View>
        </View>
        <ProgressBar progress={overallProgress} showLabel label="Overall" />
      </Card>

      {/* Budget List */}
      <FlatList
        data={budgetsWithSpent}
        renderItem={renderBudgetItem}
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
            icon="wallet-outline"
            title="No budgets set"
            description="Set monthly budgets for your spending categories"
            action={<Button title="Add Budget" onPress={openAddModal} />}
          />
        }
      />

      {/* FAB */}
      {unusedCategories.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
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
        {/* Category Selector (only for new budgets) */}
        {!editingBudget && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {unusedCategories.map((cat) => {
                const info = TRANSACTION_CATEGORIES[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: formData.category === cat ? info.color : colors.card,
                        borderColor: info.color,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text
                      style={{
                        color: formData.category === cat ? '#fff' : info.color,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {info.label.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Input
          label="Budget Limit"
          value={formData.limit}
          onChangeText={(text) => setFormData({ ...formData, limit: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          leftIcon="cash-outline"
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
  overviewCard: {
    margin: 16,
  },
  overviewTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 24,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  budgetCard: {
    padding: 16,
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetAmount: {
    fontSize: 13,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  overBudgetText: {
    fontSize: 12,
    marginTop: 8,
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default BudgetsScreen;
