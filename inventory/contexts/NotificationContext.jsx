import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Notification from '../components/ui/Notification';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showNotification = useCallback((message, options = {}) => {
    const { type = 'success', duration = 4000 } = options;
    setNotification({
      message,
      type,
      duration,
      id: Date.now()
    });
  }, []);

  useEffect(() => {
    if (!notification?.duration) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, notification.duration);

    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Notification notification={notification} onClose={hideNotification} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
