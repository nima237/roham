'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getApiUrl } from '../utils/api';

export const NotificationTest: React.FC = () => {
  const [message, setMessage] = useState('این یک نوتیفیکیشن تست است');
  const [type, setType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendTestNotification = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(getApiUrl('notifications/test/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          type
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult('✅ ' + data.message);
      } else {
        setResult('❌ ' + (data.error || 'خطا در ارسال نوتیفیکیشن'));
      }
    } catch (error) {
      setResult('❌ خطا در اتصال به سرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#D39E46]">
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-[#D39E46]" />
        <h3 className="text-lg font-bold text-gray-800">تست نوتیفیکیشن لحظه‌ای</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            پیام نوتیفیکیشن:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D39E46] focus:border-transparent"
            rows={3}
            placeholder="پیام نوتیفیکیشن را وارد کنید..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع نوتیفیکیشن:
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D39E46] focus:border-transparent"
          >
            <option value="info">اطلاع‌رسانی</option>
            <option value="success">موفقیت</option>
            <option value="warning">هشدار</option>
            <option value="error">خطا</option>
          </select>
        </div>
        
        <button
          onClick={sendTestNotification}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#003363] to-[#D39E46] text-white py-3 px-6 rounded-lg font-medium hover:from-[#D39E46] hover:to-[#003363] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'در حال ارسال...' : 'ارسال نوتیفیکیشن تست'}
        </button>
        
        {result && (
          <div className={`p-3 rounded-lg text-sm ${
            result.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationTest; 