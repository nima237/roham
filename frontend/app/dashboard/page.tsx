'use client';
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getApiUrl } from "@/app/utils/api";
import { 
  faFileAlt, 
  faCheckCircle, 
  faExclamationTriangle, 
  faClock, 
  faUsers, 
  faCalendarDay,
  faChartBar,
  faEye,
  faTimes,
  faChartPie,
  faEdit,
  faFilter,
  faUserTie,
  faUserShield,
  faUserCog
} from "@fortawesome/free-solid-svg-icons";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ProtectedRoute from '../components/ProtectedRoute';

// Dynamically import and register matrix controller/element if available
try {
  // @ts-ignore
  const { MatrixController, MatrixElement } = require('chartjs-chart-matrix');
  ChartJS.register(MatrixController, MatrixElement);
} catch (e) {
  // Ignore if not available (for type errors in dev)
}
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface DashboardStats {
  total_resolutions: number;
  operational_resolutions: number;
  informational_resolutions: number;
  pending_secretary_approval: number;
  pending_ceo_approval: number;
  pending_executor_approval: number;
  completed_resolutions: number;
  in_progress_resolutions: number;
  cancelled_resolutions: number;
  overdue_resolutions: number;
  total_meetings: number;
  status_summary: {
    total: number;
    operational: number;
    informational: number;
    pending_secretary: number;
    pending_ceo: number;
    pending_executor: number;
    completed: number;
    in_progress: number;
    cancelled: number;
    overdue: number;
  };
  my_pending_tasks: number;
  pending_tasks_secretary: number;
  pending_tasks_ceo: number;
  pending_tasks_executor: number;
}

interface RecentResolution {
  id: string;
  public_id: string;
  clause: string;
  subclause: string;
  description: string;
  status: string;
  created_at: string;
  meeting: {
    number: number;
    date: string;
  };
  executor_unit: null | {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    department?: string; // Added department field
    // ...other fields if needed
  };
  type: string;
}

interface UnitStat {
  unit_name: string;
  total_count: number;
  completed_count: number;
  notified_count: number;
  pending_count: number;
  returned_count: number;
  cancelled_count: number;
}

