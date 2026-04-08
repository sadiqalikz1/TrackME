import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui';
import { Transaction, TransactionCategory, MonthlyData } from '@/types';
import { formatCurrency, formatCompactCurrency, getMonthKey, getLast6Months } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES, CHART_COLORS } from '@/utils/constants';
import { subscribeToCollection } from '@/services/firebase';
import { where, orderBy } from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

const AnalysisScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = user?.currency || 'USD';

  useEffect(() => {
    if (!user) return;

    const sixMonthsAgo = subMonths(new Date(), 6);

    const unsubscribe = subscribeToCollection<Transaction>(
      'transactions',
      [where('uid', '==', user.uid), orderBy('date', 'desc')],
      (data) => {
        const formattedData = data.map((t) => ({
          ...t,
          date: typeof (t.date as any)?.toDate === 'function' ? (t.date as any).toDate() : new Date(t.date),
        }));
        setTransactions(formattedData);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Monthly data for last 6 months
  const monthlyData = useMemo(() => {
    const months = getLast6Months();
    return months.map((month) => {
      const monthKey = getMonthKey(month);
      const monthTransactions = transactions.filter(
        (t) => getMonthKey(new Date(t.date)) === monthKey
      );

      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(month, 'MMM'),
        income,
        expense,
        savings: income - expense,
      };
    });
  }, [transactions]);

  // Category breakdown (current month)
  const categoryBreakdown = useMemo(() => {
    const currentMonth = getMonthKey();
    const expenses = transactions.filter(
      (t) => t.type === 'expense' && getMonthKey(new Date(t.date)) === currentMonth
    );

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        name: TRANSACTION_CATEGORIES[category as TransactionCategory]?.label.split(' ')[0] || category,
        amount,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, colors]);

  // Summary stats
  const stats = useMemo(() => {
    const currentMonth = getMonthKey();
    const lastMonth = getMonthKey(subMonths(new Date(), 1));

    const currentMonthTrans = transactions.filter(
      (t) => getMonthKey(new Date(t.date)) === currentMonth
    );
    const lastMonthTrans = transactions.filter(
      (t) => getMonthKey(new Date(t.date)) === lastMonth
    );

    const currentIncome = currentMonthTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const currentExpense = currentMonthTrans
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastIncome = lastMonthTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const lastExpense = lastMonthTrans
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const incomeChange =
      lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseChange =
      lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;

    const avgMonthlyIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / 6;
    const avgMonthlyExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0) / 6;

    return {
      currentIncome,
      currentExpense,
      incomeChange,
      expenseChange,
      avgMonthlyIncome,
      avgMonthlyExpense,
      savingsRate: currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0,
    };
  }, [transactions, monthlyData]);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 0.5,
    },
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
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
    >
      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Savings Rate</Text>
          <Text
            style={[
              styles.statValue,
              { color: stats.savingsRate >= 0 ? colors.success : colors.danger },
            ]}
          >
            {stats.savingsRate.toFixed(1)}%
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Monthly</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatCompactCurrency(stats.avgMonthlyIncome - stats.avgMonthlyExpense, currency)}
          </Text>
        </Card>
      </View>

      {/* Income vs Expense Trend */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Income vs Expenses</Text>
        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>Last 6 months</Text>
        <LineChart
          data={{
            labels: monthlyData.map((m) => m.month),
            datasets: [
              {
                data: monthlyData.map((m) => m.income || 0),
                color: () => colors.success,
                strokeWidth: 2,
              },
              {
                data: monthlyData.map((m) => m.expense || 0),
                color: () => colors.danger,
                strokeWidth: 2,
              },
            ],
            legend: ['Income', 'Expenses'],
          }}
          width={CHART_WIDTH}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </Card>

      {/* Savings Trend */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Savings</Text>
        <BarChart
          data={{
            labels: monthlyData.map((m) => m.month),
            datasets: [
              {
                data: monthlyData.map((m) => Math.max(m.savings, 0)),
              },
            ],
          }}
          width={CHART_WIDTH}
          height={200}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          }}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
        />
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Spending by Category</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>This month</Text>
          <PieChart
            data={categoryBreakdown}
            width={CHART_WIDTH}
            height={200}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card>
      )}

      {/* Top Spending Categories */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Top Categories</Text>
        {categoryBreakdown.slice(0, 5).map((cat, index) => (
          <View key={cat.name} style={styles.categoryRow}>
            <View style={[styles.categoryRank, { backgroundColor: cat.color }]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
            <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>
              {formatCurrency(cat.amount, currency)}
            </Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  chart: {
    marginLeft: -16,
    borderRadius: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AnalysisScreen;
