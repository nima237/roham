'use client';
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "react-select";
import { getApiUrl } from "@/app/utils/api";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import * as XLSX from 'xlsx';
import Pagination from "@/app/components/Pagination";
import ProtectedRoute from '../../components/ProtectedRoute';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faFileAlt, faDownload, faEye, faFilter, faChartLine, faCalendarAlt, faUser, faClock, faTimes } from "@fortawesome/free-solid-svg-icons";

interface Resolution {
  id: string;
  public_id: string;
  meeting: {
    id: string;
    number: number;
    held_at: string;
  };
  clause: string;
  subclause: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  deadline: string;
  executor_unit: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  } | null;
  executor_name: string | null;
  coworkers_names: string[];
  last_progress_update: string | null;
}

interface Meeting {
  id: string;
  number: number;
  held_at: string;
}

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

function ResolutionsPage() {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterExecutor, setFilterExecutor] = useState<string | null>(null);
  const [filterMeeting, setFilterMeeting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const router = useRouter();
  const searchParams = useSearchParams();

  const statusOptions = [
    { value: "notified", label: "در حال ابلاغ" },
    { value: "in_progress", label: "در حال اجرا" },
    { value: "completed", label: "تکمیل شده" },
    { value: "cancelled", label: "منتفی" },
    { value: "pending_ceo_approval", label: "منتظر تایید مدیرعامل" },
    { value: "pending_secretary_approval", label: "منتظر تایید دبیر" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch resolutions
        const resolutionsResponse = await fetch(getApiUrl("resolutions/secretary/"), {
          credentials: 'include'
        });

        if (!resolutionsResponse.ok) {
          throw new Error("Failed to fetch resolutions");
        }

        const resolutionsData = await resolutionsResponse.json();
        

        
        setResolutions(resolutionsData);

        // Fetch meetings
        const meetingsResponse = await fetch(getApiUrl("meetings/"), {
          credentials: 'include'
        });

        if (!meetingsResponse.ok) {
          throw new Error("Failed to fetch meetings");
        }

        const meetingsData = await meetingsResponse.json();
        setMeetings(meetingsData);

        // Check for meeting query parameter
        const meetingParam = searchParams.get('meeting');
        if (meetingParam) {
          setFilterMeeting(meetingParam);
        }

        // Check for status query parameter
        const statusParam = searchParams.get('status');
        if (statusParam) {
          setFilterStatus(statusParam);
        }

        // بررسی پارامتر resolution از URL و ریدایرکت به صفحه جزئیات
        const resolutionId = searchParams.get('resolution');
        if (resolutionId) {
          router.push(`/dashboard/resolutions/${resolutionId}`);
        }

      } catch (err) {
        setError("خطا در دریافت اطلاعات");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, searchParams]);

  useEffect(() => {
    // دریافت اطلاعات کاربر از localStorage
    const fetchUserInfo = async () => {
      try {
        const userResponse = await fetch(getApiUrl('user-info/'), {
          credentials: 'include'
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user info");
        }

        const userData = await userResponse.json();
        setUserInfo(userData);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    fetchUserInfo();
  }, []);

  const typeOptions = [
    { value: "operational", label: "عملیاتی" },
    { value: "informational", label: "اطلاع‌رسانی" }
  ];

  // گزینه‌های جلسات
  const meetingOptions = meetings.map(meeting => ({
    value: meeting.number.toString(),
    label: `جلسه ${toPersianNumber(meeting.number)} - ${toPersianNumber(new Date(meeting.held_at).toLocaleDateString('fa-IR'))}`
  }));

  // گزینه‌های واحد مجری (یکتا)
  const executorOptions = Array.from(
    new Map(
      resolutions
        .filter(r => r.executor_unit)
        .map(r => {
          const executorName = r.executor_unit?.department || r.executor_unit?.username || r.executor_name || 'نامشخص';
          return [
            executorName, 
            {
              value: executorName,
              label: executorName
            }
          ];
        })
    ).values()
  );

  // تشخیص نقش دبیر، ناظر یا مدیرعامل
  const isSecretary = userInfo?.position === "secretary" || userInfo?.profile?.position === "secretary";
  const isAuditor = userInfo?.position === "auditor" || userInfo?.profile?.position === "auditor";
  const isCEO = userInfo?.position === "ceo" || userInfo?.profile?.position === "ceo";

  const showAll = isSecretary || isAuditor || isCEO;

  const filteredResolutions = resolutions.filter(resolution => {
    const matchesStatus = !filterStatus || resolution.status === filterStatus;
    const matchesType = !filterType || resolution.type === filterType;
    const matchesExecutor = !filterExecutor || 
      (resolution.executor_unit?.department || resolution.executor_unit?.username || resolution.executor_name) === filterExecutor;
    const matchesMeeting = !filterMeeting || resolution.meeting.number.toString() === filterMeeting;
    const matchesSearch = !searchTerm || 
      resolution.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${resolution.clause}-${resolution.subclause}`.includes(searchTerm);

    return matchesStatus && matchesType && matchesExecutor && matchesMeeting && matchesSearch;
  }).sort((a, b) => {
    // اول براساس شماره جلسه مرتب کن (بزرگتر بالا)
    const meetingDiff = b.meeting.number - a.meeting.number;
    if (meetingDiff !== 0) {
      return meetingDiff;
    }
    // اگر شماره جلسه یکسان بود، براساس بند مرتب کن (بزرگتر بالا)
    const aClause = parseInt(a.clause);
    const bClause = parseInt(b.clause);
    const clauseDiff = bClause - aClause;
    if (clauseDiff !== 0) {
      return clauseDiff;
    }
    // اگر بند یکسان بود، براساس زیربند مرتب کن (بزرگتر بالا)
    const aSubclause = parseInt(a.subclause);
    const bSubclause = parseInt(b.subclause);
    return bSubclause - aSubclause;
  });

  // Pagination logic
  const totalItems = filteredResolutions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResolutions = filteredResolutions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, filterExecutor, filterMeeting, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const clearAllFilters = () => {
    setFilterStatus(null);
    setFilterType(null);
    setFilterExecutor(null);
    setFilterMeeting(null);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "notified":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending_ceo_approval":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending_secretary_approval":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "operational" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-indigo-100 text-indigo-800 border-indigo-200";
  };

  // تابع خروجی اکسل
  const exportToExcel = () => {
    // آماده‌سازی داده‌ها برای اکسل
    const excelData = filteredResolutions.map((resolution, index) => ({
      'ردیف': toPersianNumber(index + 1),
      'شماره جلسه': toPersianNumber(resolution.meeting.number),
      'تاریخ جلسه': toPersianNumber(new Date(resolution.meeting.held_at).toLocaleDateString('fa-IR')),
      'بند': toPersianNumber(`${resolution.clause}-${resolution.subclause}`),
      'شرح مصوبه': resolution.description,
      'نوع مصوبه': resolution.type === "operational" ? "عملیاتی" : "اطلاع‌رسانی",
      'وضعیت': statusOptions.find(opt => opt.value === resolution.status)?.label || resolution.status,
      'پیشرفت': toPersianNumber(resolution.progress) + '٪',
      'واحد مجری': resolution.executor_unit?.department || resolution.executor_unit?.username || resolution.executor_name || '-',
      'مهلت انجام': resolution.deadline 
        ? toPersianNumber(new Date(resolution.deadline).toLocaleDateString('fa-IR'))
        : '-',
      'آخرین به‌روزرسانی': resolution.last_progress_update 
        ? toPersianNumber(new Date(resolution.last_progress_update).toLocaleDateString('fa-IR'))
        : '-'
    }));

    // ایجاد workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    
    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 8 },   // ردیف
      { wch: 12 },  // شماره جلسه
      { wch: 15 },  // تاریخ جلسه
      { wch: 10 },  // بند
      { wch: 50 },  // شرح مصوبه
      { wch: 15 },  // نوع مصوبه
      { wch: 15 },  // وضعیت
      { wch: 10 },  // پیشرفت
      { wch: 20 },  // واحد مجری
      { wch: 15 },  // مهلت انجام
      { wch: 18 }   // آخرین به‌روزرسانی
    ];
    worksheet['!cols'] = columnWidths;

    // اضافه کردن worksheet به workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مصوبات');

    // تولید نام فایل با تاریخ فارسی
    const currentDate = new Date().toLocaleDateString('fa-IR');
    const fileName = `مصوبات_${toPersianNumber(currentDate)}.xlsx`;

    // دانلود فایل
    XLSX.writeFile(workbook, fileName);
  };

  if (userInfo === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#003363] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-semibold text-[#003363]">در حال بارگذاری اطلاعات کاربر...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#003363] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-semibold text-[#003363]">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">
              مصوبات
            </h2>
            <p className="text-sm text-gray-600 mt-2">مدیریت و پیگیری مصوبات</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
            <FontAwesomeIcon icon={faFileAlt} className="text-lg text-white" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 relative z-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <div className="relative lg:col-span-2">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              placeholder="جستجو در مصوبات..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-800 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Select
              options={statusOptions}
              placeholder="وضعیت"
              isClearable
              value={statusOptions.find(option => option.value === filterStatus) || null}
              onChange={(option) => setFilterStatus(option?.value || null)}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
              menuShouldBlockScroll={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderWidth: '1px',
                  borderRadius: '12px',
                  minHeight: '48px',
                  direction: 'rtl',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    borderColor: '#003363'
                  },
                  '&:focus-within': {
                    borderColor: '#003363',
                    boxShadow: '0 0 0 2px rgba(0, 51, 99, 0.2)'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  direction: 'rtl',
                  textAlign: 'right',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 2147483647
                }),
                option: (base, state) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                  backgroundColor: state.isSelected ? '#D39E46' : state.isFocused ? 'rgba(211, 158, 70, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: state.isSelected ? '#D39E46' : 'rgba(211, 158, 70, 0.1)'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#9ca3af',
                })
              }}
            />
          </div>
          <div>
            <Select
              options={typeOptions}
              placeholder="نوع مصوبه"
              isClearable
              onChange={(option) => setFilterType(option?.value || null)}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
              menuShouldBlockScroll={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderWidth: '1px',
                  borderRadius: '12px',
                  minHeight: '48px',
                  direction: 'rtl',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    borderColor: '#003363'
                  },
                  '&:focus-within': {
                    borderColor: '#003363',
                    boxShadow: '0 0 0 2px rgba(0, 51, 99, 0.2)'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  direction: 'rtl',
                  textAlign: 'right',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 2147483647
                }),
                option: (base, state) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                  backgroundColor: state.isSelected ? '#D39E46' : state.isFocused ? 'rgba(211, 158, 70, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: state.isSelected ? '#D39E46' : 'rgba(211, 158, 70, 0.1)'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#9ca3af',
                })
              }}
            />
          </div>
          <div>
            <Select
              options={executorOptions}
              placeholder="واحد مجری"
              isClearable
              onChange={(option) => setFilterExecutor(option?.value || null)}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
              menuShouldBlockScroll={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderWidth: '1px',
                  borderRadius: '12px',
                  minHeight: '48px',
                  direction: 'rtl',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    borderColor: '#003363'
                  },
                  '&:focus-within': {
                    borderColor: '#003363',
                    boxShadow: '0 0 0 2px rgba(0, 51, 99, 0.2)'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  direction: 'rtl',
                  textAlign: 'right',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 2147483647
                }),
                option: (base, state) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                  backgroundColor: state.isSelected ? '#D39E46' : state.isFocused ? 'rgba(211, 158, 70, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: state.isSelected ? '#D39E46' : 'rgba(211, 158, 70, 0.1)'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#9ca3af',
                })
              }}
            />
          </div>
          <div>
            <Select
              options={meetingOptions}
              placeholder="جلسه"
              isClearable
              value={meetingOptions.find(option => option.value === filterMeeting) || null}
              onChange={(option) => setFilterMeeting(option?.value || null)}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
              menuShouldBlockScroll={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderWidth: '1px',
                  borderRadius: '12px',
                  minHeight: '48px',
                  direction: 'rtl',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    borderColor: '#003363'
                  },
                  '&:focus-within': {
                    borderColor: '#003363',
                    boxShadow: '0 0 0 2px rgba(0, 51, 99, 0.2)'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  direction: 'rtl',
                  textAlign: 'right',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 2147483647
                }),
                option: (base, state) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                  backgroundColor: state.isSelected ? '#D39E46' : state.isFocused ? 'rgba(211, 158, 70, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: state.isSelected ? '#D39E46' : 'rgba(211, 158, 70, 0.1)'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#003363',
                  fontWeight: '500',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#9ca3af',
                })
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAllFilters}
              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <FontAwesomeIcon icon={faTimes} className="text-sm" />
              حذف فیلترها
            </button>
            <button
              onClick={exportToExcel}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <FontAwesomeIcon icon={faDownload} className="text-sm" />
              خروجی اکسل
            </button>
          </div>
        </div>
      </div>

      {/* Resolutions Table Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden relative z-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    شماره جلسه
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    بند
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700 w-1/4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    شرح مصوبه
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    نوع
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    وضعیت
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    پیشرفت
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    واحد مجری
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    مهلت
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    آخرین به‌روزرسانی
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    عملیات
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedResolutions.map((resolution, index) => (
                <tr key={resolution.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200">
                  <td className="p-4 text-gray-900 font-semibold text-sm">{toPersianNumber(resolution.meeting.number)}</td>
                  <td className="p-4 text-gray-900 font-medium text-sm">{toPersianNumber(`${resolution.clause}-${resolution.subclause}`)}</td>
                  <td className="p-4 text-gray-800 text-sm leading-relaxed max-w-xs">
                    <div className="break-words line-clamp-2 text-justify">
                      {resolution.description}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getTypeColor(resolution.type)}`}>
                      {resolution.type === "operational" ? "عملیاتی" : "اطلاع‌رسانی"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(resolution.status)}`}>
                      {statusOptions.find(opt => opt.value === resolution.status)?.label || resolution.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-gradient-to-r from-[#D39E46] to-[#003363] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${resolution.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{toPersianNumber(resolution.progress)}٪</span>
                  </td>
                  <td className="p-4 text-gray-900 font-medium text-sm">
                    {resolution.executor_unit?.department || resolution.executor_unit?.username || resolution.executor_name || '-'}
                  </td>
                  <td className="p-4 text-gray-900 font-medium text-sm">
                    {resolution.deadline ? toPersianNumber(new Date(resolution.deadline).toLocaleDateString('fa-IR')) : '-'}
                  </td>
                  <td className="p-4 text-gray-900 font-medium text-sm">
                    {resolution.last_progress_update ? toPersianNumber(new Date(resolution.last_progress_update).toLocaleDateString('fa-IR')) : '-'}
                  </td>
                  <td className="p-4">
                    <a
                      href={`/dashboard/resolutions/${resolution.public_id}`}
                      className="bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faEye} className="text-xs" />
                      جزئیات
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredResolutions.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faFileAlt} className="text-gray-400 text-xl" />
            </div>
            <p className="text-gray-500 text-sm">هیچ مصوبه‌ای یافت نشد</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}
    </div>
  );
}

export default function ResolutionsPageProtected() {
  return (
    <ProtectedRoute>
      <ResolutionsPage />
    </ProtectedRoute>
  );
} 