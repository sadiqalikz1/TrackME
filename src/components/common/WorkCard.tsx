import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Work } from '@/types';
import { formatCurrency, formatDate, calculateProgress } from '@/utils/formatters';
import { WORK_CATEGORIES, STATUS_COLORS } from '@/utils/constants';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressBar } from '../ui/ProgressBar';

interface WorkCardProps {
  work: Work;
  onPress?: () => void;
}

export const WorkCard: React.FC<WorkCardProps> = ({ work, onPress }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const category = WORK_CATEGORIES[work.category];
  const statusColor = STATUS_COLORS[work.status];

  const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      video: 'videocam',
      cpu: 'hardware-chip',
      wifi: 'wifi',
      code: 'code-slash',
      tool: 'build',
      users: 'people',
      'more-horizontal': 'ellipsis-horizontal',
    };
    return iconMap[icon] || 'ellipsis-horizontal';
  };

  const statusLabel = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[work.status];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={getIconName(category.icon)} size={22} color={category.color} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {work.title}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>
            {category.label}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressBar progress={work.progress} color={category.color} showLabel label="Progress" />
      </View>

      {/* Financial Info */}
      <View style={styles.financialRow}>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Quotation</Text>
          <Text style={[styles.financialValue, { color: colors.text }]}>
            {formatCurrency(work.quotationAmount, user?.currency || 'USD')}
          </Text>
        </View>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Costs</Text>
          <Text style={[styles.financialValue, { color: colors.warning }]}>
            {formatCurrency(work.workingCost + work.expenses, user?.currency || 'USD')}
          </Text>
        </View>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Profit</Text>
          <Text
            style={[
              styles.financialValue,
              { color: work.profit >= 0 ? colors.success : colors.danger },
            ]}
          >
            {formatCurrency(work.profit, user?.currency || 'USD')}
          </Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.footer}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.date, { color: colors.textMuted }]}>
          Started {formatDate(work.startDate, 'MMM dd, yyyy')}
        </Text>
        {work.photos.length > 0 && (
          <>
            <Ionicons name="images" size={14} color={colors.textMuted} style={{ marginLeft: 12 }} />
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {work.photos.length} photos
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
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
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  financialItem: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  date: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default WorkCard;
