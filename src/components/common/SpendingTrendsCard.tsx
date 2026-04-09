import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface SpendingTrendsCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
}

const SpendingTrendsCard: React.FC<SpendingTrendsCardProps> = ({ transactions, currency, customColor }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const trendData = useMemo(() => {
    const today = new Date();
    const weeks = [];

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return t.type === 'expense' && date >= weekStart && date <= weekEnd;
      });

      const weekTotal = weekTransactions.reduce((sum, t) => sum + t.amount, 0);

      weeks.push({
        label: `Week ${4 - i}`,
        amount: weekTotal,
        date: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      });
    }

    const avgSpending = weeks.length > 0 ? weeks.reduce((sum, w) => sum + w.amount, 0) / weeks.length : 0;
    const maxSpending = Math.max(...weeks.map((w) => w.amount));
    const trend =
      weeks.length >= 2
        ? weeks[weeks.length - 1].amount > weeks[weeks.length - 2].amount
          ? 'up'
          : 'down'
        : 'stable';

    return { weeks, avgSpending, maxSpending, trend };
  }, [transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};
  const trendColor = trendData.trend === 'up' ? colors.danger : colors.success;
  const trendIcon = trendData.trend === 'up' ? 'trending-up' : 'trending-down';

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Spending Trends</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.trendSummary}>
        <View style={styles.trendItem}>
          <Text style={[styles.trendLabel, { color: colors.textMuted }]}>Average</Text>
          <Text style={[styles.trendAmount, { color: colors.textMuted }]}>
            {formatCurrency(trendData.avgSpending, currency as any)}
          </Text>
        </View>
        <View style={[styles.trendIndicator, { backgroundColor: trendColor + '20' }]}>
          <Ionicons name={trendIcon as any} size={20} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendData.trend === 'up' ? 'Increasing' : 'Decreasing'}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {trendData.weeks.map((week, index) => {
            const barHeight = trendData.maxSpending > 0 ? (week.amount / trendData.maxSpending) * 80 : 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 8),
                      backgroundColor: colors.primary,
                      opacity: 0.6 + week.amount / (trendData.maxSpending + 1) * 0.4,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: colors.textMuted }]}>W{index + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={[styles.subTitle, { color: colors.text, marginBottom: 12 }]}>Weekly Details</Text>
          {trendData.weeks.map((week, index) => (
            <View key={index} style={[styles.weekRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.weekLabel, { color: colors.text }]}>{week.label}</Text>
                <Text style={[styles.weekDate, { color: colors.textMuted }]}>{week.date}</Text>
              </View>
              <Text style={[styles.weekAmount, { color: colors.text }]}>
                {formatCurrency(week.amount, currency as any)}
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
  trendSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendItem: {
    justifyContent: 'center',
  },
  trendLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  trendAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  chartContainer: {
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
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
  weekDate: {
    fontSize: 10,
    marginTop: 2,
  },
  weekAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SpendingTrendsCard;
