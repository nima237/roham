'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash, faEnvelope, faDesktop, faMobile, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getApiUrl } from '../utils/api';

interface NotificationSettings {
  email_notifications: boolean;
  browser_notifications: boolean;
  mobile_notifications: boolean;
  resolution_updates: boolean;
  chat_messages: boolean;
  status_changes: boolean;
  deadline_reminders: boolean;
}

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    browser_notifications: true,
    mobile_notifications: false,
    resolution_updates: true,
    chat_messages: true,
    status_changes: true,
    deadline_reminders: true,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(getApiUrl('notifications/settings/'), { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl('notifications/settings/'), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    const newValue = !settings[key];
    updateSettings({ [key]: newValue });
  };

  const requestBrowserNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ browser_notifications: true });
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
        <span className="text-sm">تنظیمات نوتیفیکیشن</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border-2 border-[#D39E46]">
            <div className="bg-gradient-to-r from-[#003363] to-[#D39E46] text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">تنظیمات نوتیفیکیشن</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Notification Channels */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">کانال‌های نوتیفیکیشن</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">نوتیفیکیشن ایمیل</p>
                        <p className="text-sm text-gray-500">دریافت اعلان‌ها از طریق ایمیل</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('email_notifications')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.email_notifications ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faDesktop} className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">نوتیفیکیشن مرورگر</p>
                        <p className="text-sm text-gray-500">دریافت اعلان‌ها در مرورگر</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('browser_notifications')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.browser_notifications ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.browser_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faMobile} className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">نوتیفیکیشن موبایل</p>
                        <p className="text-sm text-gray-500">دریافت اعلان‌ها در موبایل</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('mobile_notifications')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.mobile_notifications ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.mobile_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">انواع نوتیفیکیشن</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">به‌روزرسانی مصوبات</p>
                      <p className="text-sm text-gray-500">اطلاع از تغییرات در مصوبات</p>
                    </div>
                    <button
                      onClick={() => handleToggle('resolution_updates')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.resolution_updates ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.resolution_updates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">پیام‌های چت</p>
                      <p className="text-sm text-gray-500">اطلاع از پیام‌های جدید در چت</p>
                    </div>
                    <button
                      onClick={() => handleToggle('chat_messages')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.chat_messages ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.chat_messages ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">تغییر وضعیت</p>
                      <p className="text-sm text-gray-500">اطلاع از تغییر وضعیت مصوبات</p>
                    </div>
                    <button
                      onClick={() => handleToggle('status_changes')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.status_changes ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.status_changes ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">یادآوری مهلت</p>
                      <p className="text-sm text-gray-500">یادآوری مهلت‌های مصوبات</p>
                    </div>
                    <button
                      onClick={() => handleToggle('deadline_reminders')}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.deadline_reminders ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.deadline_reminders ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationSettings; 