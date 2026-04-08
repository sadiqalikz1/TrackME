import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Goal } from '@/types';
import { formatCurrency, formatPercentage, getDaysUntil, formatDate } from '@/utils/formatters';
import { ProgressBar } from '@/components/ui';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  
  const progress = goal.target > 0 
    ? (goal.saved / goal.target) * 100 
    : 0;
  const daysRemaining = goal.deadline ? getDaysUntil(goal.deadline) : 0;
  const isCompleted = goal.isCompleted || goal.saved >= goal.target;
  const isOverdue = daysRemaining < 0 && !isCompleted;

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
            styles.colorIndicator,
            { backgroundColor: goal.color },
          ]}
        />
        <View style={styles.headerContent}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {goal.name}
          </Text>
          <Text style={[styles.deadline, { color: colors.textMuted }]}>
            {isCompleted ? (
              'Completed! 🎉'
            ) : isOverdue ? (
              `Overdue by ${Math.abs(daysRemaining)} days`
            ) : daysRemaining === 0 ? (
              'Due today'
            ) : (
              `${daysRemaining} days remaining`
            )}
          </Text>
        </View>
        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        )}
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressBar 
          progress={progress} 
          color={isCompleted ? colors.success : goal.color}
          height={10}
        />
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {formatCurrency(goal.saved, currency)}
          </Text>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            of {formatCurrency(goal.target, currency)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: goal.color }]}>
            {formatPercentage(Math.min(progress, 100), 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Progress
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(goal.target - goal.saved, currency)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Remaining
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {goal.deadline ? formatDate(goal.deadline, 'MMM d') : 'No deadline'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Deadline
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
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  deadline: {
    fontSize: 12,
    marginTop: 2,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginTop: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default GoalCard;
