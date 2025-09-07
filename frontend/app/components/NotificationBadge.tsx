'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { faCheck, faEnvelopeOpen } from '@fortawesome/free-solid-svg-icons';
import { createPortal } from 'react-dom';

function toPersianNumber(num: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/[0-9]/g, d => persianDigits[+d]);
}

interface NotificationBadgeProps {
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
        window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
      }
    } catch {}
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notifications/user/', { credentials: 'include' });
      if (!res.ok) throw new Error('خطا در دریافت نوتیفیکیشن‌ها');
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch (e: any) {
      setError(e.message || 'خطا در دریافت نوتیفیکیشن‌ها');
    } finally {
      setLoading(false);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read/', { method: 'PUT', credentials: 'include' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        await updateUnreadCount();
      }
    } finally {
      setMarkingAll(false);
    }
  };

  // Mark single as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read/`, { method: 'POST', credentials: 'include' });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      await updateUnreadCount();
    } catch {}
  };

  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const DROPDOWN_WIDTH = 340;
      const DROPDOWN_HEIGHT = 400; // Approximate max height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Check if dropdown would go off the right edge
      if (left + DROPDOWN_WIDTH > viewportWidth - 16) {
        left = viewportWidth - DROPDOWN_WIDTH - 16;
      }
      
      // Check if dropdown would go off the left edge
      if (left < 16) {
        left = 16;
      }
      
      // Check if dropdown would go off the bottom edge
      if (top + DROPDOWN_HEIGHT > viewportHeight - 16) {
        // Position above the bell instead
        top = rect.top - DROPDOWN_HEIGHT - 8;
      }
      
      // Ensure dropdown doesn't go off the top edge
      if (top < 16) {
        top = 16;
      }
      
      setDropdownPos({
        top,
        left,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bellRef.current &&
        !bellRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count/', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch {}
    };
    const handler = () => fetchUnread();
    window.addEventListener('refreshNotificationCount', handler);
    fetchUnread(); // initial fetch
    return () => window.removeEventListener('refreshNotificationCount', handler);
  }, []);

  return (
    <div className={`relative notif-bell-dropdown ${className}`} style={{zIndex: 2147483647}}>
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 bg-transparent hover:bg-gray-50/80 rounded-xl transition-all duration-200 focus:outline-none group"
        aria-label="Notifications"
      >
        <FontAwesomeIcon 
          icon={faBell} 
          className="w-5 h-5 text-gray-600 group-hover:text-[#003363] transition-colors duration-200" 
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : toPersianNumber(unreadCount)}
          </span>
        )}
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-2xl shadow-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl z-[2147483647] animate-scale-in flex flex-col overflow-hidden max-w-[calc(100vw-32px)]"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: 'min(340px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 32px)',
            direction: 'rtl',
          }}
        >
          <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-r from-[#003363]/5 to-[#D39E46]/5 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-base">نوتیفیکیشن‌ها</span>
            <button
              className="text-xs text-[#003363] font-medium hover:text-[#D39E46] disabled:opacity-50 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50/80 transition-all duration-200"
              onClick={markAllAsRead}
              disabled={markingAll || unreadCount === 0}
              title="علامت‌گذاری همه به عنوان خوانده شده"
            >
              <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              {markingAll ? '...' : 'همه خوانده'}
            </button>
          </div>
          <ul className="max-h-[28rem] overflow-y-auto divide-y divide-gray-100/50">
            {loading ? (
              <li className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#003363] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-500 text-sm">در حال بارگذاری...</span>
                </div>
              </li>
            ) : error ? (
              <li className="p-6 text-center text-red-500 text-sm">{error}</li>
            ) : notifications.length === 0 ? (
              <li className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <FontAwesomeIcon icon={faBell} className="w-8 h-8 text-gray-300" />
                  <span className="text-gray-500 text-sm">نوتیفیکیشن جدیدی ندارید</span>
                </div>
              </li>
            ) : notifications.map((n) => (
              <li
                key={n.id}
                className={`flex flex-col gap-2 px-6 py-4 group transition-all duration-200 hover:bg-gray-50/50 ${
                  !n.read ? 'bg-gradient-to-r from-[#FFF9E5]/50 to-[#FFF9E5]/30' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="font-semibold text-[#003363] text-sm cursor-pointer hover:text-[#D39E46] transition-colors duration-200"
                    onClick={e => {
                      e.stopPropagation();
                      if (n.resolution && n.resolution.public_id) router.push(`/dashboard/resolutions/${n.resolution.public_id}`);
                      if (!n.read) markAsRead(n.id);
                    }}
                  >
                    {n.resolution ? `مصوبه جلسه ${toPersianNumber(n.resolution.meeting?.number ?? '')} بند ${toPersianNumber(n.resolution.clause ?? '')}-${toPersianNumber(n.resolution.subclause ?? '')}` : 'نوتیفیکیشن'}
                  </span>
                  {!n.read && (
                    <button
                      className="text-green-500 hover:text-green-600 p-1.5 rounded-lg hover:bg-green-50/80 transition-all duration-200"
                      onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
                      title="علامت‌گذاری به عنوان خوانده شده"
                    >
                      <FontAwesomeIcon icon={faEnvelopeOpen} className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <span className="text-gray-600 text-xs leading-relaxed">{toPersianNumber(n.message)}</span>
                <span className="text-gray-400 text-xs mt-1 self-end">{toPersianNumber(new Date(n.sent_at).toLocaleDateString('fa-IR', { dateStyle: 'short' }))}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBadge; 