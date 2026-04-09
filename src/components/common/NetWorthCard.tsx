import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card, ProgressBar } from '@/components/ui';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface NetWorthCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
}

const NetWorthCard: React.FC<NetWorthCardProps> = ({ transactions, currency, customColor }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const netWorthData = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const today = new Date();

    const ytdTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= yearStart && date <= today;
    });

    const totalIncome = ytdTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = ytdTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netWorth = totalIncome - totalExpense;

    // Monthly breakdown for trend
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(new Date().getFullYear(), i, 1);
      const monthEnd = new Date(new Date().getFullYear(), i + 1, 0);

      const monthTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthIncome = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      months.push({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
      });
    }

    return {
      totalIncome,
      totalExpense,
      netWorth,
      savingsRate: totalIncome > 0 ? ((netWorth / totalIncome) * 100).toFixed(1) : '0',
      months: months.filter((m) => m.income > 0 || m.expense > 0),
    };
  }, [transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  const netWorthColor = netWorthData.netWorth >= 0 ? colors.success : colors.danger;

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Net Worth (YTD)</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainStat}>
        <Text style={[styles.netWorthLabel, { color: colors.textMuted }]}>Total Net Worth</Text>
        <Text style={[styles.netWorthAmount, { color: netWorthColor }]}>
          {formatCurrency(netWorthData.netWorth, currency as any)}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
          <Text style={[styles.statAmount, { color: colors.success }]}>
            {formatCurrency(netWorthData.totalIncome, currency as any)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expense</Text>
          <Text style={[styles.statAmount, { color: colors.danger }]}>
              {formatCurrency(netWorthData.totalExpense, currency as any)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Savings Rate</Text>
          <Text style={[styles.statAmount, { color: colors.info }]}>
            {netWorthData.savingsRate}%
          </Text>
        </View>
      </View>

      {isExpanded && netWorthData.months.length > 0 && (
        <View style={styles.expandedContent}>
          <Text style={[styles.subTitle, { color: colors.text, marginBottom: 12 }]}>Monthly Trend</Text>
          {netWorthData.months.map((month, index) => (
            <View key={index} style={[styles.monthRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.monthLabel, { color: colors.textMuted }]}>{month.month}</Text>
              <View style={styles.monthBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${(month.net / Math.max(...netWorthData.months.map((m) => m.net + 1))) * 60}%` as any,
                      backgroundColor: month.net >= 0 ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.monthAmount, { color: colors.text }]}>
                {formatCurrency(month.net, currency as any)}
              </Text>
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
  mainStat: {
    marginBottom: 16,
  },
  netWorthLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  netWorthAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 13,
    fontWeight: '600',
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  monthLabel: {
    width: 30,
    fontSize: 11,
    fontWeight: '500',
  },
  monthBar: {
    flex: 1,
    height: 20,
    marginHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
  monthAmount: {
    width: 80,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});

export default NetWorthCard;
