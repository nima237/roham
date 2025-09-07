'use client';
import React, { useState, useEffect } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faTimes } from "@fortawesome/free-solid-svg-icons";
import { getApiUrl } from "@/app/utils/api";

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

// تابع تبدیل اعداد فارسی به انگلیسی
const toEnglishNumber = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < persianDigits.length; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  return result;
};

// تابع مدیریت تایپ فقط اعداد فارسی
const handlePersianNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setValue: (value: string) => void) => {
  const value = e.target.value;
  // فقط اعداد انگلیسی و فارسی رو قبول کن
  const numbersOnly = value.replace(/[^\d۰-۹]/g, '');
  const persianValue = toPersianNumber(numbersOnly);
  setValue(persianValue);
};

// اولویت سمت‌ها برای مرتب‌سازی
const positionPriority: Record<string, number> = {
  board: 1,
  ceo: 2,
  deputy: 3,
  manager: 4,
  head: 5,
  employee: 6,
  secretary: 7,
  auditor: 8,
};
const getUserPriority = (user: any) => {
  return positionPriority[user.position] || 99;
};

export default function AddMeetingPage() {
  const [form, setForm] = useState({ number: "", held_at: "", description: "", other_invitees: "" });
  const [meetingNumber, setMeetingNumber] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [users, setUsers] = useState<{id: string, username: string, first_name: string, last_name: string, department?: string}[]>([]);
  const [meetings, setMeetings] = useState<{id: string, number: number, held_at: string, description: string}[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [heldAtDate, setHeldAtDate] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      // Fetch users
      const usersRes = await fetch(getApiUrl("users/"), { credentials: 'include' });
      const usersData = await usersRes.json();
      console.log("users:", usersData);
      if (usersRes.ok) {
        setUsers(usersData);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: any) => {
    setHeldAtDate(date);
    // Convert to YYYY-MM-DD for backend
    setForm({ ...form, held_at: date ? date.toDate().toISOString().slice(0, 10) : "" });
  };

  const handleAttendeesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setAttendees(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // مرتب‌سازی users قبل از ساخت attendeeOptions
  const sortedUsers = [...users].sort((a, b) => getUserPriority(a) - getUserPriority(b));

  // For react-select options
  const attendeeOptions = sortedUsers.map(user => {
    // Show only department if available, otherwise username
    const displayName = user.department || user.username;
    
    return {
      value: user.id,
      label: displayName || 'نامشخص'
    };
  });

  // For react-select value
  const selectedAttendees = attendeeOptions.filter(opt => attendees.includes(opt.value));

  const handleAttendeesSelect = (selected: any) => {
    setAttendees(selected ? selected.map((s: any) => s.value) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    
    // Validation سمت کلاینت
    if (!meetingNumber.trim()) {
      setError("شماره جلسه الزامی است");
      setLoading(false);
      return;
    }
    
    if (!form.held_at) {
      setError("تاریخ برگزاری الزامی است");
      setLoading(false);
      return;
    }
    
    if (!form.description.trim()) {
      setError("شرح جلسه الزامی است");
      setLoading(false);
      return;
    }
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("number", toEnglishNumber(meetingNumber));
      formData.append("held_at", form.held_at);
      formData.append("description", form.description);
      formData.append("other_invitees", form.other_invitees);
      
      // Add attendees as JSON array
      if (attendees.length > 0) {
        attendees.forEach(attendeeId => {
          formData.append("attendees_ids", attendeeId);
        });
      }
      
      attachments.forEach(file => {
        formData.append("attachments", file);
      });
      
      console.log("Sending attendees:", attendees);
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const res = await fetch(getApiUrl("meetings/"), {
        method: "POST",
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        console.error("API Error:", data);
        
        // بررسی نوع خطا و نمایش پیام مناسب
        let errorMessage = "خطا در افزودن جلسه";
        
        if (data.number && Array.isArray(data.number)) {
          const numberError = data.number[0];
          if (numberError.includes('meeting with this number already exists') || 
              numberError.includes('already exists') ||
              numberError.includes('unique')) {
            errorMessage = `جلسه با شماره ${meetingNumber} قبلاً ثبت شده است`;
          } else {
            errorMessage = `خطا در شماره جلسه: ${numberError}`;
          }
        } else if (data.number && typeof data.number === 'string') {
          if (data.number.includes('meeting with this number already exists') || 
              data.number.includes('already exists') ||
              data.number.includes('unique')) {
            errorMessage = `جلسه با شماره ${meetingNumber} قبلاً ثبت شده است`;
          } else {
            errorMessage = `خطا در شماره جلسه: ${data.number}`;
          }
        } else if (data.held_at && Array.isArray(data.held_at)) {
          errorMessage = `خطا در تاریخ: ${data.held_at.join(', ')}`;
        } else if (data.description && Array.isArray(data.description)) {
          errorMessage = `خطا در شرح جلسه: ${data.description.join(', ')}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join(', ');
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await res.json();
      console.log("Meeting created successfully:", responseData);
      
      setMessage("جلسه با موفقیت افزوده شد!");
      setForm({ number: "", held_at: "", description: "", other_invitees: "" });
      setMeetingNumber("");
      setAttendees([]);
      setAttachments([]);
      setHeldAtDate(null);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
      <div className="w-full max-w-none space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faFileArrowUp} className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">ثبت جلسه جدید</h1>
              <p className="text-gray-600 text-sm font-medium">افزودن جلسه جدید به سامانه</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-8" encType="multipart/form-data">
            {/* ردیف اول: شماره جلسه و تاریخ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  شماره جلسه <span className="text-red-500">*</span>
                </label>
                <input
                  name="number"
                  type="text"
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 text-right text-gray-900 placeholder-gray-400 font-medium"
                  value={meetingNumber}
                  onChange={(e) => handlePersianNumberInput(e, setMeetingNumber)}
                  placeholder="شماره جلسه"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  تاریخ برگزاری <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={heldAtDate}
                  onChange={handleDateChange}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 text-right text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="تاریخ برگزاری"
                  format="YYYY/MM/DD"
                  editable={false}
                  containerClassName="w-full"
                />
              </div>
            </div>

            {/* شرح جلسه */}
            <div className="space-y-3">
              <label className="text-gray-700 text-sm font-semibold">
                شرح جلسه <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                rows={4}
                required
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 resize-y text-right text-gray-900 placeholder-gray-400 font-medium min-h-[120px]"
                value={form.description}
                onChange={handleChange}
                placeholder="شرح جلسه"
                style={{ minHeight: '120px', maxHeight: '400px' }}
              />
            </div>

            {/* ردیف دوم: فایل پیوست و حاضرین جلسه */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">پیوست‌ها</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white font-medium py-3 px-5 rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <FontAwesomeIcon icon={faFileArrowUp} className="text-sm" />
                    انتخاب فایل‌ها
                  </button>
                  <span className="text-gray-500 text-sm truncate max-w-xs">
                    {attachments.length > 0 ? attachments.map(f => f.name).join(', ') : "فایلی انتخاب نشده است"}
                  </span>
                </div>
                <input
                  id="fileInput"
                  name="attachments"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
              </div>
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">حاضرین جلسه</label>
                {isClient && (
                  <Select
                    isMulti
                    isSearchable
                    options={attendeeOptions}
                    value={selectedAttendees}
                    onChange={handleAttendeesSelect}
                    classNamePrefix="react-select"
                    placeholder="انتخاب حاضرین..."
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#003363' : '#e2e8f0',
                        borderWidth: '1px',
                        borderRadius: '16px',
                        minHeight: '52px',
                        direction: 'rtl',
                        textAlign: 'right',
                        fontSize: '14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: state.isFocused ? '0 0 0 3px rgba(0, 51, 99, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderColor: '#003363',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                        }
                      }),
                      menu: (base) => ({
                        ...base,
                        direction: 'rtl',
                        textAlign: 'right',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(16px)',
                        marginTop: '8px'
                      }),
                      option: (base, state) => ({
                        ...base,
                        color: '#1f2937',
                        fontWeight: '500',
                        backgroundColor: state.isSelected 
                          ? '#D39E46' 
                          : state.isFocused 
                            ? '#f8fafc' 
                            : 'transparent',
                        padding: '14px 20px',
                        transition: 'all 0.15s ease',
                        borderRadius: '8px',
                        margin: '2px 8px',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#D39E46' : '#f8fafc'
                        }
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#f3f4f6',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        margin: '3px',
                        border: '1px solid #e5e7eb'
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#374151',
                        fontWeight: '500',
                        fontSize: '13px'
                      }),
                      multiValueRemove: (base, state) => ({
                        ...base,
                        color: '#6b7280',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        padding: '4px',
                        marginLeft: '6px',
                        '&:hover': {
                          backgroundColor: '#ef4444',
                          color: 'white'
                        }
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#94a3b8',
                        fontSize: '14px'
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: '#1f2937',
                        fontWeight: '500'
                      })
                    }}
                    noOptionsMessage={() => "کاربری یافت نشد"}
                    loadingMessage={() => "در حال بارگذاری..."}
                    isClearable={true}
                  />
                )}
              </div>
            </div>

            {/* سایر مدعوین */}
            <div className="space-y-3">
              <label className="text-gray-700 text-sm font-semibold">سایر مدعوین</label>
              <input
                name="other_invitees"
                type="text"
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 text-right text-gray-900 placeholder-gray-400 font-medium"
                value={form.other_invitees}
                onChange={handleChange}
                placeholder="سایر مدعوین (با ویرگول جدا کنید)"
                autoComplete="off"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-lg" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  در حال افزودن...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFileArrowUp} className="text-lg" />
                  افزودن جلسه
                </>
              )}
            </button>
          </form>

          {/* Messages */}
          {message && (
            <div className="mt-6 bg-green-50/80 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faFileArrowUp} className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-medium">{message}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-6 bg-red-50/80 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 