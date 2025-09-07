'use client';
import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Select from "react-select";
import { getApiUrl } from "@/app/utils/api";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ProtectedRoute from '../../../../components/ProtectedRoute';

interface Resolution {
  id: string;
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
  } | null;
  executor_name: string | null;
  coworkers_ids: (string | number)[];
  inform_units_ids: (string | number)[];
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  groups: string[];
  position?: string;
  profile?: {
    position?: string;
  };
  department?: string;
}

function EditResolutionPage() {
  const router = useRouter();
  const { public_id } = useParams();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [executorUnit, setExecutorUnit] = useState('');
  const [coworkers, setCoworkers] = useState<string[]>([]);
  const [informUnits, setInformUnits] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataInitialized, setDataInitialized] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Fetch current user info
    const fetchUserInfo = async () => {
      try {
        const res = await fetch(getApiUrl('user-info/'), { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        // Ignore
      }
    };
    fetchUserInfo();
  }, []);

  const typeOptions = [
    { value: 'operational', label: 'عملیاتی' },
    { value: 'informational', label: 'اطلاع‌رسانی' }
  ];

  const deputyOptions = useMemo(() => {
    return users
      .filter(user => user.groups.includes('Deputy'))
      .map(user => ({
        value: user.id.toString(), // Ensure string type
        label: user.department || user.username
          ? `${user.department || user.username}`.trim()
          : user.username
      }));
  }, [users]);

  // Debug logging
  console.log('=== DEPUTY OPTIONS DEBUG ===');
  console.log('Users:', users);
  console.log('Users with Deputy group:', users.filter(user => user.groups.includes('Deputy')));
  console.log('Deputy options:', deputyOptions);
  console.log('Current executor unit:', executorUnit);
  console.log('Current coworkers:', coworkers);
  console.log('Current inform units:', informUnits);

  useEffect(() => {
    const formatDateForInput = (dateString: string): string => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    const fetchData = async () => {
      try {
        
        const [resolutionResponse, usersResponse] = await Promise.all([
          fetch(getApiUrl(`resolutions/${public_id}/edit/`), {
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json'
            }
          }),
          fetch(getApiUrl('users/'), {
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (!resolutionResponse.ok || !usersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const resolutionData = await resolutionResponse.json();
        const usersData = await usersResponse.json();

        setResolution(resolutionData);
        setUsers(usersData);
        setDescription(resolutionData.description);
        setType(resolutionData.type);
        
        // Convert IDs to strings for consistency
        const coworkersIds = (resolutionData.coworkers_ids || []).map((id: string | number) => id.toString());
        const informUnitsIds = (resolutionData.inform_units_ids || []).map((id: string | number) => id.toString());
        
        console.log('=== RESOLUTION DATA DEBUG ===');
        console.log('Resolution data:', resolutionData);
        console.log('Executor unit from API:', resolutionData.executor_unit);
        console.log('Executor unit ID:', resolutionData.executor_unit?.id);
        console.log('Coworkers IDs from API:', resolutionData.coworkers_ids);
        console.log('Inform units IDs from API:', resolutionData.inform_units_ids);
        console.log('Converted coworkers IDs:', coworkersIds);
        console.log('Converted inform units IDs:', informUnitsIds);
        console.log('Deadline from API:', resolutionData.deadline);
        console.log('Users data:', usersData);
        console.log('Users with Deputy group:', usersData.filter((user: User) => user.groups.includes('Deputy')));
        
        setCoworkers(coworkersIds);
        setInformUnits(informUnitsIds);
        
        setDeadline(resolutionData.deadline ? formatDateForInput(resolutionData.deadline) : '');
        
        // Mark data as initialized
        setDataInitialized(true);

      } catch (error) {
        console.error('Error fetching data:', error);
        alert('خطا در بارگذاری اطلاعات');
      } finally {
        setLoading(false);
      }
    };

    if (public_id) {
      fetchData();
    }
  }, [public_id, isClient]);

  // Separate effect to set executor unit after users are loaded
  useEffect(() => {
    console.log('=== EXECUTOR UNIT EFFECT ===');
    console.log('Resolution:', resolution);
    console.log('Users length:', users.length);
    console.log('Data initialized:', dataInitialized);
    console.log('Executor unit from resolution:', resolution?.executor_unit);
    console.log('Executor unit ID:', resolution?.executor_unit?.id);
    
    if (resolution && users.length > 0 && dataInitialized && !executorUnit) {
      const executorId = resolution.executor_unit?.id?.toString() || '';
      console.log('Setting executor unit to:', executorId);
      setExecutorUnit(executorId);
    }
  }, [resolution, users, dataInitialized, executorUnit]);

  // Additional effect to ensure executor unit is set correctly
  useEffect(() => {
    if (resolution && resolution.executor_unit && users.length > 0 && dataInitialized) {
      const executorId = resolution.executor_unit.id.toString();
      if (executorUnit === '' || executorUnit !== executorId) {
        console.log('=== FORCING EXECUTOR UNIT UPDATE ===');
        console.log('Current executor unit:', executorUnit);
        console.log('Should be:', executorId);
        setExecutorUnit(executorId);
      }
    }
  }, [resolution, users, dataInitialized]);

  // Separate effect to set deadline date after resolution is loaded
  useEffect(() => {
    console.log('=== DEADLINE EFFECT ===');
    console.log('Resolution:', resolution);
    console.log('Resolution deadline:', resolution?.deadline);
    console.log('Is client:', isClient);
    console.log('Data initialized:', dataInitialized);
    
    if (resolution && resolution.deadline && isClient && dataInitialized && !deadlineDate) {
      try {
        // Create a proper Persian date object
        const date = new Date(resolution.deadline);
        console.log('Setting deadline date:', resolution.deadline, '->', date);
        setDeadlineDate(date);
      } catch (error) {
        console.error('Error setting deadline date:', error);
      }
    }
  }, [resolution, isClient, dataInitialized, deadlineDate]);

  // Additional effect to ensure deadline date is set correctly
  useEffect(() => {
    if (resolution && resolution.deadline && isClient && dataInitialized) {
      try {
        const date = new Date(resolution.deadline);
        // Only set if deadlineDate is null or different
        if (!deadlineDate || deadlineDate.getTime() !== date.getTime()) {
          console.log('=== FORCING DEADLINE DATE UPDATE ===');
          console.log('Setting deadline date:', resolution.deadline, '->', date);
          setDeadlineDate(date);
        }
      } catch (error) {
        console.error('Error setting deadline date:', error);
      }
    }
  }, [resolution, isClient, dataInitialized]);

  // Debug effect to track when both users and coworkers are loaded
  useEffect(() => {
    if (users.length > 0 && coworkers.length > 0) {
      console.log('=== DEBUG: Both users and coworkers loaded ===');
      console.log('Users count:', users.length);
      console.log('Coworkers:', coworkers);
      console.log('Deputy users:', users.filter(user => user.groups.includes('Deputy')));
      console.log('Deputy options:', deputyOptions);
      
      // Check if any coworker IDs match deputy user IDs
      const deputyUserIds = users.filter(user => user.groups.includes('Deputy')).map(user => user.id.toString());
      console.log('Deputy user IDs:', deputyUserIds);
      console.log('Coworker IDs that match deputy IDs:', coworkers.filter(id => deputyUserIds.includes(id)));
    }
  }, [users, coworkers, deputyOptions]);

  // Force re-render when executor unit changes
  useEffect(() => {
    console.log('=== EXECUTOR UNIT STATE CHANGE ===');
    console.log('Executor unit state:', executorUnit);
    console.log('Deputy options available:', deputyOptions.length);
    console.log('Matching option:', deputyOptions.find(opt => opt.value === executorUnit));
  }, [executorUnit, deputyOptions]);

  // Additional effect to ensure coworkers and inform units are set correctly
  useEffect(() => {
    if (resolution && users.length > 0 && dataInitialized) {
      const coworkersIds = (resolution.coworkers_ids || []).map((id: string | number) => id.toString());
      const informUnitsIds = (resolution.inform_units_ids || []).map((id: string | number) => id.toString());
      
      // Only set if they're empty or different from initial data
      if (coworkers.length === 0 || JSON.stringify(coworkers) !== JSON.stringify(coworkersIds)) {
        console.log('=== FORCING COWORKERS UPDATE ===');
        console.log('Current coworkers:', coworkers);
        console.log('Should be:', coworkersIds);
        setCoworkers(coworkersIds);
      }
      
      if (informUnits.length === 0 || JSON.stringify(informUnits) !== JSON.stringify(informUnitsIds)) {
        console.log('=== FORCING INFORM UNITS UPDATE ===');
        console.log('Current inform units:', informUnits);
        console.log('Should be:', informUnitsIds);
        setInformUnits(informUnitsIds);
      }
    }
  }, [resolution, users, dataInitialized]);

  // Final debug effect to check all states
  useEffect(() => {
    if (resolution && users.length > 0) {
      console.log('=== FINAL STATE DEBUG ===');
      console.log('Resolution loaded:', !!resolution);
      console.log('Users loaded:', users.length);
      console.log('Executor unit state:', executorUnit);
      console.log('Coworkers state:', coworkers);
      console.log('Inform units state:', informUnits);
      console.log('Deadline state:', deadline);
      console.log('Deadline date state:', deadlineDate);
      console.log('Deputy options:', deputyOptions);
    }
  }, [resolution, users, executorUnit, coworkers, informUnits, deadline, deadlineDate, deputyOptions]);

  const isCEO = currentUser?.position === 'ceo' || currentUser?.profile?.position === 'ceo';
  const isSecretary = currentUser?.position === 'secretary' || currentUser?.profile?.position === 'secretary';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('لطفا توضیحات مصوبه را وارد کنید');
      return;
    }

    if (!resolution) {
      alert('خطا در بارگذاری اطلاعات مصوبه');
      return;
    }

    if (type === 'operational' && isCEO && !deadline) {
      alert('مهلت انجام برای مدیرعامل اجباری است');
      return;
    }

    setSubmitting(true);

    try {
      
      const payload: any = {
        description: description.trim(),
        type,
        clause: resolution.clause,
        subclause: resolution.subclause,
      };

      if (type === 'operational') {
        if (executorUnit) {
          payload.executor_unit_id = parseInt(executorUnit);
        }
        // همکاران - تبدیل به array of integers
        payload.coworkers_ids_input = coworkers.map(id => parseInt(id));
        // مهلت انجام
        if (deadline) {
          payload.deadline = deadline;
        }
      } else if (type === 'informational') {
        payload.inform_units_ids = informUnits.map(id => parseInt(id));
        payload.coworkers_ids_input = [];
        payload.deadline = null;
      }

      console.log('Sending payload:', payload); // برای debug

      const response = await fetch(getApiUrl(`resolutions/${public_id}/edit/`), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData); // برای debug
        throw new Error(errorData.detail || errorData.error || 'خطا در ویرایش مصوبه');
      }

      alert('مصوبه با موفقیت ویرایش شد');
      router.back();

    } catch (error) {
      console.error('Error updating resolution:', error);
      alert(error instanceof Error ? error.message : 'خطا در ویرایش مصوبه');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003363] mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!resolution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">❌</span>
          </div>
          <p className="text-gray-700 font-medium">مصوبه یافت نشد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#003363] rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">✏️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ویرایش مصوبه</h1>
                <p className="text-sm text-gray-500">بند {resolution.clause}-{resolution.subclause}</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              بازگشت
            </button>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-amber-600 mt-0.5">⚠️</div>
            <div>
              <h3 className="font-medium text-amber-800 mb-1">نکته مهم</h3>
              <p className="text-sm text-amber-700">
                ثبت تغییر به منزله ویرایش و تایید است <span className="font-medium"></span> 
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توضیحات مصوبه <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 focus:border-[#003363] focus:ring-1 focus:ring-[#003363] rounded-lg p-3 text-right text-gray-900 resize-none h-32 transition-colors"
                placeholder="توضیحات کامل مصوبه را وارد کنید..."
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع مصوبه
              </label>
              <Select
                options={typeOptions}
                value={typeOptions.find(opt => opt.value === type)}
                onChange={(option) => {
                  setType(option?.value || "");
                  setInformUnits([]);
                  setExecutorUnit('');
                  setCoworkers([]);
                  setDeadlineDate(null);
                }}
                placeholder="انتخاب نوع مصوبه"
                classNamePrefix="react-select"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: state.isFocused ? '#003363' : '#D1D5DB',
                    boxShadow: state.isFocused ? '0 0 0 1px #003363' : 'none',
                    minHeight: 42,
                    fontSize: '14px',
                    '&:hover': {
                      borderColor: '#003363',
                    }
                  }),
                  menu: (base) => ({ 
                    ...base, 
                    fontSize: '14px',
                    zIndex: 50,
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#003363' : state.isFocused ? '#F3F4F6' : 'white',
                    color: state.isSelected ? 'white' : '#374151',
                  })
                }}
              />
            </div>

            {/* Executor Unit for operational */}
            {type === 'operational' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  واحد مجری
                </label>
                {isClient && users.length > 0 && (
                  <Select
                    options={deputyOptions}
                    value={deputyOptions.find(opt => opt.value === executorUnit)}
                    onChange={(option) => setExecutorUnit(option?.value || "")}
                    placeholder="انتخاب واحد مجری"
                    isClearable
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#003363' : '#D1D5DB',
                        boxShadow: state.isFocused ? '0 0 0 1px #003363' : 'none',
                        minHeight: 42,
                        fontSize: '14px',
                        '&:hover': {
                          borderColor: '#003363',
                        }
                      }),
                      menu: (base) => ({ 
                        ...base, 
                        fontSize: '14px',
                        zIndex: 50,
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#003363' : state.isFocused ? '#F3F4F6' : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                      })
                    }}
                    noOptionsMessage={() => "معاونی یافت نشد"}
                  />
                )}
              </div>
            )}

            {/* Coworkers for operational */}
            {type === 'operational' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  همکاران
                </label>
                {isClient && users.length > 0 && (
                  <Select
                    options={deputyOptions.filter(opt => opt.value !== executorUnit)}
                    isMulti
                    value={deputyOptions.filter(opt => {
                      const isSelected = coworkers.includes(opt.value);
                      console.log(`Checking coworker option: ${opt.value} (${opt.label}) - Selected: ${isSelected} - Coworkers array: [${coworkers.join(', ')}]`);
                      return isSelected;
                    })}
                    onChange={(options) => setCoworkers(options ? options.map(opt => opt.value) : [])}
                    placeholder="انتخاب همکاران"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#003363' : '#D1D5DB',
                        boxShadow: state.isFocused ? '0 0 0 1px #003363' : 'none',
                        minHeight: 42,
                        fontSize: '14px',
                        '&:hover': {
                          borderColor: '#003363',
                        }
                      }),
                      menu: (base) => ({ 
                        ...base, 
                        fontSize: '14px',
                        zIndex: 50,
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#003363' : state.isFocused ? '#F3F4F6' : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#003363',
                        borderRadius: '6px',
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: 'white',
                        fontSize: '12px'
                      }),
                      multiValueRemove: (base) => ({ 
                        ...base, 
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white'
                        }
                      })
                    }}
                    noOptionsMessage={() => "همکاری یافت نشد"}
                    closeMenuOnSelect={false}
                  />
                )}
              </div>
            )}

            {/* Inform Units for informational */}
            {type === 'informational' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  واحدهای اطلاع‌رسانی
                </label>
                {isClient && users.length > 0 && (
                  <Select
                    options={deputyOptions}
                    isMulti
                    value={deputyOptions.filter(opt => {
                      const isSelected = informUnits.includes(opt.value);
                      console.log(`Checking inform unit option: ${opt.value} (${opt.label}) - Selected: ${isSelected}`);
                      return isSelected;
                    })}
                    onChange={(options) => setInformUnits(options ? options.map(opt => opt.value) : [])}
                    placeholder="انتخاب واحدهای اطلاع‌رسانی"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#003363' : '#D1D5DB',
                        boxShadow: state.isFocused ? '0 0 0 1px #003363' : 'none',
                        minHeight: 42,
                        fontSize: '14px',
                        '&:hover': {
                          borderColor: '#003363',
                        }
                      }),
                      menu: (base) => ({ 
                        ...base, 
                        fontSize: '14px',
                        zIndex: 50,
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#003363' : state.isFocused ? '#F3F4F6' : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#003363',
                        borderRadius: '6px',
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: 'white',
                        fontSize: '12px'
                      }),
                      multiValueRemove: (base) => ({ 
                        ...base, 
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white'
                        }
                      })
                    }}
                    noOptionsMessage={() => "واحدی یافت نشد"}
                    closeMenuOnSelect={false}
                  />
                )}
              </div>
            )}

            {/* Deadline for operational */}
            {type === 'operational' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مهلت انجام {type === 'operational' && isCEO ? <span className="text-red-500">*</span> : null}
                </label>
                {isClient && (
                  <DatePicker
                    value={deadlineDate}
                    onChange={date => {
                      setDeadlineDate(date);
                      setDeadline(date ? date.toDate().toISOString().slice(0, 10) : "");
                    }}
                    calendar={persian}
                    locale={persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-gray-300 focus:border-[#003363] focus:ring-1 focus:ring-[#003363] rounded-lg p-3 text-right text-gray-900 outline-none transition-colors"
                    placeholder="مهلت انجام را انتخاب کنید"
                    format="YYYY/MM/DD"
                    editable={false}
                  />
                )}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="px-6 py-2 bg-[#003363] hover:bg-[#D39E46] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    در حال ثبت...
                  </div>
                ) : (
                  "ثبت تغییرات"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditResolutionPageProtected() {
  return (
    <ProtectedRoute>
      <EditResolutionPage />
    </ProtectedRoute>
  );
} 