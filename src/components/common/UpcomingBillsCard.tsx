import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui';
import { BillReminder } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface UpcomingBillsCardProps {
  bills: BillReminder[];
  currency: string;
  customColor?: string;
  onBillPress?: (bill: BillReminder) => void;
}

const UpcomingBillsCard: React.FC<UpcomingBillsCardProps> = ({ bills, currency, customColor, onBillPress }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const upcomingBills = useMemo(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return bills
      .filter((bill) => {
        const billDate = new Date(bill.dueDate);
        return billDate >= today && billDate <= thirtyDaysLater;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, isExpanded ? 10 : 3);
  }, [bills, isExpanded]);

  const totalUpcoming = useMemo(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return bills
      .filter((bill) => {
        const billDate = new Date(bill.dueDate);
        return billDate >= today && billDate <= thirtyDaysLater;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills]);

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return colors.danger;
    if (days <= 7) return colors.warning;
    return colors.success;
  };

  const getUrgencyLabel = (days: number) => {
    if (days <= 0) return 'Overdue';
    if (days === 1) return 'Due tomorrow';
    if (days <= 3) return 'Due soon';
    return `Due in ${days}d`;
  };

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Upcoming Bills</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Next 30 days • {formatCurrency(totalUpcoming, currency as any)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {upcomingBills.length > 0 ? (
        <FlatList
          scrollEnabled={false}
          data={upcomingBills}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const daysUntilDue = getDaysUntilDue(item.dueDate);
            const urgencyColor = getUrgencyColor(daysUntilDue);

            return (
              <TouchableOpacity
                style={[styles.billItem, { borderBottomColor: colors.border }]}
                onPress={() => onBillPress?.(item)}
              >
                <View style={[styles.billIcon, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="receipt" size={18} color={colors.warning} />
                </View>
                <View style={styles.billContent}>
                  <Text style={[styles.billName, { color: colors.text }]} numberOfLines={1}>
                    {(item as any).billName || (item as any).title || (item as any).name || 'Bill Reminder'}
                  </Text>
                  <Text style={[styles.billDate, { color: colors.textMuted }]}>
                    {formatDate(new Date(item.dueDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={[styles.billAmount, { color: colors.text }]}>
                  {formatCurrency(item.amount, currency as any)}
                  </Text>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
                    <Text style={[styles.urgencyText, { color: urgencyColor }]}>
                      {getUrgencyLabel(daysUntilDue)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bills due in next 30 days</Text>
        </View>
      )}

      {!isExpanded && bills.length > 3 && (
        <Text style={[styles.viewMore, { color: colors.primary }]}>View all bills</Text>
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
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billContent: {
    flex: 1,
  },
  billName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 11,
  },
  billRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '600',
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

export default UpcomingBillsCard;
