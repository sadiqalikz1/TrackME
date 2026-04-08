import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  onPress,
}) => {
  const { colors, isDark } = useTheme();

  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return 12;
      case 'lg':
        return 24;
      default:
        return 16;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: getPadding(),
    ...(variant === 'elevated' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          style,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

export default Card;
