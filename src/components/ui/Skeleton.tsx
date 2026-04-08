import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#2d2d44' : '#e2e8f0',
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={`${100 - i * 15}%`}
          height={14}
          style={{ marginTop: 12 }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
});

export default Skeleton;
