import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification, NotificationType } from '@/types';
import { APP_CONFIG } from '@/utils/constants';

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showNotification = useCallback((type: NotificationType, message: string, duration?: number) => {
    const id = generateId();
    const defaultDuration = APP_CONFIG.TOAST_DURATION[type];
    const notificationDuration = duration || defaultDuration;

    const notification: Notification = {
      id,
      type,
      message,
      duration: notificationDuration,
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, notificationDuration);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showNotification('success', message);
  }, [showNotification]);

  const showError = useCallback((message: string) => {
    showNotification('error', message);
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    showNotification('warning', message);
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    showNotification('info', message);
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
