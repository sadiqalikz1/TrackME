import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  showLabel = false,
  label,
}) => {
  const { colors } = useTheme();
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const barColor = color || colors.primary;

  const getProgressColor = (): string => {
    if (color) return color;
    if (clampedProgress >= 90) return colors.danger;
    if (clampedProgress >= 75) return colors.warning;
    return colors.primary;
  };

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.percentage, { color: getProgressColor() }]}>
            {clampedProgress.toFixed(0)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: colors.cardSecondary }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default ProgressBar;
