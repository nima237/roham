'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCalendarPlus, faFileAlt, faListAlt, faCalendarDay, faSignOutAlt, faTasks, faTimes, faTachometerAlt, faCog, faUsers, faBars } from "@fortawesome/free-solid-svg-icons";
import { NotificationContextProvider } from '../providers/NotificationContext';
import { getApiUrl } from "../utils/api";
import { NotificationModal } from '../components/NotificationModal';
import { useNotificationModal } from '../providers/NotificationModalProvider';
import { NotificationModalProvider } from '../providers/NotificationModalProvider';
import TopBar from '../components/TopBar';

const secretarySidebarItems = [
  { href: "/dashboard", label: "داشبورد", icon: faTachometerAlt },
  { href: "/dashboard/meetings/add", label: "ثبت جلسه", icon: faCalendarPlus },
  { href: "/dashboard/meetings", label: "مشاهده جلسات", icon: faCalendarDay },
  { href: "/dashboard/resolutions/add", label: "ثبت مصوبه", icon: faFileAlt },
  { href: "/dashboard/resolutions", label: "مشاهده مصوبات", icon: faListAlt },
  { href: "/dashboard/settings", label: "تنظیمات", icon: faCog },
];

const auditorSidebarItems = [
  { href: "/dashboard", label: "داشبورد", icon: faTachometerAlt },
  { href: "/dashboard/meetings", label: "مشاهده جلسات", icon: faCalendarDay },
  { href: "/dashboard/resolutions", label: "مشاهده مصوبات", icon: faListAlt },
  { href: "/dashboard/settings", label: "تنظیمات", icon: faCog },
];

const ceoSidebarItems = [
  { href: "/dashboard", label: "داشبورد", icon: faTachometerAlt },
  { href: "/dashboard/meetings", label: "مشاهده جلسات", icon: faCalendarDay },
  { href: "/dashboard/resolutions", label: "مشاهده مصوبات", icon: faListAlt },
  { href: "/dashboard/settings", label: "تنظیمات", icon: faCog },
];

const employeeSidebarItems = [
  { href: "/dashboard", label: "داشبورد", icon: faTachometerAlt },
  { href: "/dashboard/meetings/add", label: "ثبت جلسه", icon: faCalendarPlus },
  { href: "/dashboard/meetings", label: "مشاهده جلسات", icon: faCalendarDay },
  { href: "/dashboard/resolutions/add", label: "ثبت مصوبه", icon: faFileAlt },
  { href: "/dashboard/resolutions", label: "مشاهده مصوبات", icon: faListAlt },
  { href: "/dashboard/settings", label: "تنظیمات", icon: faCog },
];

const userSidebarItems = [
  { href: "/dashboard", label: "داشبورد", icon: faTachometerAlt },
  { href: "/dashboard/workbench", label: "کارتابل من", icon: faTasks },
  { href: "/dashboard/settings", label: "تنظیمات", icon: faCog },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isModalOpen } = useNotificationModal();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/user-info/', { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/logout/', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  const toPersianNumber = (num: string | number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let str = num.toString();
    for (let i = 0; i < englishDigits.length; i++) {
      str = str.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
    }
    return str;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#003363] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-[#003363]">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  const isSecretary = user.groups.includes("Secretary");
  const isAuditor = user.position === "auditor" || user.profile?.position === "auditor";
  const isCEO = user.position === "ceo" || user.profile?.position === "ceo";
  const isEmployee = user.position === "employee" || user.profile?.position === "employee";

  let sidebarItems;
  let dashboardTitle;
  
  if (isSecretary) {
    sidebarItems = secretarySidebarItems;
    dashboardTitle = "کارتابل دبیر";
  } else if (isCEO) {
    sidebarItems = ceoSidebarItems;
    dashboardTitle = "کارتابل مدیرعامل";
  } else if (isAuditor) {
    sidebarItems = auditorSidebarItems;
    dashboardTitle = "کارتابل ناظر";
  } else if (isEmployee) {
    sidebarItems = employeeSidebarItems;
    dashboardTitle = "کارتابل کارشناس دبیرخانه";
  } else {
    sidebarItems = userSidebarItems;
    dashboardTitle = "کارتابل من";
  }

  return (
    <NotificationModalProvider>
      <NotificationContextProvider>
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden" dir="rtl">
          {/* Top Bar */}
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} title={dashboardTitle} />

          {/* Modern Sidebar */}
          <aside
            className={`
              fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] 
              bg-white/90 backdrop-blur-xl border-l border-gray-200/50
              transition-all duration-300 ease-out
              ${sidebarOpen ? 'w-[280px]' : 'w-0 md:w-20'}
              flex flex-col
              shadow-xl
              overflow-hidden
            `}
          >
            {/* Sidebar Header - User Info */}
            {sidebarOpen && (
              <div className="p-6 border-b border-gray-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {user.profile?.department || user.username || 'کاربر'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {user.profile?.position_display || 'کاربر سیستم'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              {sidebarItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center gap-4 px-4 py-3 rounded-xl
                    transition-all duration-200 ease-out
                    ${pathname === item.href 
                      ? "bg-gradient-to-r from-[#003363] to-[#D39E46] text-white shadow-lg scale-105" 
                      : "text-gray-600 hover:bg-gray-50/80 hover:text-[#003363] hover:scale-102"
                    }
                    ${!sidebarOpen && 'justify-center px-3 md:px-3'}
                  `}
                  title={item.label}
                >
                  <FontAwesomeIcon 
                    icon={item.icon} 
                    className={`text-lg transition-all duration-200 ${
                      pathname === item.href 
                        ? "text-white" 
                        : "text-gray-500 group-hover:text-[#003363]"
                    }`} 
                  />
                  {sidebarOpen && (
                    <span className="font-medium text-sm whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Sidebar Footer - Additional Info */}
            {sidebarOpen && (
              <div className="p-4 border-t border-gray-100/50">
                <div className="bg-gradient-to-r from-[#003363]/5 to-[#D39E46]/5 rounded-xl p-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {!isSecretary 
                      ? (isAuditor 
                          ? "شما به عنوان ناظر به تمامی جلسات و مصوبات دسترسی دارید"
                          : "در این بخش مصوبات مربوط به شما نمایش داده می‌شود"
                        )
                      : "سیستم مدیریت جلسات و مصوبات"
                    }
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-30 md:hidden bg-black/20 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content - Fixed mobile layout */}
          <main
            className={`flex-1 flex flex-col min-w-0 overflow-hidden pt-16 transition-all duration-300 ${
              sidebarOpen ? 'mr-[280px]' : 'mr-0 md:mr-20'
            }`}
          >
            <div className="flex-1 w-full max-w-none overflow-x-hidden p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </NotificationContextProvider>
    </NotificationModalProvider>
  );
}