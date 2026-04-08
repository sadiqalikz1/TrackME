import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Notification, NotificationType } from '@/types';

const getIconAndColor = (
  type: NotificationType,
  colors: any
): { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string } => {
  switch (type) {
    case 'success':
      return { icon: 'checkmark-circle', color: '#fff', bgColor: colors.success };
    case 'error':
      return { icon: 'close-circle', color: '#fff', bgColor: colors.danger };
    case 'warning':
      return { icon: 'warning', color: '#fff', bgColor: colors.warning };
    case 'info':
    default:
      return { icon: 'information-circle', color: '#fff', bgColor: colors.info };
  }
};

interface ToastItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onDismiss }) => {
  const { colors } = useTheme();
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const { icon, color, bgColor } = getIconAndColor(notification.type, colors);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.message, { color }]} numberOfLines={2}>
        {notification.message}
      </Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={20} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <View style={styles.container}>
      {notifications.slice(-3).map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
  },
});

export default NotificationToast;
