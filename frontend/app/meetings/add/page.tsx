'use client';
import React, { useState } from "react";
import { getApiUrl } from "@/app/utils/api";

export default function AddMeetingPage() {
  const [form, setForm] = useState({ number: "", held_at: "", description: "", minutes_url: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(getApiUrl("meetings/"), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "خطا در افزودن جلسه");
      }
      setMessage("جلسه با موفقیت افزوده شد!");
      setForm({ number: "", held_at: "", description: "", minutes_url: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 py-8 px-2" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 relative">
        <h2 className="text-3xl font-extrabold text-blue-700 mb-8 text-center flex items-center justify-center gap-2">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          افزودن جلسه جدید
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Number */}
          <div className="relative">
            <input
              name="number"
              id="number"
              type="number"
              required
              className="peer w-full border-b-2 border-blue-200 focus:border-blue-500 bg-transparent py-3 px-4 text-lg outline-none transition-all placeholder-transparent text-right"
              value={form.number}
              onChange={handleChange}
              placeholder="شماره جلسه"
              autoComplete="off"
            />
            <label htmlFor="number" className="absolute right-4 top-3 text-gray-500 text-lg transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-lg peer-focus:-top-5 peer-focus:text-sm peer-focus:text-blue-600 bg-white px-1 pointer-events-none">
              <span className="flex flex-row-reverse items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" /></svg>
                شماره جلسه
              </span>
            </label>
          </div>
          {/* Held At */}
          <div className="relative">
            <input
              name="held_at"
              id="held_at"
              type="date"
              required
              className="peer w-full border-b-2 border-blue-200 focus:border-blue-500 bg-transparent py-3 px-4 text-lg outline-none transition-all placeholder-transparent text-right"
              value={form.held_at}
              onChange={handleChange}
              placeholder="تاریخ برگزاری"
              autoComplete="off"
            />
            <label htmlFor="held_at" className="absolute right-4 top-3 text-gray-500 text-lg transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-lg peer-focus:-top-5 peer-focus:text-sm peer-focus:text-blue-600 bg-white px-1 pointer-events-none">
              <span className="flex flex-row-reverse items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                تاریخ برگزاری
              </span>
            </label>
          </div>
          {/* Description */}
          <div className="relative">
            <textarea
              name="description"
              id="description"
              rows={3}
              className="peer w-full border-b-2 border-blue-200 focus:border-blue-500 bg-transparent py-3 px-4 text-lg outline-none transition-all placeholder-transparent resize-none text-right"
              value={form.description}
              onChange={handleChange}
              placeholder="توضیحات"
            />
            <label htmlFor="description" className="absolute right-4 top-3 text-gray-500 text-lg transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-lg peer-focus:-top-5 peer-focus:text-sm peer-focus:text-blue-600 bg-white px-1 pointer-events-none">
              <span className="flex flex-row-reverse items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-4-4v8" /></svg>
                توضیحات
              </span>
            </label>
          </div>
          {/* Minutes URL */}
          <div className="relative">
            <input
              name="minutes_url"
              id="minutes_url"
              type="url"
              className="peer w-full border-b-2 border-blue-200 focus:border-blue-500 bg-transparent py-3 px-4 text-lg outline-none transition-all placeholder-transparent text-right"
              value={form.minutes_url}
              onChange={handleChange}
              placeholder="آدرس صورتجلسه"
              autoComplete="off"
            />
            <label htmlFor="minutes_url" className="absolute right-4 top-3 text-gray-500 text-lg transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-lg peer-focus:-top-5 peer-focus:text-sm peer-focus:text-blue-600 bg-white px-1 pointer-events-none">
              <span className="flex flex-row-reverse items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
                آدرس صورتجلسه
              </span>
            </label>
          </div>
          {/* Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-800 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            )}
            {loading ? "در حال افزودن..." : "افزودن جلسه"}
          </button>
        </form>
        {/* Toast Notification */}
        {message && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce z-50">
            {message}
          </div>
        )}
        {error && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce z-50">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 