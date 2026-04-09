import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui';
import { Transaction } from '@/types';
import { formatCurrency, getMonthRange } from '@/utils/formatters';

interface IncomeExpenseCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const IncomeExpenseCard: React.FC<IncomeExpenseCardProps> = ({ transactions, currency, customColor }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
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

    // Weekly breakdown
    const weeks = [
      { label: 'Week 1', start: new Date(start.getFullYear(), start.getMonth(), 1), end: new Date(start.getFullYear(), start.getMonth(), 7) },
      { label: 'Week 2', start: new Date(start.getFullYear(), start.getMonth(), 8), end: new Date(start.getFullYear(), start.getMonth(), 14) },
      { label: 'Week 3', start: new Date(start.getFullYear(), start.getMonth(), 15), end: new Date(start.getFullYear(), start.getMonth(), 21) },
      { label: 'Week 4', start: new Date(start.getFullYear(), start.getMonth(), 22), end: end },
    ];

    const weeklyData = weeks.map((week) => {
      const weekTransactions = monthlyTransactions.filter((t) => {
        const date = new Date(t.date);
        return date >= week.start && date <= week.end;
      });
      const weekIncome = weekTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const weekExpense = weekTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      return {
        label: week.label,
        income: weekIncome,
        expense: weekExpense,
        net: weekIncome - weekExpense,
      };
    });

    return { income, expense, balance: income - expense, weeklyData };
  }, [transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Income & Expense</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.icon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="arrow-down" size={18} color={colors.success} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.statAmount, { color: colors.success }]}>{formatCurrency(stats.income, currency as any)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={[styles.icon, { backgroundColor: colors.danger + '20' }]}>
            <Ionicons name="arrow-up" size={18} color={colors.danger} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expense</Text>
            <Text style={[styles.statAmount, { color: colors.danger }]}>{formatCurrency(stats.expense, currency as any)}</Text>
          </View>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={[styles.subTitle, { color: colors.text, marginBottom: 12 }]}>Weekly Breakdown</Text>
          {stats.weeklyData.map((week, index) => (
            <View key={index} style={[styles.weekRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.weekLabel, { color: colors.textMuted }]}>{week.label}</Text>
              <View style={styles.weekStats}>
                <Text style={[styles.weekAmount, { color: colors.success }]}>+{formatCurrency(week.income, currency as any)}</Text>
                <Text style={[styles.weekAmount, { color: colors.danger }]}>-{formatCurrency(week.expense, currency as any)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 35,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekStats: {
    alignItems: 'flex-end',
  },
  weekAmount: {
    fontSize: 11,
    fontWeight: '500',
    marginVertical: 2,
  },
});

export default IncomeExpenseCard;
