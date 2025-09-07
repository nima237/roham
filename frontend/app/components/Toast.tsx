'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return faCheck;
      case 'error': return faExclamationTriangle;
      case 'warning': return faExclamationTriangle;
      default: return faInfoCircle;
    }
  };

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-[9999] p-4 rounded-xl shadow-lg transform transition-all duration-300 max-w-sm backdrop-blur-sm border";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50/90 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50/90 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50/90 border-yellow-200 text-yellow-800`;
      default:
        return `${baseStyles} bg-blue-50/90 border-blue-200 text-blue-800`;
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
    <div className={`${getToastStyles()} ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}`}>
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
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200 group"
        >
          <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-gray-500 group-hover:text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { notifications, clearNotifications } = useWebSocketContext();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([]);

  useEffect(() => {
    console.log('🔵 ToastContainer: notifications changed:', notifications);
    if (notifications.length > 0) {
      const newNotification = notifications[notifications.length - 1];
      console.log('🔵 ToastContainer: creating new toast for:', newNotification);
      const newToast = {
        id: newNotification.notification_id,
        message: newNotification.message,
        type: 'info'
      };
      
      console.log('🔵 ToastContainer: new toast object:', newToast);
      setToasts(prev => {
        console.log('🔵 ToastContainer: previous toasts:', prev);
        const updatedToasts = [...prev, newToast];
        console.log('🔵 ToastContainer: updated toasts:', updatedToasts);
        return updatedToasts;
      });
      clearNotifications();
    }
  }, [notifications, clearNotifications]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <Toast
            message={toast.message}
            type={toast.type as any}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default Toast; 