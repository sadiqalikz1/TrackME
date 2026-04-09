import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card, ProgressBar } from '@/components/ui';
import { Goal } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface EnhancedGoalProgressCardProps {
  goals: Goal[];
  currency: string;
  customColor?: string;
  onGoalPress?: (goal: Goal) => void;
}

const EnhancedGoalProgressCard: React.FC<EnhancedGoalProgressCardProps> = ({ goals, currency, customColor, onGoalPress }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const goalStats = useMemo(() => {
    const activeGoals = goals.filter((g) => !g.isCompleted);
    const completedGoals = goals.filter((g) => g.isCompleted);

    const totalSaved = activeGoals.reduce((sum, g) => sum + g.saved, 0);
    const totalTarget = activeGoals.reduce((sum, g) => sum + g.target, 0);
    const cumulativePercentage = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : '0';

    return {
      activeGoals,
      completedGoals,
      totalSaved,
      totalTarget,
      cumulativePercentage,
    };
  }, [goals]);

  const displayGoals = isExpanded ? goalStats.activeGoals : goalStats.activeGoals.slice(0, 3);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  const getDaysUntilDeadline = (deadline: string | undefined) => {
    if (!deadline) return -1;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDeadlineColor = (days: number) => {
    if (days < 0) return colors.danger;
    if (days <= 30) return colors.warning;
    return colors.success;
  };

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Goals Progress</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Overall Progress */}
      {goalStats.activeGoals.length > 0 && (
        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Overall Progress</Text>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {goalStats.cumulativePercentage}%
            </Text>
          </View>
          <ProgressBar
            progress={parseFloat(goalStats.cumulativePercentage) / 100}
            color={colors.primary}
            style={styles.progressBar}
          />
          <Text style={[styles.progressAmount, { color: colors.textMuted }]}>
            {formatCurrency(goalStats.totalSaved, currency as any)} of {formatCurrency(goalStats.totalTarget, currency as any)}
          </Text>
        </View>
      )}

      {/* Individual Goals */}
      {displayGoals.length > 0 ? (
        <FlatList
          scrollEnabled={false}
          data={displayGoals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const progress = item.target > 0 ? (item.saved / item.target) * 100 : 0;
            const daysUntilDeadline = getDaysUntilDeadline(item.deadline);
            const deadlineColor = getDeadlineColor(daysUntilDeadline);

            return (
              <TouchableOpacity
                style={[styles.goalItem, { borderBottomColor: colors.border }]}
                onPress={() => onGoalPress?.(item)}
              >
                <View style={styles.goalContent}>
                  <View style={styles.goalHeader}>
                    <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.goalPercentage, { color: colors.primary }]}>
                      {progress.toFixed(0)}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={progress / 100}
                    color={item.color || colors.primary}
                    style={styles.goalProgressBar}
                  />
                  <View style={styles.goalFooter}>
                    <Text style={[styles.goalAmount, { color: colors.textMuted }]}>
                    {formatCurrency(item.saved, currency as any)} / {formatCurrency(item.target, currency as any)}
                    </Text>
                    <Text style={[styles.goalDeadline, { color: deadlineColor }]}>
                      {daysUntilDeadline < 0
                        ? 'Overdue'
                        : daysUntilDeadline === 0
                          ? 'Due today'
                          : daysUntilDeadline <= 30
                            ? `${daysUntilDeadline}d left`
                            : item.deadline ? formatDate(new Date(item.deadline), 'MMM dd') : 'No deadline'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active goals</Text>
        </View>
      )}

      {/* Completed Goals Summary */}
      {goalStats.completedGoals.length > 0 && (
        <View style={[styles.completedSummary, { backgroundColor: colors.success + '10' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.completedText, { color: colors.textMuted }]}>
            {goalStats.completedGoals.length} goal{goalStats.completedGoals.length > 1 ? 's' : ''} completed
          </Text>
        </View>
      )}

      {!isExpanded && goalStats.activeGoals.length > 3 && (
        <Text style={[styles.viewMore, { color: colors.primary }]}>
          View {goalStats.activeGoals.length - 3} more goals
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
  overallProgress: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    marginBottom: 8,
  },
  progressAmount: {
    fontSize: 11,
  },
  goalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  goalContent: {
    width: '100%',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  goalPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalProgressBar: {
    height: 6,
    marginBottom: 8,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalAmount: {
    fontSize: 11,
  },
  goalDeadline: {
    fontSize: 11,
    fontWeight: '500',
  },
  completedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  completedText: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
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

export default EnhancedGoalProgressCard;
