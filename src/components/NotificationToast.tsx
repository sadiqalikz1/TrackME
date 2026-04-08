import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotification, useTheme } from '@/contexts';
import { NotificationType } from '@/types';

const getIconName = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'close-circle';
    case 'warning':
      return 'warning';
    case 'info':
      return 'information-circle';
    default:
      return 'information-circle';
  }
};

const getBackgroundColor = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return '#10b981';
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
    default:
      return '#3b82f6';
  }
};

export const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useNotification();
  const insets = useSafeAreaInsets();

  if (notifications.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 10 }]}>
      {notifications.slice(0, 3).map((notification, index) => (
        <Animated.View
          key={notification.id}
          style={[
            styles.toast,
            { backgroundColor: getBackgroundColor(notification.type) },
          ]}
        >
          <Ionicons
            name={getIconName(notification.type) as any}
            size={24}
            color="#ffffff"
          />
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <TouchableOpacity
            onPress={() => dismissNotification(notification.id)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  closeButton: {
    padding: 4,
  },
});

export default NotificationToast;
