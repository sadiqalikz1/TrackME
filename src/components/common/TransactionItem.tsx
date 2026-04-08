import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import { useAuth } from '@/contexts/AuthContext';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const category = TRANSACTION_CATEGORIES[transaction.category];
  const isIncome = transaction.type === 'income';

  const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      restaurant: 'restaurant',
      car: 'car',
      home: 'home',
      'shopping-bag': 'bag',
      film: 'film',
      heart: 'heart',
      briefcase: 'briefcase',
      'trending-up': 'trending-up',
      'file-text': 'document-text',
      'more-horizontal': 'ellipsis-horizontal',
    };
    return iconMap[icon] || 'ellipsis-horizontal';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
        <Ionicons name={getIconName(category.icon)} size={22} color={category.color} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
          {category.label}
        </Text>
        <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={1}>
          {transaction.note || 'No note'}
        </Text>
      </View>
      
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? colors.success : colors.danger },
          ]}
        >
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, user?.currency || 'USD')}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {formatDate(transaction.date, 'MMM dd')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  category: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  note: {
    fontSize: 13,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
});

export default TransactionItem;
