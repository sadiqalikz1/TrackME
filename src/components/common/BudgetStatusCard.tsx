import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card, ProgressBar } from '@/components/ui';
import { Budget } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface BudgetStatusCardProps {
  budgets: Budget[];
  transactions: any[];
  currency: string;
  customColor?: string;
}

const BudgetStatusCard: React.FC<BudgetStatusCardProps> = ({ budgets, transactions, currency, customColor }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const budgetStatus = useMemo(() => {
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    return budgets.slice(0, 3).map((budget) => {
      const spent = transactions
        .filter((t) => {
          const tDate = new Date(t.date);
          return (
            t.type === 'expense' &&
            t.category === budget.category &&
            tDate >= startOfMonth &&
            tDate <= endOfMonth
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      const status = percentage >= 100 ? 'exceeded' : percentage >= 70 ? 'warning' : 'safe';

      return {
        id: budget.id,
        category: budget.category,
        limit: budget.limit,
        spent,
        remaining: Math.max(0, budget.limit - spent),
        percentage: Math.min(percentage, 100),
        status,
      };
    });
  }, [budgets, transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return colors.danger;
      case 'warning':
        return colors.warning;
      default:
        return colors.success;
    }
  };

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Budget Status</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {budgetStatus.slice(0, isExpanded ? budgetStatus.length : 2).map((budget, index) => (
        <View key={budget.id} style={[styles.budgetItem, index > 0 && { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetName, { color: colors.text }]}>{budget.category}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(budget.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(budget.status) }]}>
                {((budget.percentage).toFixed(0))}%
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={budget.percentage / 100}
            color={getStatusColor(budget.status)}
            style={styles.progressBar}
          />
          <View style={styles.budgetFooter}>
            <Text style={[styles.budgetAmount, { color: colors.textMuted }]}>
              {formatCurrency(budget.spent, currency as any)} / {formatCurrency(budget.limit, currency as any)}
            </Text>
            <Text style={[styles.budgetRemaining, { color: getStatusColor(budget.status) }]}>
              {formatCurrency(budget.remaining, currency as any)} remaining
            </Text>
          </View>
        </View>
      ))}
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
  budgetItem: {
    marginBottom: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    marginBottom: 8,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 11,
  },
  budgetRemaining: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default BudgetStatusCard;
