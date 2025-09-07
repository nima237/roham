'use client';
import React, { useState, useEffect } from "react";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faTimes, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getApiUrl } from "@/app/utils/api";
import ProtectedRoute from '../../../components/ProtectedRoute';

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

function AddResolutionPage() {
  const [form, setForm] = useState({
    meeting_id: "",
    clause: "",
    subclause: "",
    description: "",
    type: "",
    executor_unit_id: "",
    coworkers: [] as string[],
    inform_units: [] as string[],
    deadline: ""
  });
  const [meetings, setMeetings] = useState<{id: string, number: string, held_at: string}[]>([]);
  const [users, setUsers] = useState<{id: string, username: string, first_name: string, last_name: string, groups: string[], department?: string}[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lastSubsection, setLastSubsection] = useState<{[key: string]: number}>({});
  const [deadlineDate, setDeadlineDate] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: boolean}>({});
  const [clauseNumber, setClauseNumber] = useState("");
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      // Fetch meetings
      const meetingsRes = await fetch(getApiUrl("meetings/"), {
        credentials: 'include'
      });
      const meetingsData = await meetingsRes.json();
      if (meetingsRes.ok) {
        // Sort meetings by held_at date (newest first)
        const sortedMeetings = meetingsData.sort((a: any, b: any) => {
          return new Date(b.held_at).getTime() - new Date(a.held_at).getTime();
        });
        setMeetings(sortedMeetings);
        console.log("Meetings loaded:", sortedMeetings);
      } else {
        console.error("Failed to fetch meetings:", meetingsData);
      }

      // Fetch users
      const usersRes = await fetch(getApiUrl("users/"), {
        credentials: 'include'
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData);
        console.log("Users loaded:", usersData);
      } else {
        console.error("Failed to fetch users:", usersData);
      }
    };
    fetchData();
  }, []);

  // مقداردهی خودکار زیربند بر اساس داده واقعی از سرور
  useEffect(() => {
    const fetchSubclause = async () => {
      if (form.meeting_id && clauseNumber) {
        try {
          const clauseNum = parseInt(toEnglishNumber(clauseNumber), 10);
          if (isNaN(clauseNum)) return;
          const res = await fetch(
            getApiUrl(`resolutions/count/?meeting=${form.meeting_id}&clause=${clauseNum}`),
            {
              credentials: 'include'
            }
          );
          if (!res.ok) throw new Error('Failed to fetch subclause count');
          const data = await res.json();
          setForm(prev => ({ ...prev, clause: clauseNum.toString(), subclause: (data.count + 1).toString() }));
        } catch (error) {
          console.error('Error fetching subclause:', error);
          setError("خطا در دریافت شماره زیربند");
        }
      }
    };
    fetchSubclause();
  }, [form.meeting_id, clauseNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: false }));
  };

  // For react-select options
  const meetingOptions = meetings.map(meeting => {
    // تبدیل تاریخ میلادی به شمسی برای نمایش
    const meetingDate = new Date(meeting.held_at);
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(meetingDate);
    
    return {
      value: meeting.id,
      label: `جلسه شماره ${toPersianNumber(meeting.number)} - ${persianDate}`,
      held_at: meeting.held_at,
      number: parseInt(meeting.number, 10) // Add number for sorting
    };
  }).sort((a, b) => b.number - a.number); // Sort by meeting number in descending order

  // فقط معاونین برای واحد مجری و همکاران
  const deputyOptions = users
    .filter(user => (user.groups || []).includes("Deputy"))
    .map(user => {
      // Show only department if available, otherwise username
      const displayName = user.department || user.username;
      
      return {
        value: user.id,
        label: displayName
      };
    });
  
  console.log("All users:", users);
  console.log("Deputy options:", deputyOptions);

  const typeOptions = [
    { value: "OPERATIONAL", label: "عملیاتی" },
    { value: "INFORMATIONAL", label: "اطلاع‌رسانی" }
  ];

  const handleMeetingSelect = (selected: any) => {
    setForm(prev => ({ ...prev, meeting_id: selected ? selected.value : "" }));
    setSelectedMeetingDate(selected ? selected.held_at : null);
    // اگر جلسه جدید انتخاب شد، مهلت انجام رو ریست کن
    if (selected && selected.held_at !== selectedMeetingDate) {
      setForm(prev => ({ ...prev, deadline: "" }));
      setDeadlineDate(null);
    }
  };

  const handleTypeSelect = (selected: any) => {
    setForm(prev => ({ ...prev, type: selected ? selected.value : "" }));
  };

  const handleExecutorUnitSelect = (selected: any) => {
    setForm(prev => {
      const executorId = selected ? selected.value : "";
      const newCoworkers = prev.coworkers.filter(id => id !== executorId);
      return { ...prev, executor_unit_id: executorId, coworkers: newCoworkers }    });
  };

  const handleCoworkersSelect = (selected: any) => {
    const selectedIds = selected ? selected.map((s: any) => s.value) : [];
    setForm(prev => {
      // اگر واحد مجری در همکاران انتخاب شده بود، آن را حذف کن
      if (selectedIds.includes(prev.executor_unit_id)) {
        return { ...prev, executor_unit_id: "", coworkers: selectedIds };
      }
      return { ...prev, coworkers: selectedIds };
    });
  };

  const handleInformUnitsSelect = (selected: any) => {
    const selectedIds = selected ? selected.map((s: any) => s.value) : [];
    setForm(prev => ({ ...prev, inform_units: selectedIds }));
  };

  const validateForm = () => {
    const errors: {[key: string]: boolean} = {};
    if (!form.meeting_id) errors.meeting_id = true;
    if (!clauseNumber.trim()) errors.clause = true;
    if (!form.subclause) errors.subclause = true;
    if (!form.description) errors.description = true;
    if (!form.type) errors.type = true;
    
    const typeValue = form.type.toLowerCase();
    if (typeValue === "operational") {
      if (!form.executor_unit_id) errors.executor_unit_id = true;
      // حذف validation برای deadline - اختیاری شده
    }
    if (typeValue === "informational") {
      if (!form.inform_units || form.inform_units.length === 0) errors.inform_units = true;
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("لطفاً همه فیلدهای اجباری را پر کنید.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString().split('T')[0] : null,
        type: form.type.toLowerCase(),
        // وضعیت توسط backend بر اساس نقش کاربر تعیین می‌شود
      };

      console.log('Base payload:', payload);
      console.log('Form coworkers:', form.coworkers);
      console.log('Form inform_units:', form.inform_units);

      let res;
      // حذف فیلدهای غیرضروری برای اطلاع‌رسانی
      if (payload.type === "informational") {
        const { executor_unit_id, coworkers, deadline, ...informationalPayload } = payload;
        // تبدیل string IDs به integer برای backend
        (informationalPayload as any).inform_units_ids_input = form.inform_units.map(id => parseInt(id, 10));
        
        console.log('Informational payload:', informationalPayload);
        console.log('Inform units IDs:', (informationalPayload as any).inform_units_ids_input);
        console.log('JSON payload being sent:', JSON.stringify(informationalPayload, null, 2));
        res = await fetch(getApiUrl("resolutions/"), {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(informationalPayload)
        });
      } else {
        // برای مصوبه عملیاتی
        const operationalPayload = {
          ...payload,
          // تبدیل string IDs به integer برای backend
          coworkers_ids_input: form.coworkers.map(id => parseInt(id, 10)),
          inform_units_ids_input: form.inform_units.map(id => parseInt(id, 10))
        };
        
        console.log('Operational payload:', operationalPayload);
        console.log('Coworkers IDs:', operationalPayload.coworkers_ids_input);
        console.log('Inform units IDs:', operationalPayload.inform_units_ids_input);
        console.log('JSON payload being sent:', JSON.stringify(operationalPayload, null, 2));
        
        res = await fetch(getApiUrl("resolutions/"), {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(operationalPayload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "خطا در افزودن مصوبه");
      }

      setMessage("مصوبه با موفقیت افزوده شد!");
      setShowToast(true);
      
      // ریست کردن فرم و stateها
      setForm({
        meeting_id: "",
        clause: "",
        subclause: "",
        description: "",
        type: "",
        executor_unit_id: "",
        coworkers: [],
        inform_units: [],
        deadline: ""
      });
      setClauseNumber("");
      setDeadlineDate(null);
      setSelectedMeetingDate(null);
      
      // مخفی کردن toast بعد از 3 ثانیه
      setTimeout(() => {
        setShowToast(false);
        setMessage("");
      }, 3000);
    } catch (err: any) {
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
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">ثبت مصوبه جدید</h1>
              <p className="text-gray-600 text-sm font-medium">افزودن مصوبه جدید به سامانه</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ردیف اول: جلسه و بند */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  جلسه <span className="text-red-500">*</span>
                </label>
                {isClient && (
                  <Select
                    options={meetingOptions}
                    value={meetingOptions.find(opt => opt.value === form.meeting_id)}
                    onChange={handleMeetingSelect}
                    classNamePrefix="react-select"
                    placeholder="انتخاب جلسه..."
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: fieldErrors.meeting_id ? '#ef4444' : state.isFocused ? '#003363' : '#e2e8f0',
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
                          borderColor: fieldErrors.meeting_id ? '#ef4444' : '#003363',
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
                      singleValue: (base) => ({
                        ...base,
                        color: '#1f2937',
                        fontWeight: '500'
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#94a3b8',
                        fontSize: '14px'
                      })
                    }}
                    noOptionsMessage={() => "جلسه‌ای یافت نشد"}
                  />
                )}
                {fieldErrors.meeting_id && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
              </div>
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  بند <span className="text-red-500">*</span>
                </label>
                <input
                  name="clause"
                  type="text"
                  required
                  className={`w-full px-5 py-4 rounded-2xl border ${fieldErrors.clause ? 'border-red-400' : 'border-gray-200'} focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 text-right text-gray-900 placeholder-gray-400 font-medium`}
                  value={clauseNumber}
                  onChange={(e) => {
                    handlePersianNumberInput(e, setClauseNumber);
                    setFieldErrors(prev => ({ ...prev, clause: false }));
                  }}
                  placeholder="بند"
                  autoComplete="off"
                />
                {fieldErrors.clause && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
              </div>
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  زیربند <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="subclause"
                    type="text"
                    required
                    readOnly
                    className={`w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50/60 backdrop-blur-sm text-right text-gray-600 cursor-not-allowed font-medium`}
                    value={toPersianNumber(form.subclause)}
                    placeholder="زیربند (خودکار محاسبه می‌شود)"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                {fieldErrors.subclause && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
              </div>
            </div>

            {/* شرح مصوبه */}
            <div className="space-y-3">
              <label className="text-gray-700 text-sm font-semibold">
                شرح مصوبه <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                rows={4}
                required
                className={`w-full px-5 py-4 rounded-2xl border ${fieldErrors.description ? 'border-red-400' : 'border-gray-200'} focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 resize-y text-right text-gray-900 placeholder-gray-400 font-medium min-h-[120px]`}
                value={form.description}
                onChange={handleChange}
                placeholder="شرح مصوبه"
                style={{ minHeight: '120px', maxHeight: '400px' }}
              />
              {fieldErrors.description && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
            </div>

            {/* نوع مصوبه */}
            <div className="space-y-3">
              <label className="text-gray-700 text-sm font-semibold">
                نوع مصوبه <span className="text-red-500">*</span>
              </label>
              {isClient && (
                <Select
                  options={typeOptions}
                  value={typeOptions.find(opt => opt.value === form.type)}
                  onChange={handleTypeSelect}
                  classNamePrefix="react-select"
                  placeholder="انتخاب نوع مصوبه..."
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: fieldErrors.type ? '#ef4444' : state.isFocused ? '#003363' : '#e2e8f0',
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
                        borderColor: fieldErrors.type ? '#ef4444' : '#003363',
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
                        ? '#f3f4f6' 
                        : state.isFocused 
                          ? '#f8fafc' 
                          : 'transparent',
                      padding: '14px 20px',
                      transition: 'all 0.15s ease',
                      borderRadius: '8px',
                      margin: '2px 8px',
                      '&:hover': {
                        backgroundColor: state.isSelected ? '#f3f4f6' : '#f8fafc'
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#1f2937',
                      fontWeight: '500'
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: '#94a3b8',
                      fontSize: '14px'
                    })
                  }}
                />
              )}
              {fieldErrors.type && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
            </div>

            {/* فیلدهای وابسته به نوع مصوبه */}
            {form.type === "OPERATIONAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-gray-700 text-sm font-semibold">
                    واحد مجری <span className="text-red-500">*</span>
                  </label>
                  {isClient && (
                    <Select
                      options={deputyOptions}
                      value={deputyOptions.find(opt => opt.value === form.executor_unit_id)}
                      onChange={handleExecutorUnitSelect}
                      classNamePrefix="react-select"
                      placeholder="انتخاب واحد مجری..."
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor: fieldErrors.executor_unit_id ? '#ef4444' : state.isFocused ? '#003363' : '#e2e8f0',
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
                            borderColor: fieldErrors.executor_unit_id ? '#ef4444' : '#003363',
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
                        singleValue: (base) => ({
                          ...base,
                          color: '#1f2937',
                          fontWeight: '500'
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: '#94a3b8',
                          fontSize: '14px'
                        })
                      }}
                      noOptionsMessage={() => "معاونی یافت نشد"}
                    />
                  )}
                  {fieldErrors.executor_unit_id && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
                </div>
                <div className="space-y-3">
                  <label className="text-gray-700 text-sm font-semibold">همکاران</label>
                  {isClient && (
                    <Select
                      isMulti
                      isSearchable
                      options={deputyOptions.filter(opt => opt.value !== form.executor_unit_id)}
                      value={deputyOptions.filter(opt => form.coworkers.includes(opt.value))}
                      onChange={handleCoworkersSelect}
                      classNamePrefix="react-select"
                      placeholder="انتخاب همکاران..."
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
                        })
                      }}
                      noOptionsMessage={() => "معاونی یافت نشد"}
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      isClearable={true}
                    />
                  )}
                </div>
                                <div className="space-y-3 md:col-span-2">
                  <label className="text-gray-700 text-sm font-semibold">
                    مهلت انجام
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={deadlineDate}
                      onChange={date => {
                        setDeadlineDate(date);
                        setForm(prev => ({
                          ...prev,
                          deadline: date ? date.toDate().toISOString().slice(0, 10) : ""
                        }));
                        setFieldErrors(prev => ({ ...prev, deadline: false }));
                      }}
                      calendar={persian}
                      locale={persian_fa}
                      calendarPosition="bottom-right"
                      inputClass={`w-full px-5 py-4 rounded-2xl border ${fieldErrors.deadline ? 'border-red-400' : 'border-gray-200'} focus:border-[#003363] focus:ring-4 focus:ring-[#003363]/10 bg-white/80 backdrop-blur-sm transition-all duration-300 text-right text-gray-900 placeholder-gray-400 font-medium`}
                      placeholder={selectedMeetingDate ? "مهلت انجام (اختیاری)" : "ابتدا جلسه را انتخاب کنید"}
                      format="YYYY/MM/DD"
                      editable={true}
                      minDate={selectedMeetingDate ? new Date(new Date(selectedMeetingDate).getTime() + 24 * 60 * 60 * 1000) : undefined}
                      onOpen={() => {
                        // وقتی تقویم باز میشه، روی حداقل تاریخ برو
                        if (selectedMeetingDate && !deadlineDate) {
                          const minDate = new Date(new Date(selectedMeetingDate).getTime() + 24 * 60 * 60 * 1000);
                          setDeadlineDate(minDate);
                        }
                      }}
                      disabled={!selectedMeetingDate}
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  {fieldErrors.deadline && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
                  {selectedMeetingDate && (
                    <span className="text-sm text-gray-600 mt-1">
                      حداقل تاریخ: {new Intl.DateTimeFormat('fa-IR', {
                        year: 'numeric',
                        month: '2-digit', 
                        day: '2-digit'
                      }).format(new Date(new Date(selectedMeetingDate).getTime() + 24 * 60 * 60 * 1000))}
                    </span>
                  )}
                </div>
              </div>
            )}

            {form.type === "INFORMATIONAL" && (
              <div className="space-y-3">
                <label className="text-gray-700 text-sm font-semibold">
                  واحدهای اطلاع‌رسانی <span className="text-red-500">*</span>
                </label>
                {isClient && (
                  <Select
                    isMulti
                    isSearchable
                    options={deputyOptions}
                    value={deputyOptions.filter(opt => form.inform_units.includes(opt.value))}
                    onChange={handleInformUnitsSelect}
                    classNamePrefix="react-select"
                    placeholder="انتخاب واحدهای اطلاع‌رسانی..."
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: fieldErrors.inform_units ? '#ef4444' : state.isFocused ? '#003363' : '#e2e8f0',
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
                          borderColor: fieldErrors.inform_units ? '#ef4444' : '#003363',
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
                          ? '#f3f4f6' 
                          : state.isFocused 
                            ? '#f8fafc' 
                            : 'transparent',
                        padding: '14px 20px',
                        transition: 'all 0.15s ease',
                        borderRadius: '8px',
                        margin: '2px 8px',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#f3f4f6' : '#f8fafc'
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
                      })
                    }}
                    noOptionsMessage={() => "معاونی یافت نشد"}
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isClearable={true}
                  />
                )}
                {fieldErrors.inform_units && <span className="text-red-600 text-sm">این فیلد اجباری است.</span>}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  در حال ثبت...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFileArrowUp} className="text-lg" />
                  ثبت مصوبه
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

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
          <div className="bg-white/95 backdrop-blur-xl border border-green-200 rounded-2xl shadow-2xl p-6 max-w-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faFileArrowUp} className="text-green-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">موفقیت!</h3>
                <p className="text-sm text-gray-600">{message}</p>
              </div>
              <button
                onClick={() => {
                  setShowToast(false);
                  setMessage("");
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                aria-label="بستن"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-400 hover:text-gray-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddResolutionPageProtected() {
  return (
    <ProtectedRoute>
      <AddResolutionPage />
    </ProtectedRoute>
  );
} 