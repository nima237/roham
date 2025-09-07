'use client';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes, faCheck, faEye } from '@fortawesome/free-solid-svg-icons';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { useNotificationModal } from '../providers/NotificationModalProvider';
import { useNotificationContext } from '../providers/NotificationContext';
import { getApiUrl } from '../utils/api';
import Link from 'next/link';

export const NotificationModal: React.FC = () => {
  const { isModalOpen, closeModal } = useNotificationModal();
  const { notifications, clearNotifications } = useWebSocketContext();
  const { unreadCount, refreshUnreadCount } = useNotificationContext();
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      fetchNotifications();
      refreshUnreadCount();
    }
  }, [isModalOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl('notifications/user/')}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotificationsList(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${getApiUrl(`notifications/${notificationId}/read/`)}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Update local state
      if (response.ok) {
        setNotificationsList(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${getApiUrl('notifications/mark-all-read/')}`, {
        method: 'PUT', // تغییر از POST به PUT
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setNotificationsList(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FontAwesomeIcon icon={faCheck} className="text-green-500" />;
      case 'warning':
        return <FontAwesomeIcon icon={faBell} className="text-yellow-500" />;
      case 'error':
        return <FontAwesomeIcon icon={faTimes} className="text-red-500" />;
      default:
        return <FontAwesomeIcon icon={faBell} className="text-blue-500" />;
    }
  };

  const formatDate = (notification: any) => {
    const dateString = notification.created_at || notification.sent_at || notification.timestamp;
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'تاریخ نامعتبر';
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLinkClick = async (notification: any) => {
    // اگر نوتیفیکیشن خوانده نشده، آن را علامت‌گذاری کن
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-[340px] max-w-[90vw] z-[99999] bg-white shadow-2xl border-2 border-[#D39E46] rounded-2xl overflow-y-auto max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#D39E46] bg-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faBell} className="text-2xl text-[#D39E46]" />
          <h2 className="text-lg font-bold text-[#003363]">نوتیفیکیشن‌ها</h2>
          {notificationsList.filter(n => !n.read).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notificationsList.filter(n => !n.read).length}
            </span>
          )}
        </div>
        <button
          onClick={closeModal}
          className="text-[#003363] hover:text-gray-600 p-2 rounded-full transition-colors duration-150"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notificationsList.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <FontAwesomeIcon icon={faBell} className="text-4xl mb-4 text-gray-300" />
            <p>نوتیفیکیشنی وجود ندارد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notificationsList.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.notification_type || 'info')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      {notification.resolution && notification.resolution.public_id ? (
                        <Link
                          href={`/dashboard/resolutions/${notification.resolution.public_id}`}
                          className={`text-sm font-medium transition-colors duration-150 ${!notification.read ? 'text-blue-700 hover:underline' : 'text-gray-600 hover:text-blue-600 hover:underline'}`}
                          target="_blank"
                          onClick={() => handleLinkClick(notification)}
                        >
                          {notification.message}
                        </Link>
                      ) : (
                        <span className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>{notification.message}</span>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md shadow ml-2 transition-colors duration-150"
                        >
                          <FontAwesomeIcon icon={faEye} className="ml-1" />
                          خوانده شد
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(notification)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 