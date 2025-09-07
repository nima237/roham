"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Resolution {
  id: string;
  public_id: string;
  meeting: {
    number: number;
    held_at: string;
  };
  clause: number;
  subclause: number;
  description: string;
  type: string;
  status: string;
  executor_unit?: { name?: string; username?: string; first_name?: string; last_name?: string; department?: string };
  executor_name?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

function getDaysArray(start: Date, end: Date) {
  const arr = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

function formatDate(date: Date) {
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fa-IR');
}

function toJalaliParts(date: Date) {
  // تبدیل تاریخ میلادی به شمسی (fa-IR)
  const fa = date.toLocaleDateString('fa-IR').split('/');
  return { year: fa[0], month: fa[1], day: fa[2] };
}

function truncate(text: string, max: number) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function getYearMonthDayArray(days: Date[]) {
  const years: { year: string; start: number; end: number }[] = [];
  const months: { year: string; month: string; start: number; end: number }[] = [];
  let prevYear = '', prevMonth = '';
  days.forEach((d, i) => {
    const { year, month } = toJalaliParts(d);
    if (year !== prevYear) {
      years.push({ year, start: i, end: i });
      prevYear = year;
    } else {
      years[years.length - 1].end = i;
    }
    if (months.length === 0 || months[months.length - 1].month !== month || months[months.length - 1].year !== year) {
      months.push({ year, month, start: i, end: i });
      prevMonth = month;
    } else {
      months[months.length - 1].end = i;
    }
  });
  return { years, months };
}

// اضافه کردن تابع برای نمایش وضعیت با رنگ
// وضعیت‌ها و رنگ‌ها مطابق صفحه resolutions/page.tsx
const statusOptions = [
  { value: "notified", label: "در حال ابلاغ" },
  { value: "in_progress", label: "در حال اجرا" },
  { value: "completed", label: "تکمیل شده" },
  { value: "cancelled", label: "منتفی" },
  { value: "pending_ceo_approval", label: "منتظر تایید مدیرعامل" },
  { value: "pending_secretary_approval", label: "منتظر تایید دبیر" }
];
function getStatusColor(status: string) {
  switch (status) {
    case "notified":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "pending_ceo_approval":
      return "bg-purple-100 text-purple-800";
    case "pending_secretary_approval":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
function statusLabel(status: string) {
  const label = statusOptions.find(opt => opt.value === status)?.label || status;
  return <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{label}</span>;
}

// تابع وضعیت فقط رنگ (دایره)
function statusDot(status: string) {
  let color = 'bg-blue-400';
  if (status.includes('تکمیل')) color = 'bg-green-400';
  if (status.includes('لغو') || status.includes('منتفی')) color = 'bg-red-400';
  return <span className={`inline-block w-5 h-5 rounded-full ${color} border-2 border-white shadow`}></span>;
}

// تابع تبدیل اعداد به فارسی
function toPersianNumber(str: string | number) {
  return String(str).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
// مپ واحد مجری به فارسی فقط برای معاونین و واحدهای واقعی
const executorUnitMap: Record<string, string> = {
  deputy1: 'معاونت برنامه‌ریزی',
  deputy2: 'معاونت مالی',
  deputy3: 'معاونت اجرایی',
  deputy4: 'معاونت منابع انسانی',
  // ... سایر معاونت‌ها و واحدهای واقعی
};

// رنگ وضعیت برای سلول روز - بر اساس وضعیت واقعی
function dayStatusColor(status: string) {
  switch (status) {
    case "notified":
      return 'bg-yellow-100';
    case "in_progress":
      return 'bg-blue-100';
    case "completed":
      return 'bg-green-100';
    case "cancelled":
      return 'bg-red-100';
    case "pending_ceo_approval":
      return 'bg-purple-100';
    case "pending_secretary_approval":
      return 'bg-orange-100';
    default:
      return 'bg-gray-50';
  }
}

// رنگ دایره روز جلسه - بر اساس وضعیت واقعی
function statusColor(status: string) {
  switch (status) {
    case "notified":
      return 'bg-yellow-400';
    case "in_progress":
      return 'bg-blue-400';
    case "completed":
      return 'bg-green-400';
    case "cancelled":
      return 'bg-red-400';
    case "pending_ceo_approval":
      return 'bg-purple-400';
    case "pending_secretary_approval":
      return 'bg-orange-400';
    default:
      return 'bg-gray-400';
  }
}

export default function CalendarPage() {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [selectedExecutor, setSelectedExecutor] = useState<string>('all');

  // استخراج لیست واحدهای مجری یکتا - بهبود شده
  const executorUnits = useMemo(() => {
    const names = resolutions.map(r => {
      const executorName = r.executor_unit?.department || r.executor_unit?.username || r.executor_unit?.name || r.executor_name || 'نامشخص';
      return executorName;
    });
    return Array.from(new Set(names)).filter(Boolean);
  }, [resolutions]);

  // فیلتر مصوبات بر اساس واحد مجری - بهبود شده
  const filteredResolutions = useMemo(() => {
    if (selectedExecutor === 'all') return resolutions;
    return resolutions.filter(r => {
      const executorName = r.executor_unit?.department || r.executor_unit?.username || r.executor_unit?.name || r.executor_name || 'نامشخص';
      return executorName === selectedExecutor;
    });
  }, [resolutions, selectedExecutor]);

  useEffect(() => {
    fetch('/api/resolutions/')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched resolutions:', data); // برای debug
        setResolutions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching resolutions:', err);
        setError('خطا در دریافت مصوبات');
        setLoading(false);
      });
  }, []);

  // استخراج تاریخ جلسه و deadline به صورت امن
  const getMeetingDate = (r: Resolution) => {
    return r.meeting?.held_at || null;
  };
  const getDeadline = (r: Resolution) => r.deadline || null;

  // پیدا کردن بازه کلی تاریخ‌ها - بهبود شده
  let minDate = new Date();
  let maxDate = new Date();
  if (resolutions.length > 0) {
    const allStarts = resolutions
      .map(r => getMeetingDate(r))
      .filter(Boolean)
      .map(d => new Date(d!))
      .filter(d => !isNaN(d.getTime()));
    const allEnds = resolutions
      .map(r => getDeadline(r))
      .filter(Boolean)
      .map(d => new Date(d!))
      .filter(d => !isNaN(d.getTime()));
    if (allStarts.length > 0 && allEnds.length > 0) {
      minDate = new Date(Math.min(...allStarts.map(d => d.getTime())));
      maxDate = new Date(Math.max(...allEnds.map(d => d.getTime())));
    } else {
      minDate = new Date();
      maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
    }
  }
  
  const days = getDaysArray(minDate, maxDate);
  const { years, months } = getYearMonthDayArray(days);

  // پیدا کردن ایندکس امروز - بهبود شده
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayFa = today.toLocaleDateString('fa-IR');
  const todayIdx = days.findIndex(d => {
    const dayFa = d.toLocaleDateString('fa-IR');
    return dayFa === todayFa;
  });
  
  console.log('Today:', todayFa, 'TodayIdx:', todayIdx, 'Days length:', days.length);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-4 md:p-8 mt-6 md:mt-10 overflow-x-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#003363] mb-6 md:mb-10 flex items-center gap-3 drop-shadow-lg">
          گانت مصوبات
        </h1>
        
        {/* فیلتر واحد مجری */}
        <div className="mb-8 flex items-center gap-4">
          <label className="font-bold text-gray-700 text-base">واحد مجری:</label>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            value={selectedExecutor}
            onChange={e => setSelectedExecutor(e.target.value)}
          >
            <option value="all">همه واحدها</option>
            {executorUnits.map((name, i) => (
              <option key={i} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="w-full min-w-[1800px] bg-white rounded-xl shadow-lg overflow-x-auto overflow-y-hidden">
            {/* سرستون سال/ماه/روز */}
            <div className="grid relative text-base md:text-lg font-bold border-b border-gray-300" style={{ gridTemplateColumns: `220px 220px 320px 80px repeat(${days.length}, 64px)` }}>
              {/* خط عمودی امروز - کامل در کل جدول */}
              {todayIdx !== -1 && (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ 
                    right: `calc(${(days.length - todayIdx - 1) * 64}px + 0px + 0.5rem + 220px + 220px + 320px + 80px)`, 
                    width: '2px', 
                    borderRight: '2px dashed #ff6b35', 
                    background: 'none', 
                    height: '100%' 
                  }}
                />
              )}
              
              {/* سال */}
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              {years.map((y, i) => (
                <div key={i} className="text-center flex items-center justify-center text-lg font-extrabold text-gray-700 bg-gray-100 border-b border-gray-200 border-r border-gray-200" style={{ gridColumn: `span ${y.end - y.start + 1}` }}>
                  {y.year}
                </div>
              ))}
              
              {/* ماه */}
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              <div className="bg-white text-center flex items-center justify-center border-r border-gray-200" />
              {months.map((m, i) => (
                <div key={i} className="text-center flex items-center justify-center text-base font-bold text-gray-600 bg-gray-50 border-b border-gray-100 border-r border-gray-200" style={{ gridColumn: `span ${m.end - m.start + 1}` }}>
                  {m.month}
                </div>
              ))}
              
              {/* روز */}
              <div className="text-xs text-gray-400 bg-white border-b border-gray-100 flex items-center justify-center text-center border-r border-gray-200">جلسه-بند-زیربند</div>
              <div className="text-xs text-gray-400 bg-white border-b border-gray-100 flex items-center justify-center text-center border-r border-gray-200">واحد مجری</div>
              <div className="text-xs text-gray-400 bg-white border-b border-gray-100 flex items-center justify-center text-center border-r border-gray-200">توضیحات</div>
              <div className="text-xs text-gray-400 bg-white border-b border-gray-100 flex items-center justify-center text-center border-r border-gray-200">وضعیت</div>
              {days.map((d, i) => {
                const { day } = toJalaliParts(d);
                return (
                  <div key={i} className={`text-xs text-gray-400 bg-white border-b border-gray-100 flex items-center justify-center text-center border-r border-gray-200 relative`}>
                    {day}
                    {/* خط عمودی امروز فقط روی همان سلول */}
                    {i === todayIdx && (
                      <div className="absolute top-0 bottom-0 left-1/2 w-1 border-r-2 border-dashed border-orange-500 z-30 rounded-full" style={{ transform: 'translateX(-50%)', height: '100%', background: 'none' }} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* ردیف مصوبات */}
            <div className="divide-y divide-gray-200 relative">
              {filteredResolutions.map((r, idx) => {
                const startRaw = getMeetingDate(r);
                const endRaw = getDeadline(r);
                const start = startRaw ? new Date(startRaw) : null;
                const end = endRaw ? new Date(endRaw) : null;
                
                return (
                  <div
                    key={r.id}
                    className="grid items-center hover:bg-blue-50 hover:shadow-lg cursor-pointer rounded-2xl transition-all duration-200 border border-transparent hover:border-blue-300 relative border-b border-gray-300"
                    style={{ gridTemplateColumns: `220px 220px 320px 80px repeat(${days.length}, 64px)` }}
                    onClick={() => router.push(`/dashboard/resolutions/${r.public_id || r.id}`)}
                  >
                    {/* خط عمودی امروز در هر ردیف */}
                    {todayIdx !== -1 && (
                      <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ right: `calc(${(days.length - todayIdx - 1) * 64}px + 0px + 0.5rem + 220px + 220px + 320px + 80px)`, width: '2px', borderRight: '2px dashed #ff6b35', background: 'none', height: '100%' }} />
                    )}
                    
                    {/* جلسه-بند-زیربند */}
                    <div className="whitespace-nowrap font-bold text-blue-900 text-base px-2 overflow-hidden text-ellipsis text-center border-r border-gray-200">
                      جلسه {toPersianNumber(r.meeting?.number ?? '-')} - بند {toPersianNumber(r.clause ?? '-')} - زیربند {toPersianNumber(r.subclause ?? '-')}
                    </div>
                    {/* واحد مجری */}
                    <div className="whitespace-nowrap text-xs text-indigo-700 font-bold px-2 overflow-hidden text-ellipsis text-center border-r border-gray-200">
                      {r.executor_unit?.department || r.executor_unit?.username || r.executor_unit?.name || r.executor_name || 'نامشخص'}
                    </div>
                    {/* توضیح کوتاه با tooltip */}
                    <div
                      className="whitespace-nowrap text-xs text-gray-700 px-2 overflow-hidden text-ellipsis relative group cursor-help text-center border-r border-gray-200"
                      title={r.description}
                    >
                      {truncate(r.description, 60)}
                      <span className="hidden group-hover:block absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded-xl shadow-lg px-4 py-2 whitespace-pre-line break-words max-h-60 overflow-y-auto">
                        {r.description}
                      </span>
                    </div>
                    {/* وضعیت مصوبه */}
                    <div className="flex items-center justify-center border-r border-gray-200">{statusLabel(r.status)}</div>
                    
                    {/* سلول‌های روز - با بارهای رنگی */}
                    {days.map((d, i) => {
                      const isInRange = start && end && d >= start && d <= end;
                      const isMeetingDay = getMeetingDate(r) && new Date(getMeetingDate(r)!).toDateString() === d.toDateString();
                      
                      // Debug برای اولین مصوبه
                      if (idx === 0 && i === 0) {
                        console.log('Resolution debug:', {
                          id: r.id,
                          start: start?.toISOString(),
                          end: end?.toISOString(),
                          currentDay: d.toISOString(),
                          isInRange,
                          status: r.status,
                          dayStatusColor: dayStatusColor(r.status)
                        });
                      }
                      
                      return (
                        <div
                          key={i}
                          className={`h-8 flex items-center justify-center border-r border-gray-200 border-b border-gray-200 relative ${isInRange ? dayStatusColor(r.status) : ''}`}
                        >
                          {/* دایره روز جلسه */}
                          {isMeetingDay && (
                            <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${statusColor(r.status)} border-2 border-white shadow-lg`}></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 