import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui';
import { Transaction, TransactionCategory } from '@/types';
import { formatCurrency, getMonthRange } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';

interface TopCategoriesCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
}

const TopCategoriesCard: React.FC<TopCategoriesCardProps> = ({ transactions, currency, customColor }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryData = useMemo(() => {
    const { start, end } = getMonthRange();
    const monthlyExpenses = transactions.filter(
      (t) => t.type === 'expense' && new Date(t.date) >= start && new Date(t.date) <= end
    );

    const categoryTotals: Record<string, { amount: number; icon: string; color: string }> = {};
    monthlyExpenses.forEach((t) => {
      const catInfo = TRANSACTION_CATEGORIES[t.category as TransactionCategory];
      categoryTotals[t.category] = {
        amount: (categoryTotals[t.category]?.amount || 0) + t.amount,
        icon: catInfo?.icon || 'wallet',
        color: catInfo?.color || '#6b7280',
      };
    });

    const sorted = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        label: TRANSACTION_CATEGORIES[category as TransactionCategory]?.label || category,
        amount: data.amount,
        icon: data.icon,
        color: data.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = sorted.reduce((sum, item) => sum + item.amount, 0);

    return { categories: sorted, total };
  }, [transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};
  const displayCategories = isExpanded ? categoryData.categories : categoryData.categories.slice(0, 5);
  const maxAmount = Math.max(...categoryData.categories.map((c) => c.amount), 1);

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Top Categories</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {displayCategories.length > 0 ? (
        displayCategories.map((category, index) => {
          const percentage = categoryData.total > 0 ? (category.amount / categoryData.total) * 100 : 0;
          const barWidth = (category.amount / maxAmount) * 100;

          return (
            <View key={category.category} style={[styles.categoryRow, index < displayCategories.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={16} color={category.color} />
                </View>
                <View style={styles.categoryContent}>
                  <Text style={[styles.categoryLabel, { color: colors.text }]}>{category.label}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.categoryBarFill, { width: `${barWidth}%` as any, backgroundColor: category.color }]} />
                  </View>
                </View>
              </View>
              <View style={styles.categoryAmount}>
                <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(category.amount, currency as any)}</Text>
                <Text style={[styles.percentage, { color: colors.textMuted }]}>{percentage.toFixed(0)}%</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No spending data</Text>
        </View>
      )}

      {categoryData.categories.length > 5 && !isExpanded && (
        <Text style={[styles.viewMore, { color: colors.primary }]}>
          View {categoryData.categories.length - 5} more categories
        </Text>
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
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 10,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  viewMore: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TopCategoriesCard;
