import { useState, useEffect, useRef } from 'react';

interface NotificationMessage {
  type: 'notification';
  message: string;
  notification_id: string;
  notification_type?: string;
  resolution?: any;
}

interface ChatMessage {
  type: 'chat_message';
  resolution_id: string;
  message: string;
  author_id: number;
  author_name?: string;
  timestamp?: string;
}

interface InteractionNotification {
  type: 'interaction_notification';
  resolution_id: string;
  interaction_data: any;
  author_name?: string;
  timestamp?: string;
}

type WebSocketMessage = NotificationMessage | ChatMessage | InteractionNotification;

export const useWebSocket = (_token: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    // حذف وابستگی به توکن
    // فرض: WebSocket بدون توکن یا با راهکار جدید احراز هویت
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect through nginx proxy to the backend WebSocket
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;
    console.log('🔵 Connecting to WebSocket:', wsUrl);
    console.log('🔵 Current location:', window.location.href);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        console.log('🔵 WebSocket message received:', event.data);
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.type === 'notification') {
          console.log('🔵 New notification received:', data);
          setNotifications(prev => {
            console.log('🔵 Previous notifications:', prev);
            const newNotifications = [...prev, data];
            console.log('🔵 Updated notifications:', newNotifications);
            return newNotifications;
          });
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('نوتیفیکیشن جدید', {
              body: data.message,
              icon: '/favicon.ico'
            });
          }
          
          // Trigger refresh event for notification count
          window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
        } else if (data.type === 'chat_message') {
          console.log('🔵 New chat message received:', data);
          setChatMessages(prev => {
            console.log('🔵 Previous chat messages:', prev);
            const newChatMessages = [...prev, data];
            console.log('🔵 Updated chat messages:', newChatMessages);
            return newChatMessages;
          });
          
          // Trigger refresh event for chat
          window.dispatchEvent(new CustomEvent('refreshChatMessages', { detail: data }));
        } else if (data.type === 'interaction_notification') {
          console.log('🔵 New interaction notification received:', data);
          // You might want to display a specific UI for interaction notifications
          // For now, we'll just log it and trigger a refresh event
          window.dispatchEvent(new CustomEvent('refreshInteractionNotifications', { detail: data }));
        } else {
          console.log('🔵 Received unknown message type:', data);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('❌ Raw message:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      if (event.code !== 1000) { // Don't reconnect if closed normally
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 5000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [_token]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const clearChatMessages = () => {
    setChatMessages([]);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔵 Sending WebSocket message:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not connected, cannot send message:', message);
    }
  };

  const joinChat = (resolutionId: string) => {
    console.log('🔵 Joining chat for resolution:', resolutionId);
    sendMessage({
      type: 'join_chat',
      resolution_id: resolutionId
    });
  };

  const leaveChat = (resolutionId: string) => {
    console.log('🔵 Leaving chat for resolution:', resolutionId);
    sendMessage({
      type: 'leave_chat',
      resolution_id: resolutionId
    });
  };

  const sendChatMessage = (resolutionId: string, message: string, authorId: number) => {
    sendMessage({
      type: 'chat_message',
      resolution_id: resolutionId,
      message: message,
      author_id: authorId,
      timestamp: new Date().toISOString()
    });
  };

  return {
    isConnected,
    notifications,
    chatMessages,
    clearNotifications,
    clearChatMessages,
    sendMessage,
    joinChat,
    leaveChat,
    sendChatMessage
  };
}; 