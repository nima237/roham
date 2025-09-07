'use client';
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl } from "@/app/utils/api";
import Select from "react-select";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import * as XLSX from 'xlsx';
import Pagination from "@/app/components/Pagination";
import ProtectedRoute from '../../components/ProtectedRoute';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faFileAlt, faDownload, faEye, faFilter, faChartLine, faCalendarAlt, faUser, faClock, faBriefcase, faToggleOn, faToggleOff, faTimes } from "@fortawesome/free-solid-svg-icons";

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
  };
  executor_name: string | null;
  last_progress_update: string | null;
  unread: boolean;
  first_viewed_at: string | null;
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

function WorkbenchPage() {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyMyResolutions, setShowOnlyMyResolutions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [userInfo, setUserInfo] = useState<{
    username: string, 
    groups: string[],
    profile?: {
      department?: string;
      position_display?: string;
      position?: string;
    }
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // دریافت اطلاعات کاربر فقط با fetch و credentials: 'include'
        const userRes = await fetch(getApiUrl('user-info/'), { credentials: 'include' });
        if (userRes.ok) {
          const userObj = await userRes.json();
          setUserInfo(userObj);
        }
        // دریافت مصوبات فقط با credentials: 'include'
        const response = await fetch(getApiUrl('resolutions/workbench/'), { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setResolutions(data);
        }
      } catch (error) {
        setError('خطا در دریافت اطلاعات');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, searchParams]);

  const statusOptions = [
    { value: "notified", label: "در حال ابلاغ" },
    { value: "in_progress", label: "در حال اجرا" },
    { value: "completed", label: "تکمیل شده" },
    { value: "cancelled", label: "منتفی" },
    { value: "pending_ceo_approval", label: "منتظر تایید مدیرعامل" },
    { value: "pending_secretary_approval", label: "منتظر تایید دبیر" }
  ];

  const typeOptions = [
    { value: "operational", label: "عملیاتی" },
    { value: "informational", label: "اطلاع‌رسانی" }
  ];

  const filteredResolutions = resolutions.filter(resolution => {
    const matchesStatus = !filterStatus || resolution.status === filterStatus;
    const matchesType = !filterType || resolution.type === filterType;
    const matchesSearch = !searchTerm || 
      resolution.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${resolution.clause}-${resolution.subclause}`.includes(searchTerm);
    const matchesExecutor = !showOnlyMyResolutions || 
      (resolution.executor_unit && resolution.executor_unit.username === userInfo?.username);

    return matchesStatus && matchesType && matchesSearch && matchesExecutor;
  }).sort((a, b) => {
    // ابتدا بر اساس شماره جلسه (نزولی - از بزرگ به کوچک)
    if (a.meeting.number !== b.meeting.number) {
      return b.meeting.number - a.meeting.number;
    }
    // اگر شماره جلسه یکسان بود، بر اساس بند
    if (a.clause !== b.clause) {
      return parseInt(a.clause) - parseInt(b.clause);
    }
    // اگر بند هم یکسان بود، بر اساس زیربند
    return parseFloat(a.subclause) - parseFloat(b.subclause);
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
  }, [filterStatus, filterType, searchTerm, showOnlyMyResolutions]);

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
    setSearchTerm("");
    setShowOnlyMyResolutions(false);
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
      case "returned_to_secretary":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "pending_ceo_approval":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending_secretary_approval":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "operational" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-indigo-100 text-indigo-800 border-indigo-200";
  };

  // تابع خروجی اکسل
  const exportToExcel = () => {
    const excelData = filteredResolutions.map((resolution, index) => ({
      'ردیف': toPersianNumber(index + 1),
      'شماره جلسه': toPersianNumber(resolution.meeting.number),
      'تاریخ جلسه': toPersianNumber(new Date(resolution.meeting.held_at).toLocaleDateString('fa-IR')),
      'بند': toPersianNumber(`${resolution.clause}-${resolution.subclause}`),
      'شرح مصوبه': resolution.description,
      'نوع مصوبه': resolution.type === "operational" ? "عملیاتی" : "اطلاع‌رسانی",
      'وضعیت': statusOptions.find(opt => opt.value === resolution.status)?.label || resolution.status,
      'واحد مجری': resolution.executor_unit?.department || resolution.executor_unit?.username || resolution.executor_name || '-',
      'پیشرفت': toPersianNumber(resolution.progress) + '٪',
      'آخرین به‌روزرسانی': resolution.last_progress_update 
        ? toPersianNumber(new Date(resolution.last_progress_update).toLocaleDateString('fa-IR'))
        : '-',
      'مهلت انجام': resolution.deadline 
        ? toPersianNumber(new Date(resolution.deadline).toLocaleDateString('fa-IR'))
        : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    
    const columnWidths = [
      { wch: 8 },   // ردیف
      { wch: 12 },  // شماره جلسه
      { wch: 15 },  // تاریخ جلسه
      { wch: 10 },  // بند
      { wch: 45 },  // شرح مصوبه
      { wch: 15 },  // نوع مصوبه
      { wch: 15 },  // وضعیت
      { wch: 10 },  // واحد مجری
      { wch: 10 },  // پیشرفت
      { wch: 18 },  // آخرین به‌روزرسانی
      { wch: 15 }   // مهلت انجام
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'کارتابل من');

    const currentDate = new Date().toLocaleDateString('fa-IR');
    const fileName = `کارتابل_${toPersianNumber(currentDate)}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // محاسبه آمار
  const totalResolutions = filteredResolutions.length;
  const completedResolutions = filteredResolutions.filter(r => r.status === 'completed').length;
  const inProgressResolutions = filteredResolutions.filter(r => r.status === 'in_progress').length;
  const notifiedResolutions = filteredResolutions.filter(r => r.status === 'notified').length;
  const pendingCeoApprovalResolutions = filteredResolutions.filter(r => r.status === 'pending_ceo_approval').length;
  const pendingSecretaryApprovalResolutions = filteredResolutions.filter(r => r.status === 'pending_secretary_approval').length;
  const overdueResolutions = filteredResolutions.filter(r => {
    if (!r.deadline) return false;
    const deadline = new Date(r.deadline);
    const today = new Date();
    return deadline < today && r.status !== 'completed';
  }).length;

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
              کارتابل من
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              خوش آمدید، <span className="font-semibold text-[#003363]">{userInfo?.profile?.department || userInfo?.username}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
            <FontAwesomeIcon icon={faBriefcase} className="text-lg text-white" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 relative z-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <div className="flex items-center justify-center h-12 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl px-3 hover:border-[#003363] transition-all duration-200">
              <label className="flex items-center cursor-pointer gap-3">
                <div className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    checked={showOnlyMyResolutions}
                    onChange={(e) => setShowOnlyMyResolutions(e.target.checked)}
                    className="opacity-0 w-0 h-0"
                  />
                  <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${showOnlyMyResolutions ? 'bg-[#D39E46]' : 'bg-gray-400'}`}>
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${showOnlyMyResolutions ? 'transform translate-x-6' : ''}`}></span>
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 select-none flex items-center gap-2">
                  <FontAwesomeIcon icon={showOnlyMyResolutions ? faToggleOn : faToggleOff} className="text-[#003363] text-sm" />
                  فقط مصوبات من
                </span>
              </label>
            </div>
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
                    واحد مجری
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
                    آخرین به‌روزرسانی
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
                    عملیات
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedResolutions.map((resolution) => (
                <tr 
                  key={resolution.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200 ${
                    !resolution.first_viewed_at ? 'bg-blue-50/80 hover:bg-blue-100/80' : ''
                  }`}
                >
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
                      {statusOptions.find(opt => opt.value === resolution.status)?.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-gray-900">
                      {resolution.executor_unit?.department || resolution.executor_unit?.username || resolution.executor_name || '-'}
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
                    {resolution.last_progress_update ? (
                      <span className="text-gray-700">
                        {toPersianNumber(new Date(resolution.last_progress_update).toLocaleDateString('fa-IR'))}
                      </span>
                    ) : (
                      <span className="text-gray-700">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-900 font-medium text-sm">
                    {resolution.deadline ? (
                      <span className={new Date(resolution.deadline) < new Date() && resolution.status !== 'completed' ? 'text-red-600 font-bold' : ''}>
                        {toPersianNumber(new Date(resolution.deadline).toLocaleDateString('fa-IR'))}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    {resolution.public_id ? (
                      <a
                        href={`/dashboard/resolutions/${resolution.public_id}`}
                        className="bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faEye} className="text-xs" />
                        جزئیات
                      </a>
                    ) : null}
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
              <FontAwesomeIcon icon={faBriefcase} className="text-gray-400 text-xl" />
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

export default function WorkbenchPageProtected() {
  return (
    <ProtectedRoute>
      <WorkbenchPage />
    </ProtectedRoute>
  );
} 