'use client';
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { getApiUrl } from "@/app/utils/api";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import * as XLSX from 'xlsx';
import Pagination from "@/app/components/Pagination";
import ProtectedRoute from '../../components/ProtectedRoute';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCalendarAlt, faFileAlt, faUsers, faDownload, faEye, faTimes, faFileDownload, faUser } from "@fortawesome/free-solid-svg-icons";

interface Meeting {
  id: string;
  number: number;
  held_at: string;
  description: string;
  attendees: Array<{
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    department?: string; // Added department field
  }>;
  other_invitees: string;
  attachments?: Array<{
    id: string;
    file: string;
    original_name: string;
    uploaded_at: string;
  }>;
  created_at: string;
  updated_at: string;
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

// تابع تبدیل اعداد فارسی به انگلیسی (برای جستجو)
const toEnglishNumber = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < persianDigits.length; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  return result;
};

// تابع مدیریت تایپ اعداد فارسی در input
const handlePersianInput = (e: React.ChangeEvent<HTMLInputElement>, setValue: (value: string) => void) => {
  const value = e.target.value;
  const persianValue = toPersianNumber(value);
  setValue(persianValue);
};

function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<any>(null);
  const [filterDateTo, setFilterDateTo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'number' | 'held_at' | 'description'>('held_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch(getApiUrl("meetings/"), {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Failed to fetch meetings");
        }

        const data = await response.json();
        console.log("Meetings data received:", data);
        console.log("First meeting attendees:", data[0]?.attendees);
        setMeetings(data);
      } catch (err) {
        setError("خطا در دریافت اطلاعات جلسات");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const filteredMeetings = meetings.filter(meeting => {
    const searchTermEnglish = toEnglishNumber(searchTerm);
    const matchesSearch = !searchTerm || 
      meeting.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.number.toString().includes(searchTermEnglish) ||
      toPersianNumber(meeting.number).includes(searchTerm);

    const meetingDate = new Date(meeting.held_at);
    const matchesDateFrom = !filterDateFrom || meetingDate >= filterDateFrom.toDate();
    const matchesDateTo = !filterDateTo || meetingDate <= filterDateTo.toDate();

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  // سورت جدول
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'number') {
      valA = a.number;
      valB = b.number;
    } else if (sortBy === 'held_at') {
      valA = new Date(a.held_at).getTime();
      valB = new Date(b.held_at).getTime();
    } else {
      valA = a.description || '';
      valB = b.description || '';
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedMeetings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMeetings = sortedMeetings.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDateFrom, filterDateTo]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setCurrentPage(1);
  };

  const openModal = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedMeeting(null);
    setShowModal(false);
  };

  // تابع خروجی اکسل
  const exportToExcel = () => {
    const excelData = filteredMeetings.map((meeting, index) => ({
      'ردیف': toPersianNumber(index + 1),
      'شماره جلسه': toPersianNumber(meeting.number),
      'تاریخ برگزاری': toPersianNumber(new Date(meeting.held_at).toLocaleDateString('fa-IR')),
      'حاضرین': meeting.attendees.map(attendee => {
        // Show only department if available, otherwise username
        const displayName = attendee.department || attendee.username;
        return displayName;
      }).join(', ') || '-',
      'سایر مدعوین': meeting.other_invitees || '-',
      'توضیحات': meeting.description || '-',
      'تاریخ ایجاد': toPersianNumber(new Date(meeting.created_at).toLocaleDateString('fa-IR')),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    
    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 8 },   // ردیف
      { wch: 12 },  // شماره جلسه
      { wch: 15 },  // تاریخ برگزاری
      { wch: 30 },  // حاضرین
      { wch: 25 },  // سایر مدعوین
      { wch: 50 },  // توضیحات
      { wch: 15 }   // تاریخ ایجاد
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'جلسات');

    const currentDate = new Date().toLocaleDateString('fa-IR');
    const fileName = `جلسات_${toPersianNumber(currentDate)}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

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
              جلسات
            </h2>
            <p className="text-sm text-gray-600 mt-2">مدیریت و مشاهده جلسات</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-lg text-white" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 relative z-1">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm" />
              </div>
              <input
                type="text"
                placeholder="جستجو در جلسات..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-800 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => handlePersianInput(e, setSearchTerm)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-sm" />
                </div>
                <DatePicker
                  value={filterDateFrom}
                  onChange={setFilterDateFrom}
                  calendar={persian}
                  locale={persian_fa}
                  placeholder="از تاریخ"
                  inputClass="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-800 placeholder-gray-400"
                  calendarPosition="bottom-right"
                  format="YYYY/MM/DD"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-sm" />
                </div>
                <DatePicker
                  value={filterDateTo}
                  onChange={setFilterDateTo}
                  calendar={persian}
                  locale={persian_fa}
                  placeholder="تا تاریخ"
                  inputClass="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-800 placeholder-gray-400"
                  calendarPosition="bottom-right"
                  format="YYYY/MM/DD"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <button
              onClick={clearAllFilters}
              className="flex-1 lg:flex-none bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <FontAwesomeIcon icon={faTimes} className="text-sm" />
              حذف فیلترها
            </button>
            <button
              onClick={exportToExcel}
              className="flex-1 lg:flex-none bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <FontAwesomeIcon icon={faDownload} className="text-sm" />
              خروجی اکسل
            </button>
          </div>
        </div>
      </div>

      {/* Meetings Table Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden relative z-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="p-4 text-right font-semibold text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => {
                  if (sortBy === 'number') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setSortBy('number');
                }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    شماره جلسه
                    {sortBy === 'number' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'desc' ? 'sort-down' : 'sort-up'} 
                        className="text-[#003363] text-xs" 
                      />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => {
                  if (sortBy === 'held_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setSortBy('held_at');
                }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    تاریخ برگزاری
                    {sortBy === 'held_at' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'desc' ? 'sort-down' : 'sort-up'} 
                        className="text-[#003363] text-xs" 
                      />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right font-semibold text-sm text-gray-700 w-1/2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => {
                  if (sortBy === 'description') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setSortBy('description');
                }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#003363]"></div>
                    توضیحات
                    {sortBy === 'description' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'desc' ? 'sort-down' : 'sort-up'} 
                        className="text-[#003363] text-xs" 
                      />
                    )}
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
              {paginatedMeetings.map((meeting) => (
                <tr key={meeting.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200">
                  <td className="p-4 text-gray-900 font-semibold text-sm">{toPersianNumber(meeting.number)}</td>
                  <td className="p-4 text-gray-900 font-medium text-sm">
                    {toPersianNumber(new Date(meeting.held_at).toLocaleDateString('fa-IR'))}
                  </td>
                  <td className="p-4 text-gray-800 text-sm leading-relaxed max-w-xs">
                    <div className="break-words line-clamp-2 text-justify">
                      {meeting.description || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openModal(meeting)}
                      className="bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faEye} className="text-xs" />
                      جزئیات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredMeetings.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-xl" />
            </div>
            <p className="text-gray-500 text-sm">هیچ جلسه‌ای یافت نشد</p>
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

      {/* Modal for Meeting Details */}
      {showModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200/50 overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 px-8 py-6 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-white text-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">جزئیات جلسه شماره {toPersianNumber(selectedMeeting.number)}</h2>
                  <p className="text-sm text-gray-600">تاریخ برگزاری: {toPersianNumber(new Date(selectedMeeting.held_at).toLocaleDateString('fa-IR'))}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="بستن"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-400 hover:text-gray-600 text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* اطلاعات کلی */}
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-[#D39E46]" />
                    اطلاعات کلی
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm text-gray-600">شماره جلسه:</span>
                      <span className="font-semibold text-gray-900">{toPersianNumber(selectedMeeting.number)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm text-gray-600">تاریخ برگزاری:</span>
                      <span className="font-semibold text-gray-900">{toPersianNumber(new Date(selectedMeeting.held_at).toLocaleDateString('fa-IR'))}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm text-gray-600">زمان برگزاری:</span>
                      <span className="font-semibold text-gray-900">{toPersianNumber(new Date(selectedMeeting.held_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</span>
                    </div>
                  </div>
                </div>

                {/* اطلاعات تکمیلی */}
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faFileAlt} className="text-[#D39E46]" />
                    اطلاعات تکمیلی
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm text-gray-600">تاریخ ایجاد:</span>
                      <span className="font-semibold text-gray-900">{toPersianNumber(new Date(selectedMeeting.created_at).toLocaleDateString('fa-IR'))}</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* پیوست‌ها */}
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileDownload} className="text-[#D39E46]" />
                  پیوست‌های جلسه
                </h3>
                {selectedMeeting.attachments && selectedMeeting.attachments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedMeeting.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-gray-200/50">
                        <FontAwesomeIcon icon={faFileDownload} className="text-blue-500 text-sm" />
                        <a
                          href={att.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-900 font-medium truncate flex-1"
                          title={att.original_name}
                        >
                          {att.original_name || 'پیوست بدون نام'}
                        </a>
                        <span className="text-xs text-gray-400">{new Date(att.uploaded_at).toLocaleDateString('fa-IR')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FontAwesomeIcon icon={faFileAlt} className="text-gray-300 text-2xl mb-2" />
                    <p className="text-gray-400 text-sm">پیوستی برای این جلسه ثبت نشده است.</p>
                  </div>
                )}
              </div>

              {/* حاضرین جلسه */}
              {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 && (
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="text-[#D39E46]" />
                    حاضرین جلسه
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.attendees.map((attendee, index) => {
                      // Show only department if available, otherwise username
                      const displayName = attendee.department || attendee.username;
                      
                      return (
                        <span key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg px-3 py-2 font-medium text-gray-900 flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} className="text-[#D39E46] text-xs" />
                          {displayName || 'نامشخص'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* سایر مدعوین */}
              {selectedMeeting.other_invitees && selectedMeeting.other_invitees.trim().length > 0 && (
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="text-[#D39E46]" />
                    سایر مدعوین
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.other_invitees.split(',').map((invitee, index) => {
                      const trimmedInvitee = invitee.trim();
                      return trimmedInvitee ? (
                        <span key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg px-3 py-2 font-medium text-gray-900 flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} className="text-[#D39E46] text-xs" />
                          {trimmedInvitee}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* توضیحات کامل */}
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                <h3 className="text-lg font-bold text-[#003363] mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileAlt} className="text-[#D39E46]" />
                  توضیحات جلسه
                </h3>
                <div className="text-gray-800 text-sm leading-relaxed text-justify whitespace-pre-line bg-white/50 rounded-lg p-4" style={{wordBreak: 'break-word'}}>
                  {selectedMeeting.description
                    ? (
                        <span dangerouslySetInnerHTML={{
                          __html: selectedMeeting.description
                            .replace(/  /g, ' &nbsp;')
                            .replace(/\n/g, '<br />')
                        }} />
                      )
                    : 'توضیحاتی برای این جلسه ثبت نشده است.'}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-200/50 px-8 py-6 flex justify-center gap-4 rounded-b-2xl">
              <button
                onClick={() => {
                  const url = `/dashboard/resolutions?meeting=${selectedMeeting.number}`;
                  window.open(url, '_blank');
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
              >
                <FontAwesomeIcon icon={faFileAlt} className="text-sm" />
                مشاهده مصوبات
              </button>
              <button
                onClick={closeModal}
                className="bg-gradient-to-r from-[#D39E46] to-[#003363] hover:from-[#003363] hover:to-[#D39E46] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingsPageProtected() {
  return (
    <ProtectedRoute>
      <MeetingsPage />
    </ProtectedRoute>
  );
} 