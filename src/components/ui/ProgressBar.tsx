import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  style?: ViewStyle;
  showOverflow?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  style,
  showOverflow = false,
}) => {
  const { colors } = useTheme();
  
  const clampedProgress = showOverflow ? progress : Math.min(progress, 100);
  const barColor = color || (progress > 100 ? colors.danger : colors.primary);
  const backgroundColor = progress > 100 ? colors.danger + '30' : colors.border;

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <View
        style={[
          styles.progress,
          {
            width: `${Math.min(clampedProgress, 100)}%`,
            backgroundColor: barColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
});

export default ProgressBar;
