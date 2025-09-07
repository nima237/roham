import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import NotificationBadge from './NotificationBadge';
import { useNotificationModal } from '../providers/NotificationModalProvider';
import { NotificationModal } from './NotificationModal';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout/', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 fixed top-0 right-0 left-0 z-50 h-16 shadow-sm">
      {/* Left section: Menu button and title */}
      <div className="flex items-center gap-4">
        <button
          className="p-2.5 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group"
          onClick={onMenuClick}
          aria-label="باز کردن منو"
        >
          <FontAwesomeIcon 
            icon={faBars} 
            className="text-lg text-gray-600 group-hover:text-[#003363] transition-colors duration-200" 
          />
        </button>
        
        {/* Title with gradient */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-[#003363] to-[#D39E46] rounded-full"></div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">
            {title || 'داشبورد'}
          </h1>
        </div>
      </div>

      {/* Right section: Notifications and user actions */}
      <div className="flex items-center gap-3">
        {/* Notification Badge */}
        <div className="relative">
          <NotificationBadge />
        </div>
        
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl hover:bg-red-50/80 transition-all duration-200 group"
          aria-label="خروج"
        >
          <FontAwesomeIcon 
            icon={faSignOutAlt} 
            className="text-lg text-gray-500 group-hover:text-red-500 transition-colors duration-200" 
          />
        </button>
      </div>
    </header>
  );
};

export default TopBar; 