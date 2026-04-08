import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth } from '@/contexts';
import { Card, SkeletonList } from '@/components/ui';
import { TransactionItem, GoalCard } from '@/components/common';
import { Transaction, Goal, CategoryData } from '@/types';
import { getUserTransactions, getUserGoals } from '@/services/firebase';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import { formatCurrency, getMonthRange, formatDate } from '@/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubTransactions = getUserTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });

    const unsubGoals = getUserGoals(user.uid, (data) => {
      setGoals(data);
    });

    return () => {
      unsubTransactions();
      unsubGoals();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Data will be refreshed via subscriptions
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const { start, end } = getMonthRange();
    const monthlyTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

    const income = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Calculate category data for pie chart
  const categoryData = useMemo((): CategoryData[] => {
    const { start, end } = getMonthRange();
    const monthlyExpenses = transactions.filter(
      (t) => t.type === 'expense' && new Date(t.date) >= start && new Date(t.date) <= end
    );

    const categoryTotals: Record<string, number> = {};
    monthlyExpenses.forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        name: TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]?.label || category,
        amount,
        color: TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]?.color || '#6b7280',
        legendFontColor: colors.text,
        legendFontSize: 12,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, colors]);

  const recentTransactions = transactions.slice(0, 5);
  const activeGoals = goals.filter((g) => !g.isCompleted && g.saved < g.target).slice(0, 3);
  const currency = user?.currency || 'USD';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonList count={4} style={styles.skeletonContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.profileButton, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            {formatDate(new Date(), 'MMMM yyyy')} Balance
          </Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {formatCurrency(monthlyStats.balance, currency)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="arrow-down" size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.balanceItemLabel, { color: colors.textMuted }]}>Income</Text>
                <Text style={[styles.balanceItemAmount, { color: colors.success }]}>
                  {formatCurrency(monthlyStats.income, currency)}
                </Text>
              </View>
            </View>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="arrow-up" size={16} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.balanceItemLabel, { color: colors.textMuted }]}>Expense</Text>
                <Text style={[styles.balanceItemAmount, { color: colors.danger }]}>
                  {formatCurrency(monthlyStats.expense, currency)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Spending by Category
            </Text>
            <PieChart
              data={categoryData}
              width={SCREEN_WIDTH - 64}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
            />
          </Card>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions' as never)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No transactions yet. Start by adding one!
              </Text>
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
              <TouchableOpacity onPress={() => (navigation as any).navigate('More', { screen: 'Goals' })}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
  },
  balanceItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 100,
  },
});

export default DashboardScreen;
