import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification, NotificationType } from '@/types';
import { generateId } from '@/utils/formatters';

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

interface NotificationProviderProps {
  children: ReactNode;
}

const DEFAULT_DURATION = 3000;

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration: number = DEFAULT_DURATION) => {
      const id = generateId();
      const notification: Notification = { id, type, message, duration };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          dismissNotification(id);
        }, duration);
      }

      return id;
    },
    [dismissNotification]
  );

  const showSuccess = useCallback(
    (message: string) => showNotification('success', message),
    [showNotification]
  );

  const showError = useCallback(
    (message: string) => showNotification('error', message, 5000),
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string) => showNotification('warning', message, 4000),
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string) => showNotification('info', message),
    [showNotification]
  );

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

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
