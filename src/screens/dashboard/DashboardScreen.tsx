import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, SkeletonCard } from '@/components/ui';
import { TransactionItem, GoalCard } from '@/components/common';
import { formatCurrency, formatCompactCurrency, getMonthKey, formatDate } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES, CHART_COLORS } from '@/utils/constants';
import { Transaction, Goal, TransactionCategory } from '@/types';
import {
  subscribeToCollection,
  getUserTransactions,
  getUserGoals,
} from '@/services/firebase';
import { where, orderBy } from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

const DashboardScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = user?.currency || 'USD';

  useEffect(() => {
    if (!user) return;

    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Subscribe to transactions
    const unsubTransactions = subscribeToCollection<Transaction>(
      'transactions',
      [where('uid', '==', user.uid), orderBy('date', 'desc')],
      (data) => {
        setTransactions(data.map(t => ({
          ...t,
          date: typeof (t.date as any)?.toDate === 'function' ? (t.date as any).toDate() : new Date(t.date),
          createdAt: typeof (t.createdAt as any)?.toDate === 'function' ? (t.createdAt as any).toDate() : new Date(),
          updatedAt: typeof (t.updatedAt as any)?.toDate === 'function' ? (t.updatedAt as any).toDate() : new Date(),
        })));
        setIsLoading(false);
      }
    );

    // Subscribe to goals
    const unsubGoals = subscribeToCollection<Goal>(
      'goals',
      [where('uid', '==', user.uid), orderBy('deadline', 'asc')],
      (data) => {
        setGoals(data.map(g => ({
          ...g,
          deadline: typeof (g.deadline as any)?.toDate === 'function' ? (g.deadline as any).toDate() : new Date(g.deadline),
          createdAt: typeof (g.createdAt as any)?.toDate === 'function' ? (g.createdAt as any).toDate() : new Date(),
          updatedAt: typeof (g.updatedAt as any)?.toDate === 'function' ? (g.updatedAt as any).toDate() : new Date(),
        })));
      }
    );

    return () => {
      unsubTransactions();
      unsubGoals();
    };
  }, [user]);

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const currentMonth = getMonthKey();
    const monthTransactions = transactions.filter(
      t => getMonthKey(new Date(t.date)) === currentMonth
    );

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: monthTransactions.length,
    };
  }, [transactions]);

  // Category breakdown data
  const categoryData = useMemo(() => {
    const currentMonth = getMonthKey();
    const expenses = transactions.filter(
      t => t.type === 'expense' && getMonthKey(new Date(t.date)) === currentMonth
    );

    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        name: TRANSACTION_CATEGORIES[category as TransactionCategory]?.label.split(' ')[0] || category,
        amount,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, colors]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Active goals
  const activeGoals = useMemo(() => {
    return goals.filter(g => g.currentAmount < g.targetAmount).slice(0, 3);
  }, [goals]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <SkeletonCard lines={2} />
        </View>
        <SkeletonCard />
        <SkeletonCard />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.card }]}
          >
            <Ionicons name="person" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <Card variant="elevated" style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
            Monthly Balance
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: monthlyStats.balance >= 0 ? colors.success : colors.danger },
            ]}
          >
            {formatCurrency(monthlyStats.balance, currency)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="arrow-down" size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCompactCurrency(monthlyStats.income, currency)}
                </Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="arrow-up" size={16} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expenses</Text>
                <Text style={[styles.statValue, { color: colors.danger }]}>
                  {formatCompactCurrency(monthlyStats.expense, currency)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Spending by Category
            </Text>
            <Card>
              <PieChart
                data={categoryData}
                width={CHART_WIDTH}
                height={200}
                chartConfig={{
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map(transaction => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No transactions yet
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Savings Goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Savings Goals
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default DashboardScreen;
