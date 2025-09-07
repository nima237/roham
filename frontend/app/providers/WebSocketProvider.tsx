'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  notifications: any[];
  chatMessages: any[];
  clearNotifications: () => void;
  clearChatMessages: () => void;
  joinChat: (resolutionId: string) => void;
  leaveChat: (resolutionId: string) => void;
  sendChatMessage: (resolutionId: string, message: string, authorId: number) => void;
  refreshNotificationCount: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // حذف وابستگی به localStorage و token
  // فرض: WebSocket بدون توکن یا با راهکار جدید احراز هویت
  const { 
    isConnected, 
    notifications, 
    chatMessages,
    clearNotifications, 
    clearChatMessages,
    joinChat,
    leaveChat,
    sendChatMessage
  } = useWebSocket(null);

  const refreshNotificationCount = () => {
    window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
  };

  useEffect(() => {
    if (notifications.length > 0) {
      refreshNotificationCount();
    }
  }, [notifications]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      // Trigger chat refresh event with the latest message
      const latestMessage = chatMessages[chatMessages.length - 1];
      window.dispatchEvent(new CustomEvent('refreshChatMessages', { 
        detail: latestMessage 
      }));
      console.log('🔵 WebSocketProvider: Chat messages updated, triggering refresh');
    }
  }, [chatMessages]);

  const value = {
    isConnected,
    notifications,
    chatMessages,
    clearNotifications,
    clearChatMessages,
    joinChat,
    leaveChat,
    sendChatMessage,
    refreshNotificationCount
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 