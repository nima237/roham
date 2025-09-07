'use client';
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getFullApiUrl } from "../utils/api";
import LoginComponent from "../components/ui/login-1";

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // مرحله ۱: لاگین و دریافت توکن (کوکی ست می‌شود)
      const res = await fetch(getFullApiUrl("/token/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include", // مهم: کوکی ست شود
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "خطا در ورود. لطفا دوباره تلاش کنید.");
      }
      // نیازی به ذخیره توکن نیست، کوکی ست شده است

      // مرحله ۲: دریافت اطلاعات کاربر و گروه‌ها
      const userRes = await fetch(getFullApiUrl("/user-info/"), {
        credentials: "include"
      });
      
      if (!userRes.ok) {
        const userData = await userRes.json();
        throw new Error(userData.detail || "خطا در دریافت اطلاعات کاربر.");
      }
      
      const userData = await userRes.json();
      // اطلاعات کاربر را فقط در state/context نگه دار، نه localStorage
      // setUser(userData); // اگر context داری

      // ریدایرکت به داشبورد
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <LoginComponent 
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
} 