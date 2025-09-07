import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(getApiUrl('user-info/'), { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-bold text-[#003363]">در حال بررسی احراز هویت...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 