// کامپوننت نمودار دایره‌ای ساده
const SimplePieChart = ({ operational, informational }: { operational: number, informational: number }) => {
  const total = operational + informational;
  if (total === 0) return null;
  
  const operationalPercentage = (operational / total) * 100;
  const informationalPercentage = (informational / total) * 100;
  
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="transparent"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray={`${operationalPercentage} ${100 - operationalPercentage}`}
            strokeDashoffset="0"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="transparent"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray={`${informationalPercentage} ${100 - informationalPercentage}`}
            strokeDashoffset={`-${operationalPercentage}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700">{total}</span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardProtected() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentResolutions, setRecentResolutions] = useState<RecentResolution[]>([]);
  const [unitStats, setUnitStats] = useState<UnitStat[]>([]);
  const [unitNotifiedCount, setUnitNotifiedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [allUsersDuration, setAllUsersDuration] = useState<any>(null);
  const [loadingDuration, setLoadingDuration] = useState(false);
  const [secretaryDuration, setSecretaryDuration] = useState<any>(null);
  const [ceoDuration, setCeoDuration] = useState<any>(null);
  const [executorDuration, setExecutorDuration] = useState<any>(null);
  const [meetingToResolutionDuration, setMeetingToResolutionDuration] = useState<any>(null);
  const [executorUnitsDuration, setExecutorUnitsDuration] = useState<any[]>([]);
  const [executorAcceptanceDuration, setExecutorAcceptanceDuration] = useState<any[]>([]);

  // تابع تبدیل اعداد انگلیسی به فارسی
  const toPersianNumber = (num: string | number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let str = num.toString();
    for (let i = 0; i < englishDigits.length; i++) {
      str = str.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
    }
    return str;
  };

  // تابع ترجمه وضعیت مصوبات
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'notified': 'در حال ابلاغ',
      'completed': 'تکمیل شده',
      'cancelled': 'لغو شده',
      'in_progress': 'در حال اجرا',
      'returned_to_secretary': 'برگشت به دبیر',
      'pending_ceo_approval': 'منتظر تایید مدیرعامل',
      'pending_secretary_approval': 'منتظر تایید دبیر'
    };
    return statusMap[status] || status;
  };

  // تابع تعیین رنگ وضعیت
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'notified': 'text-blue-600 bg-blue-100',
      'completed': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100',
      'in_progress': 'text-orange-600 bg-orange-100',
      'returned_to_secretary': 'text-yellow-600 bg-yellow-100',
      'pending_ceo_approval': 'text-purple-600 bg-purple-100',
      'pending_secretary_approval': 'text-indigo-600 bg-indigo-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  // تابع تعیین نقش کاربر
  const getUserRole = (userData: any) => {
    if (!userData) return 'user';
    if (userData.groups.includes("Secretary")) return 'secretary';
    if (userData.position === "ceo" || userData.profile?.position === "ceo") return 'ceo';
    if (userData.position === "auditor" || userData.profile?.position === "auditor") return 'auditor';
    if (userData.position === "deputy" || userData.profile?.position === "deputy") return 'deputy';
    return 'user';
  };

  // تابع تعیین عنوان داشبورد
  const getDashboardTitle = (role: string) => {
    switch (role) {
      case 'secretary': return 'کارتابل دبیر';
      case 'ceo': return 'کارتابل مدیرعامل';
      case 'auditor': return 'کارتابل ناظر';
      case 'deputy': return 'کارتابل معاون';
      default: return 'کارتابل من';
    }
  };

  // تابع تعیین آیکون نقش
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'secretary': return faUserTie;
      case 'ceo': return faUserShield;
      case 'auditor': return faUserCog;
      case 'deputy': return faUserTie;
      default: return faUsers;
    }
  };

  useEffect(() => {
    // اطلاعات کاربر را فقط با fetch و credentials: 'include' بگیر
    const fetchUser = async () => {
      const res = await fetch(getApiUrl('user-info/'), { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setSelectedRole(getUserRole(userData));
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // همه fetchها فقط با credentials: 'include'
        const statsResponse = await fetch(getApiUrl('stats/dashboard/'), { credentials: 'include' });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log("Stats data received:", statsData);
          console.log("pending_ceo_approval:", statsData.pending_ceo_approval);
          console.log("pending_secretary_approval:", statsData.pending_secretary_approval);
          setStats(statsData);
        }

        // دریافت ۱۰ مصوبه‌ای که اخیراً روی آن‌ها کامنت ثبت شده (یونیک)
        const recentChangedResponse = await fetch(getApiUrl("resolutions/recent-changed/?limit=10"), { credentials: 'include' });

        if (recentChangedResponse.ok) {
          const recentChangedData = await recentChangedResponse.json();
          setRecentResolutions(recentChangedData);
        }

        // دریافت آمار واحدها
        const unitResponse = await fetch(getApiUrl("resolutions/by-unit/"), { credentials: 'include' });

        if (unitResponse.ok) {
          const unitData = await unitResponse.json();
          console.log("Unit stats data received:", unitData);
          setUnitStats(unitData);
        }

        // دریافت آمار مصوبات در حال ابلاغ برای واحد مجری
        const unitNotifiedResponse = await fetch(getApiUrl("resolutions/unit-notified/"), { credentials: 'include' });

        if (unitNotifiedResponse.ok) {
          const unitNotifiedData = await unitNotifiedResponse.json();
          console.log("Unit notified data received:", unitNotifiedData);
          // اگر کاربر واحد مجری است، آمار خودش را ذخیره کنیم
          if (Array.isArray(unitNotifiedData)) {
            // برای ناظر/مدیرعامل - همه واحدها
            setUnitStats(prevStats => {
              const updatedStats = [...prevStats];
              unitNotifiedData.forEach(unit => {
                const existingUnit = updatedStats.find(u => u.unit_name === unit.unit_name);
                if (existingUnit) {
                  existingUnit.notified_count = unit.notified_count;
                }
              });
              return updatedStats;
            });
          } else {
            // برای واحد مجری - فقط خودش
            setUnitNotifiedCount(unitNotifiedData.notified_count || 0);
            setUnitStats(prevStats => {
              const updatedStats = [...prevStats];
              const existingUnit = updatedStats.find(u => u.unit_name === unitNotifiedData.unit_name);
              if (existingUnit) {
                existingUnit.notified_count = unitNotifiedData.notified_count;
              }
              return updatedStats;
            });
          }
        }

        // دریافت میانگین مدت زمان تمام کاربران
        setLoadingDuration(true);
        try {
          const durationResponse = await fetch(getApiUrl('users/all-users-average-duration/'), { credentials: 'include' });

          if (durationResponse.ok) {
            const durationData = await durationResponse.json();
            console.log("Duration data received:", durationData);
            setAllUsersDuration(durationData);
          } else {
            console.error("Error fetching duration data:", durationResponse.status);
          }
        } catch (error) {
          console.error("Error fetching duration data:", error);
        } finally {
          setLoadingDuration(false);
        }

        // دریافت میانگین مدت زمان کارتابل دبیر
        try {
          const secretaryResponse = await fetch(getApiUrl('stats/secretary-average-duration/'), { credentials: 'include' });

          if (secretaryResponse.ok) {
            const secretaryData = await secretaryResponse.json();
            console.log("Secretary duration data received:", secretaryData);
            setSecretaryDuration(secretaryData);
          }
        } catch (error) {
          console.error("Error fetching secretary duration:", error);
        }

        // دریافت میانگین مدت زمان کارتابل مدیرعامل
        try {
          const ceoResponse = await fetch(getApiUrl('stats/ceo-average-duration/'), { credentials: 'include' });

          if (ceoResponse.ok) {
            const ceoData = await ceoResponse.json();
            console.log("CEO duration data received:", ceoData);
            setCeoDuration(ceoData);
          }
        } catch (error) {
          console.error("Error fetching CEO duration:", error);
        }

        // دریافت میانگین مدت زمان کارتابل مجری
        try {
          const executorResponse = await fetch(getApiUrl('stats/executor-average-duration/'), { credentials: 'include' });

          if (executorResponse.ok) {
            const executorData = await executorResponse.json();
            console.log("Executor duration data received:", executorData);
            setExecutorDuration(executorData);
          }
        } catch (error) {
          console.error("Error fetching executor duration:", error);
        }

        // دریافت میانگین زمان جلسه تا ثبت مصوبه
        try {
          fetch(getApiUrl('stats/meeting-to-resolution-average-duration/'), { credentials: 'include' })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
              if (data) setMeetingToResolutionDuration(data);
            });
        } catch (error) {
          console.error("Error fetching meeting to resolution duration:", error);
        }

        // دریافت میانگین مدت زمان اجرای مصوبات برای هر واحد مجری
        try {
          fetch(getApiUrl('stats/executor-units-execution-duration/'), { credentials: 'include' })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
              if (data) setExecutorUnitsDuration(data);
            });
        } catch (error) {
          console.error("Error fetching executor units duration:", error);
        }

        // دریافت میانگین مدت زمان قبول مصوبات توسط مجری (از تایید مدیرعامل تا قبول مجری)
        try {
          fetch(getApiUrl('stats/executor-acceptance-duration/'), { credentials: 'include' })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
              if (data) setExecutorAcceptanceDuration(data);
            });
        } catch (error) {
          console.error("Error fetching executor acceptance duration:", error);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  // Persian month names helper
  const persianMonthNames = [
    '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  return (
    <div className="space-y-6">
      {/* حذف عنوان و توضیح داشبورد */}
      {/* Stats Cards */}
      {stats && (
        <>
          {/* Horizontal Pending Tasks Card */}
          {(
            (selectedRole === 'secretary' && stats.pending_tasks_secretary > 0) ||
            (selectedRole === 'ceo' && stats.pending_tasks_ceo > 0) ||
            (selectedRole === 'deputy' && stats.pending_tasks_executor > 0)
          ) && (
            <div className="w-full">
              <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl shadow-lg px-6 py-4 gap-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl text-white" />
                  </div>
                  <div>
                    <div className="text-lg md:text-xl font-bold text-red-700">
                      {selectedRole === 'secretary' && 'مصوبات در انتظار تایید دبیر'}
                      {selectedRole === 'ceo' && 'مصوبات در انتظار تایید مدیرعامل'}
                      {selectedRole === 'deputy' && 'مصوبات در حال ابلاغ برای واحد من'}
                    </div>
                    <div className="text-2xl md:text-3xl font-extrabold text-red-600 mt-1">
                      {selectedRole === 'secretary' && toPersianNumber(stats?.pending_tasks_secretary ?? 0)}
                      {selectedRole === 'ceo' && toPersianNumber(stats?.pending_tasks_ceo ?? 0)}
                      {selectedRole === 'deputy' && toPersianNumber(stats?.pending_tasks_executor ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                  <a
                    href={
                      selectedRole === 'secretary'
                        ? '/dashboard/resolutions?status=pending_secretary_approval'
                        : selectedRole === 'ceo'
                        ? '/dashboard/resolutions?status=pending_ceo_approval'
                        : '/dashboard/resolutions?status=notified&mine=1'
                    }
                    className="inline-block bg-gradient-to-r from-[#D39E46] to-[#003363] hover:from-[#003363] hover:to-[#D39E46] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 text-base md:text-lg hover:scale-105"
                  >
                    مشاهده مصوبات
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {/* Modern Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* توزیع مصوبات */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">توزیع مصوبات</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faChartPie} className="text-lg text-white" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-center mb-3">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="transparent"
                          stroke="#f3f4f6"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray={`${stats?.operational_resolutions > 0 ? (stats?.operational_resolutions / (stats?.operational_resolutions + stats?.informational_resolutions)) * 100 : 0} ${100 - (stats?.operational_resolutions > 0 ? (stats?.operational_resolutions / (stats?.operational_resolutions + stats?.informational_resolutions)) * 100 : 0)}`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="transparent"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeDasharray={`${stats?.informational_resolutions > 0 ? (stats?.informational_resolutions / (stats?.operational_resolutions + stats?.informational_resolutions)) * 100 : 0} ${100 - (stats?.informational_resolutions > 0 ? (stats?.informational_resolutions / (stats?.operational_resolutions + stats?.informational_resolutions)) * 100 : 0)}`}
                          strokeDashoffset={`-${stats?.operational_resolutions > 0 ? (stats?.operational_resolutions / (stats?.operational_resolutions + stats?.informational_resolutions)) * 100 : 0}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-700">{toPersianNumber((stats?.operational_resolutions ?? 0) + (stats?.informational_resolutions ?? 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2 text-right">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-800">{toPersianNumber(stats?.operational_resolutions ?? 0)}</span>
                    <div className="flex items-center">
                      <span className="text-gray-700 text-sm">عملیاتی</span>
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-800">{toPersianNumber(stats?.informational_resolutions ?? 0)}</span>
                    <div className="flex items-center">
                      <span className="text-gray-700 text-sm">اطلاع‌رسانی</span>
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* کل جلسات */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">تعداد جلسات برگزار شده</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">
                    {toPersianNumber(stats?.total_meetings ?? 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-[#D39E46] to-[#003363] rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendarDay} className="text-lg text-white" />
                </div>
              </div>
            </div>

            {/* تکمیل شده (از دید ناظر) */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">تکمیل شده (از دید ناظر)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {toPersianNumber(stats?.completed_resolutions ?? 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-lg text-white" />
                </div>
              </div>
            </div>

            {/* میانگین زمان تایید مصوبه توسط دبیر */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">میانگین زمان تایید مصوبه توسط دبیر</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="text-lg text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-indigo-600">
                  {secretaryDuration ? 
                    (secretaryDuration.average_duration_minutes ? 
                      `${Math.round(secretaryDuration.average_duration_minutes)} دقیقه` : 
                      secretaryDuration.average_duration) 
                    : '0 دقیقه'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {secretaryDuration ? `${toPersianNumber(secretaryDuration.resolution_count)} مصوبه` : '0 مصوبه'}
                </p>
              </div>
            </div>

            {/* میانگین زمان تایید مصوبه توسط مدیرعامل */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">میانگین زمان تایید مصوبه توسط مدیرعامل</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserShield} className="text-lg text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-600">
                  {ceoDuration ? 
                    (ceoDuration.average_duration_minutes ? 
                      `${Math.round(ceoDuration.average_duration_minutes)} دقیقه` : 
                      ceoDuration.average_duration) 
                    : '0 دقیقه'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {ceoDuration ? `${toPersianNumber(ceoDuration.resolution_count)} مصوبه` : '0 مصوبه'}
                </p>
              </div>
            </div>

            {/* میانگین زمان جلسه تا ثبت مصوبه */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">میانگین زمان جلسه تا ثبت مصوبه</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faClock} className="text-lg text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-600">
                  {meetingToResolutionDuration ? 
                    (() => {
                      // Check if we have minutes data
                      if (meetingToResolutionDuration.average_duration_minutes) {
                        const days = Math.round(meetingToResolutionDuration.average_duration_minutes / 1440);
                        return `${days} روز`;
                      }
                      // Check if we have duration in a different format
                      if (meetingToResolutionDuration.average_duration) {
                        // If it's already in days, use it directly
                        if (typeof meetingToResolutionDuration.average_duration === 'string' && meetingToResolutionDuration.average_duration.includes('روز')) {
                          return meetingToResolutionDuration.average_duration;
                        }
                        // If it's a number, assume it's in minutes and convert to days
                        if (typeof meetingToResolutionDuration.average_duration === 'number') {
                          const days = Math.round(meetingToResolutionDuration.average_duration / 1440);
                          return `${days} روز`;
                        }
                        // If it's a string with minutes, extract and convert
                        if (typeof meetingToResolutionDuration.average_duration === 'string' && meetingToResolutionDuration.average_duration.includes('دقیقه')) {
                          const minutes = parseInt(meetingToResolutionDuration.average_duration.match(/\d+/)?.[0] || '0');
                          const days = Math.round(minutes / 1440);
                          return `${days} روز`;
                        }
                        return meetingToResolutionDuration.average_duration;
                      }
                      return '0 روز';
                    })()
                    : '0 روز'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {meetingToResolutionDuration ? `${toPersianNumber(meetingToResolutionDuration.resolution_count)} مصوبه` : '0 مصوبه'}
                </p>
              </div>
            </div>


          </div>

          {/* نمودار وضعیت مصوبات */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">وضعیت مصوبات</h3>
                <p className="text-sm text-gray-500">توزیع مصوبات بر اساس وضعیت</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faChartPie} className="text-lg text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 flex justify-center">
                <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72">
                  <Doughnut
                    data={{
                      labels: [
                        'تکمیل شده',
                        'در حال ابلاغ',
                        'در حال اجرا',
                        'در انتظار تایید دبیر',
                        'در انتظار تایید مدیرعامل',
                        'لغو شده'
                      ],
                      datasets: [
                        {
                          data: [
                            stats.completed_resolutions,
                            stats.pending_executor_approval,
                            stats.in_progress_resolutions || 0,
                            stats.pending_secretary_approval || 0,
                            stats.pending_ceo_approval || 0,
                            stats.cancelled_resolutions
                          ],
                          backgroundColor: [
                            '#10b981', // سبز - تکمیل شده
                            '#3b82f6', // آبی - در حال ابلاغ
                            '#f59e0b', // نارنجی - در حال اجرا
                            '#8b5cf6', // بنفش - انتظار تایید دبیر
                            '#ec4899', // صورتی - انتظار تایید مدیرعامل
                            '#ef4444'  // قرمز - لغو شده
                          ],
                          borderWidth: 3,
                          borderColor: '#ffffff',
                          hoverBorderWidth: 4,
                          hoverBorderColor: '#f8fafc'
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            padding: 12,
                            font: {
                              size: 11,
                              family: 'Vazirmatn, sans-serif',
                              weight: '500'
                            },
                            generateLabels: function(chart: any) {
                              const data = chart.data;
                              if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label: string, i: number) => {
                                  const dataset = data.datasets[0];
                                  const value = dataset.data[i];
                                  const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                  
                                  return {
                                    text: `${label} (${toPersianNumber(value)} - ${toPersianNumber(percentage)}%)`,
                                    fillStyle: dataset.backgroundColor[i],
                                    strokeStyle: dataset.backgroundColor[i],
                                    lineWidth: 0,
                                    pointStyle: 'circle',
                                    hidden: false,
                                    index: i
                                  };
                                });
                              }
                              return [];
                            }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            label: function(context: any) {
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
                              return `${context.label}: ${toPersianNumber(context.parsed)} (${toPersianNumber(percentage)}%)`;
                            }
                          },
                          titleFont: {
                            family: 'Vazirmatn, sans-serif',
                            size: 14,
                            weight: 'bold'
                          },
                          bodyFont: {
                            family: 'Vazirmatn, sans-serif',
                            size: 12
                          }
                        }
                      },
                      animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1000,
                        easing: 'easeInOutQuart'
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* نمودار مصوبات به تفکیک واحد مجری */}
              <div className="lg:col-span-2">
                <h4 className="text-lg font-bold text-gray-700 mb-4 text-center">مصوبات به تفکیک واحد مجری</h4>
                <div className="h-48">
                  <Bar
                    data={{
                      labels: unitStats.map(unit => unit.unit_name),
                      datasets: [
                        {
                          label: 'تکمیل شده',
                          data: unitStats.map(unit => unit.completed_count),
                          backgroundColor: 'rgba(16, 185, 129, 0.8)',
                          borderColor: '#10b981',
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                          hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
                          hoverBorderColor: '#059669',
                          hoverBorderWidth: 3
                        },
                        {
                          label: 'در حال ابلاغ',
                          data: unitStats.map(unit => unit.notified_count),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                          borderColor: '#3b82f6',
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                          hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                          hoverBorderColor: '#2563eb',
                          hoverBorderWidth: 3
                        },
                        {
                          label: 'در حال اجرا',
                          data: unitStats.map(unit => unit.pending_count),
                          backgroundColor: 'rgba(245, 158, 11, 0.8)',
                          borderColor: '#f59e0b',
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                          hoverBackgroundColor: 'rgba(245, 158, 11, 1)',
                          hoverBorderColor: '#d97706',
                          hoverBorderWidth: 3
                        },
                        {
                          label: 'منتفی',
                          data: unitStats.map(unit => unit.cancelled_count),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          borderColor: '#ef4444',
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                          hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
                          hoverBorderColor: '#dc2626',
                          hoverBorderWidth: 3
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                              family: 'Vazirmatn, sans-serif',
                              size: 12,
                              weight: '500'
                            },
                            generateLabels: function(chart: any) {
                              const datasets = chart.data.datasets;
                              return datasets.map((dataset: any, i: number) => ({
                                text: dataset.label,
                                fillStyle: dataset.backgroundColor,
                                strokeStyle: dataset.borderColor,
                                lineWidth: 0,
                                pointStyle: 'circle',
                                hidden: false,
                                index: i
                              }));
                            }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            label: function(context: any) {
                              return `${context.dataset.label}: ${toPersianNumber(context.parsed.y)}`;
                            }
                          },
                          titleFont: {
                            family: 'Vazirmatn, sans-serif',
                            size: 14,
                            weight: 'bold'
                          },
                          bodyFont: {
                            family: 'Vazirmatn, sans-serif',
                            size: 12
                          }
                        }
                      },
                      scales: {
                        x: {
                          stacked: true,
                          grid: { 
                            display: false,
                            drawBorder: false
                          },
                          ticks: { 
                            font: { 
                              family: 'Vazirmatn, sans-serif', 
                              size: 11,
                              weight: '500'
                            },
                            color: '#6b7280'
                          },
                          border: {
                            display: false
                          }
                        },
                        y: {
                          stacked: true,
                          grid: { 
                            display: false,
                            drawBorder: false
                          },
                          ticks: { 
                            font: { 
                              family: 'Vazirmatn, sans-serif', 
                              size: 11,
                              weight: '500'
                            },
                            color: '#6b7280',
                            callback: function(value: any) {
                              return toPersianNumber(value.toString());
                            }
                          },
                          border: {
                            display: false
                          }
                        }
                      },
                      animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* بارچارت میانگین مدت زمان اجرای مصوبات توسط واحد مجری */}
      {executorUnitsDuration.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">میانگین مدت زمان اجرای مصوبات (روز) به تفکیک واحد مجری</h3>
            <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faChartBar} className="text-lg text-white" />
            </div>
          </div>
          <div className="h-72">
            <Bar
              type="bar"
              data={{
                labels: executorUnitsDuration.map(unit => unit.unit_name),
                datasets: [
                  {
                    label: 'میانگین مدت زمان اجرا (روز)',
                    data: executorUnitsDuration.map(unit => (unit.avg_execution_duration_minutes / 1440).toFixed(1)),
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(245, 158, 11, 1)',
                    hoverBorderColor: '#d97706',
                    hoverBorderWidth: 3
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 15,
                      font: {
                        size: 12,
                        family: 'Vazirmatn, sans-serif',
                        weight: '500'
                      },
                      generateLabels: function(chart: any) {
                        const datasets = chart.data.datasets;
                        return datasets.map((dataset: any, i: number) => ({
                          text: dataset.label,
                          fillStyle: dataset.backgroundColor,
                          strokeStyle: dataset.borderColor,
                          lineWidth: 0,
                          pointStyle: 'circle',
                          hidden: false,
                          index: i
                        }));
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                      label: function(context: any) {
                        return `${context.dataset.label}: ${toPersianNumber(context.parsed.y)}`;
                      }
                    },
                    titleFont: {
                      family: 'Vazirmatn, sans-serif',
                      size: 14,
                      weight: 'bold'
                    },
                    bodyFont: {
                      family: 'Vazirmatn, sans-serif',
                      size: 12
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 11,
                        weight: '500'
                      },
                      color: '#6b7280'
                    },
                    grid: {
                      display: false,
                      drawBorder: false
                    },
                    border: {
                      display: false
                    }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value: any) {
                        return toPersianNumber(value.toString());
                      },
                      font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 11,
                        weight: '500'
                      },
                      color: '#6b7280'
                    },
                    grid: {
                      display: false,
                      drawBorder: false
                    },
                    border: {
                      display: false
                    }
                  }
                },
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>
        </div>
      )}

      {/* بارچارت میانگین مدت زمان قبول مصوبات توسط مجری */}
      {executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">میانگین مدت زمان قبول مصوبات (از تایید مدیرعامل تا قبول مجری) به تفکیک واحد مجری</h3>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faUserTie} className="text-lg text-white" />
            </div>
          </div>
          <div className="h-72">
            <Bar
              type="bar"
                              data={{
                  labels: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => unit.unit_name),
                  datasets: [
                    {
                      label: 'میانگین مدت زمان قبول (روز)',
                      data: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => {
                        return (unit.avg_acceptance_duration_minutes / 1440).toFixed(1);
                      }),
                      backgroundColor: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => 
                        'rgba(59, 130, 246, 0.8)'
                      ),
                      borderColor: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => 
                        '#3b82f6'
                      ),
                      borderWidth: 2,
                      borderRadius: 8,
                      borderSkipped: false,
                      hoverBackgroundColor: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => 
                        'rgba(59, 130, 246, 1)'
                      ),
                      hoverBorderColor: executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0).map((unit: any) => 
                        '#2563eb'
                      ),
                      hoverBorderWidth: 3
                    }
                  ]
                }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 15,
                      font: {
                        size: 12,
                        family: 'Vazirmatn, sans-serif',
                        weight: '500'
                      },
                      generateLabels: function(chart: any) {
                        const datasets = chart.data.datasets;
                        return datasets.map((dataset: any, i: number) => ({
                          text: dataset.label,
                          fillStyle: dataset.backgroundColor,
                          strokeStyle: dataset.borderColor,
                          lineWidth: 0,
                          pointStyle: 'circle',
                          hidden: false,
                          index: i
                        }));
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                      label: function(context: any) {
                        const unitData = executorAcceptanceDuration.filter((unit: any) => unit.resolution_count > 0)[context.dataIndex];
                        const avgDurationDays = (unitData.avg_acceptance_duration_minutes / 1440).toFixed(1);
                        return [
                          `${context.dataset.label}: ${toPersianNumber(avgDurationDays)} روز`,
                          `مصوبات قبول شده: ${toPersianNumber(unitData.resolution_count)}`,
                          `کل مصوبات اختصاص یافته: ${toPersianNumber(unitData.total_assigned_resolutions)}`
                        ];
                      }
                    },
                    titleFont: {
                      family: 'Vazirmatn, sans-serif',
                      size: 14,
                      weight: 'bold'
                    },
                    bodyFont: {
                      family: 'Vazirmatn, sans-serif',
                      size: 12
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 11,
                        weight: '500'
                      },
                      color: '#6b7280'
                    },
                    grid: {
                      display: false,
                      drawBorder: false
                    },
                    border: {
                      display: false
                    }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value: any) {
                        return toPersianNumber(value.toString());
                      },
                      font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 11,
                        weight: '500'
                      },
                      color: '#6b7280'
                    },
                    grid: {
                      display: false,
                      drawBorder: false
                    },
                    border: {
                      display: false
                    }
                  }
                },
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Recent Resolutions */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">مصوبات اخیر</h3>
          <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
            <FontAwesomeIcon icon={faEye} className="text-lg text-white" />
          </div>
        </div>
        
        {recentResolutions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">مصوبه</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">توضیحات</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">واحد مجری</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">وضعیت</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {recentResolutions.map((resolution) => (
                  <tr
                    key={resolution.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors duration-200"
                    onClick={() => window.location.href = `/dashboard/resolutions/${resolution.public_id}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#003363] underline">
                        {toPersianNumber(resolution.meeting.number)}-{toPersianNumber(resolution.clause)}-{toPersianNumber(resolution.subclause)}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate text-gray-700">
                        {resolution.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {resolution.type === 'informational'
                        ? '-'
                        : (resolution.executor_unit && (resolution.executor_unit.department || resolution.executor_unit.username)
                            ? (resolution.executor_unit.department || resolution.executor_unit.username)
                            : 'خطا در داده')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(resolution.status)}`}>
                        {getStatusText(resolution.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {toPersianNumber(new Date(resolution.created_at).toLocaleDateString('fa-IR'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="flex flex-col items-center gap-3">
              <FontAwesomeIcon icon={faFileAlt} className="w-8 h-8 text-gray-300" />
              <span className="text-sm">مصوبه‌ای یافت نشد</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 