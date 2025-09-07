'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes, faCheck, faExclamationTriangle, faInfoCircle, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { useNotificationModal } from '../providers/NotificationModalProvider';
import { getApiUrl } from '../utils/api';
import { useRouter } from 'next/navigation';
import { useNotificationContext } from '../providers/NotificationContext';

interface Notification {
  id: string;
  message: string;
  sent_at: string;
  read: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  resolution?: {
    id: string;
    public_id: string;
    clause: string;
    subclause: string;
    meeting: {
      number: number;
    };
  };
}

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return faCheck;
      case 'error': return faExclamationTriangle;
      case 'warning': return faExclamationTriangle;
      default: return faInfoCircle;
    }
  };

  const getStyles = () => {
    const base = "fixed top-4 right-4 z-[99999] p-4 rounded-xl shadow-lg transform transition-all duration-300 max-w-sm backdrop-blur-sm border";
    switch (type) {
      case 'success': return `${base} bg-green-50/90 border-green-200 text-green-800`;
      case 'error': return `${base} bg-red-50/90 border-red-200 text-red-800`;
      case 'warning': return `${base} bg-yellow-50/90 border-yellow-200 text-yellow-800`;
      default: return `${base} bg-blue-50/90 border-blue-200 text-blue-800`;
    }
  };

  const getIconStyles = () => {
    switch (type) {
      case 'success':
        return "w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600";
      case 'error':
        return "w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600";
      case 'warning':
        return "w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600";
      default:
        return "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600";
    }
  };

  return (
    <div className={`${getStyles()} ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}`}>
      <div className="flex items-start gap-3">
        <div className={getIconStyles()}>
          <FontAwesomeIcon icon={getIcon()} className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200 group"
        >
          <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-gray-500 group-hover:text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export const NotificationBadge: React.FC = () => {
  const { unreadCount, refreshUnreadCount } = useNotificationContext();
  const { openModal } = useNotificationModal();
  const router = useRouter();

  useEffect(() => {
    refreshUnreadCount();
    // Listen for refresh events
    const handleRefresh = () => {
      refreshUnreadCount();
    };
    window.addEventListener('refreshNotificationCount', handleRefresh);
    return () => window.removeEventListener('refreshNotificationCount', handleRefresh);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(getApiUrl(`notifications/${notificationId}/read/`), {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // setNotifications(prev => 
        //   prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        // );
        // setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // علامت‌گذاری به عنوان خوانده شده
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // بستن Modal
    // Modal is now controlled by context
    
    // هدایت به صفحه مربوطه
    if (notification.resolution) {
      router.push(`/dashboard/resolutions/${notification.resolution.public_id}?tab=interactions`);
    }
  };

  const toPersianNumber = (num: number) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianNumbers[parseInt(x)]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <button
        onClick={openModal}
        className="relative p-3 bg-gradient-to-r from-[#D39E46] to-[#003363] hover:from-[#003363] hover:to-[#D39E46] text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : toPersianNumber(unreadCount)}
          </span>
        )}
      </button>
    </>
  );
};

export const ToastContainer: React.FC = () => {
  const { notifications, clearNotifications } = useWebSocketContext();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([]);

  useEffect(() => {
    if (notifications.length > 0) {
      const newNotification = notifications[notifications.length - 1];
      const newToast = {
        id: newNotification.notification_id || Date.now().toString(),
        message: newNotification.message,
        type: newNotification.type || 'info'
      };
      
      setToasts(prev => [...prev, newToast]);
      clearNotifications();
    }
  }, [notifications, clearNotifications]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[99999] space-y-3">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <Toast
            id={toast.id}
            message={toast.message}
            type={toast.type as any}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
};

export const NotificationSystem: React.FC = () => {
  return (
    <>
      <ToastContainer />
      <NotificationBadge />
    </>
  );
}; 