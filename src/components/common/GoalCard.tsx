import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { Goal } from '@/types';
import { formatCurrency, calculateProgress, getDaysUntil, formatDate } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onPress }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
  const daysLeft = getDaysUntil(goal.deadline);
  const remaining = goal.targetAmount - goal.currentAmount;

  // Circular progress calculations
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  const getDeadlineStatus = () => {
    if (progress >= 100) return { label: 'Completed!', color: colors.success };
    if (daysLeft < 0) return { label: 'Overdue', color: colors.danger };
    if (daysLeft === 0) return { label: 'Due today', color: colors.warning };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: colors.warning };
    return { label: `${daysLeft}d left`, color: colors.textSecondary };
  };

  const deadlineStatus = getDeadlineStatus();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Progress Circle */}
      <View style={styles.progressContainer}>
        <Svg width={size} height={size} style={styles.progressCircle}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.cardSecondary}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={goal.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={[styles.progressText, { color: goal.color }]}>
          {progress}%
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {goal.name}
        </Text>
        
        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: goal.color }]}>
            {formatCurrency(goal.currentAmount, user?.currency || 'USD')}
          </Text>
          <Text style={[styles.separator, { color: colors.textMuted }]}> / </Text>
          <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>
            {formatCurrency(goal.targetAmount, user?.currency || 'USD')}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.deadlineContainer}>
            <Ionicons name="time-outline" size={14} color={deadlineStatus.color} />
            <Text style={[styles.deadline, { color: deadlineStatus.color }]}>
              {deadlineStatus.label}
            </Text>
          </View>
          {progress < 100 && (
            <Text style={[styles.remaining, { color: colors.textMuted }]}>
              {formatCurrency(remaining, user?.currency || 'USD')} to go
            </Text>
          )}
        </View>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  progressContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    position: 'absolute',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  currentAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    fontSize: 13,
  },
  targetAmount: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadline: {
    fontSize: 12,
    marginLeft: 4,
  },
  remaining: {
    fontSize: 12,
  },
});

export default GoalCard;
