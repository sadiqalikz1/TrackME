import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = (): string => {
    if (disabled) return isDark ? '#374151' : '#d1d5db';
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.card;
      case 'danger':
        return colors.danger;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return isDark ? '#6b7280' : '#9ca3af';
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#ffffff';
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.text;
      default:
        return '#ffffff';
    }
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') return colors.primary;
    return 'transparent';
  };

  const getPadding = (): { paddingVertical: number; paddingHorizontal: number } => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 20 };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outline' ? 1.5 : 0,
    ...getPadding(),
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(fullWidth && { width: '100%' }),
  };

  const textStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style as ViewStyle]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
