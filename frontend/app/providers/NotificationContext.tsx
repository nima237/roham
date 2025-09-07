'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '../utils/api';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationContext must be used within NotificationContextProvider');
  return context;
};

export const NotificationContextProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const response = await fetch(getApiUrl('notifications/unread-count/'), {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (e) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}; 