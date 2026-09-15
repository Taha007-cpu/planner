'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // بازیابی ایمیل ذخیره‌شده در صورت وجود
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // ذخیره یا حذف ایمیل بر اساس انتخاب کاربر
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email.trim());
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        // ورود کاربر
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // بررسی وضعیت حساب در profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.user.id)
          .single();

        if (profile?.status === 'blocked') {
          await supabase.auth.signOut();
          throw new Error('دسترسی حساب شما توسط مدیر مسدود شده است.');
        }

        if (profile?.status === 'pending') {
          await supabase.auth.signOut();
          throw new Error('حساب شما در انتظار تأیید مدیر سیستم است.');
        }

        router.push('/');
        router.refresh();
      } else {
        // ثبت‌نام کاربر جدید
        if (!fullName.trim()) {
          throw new Error('لطفاً نام و نام خانوادگی را وارد کنید.');
        }
        if (!jobTitle.trim()) {
          throw new Error('لطفاً سمت شغلی را وارد کنید.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
            },
          },
        });

        if (error) throw error;

        // به‌روزرسانی پروفایل در صورت وجود تریگر یا درج مستقیم
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            job_title: jobTitle.trim(),
            status: 'approved',
          });
        }

        setSuccessMsg('ثبت‌نام با موفقیت انجام شد! در حال انتقال...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطایی در برقراری ارتباط رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-emerald-100/60 flex flex-col items-center justify-center p-4 relative overflow-hidden [perspective:1200px]" dir="rtl">
      {/* Dynamic Background Glows */}
      <div className="absolute top-10 right-1/4 w-[480px] h-[480px] bg-emerald-400/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[480px] h-[480px] bg-teal-400/20 rounded-full blur-[120px] pointer-events-none" />

      {/* 3D Elevated Realistic Floating Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl p-9 rounded-[36px] relative z-10 transition-all duration-500 hover:-translate-y-1.5 border-t border-l border-white border-b-2 border-r-2 border-slate-300/70 shadow-[0_30px_70px_-15px_rgba(15,23,42,0.18),0_15px_30px_-10px_rgba(0,135,90,0.12),inset_0_1px_2px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.04)]">
        
        {/* Top 3D Gloss Highlight Line */}
        <div className="absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent rounded-full" />

        {/* 3D Floating Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-b from-emerald-500 to-[#00875A] rounded-2xl mx-auto mb-4 flex items-center justify-center border-t border-emerald-300 shadow-[0_12px_24px_-6px_rgba(0,135,90,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)]">
            <span className="text-3xl filter drop-shadow-md">🧬</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight drop-shadow-sm">سامانه مدیریت سازمانی</h1>
          <p className="text-xs font-semibold text-slate-400 mt-2">
            {isLogin ? 'برای ورود اطلاعات حساب خود را وارد کنید' : 'فرم عضویت کارشناسان و مدیران'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 shadow-sm">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#00875A] text-xs flex items-center gap-2 shadow-sm">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: علی احمدی"
                  className="w-full px-4 py-3 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/15 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">سمت شغلی</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مثال: سرپرست کنترل کیفیت (QC)"
                  className="w-full px-4 py-3 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/15 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">ایمیل سازمانی</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full px-4 py-3 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/15 transition-all text-sm text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">رمز عبور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/15 transition-all text-sm text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors focus:outline-none"
                aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* فیلد مرا به خاطر بسپار */}
          {isLogin && (
            <div className="flex items-center gap-2 pt-1 mr-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]/20 cursor-pointer accent-[#00875A]"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors"
              >
                مرا به خاطر بسپار
              </label>
            </div>
          )}

          {/* 3D Push Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-gradient-to-b from-[#009b67] to-[#00875A] hover:from-[#00875A] hover:to-[#00734c] active:translate-y-0.5 text-white font-bold rounded-2xl border-t border-emerald-300/40 border-b-2 border-[#006040] shadow-[0_10px_20px_-4px_rgba(0,135,90,0.4),0_4px_6px_-2px_rgba(0,0,0,0.05)] active:shadow-[0_4px_10px_-2px_rgba(0,135,90,0.4)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'در حال پردازش...' : isLogin ? 'ورود به سامانه' : 'تکمیل ثبت‌نام'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100/90 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-[#00875A] transition-colors"
          >
            {isLogin ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : 'قبلاً حساب ساخته‌اید؟ ورود به سیستم'}
          </button>
        </div>
      </div>

      {/* Modern Floating Logo Below Card with Hover Hint */}
      <div className="mt-8 flex justify-center relative z-10">
        <a
          href="https://kiacell-immune.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center transition-transform duration-300 hover:scale-105"
          aria-label="ورود به سایت کیان ایمن سلول"
        >
          <div className="p-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg shadow-slate-200/40 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="لوگوی کیان ایمن سلول"
              style={{ width: '135px', height: 'auto', display: 'block' }}
              className="object-contain rounded-lg"
            />
          </div>
          <span className="mt-2 text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
            ورود به سایت شرکت ↗
          </span>
        </a>
      </div>
    </div>
  );
}
