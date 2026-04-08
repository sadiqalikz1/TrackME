import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme, useAuth } from '@/contexts';
import { Card, Skeleton } from '@/components/ui';
import { Transaction, TransactionCategory } from '@/types';
import { getUserTransactions } from '@/services/firebase';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatPercentage, getMonthName } from '@/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

type TimeRange = '1M' | '3M' | '6M' | '1Y';

const AnalysisScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  const currency = user?.currency || 'USD';

  useEffect(() => {
    if (!user) return;

    const unsub = getUserTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Filter by time range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, timeRange]);

  // Overall stats
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, savingsRate };
  }, [filteredTransactions]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    const now = new Date();

    const data: { month: string; income: number; expenses: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = getMonthName(date).slice(0, 3);

      const monthTransactions = filteredTransactions.filter((t) => t.date.startsWith(monthKey));
      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({ month: monthName, income, expenses });
    }

    return data;
  }, [filteredTransactions, timeRange]);

  // Category breakdown (expenses)
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    const grouped: Record<string, number> = {};

    expenses.forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);

    return Object.entries(grouped)
      .map(([category, amount]) => {
        const catInfo = TRANSACTION_CATEGORIES[category as TransactionCategory];
        return {
          category,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: catInfo?.color || '#8E8E93',
          name: catInfo?.label || category,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredTransactions]);

  // Chart config
  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
      fill: colors.textMuted,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 0.5,
    },
  };

  // Pie chart data
  const pieData = categoryData.map((c) => ({
    name: c.name,
    amount: c.amount,
    color: c.color,
    legendFontColor: colors.text,
    legendFontSize: 11,
  }));

  // Line chart data
  const lineData = {
    labels: monthlyData.map((d) => d.month),
    datasets: [
      {
        data: monthlyData.map((d) => d.income || 0),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: monthlyData.map((d) => d.expenses || 0),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Income', 'Expenses'],
  };

  // Bar chart data
  const barData = {
    labels: monthlyData.slice(-4).map((d) => d.month),
    datasets: [
      {
        data: monthlyData.slice(-4).map((d) => d.income - d.expenses),
      },
    ],
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Analysis</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <Skeleton height={120} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton height={250} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton height={250} borderRadius={16} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Analysis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['1M', '3M', '6M', '1Y'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeButton,
                {
                  backgroundColor: timeRange === range ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: timeRange === range ? '#ffffff' : colors.text },
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Overview */}
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(stats.income, currency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expenses</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {formatCurrency(stats.expenses, currency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Net Savings</Text>
              <Text
                style={[styles.statValue, { color: stats.savings >= 0 ? colors.success : colors.danger }]}
              >
                {formatCurrency(stats.savings, currency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Savings Rate</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatPercentage(stats.savingsRate, 1)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Income vs Expenses Trend */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Income vs Expenses</Text>
          {monthlyData.length > 0 ? (
            <LineChart
              data={lineData}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withDots={true}
              withShadow={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data available</Text>
            </View>
          )}
        </Card>

        {/* Category Breakdown */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Breakdown</Text>
          {pieData.length > 0 ? (
            <>
              <PieChart
                data={pieData}
                width={CHART_WIDTH}
                height={180}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                center={[10, 0]}
                absolute
              />
              <View style={styles.categoryList}>
                {categoryData.map((c) => (
                  <View key={c.category} style={styles.categoryItem}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: c.color }]} />
                      <Text style={[styles.categoryName, { color: colors.text }]}>{c.name}</Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={[styles.categoryAmount, { color: colors.text }]}>
                        {formatCurrency(c.amount, currency)}
                      </Text>
                      <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>
                        {formatPercentage(c.percentage, 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No expenses recorded</Text>
            </View>
          )}
        </Card>

        {/* Monthly Savings */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Savings</Text>
          {monthlyData.length > 0 ? (
            <BarChart
              data={barData}
              width={CHART_WIDTH}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              withInnerLines={false}
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data available</Text>
            </View>
          )}
        </Card>

        {/* Insights */}
        <Card style={[styles.insightsCard, { marginBottom: 32 }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Quick Insights</Text>
          <View style={styles.insightsList}>
            {stats.savingsRate >= 20 && (
              <View style={styles.insightItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Great job! You're saving {formatPercentage(stats.savingsRate, 0)} of your income.
                </Text>
              </View>
            )}
            {stats.savingsRate > 0 && stats.savingsRate < 20 && (
              <View style={styles.insightItem}>
                <Ionicons name="alert-circle" size={20} color={colors.warning} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Try to increase your savings rate to at least 20%.
                </Text>
              </View>
            )}
            {stats.savingsRate <= 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="warning" size={20} color={colors.danger} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  You're spending more than you earn. Review your expenses.
                </Text>
              </View>
            )}
            {categoryData.length > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="pie-chart" size={20} color={colors.primary} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Top expense: {categoryData[0].name} ({formatPercentage(categoryData[0].percentage, 0)})
                </Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  emptyChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  categoryList: {
    marginTop: 12,
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 13,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryPercent: {
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  insightsCard: {
    marginBottom: 16,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightText: {
    fontSize: 13,
    flex: 1,
  },
});

export default AnalysisScreen;
