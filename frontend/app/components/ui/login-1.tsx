'use client'

import * as React from 'react'
import { Children,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState, } from 'react'
import Image from 'next/image';

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="w-full min-w-[200px] relative">
      { label && 
        <label className='block mb-2 text-sm'>
          {label}
        </label>
      }
      <div className="relative w-full">
        <input
          type="text"
          className="peer relative z-10 border-2 border-[var(--color-border)] h-13 w-full rounded-md bg-[var(--color-surface)] px-4 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 placeholder:font-medium hover:border-gray-300"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface LoginComponentProps {
  form: { username: string; password: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

const LoginComponent = ({ form, onChange, onSubmit, loading, error }: LoginComponentProps) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

   const socialIcons = [
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/></svg>,
      href: '#',
      gradient: 'bg-[var(--color-bg)]',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/></svg>,
      href: '#',
      bg: 'bg-[var(--color-bg)]',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"/></svg>,
      href: '#',
      bg: 'bg-[var(--color-bg)]',
    }
  ];

  return (
    <div className="h-screen w-[100%] bg-[var(--color-bg)] flex items-center justify-center p-4">
    <div className='card w-[80%] lg:w-[70%] md:w-[55%] flex justify-between h-[600px] rounded-2xl overflow-hidden shadow-2xl'>
      <div
        className='w-full lg:w-1/2 px-4 lg:px-16 left h-full relative overflow-hidden'
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
          <div
            className={`absolute pointer-events-none w-[220px] h-[220px] bg-gradient-to-r from-[#D39E46]/50 via-white/30 to-[#D39E46]/50 rounded-full blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: 0,
              top: 0,
              transform: `translate(${mousePosition.x}px, ${mousePosition.y}px) translate(-50%, -50%)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          <div className="form-container sign-in-container h-full z-10">
                         <form className='text-center py-10 md:py-20 grid gap-2 h-full' onSubmit={onSubmit}>
               <div className='grid gap-4 md:gap-6 mb-2'>
                 <h1 className='text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent animate-fade-in'>رهام</h1>
                 <p className='text-lg text-[var(--color-text-secondary)] animate-fade-in animation-delay-200'>رهگیری و ابلاغ مصوبات</p>
               </div>
               
               {/* Logo */}
               <div className='flex justify-center mb-6 animate-fade-in animation-delay-400'>
                 <div className="relative group">
                   <Image
                     src='/images/logo.png'
                     width={120}
                     height={120}
                     alt="Logo"
                     className="object-contain transition-transform duration-300 group-hover:scale-105"
                   />
                   <div className="absolute inset-0 bg-gradient-to-r from-[#003363]/20 to-[#D39E46]/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                 </div>
               </div>
               
               <div className='grid gap-4 items-center animate-fade-in animation-delay-600'>
                <AppInput 
                  placeholder="نام کاربری" 
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  autoComplete="username"
                />
                <AppInput 
                  placeholder="رمز عبور" 
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="current-password"
                />
              </div>
              <div className='flex gap-4 justify-center items-center animate-fade-in animation-delay-800'>
                <button 
                  type="submit"
                  disabled={loading}
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-xl bg-gradient-to-r from-[#003363] to-[#D39E46] px-8 py-4 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-[#003363]/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="relative w-5 h-5">
                          <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                        </div>
                        <span className="text-sm">در حال ورود...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm px-2 py-1 relative z-10">ورود به سامانه</span>
                      <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                        <div className="relative h-full w-8 bg-white/20" />
                      </div>
                    </>
                  )}
                </button>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm backdrop-blur-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
        <div className='hidden lg:block w-1/2 right h-full overflow-hidden'>
            <Image
              src='/images/login-bg.jpg'
              width={1000}
              height={1000}
              priority
              alt="Login background"
              className="w-full h-full object-cover transition-transform duration-300 opacity-40 brightness-110 hover:scale-105"
            />
       </div>
      </div>
    </div>
  )
}

export default LoginComponent 