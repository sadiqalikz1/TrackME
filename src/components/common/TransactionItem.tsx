import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';

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
  const currency = user?.currency || 'USD';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: category.color + '20' },
        ]}
      >
        <Ionicons name={category.icon as any} size={24} color={category.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.text }]}>
          {category.label}
        </Text>
        {transaction.note ? (
          <Text
            style={[styles.note, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {transaction.note}
          </Text>
        ) : (
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatRelativeDate(transaction.date)} at {transaction.time || '12:00'}
          </Text>
        )}
      </View>

      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? colors.success : colors.danger },
          ]}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount, currency)}
        </Text>
        {transaction.note && (
          <Text style={[styles.date, { color: colors.textMuted, textAlign: 'right' }]}>
            {formatRelativeDate(transaction.date)} at {transaction.time || '12:00'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransactionItem;
