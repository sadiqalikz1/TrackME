import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Work } from '@/types';
import { WORK_CATEGORIES, STATUS_COLORS } from '@/utils/constants';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { ProgressBar } from '@/components/ui';

interface WorkCardProps {
  work: Work;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const WorkCard: React.FC<WorkCardProps> = ({
  work,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const category = WORK_CATEGORIES[work.category];
  const status = STATUS_COLORS[work.status];
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
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: category.color + '20' },
          ]}
        >
          <Ionicons name={category.icon as any} size={24} color={category.color} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {work.title}
          </Text>
          <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
            {category.label}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Description */}
      {work.description && (
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {work.description}
        </Text>
      )}

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            Progress
          </Text>
          <Text style={[styles.progressValue, { color: colors.text }]}>
            {formatPercentage(work.progress, 0)}
          </Text>
        </View>
        <ProgressBar progress={work.progress} color={status.color} />
      </View>

      {/* Financial Summary */}
      <View style={styles.financialSection}>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textMuted }]}>
            Quotation
          </Text>
          <Text style={[styles.financialValue, { color: colors.text }]}>
            {formatCurrency(work.quotationAmount, currency)}
          </Text>
        </View>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textMuted }]}>
            Profit
          </Text>
          <Text
            style={[
              styles.financialValue,
              { color: work.profit >= 0 ? colors.success : colors.danger },
            ]}
          >
            {formatCurrency(work.profit, currency)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  financialSection: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  financialItem: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WorkCard;
