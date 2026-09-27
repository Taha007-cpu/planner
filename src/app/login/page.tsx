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

  // بازیابی ایمیل ذخیره‌شده
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
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email.trim());
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // ثبت زمان ورود برای Session Expiry
        localStorage.setItem('login_time', Date.now().toString());

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
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-emerald-100/60 flex flex-col items-center justify-center p-4 relative overflow-hidden [perspective:1400px]" dir="rtl">
      {/* Background Glows */}
      <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-teal-400/20 rounded-full blur-[130px] pointer-events-none" />

      {/* 3D Outer Sphere Ring with Depth Inset */}
      <div className="relative p-3.5 sm:p-4 rounded-full bg-gradient-to-br from-white/90 via-emerald-100/40 to-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,135,90,0.25),0_10px_20px_-5px_rgba(15,23,42,0.1),inset_0_4px_8px_rgba(255,255,255,0.9),inset_0_-4px_8px_rgba(0,0,0,0.06)] border border-emerald-400/30">
        
        {/* Deep Inset Green Glow Ring */}
        <div className="p-2 sm:p-2.5 rounded-full bg-slate-100/80 shadow-[inset_0_10px_25px_rgba(0,135,90,0.18),inset_0_3px_6px_rgba(0,0,0,0.15)] border-2 border-emerald-500/25">

          {/* 3D Flipping Core */}
          <div className="relative w-[330px] h-[330px] sm:w-[500px] sm:h-[500px] [perspective:1400px]">
            <div
              className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] ${
                !isLogin ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              {/* =================== روی دایره: فرم ورود (LOGIN) =================== */}
              <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-b from-white via-white/95 to-slate-50/90 backdrop-blur-2xl p-6 sm:p-12 flex flex-col items-center justify-center shadow-[inset_0_12px_24px_-6px_rgba(0,135,90,0.12),inset_0_-8px_16px_rgba(0,0,0,0.04)] [backface-visibility:hidden]">
                
                {/* 3D Floating Icon */}
                <div className="text-center mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-b from-emerald-500 to-[#00875A] rounded-2xl mx-auto mb-2 flex items-center justify-center border-t border-emerald-300 shadow-[0_8px_20px_-4px_rgba(0,135,90,0.45)]">
                    <span className="text-2xl filter drop-shadow-md">🧬</span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">ورود به سامانه</h1>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">اطلاعات حساب کاربری خود را وارد کنید</p>
                </div>

                {errorMsg && isLogin && (
                  <div className="w-full max-w-xs mb-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-[11px] flex items-center gap-1.5 shadow-sm">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-2.5 sm:space-y-3">
                  <div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ایمیل سازمانی (user@company.com)"
                      className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/20 transition-all text-xs text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                      dir="ltr"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور"
                      className="w-full pl-10 pr-3.5 py-2 sm:py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/20 transition-all text-xs text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-1 transition-colors focus:outline-none"
                      aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mr-1">
                    <input
                      type="checkbox"
                      id="rememberMeLogin"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#00875A] cursor-pointer accent-[#00875A]"
                    />
                    <label htmlFor="rememberMeLogin" className="text-[11px] font-semibold text-slate-500 cursor-pointer select-none">
                      مرا به خاطر بسپار
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-b from-[#009b67] to-[#00875A] hover:from-[#00875A] hover:to-[#00734c] active:translate-y-0.5 text-white font-bold rounded-xl border-t border-emerald-300/40 border-b-2 border-[#006040] shadow-[0_8px_16px_-4px_rgba(0,135,90,0.4)] transition-all disabled:opacity-50 text-xs"
                  >
                    {loading ? 'در حال ورود...' : 'ورود به حساب'}
                  </button>
                </form>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-[#00875A] transition-colors"
                  >
                    حساب ندارید؟ <span className="text-[#00875A] underline">ثبت‌نام</span>
                  </button>
                </div>
              </div>

              {/* =================== پشت دایره: فرم ثبت‌نام (REGISTER) =================== */}
              <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-b from-white via-white/95 to-slate-50/90 backdrop-blur-2xl p-6 sm:p-10 flex flex-col items-center justify-center shadow-[inset_0_12px_24px_-6px_rgba(13,148,136,0.12),inset_0_-8px_16px_rgba(0,0,0,0.04)] [transform:rotateY(180deg)] [backface-visibility:hidden]">
                
                <div className="text-center mb-2.5 sm:mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-b from-teal-500 to-emerald-600 rounded-2xl mx-auto mb-1 flex items-center justify-center border-t border-teal-300 shadow-[0_8px_20px_-4px_rgba(13,148,136,0.45)]">
                    <span className="text-xl filter drop-shadow-md">✨</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">عضویت در سامانه</h1>
                  <p className="text-[10px] font-semibold text-slate-400">اطلاعات سازمانی را تکمیل کنید</p>
                </div>

                {errorMsg && !isLogin && (
                  <div className="w-full max-w-xs mb-2 p-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] flex items-center gap-1.5 shadow-sm">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && !isLogin && (
                  <div className="w-full max-w-xs mb-2 p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#00875A] text-[10px] flex items-center gap-1.5 shadow-sm">
                    <span>✅</span>
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-2">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="نام و نام خانوادگی (مثال: علی احمدی)"
                    className="w-full px-3 py-1.5 sm:py-2 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                  />

                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="سمت شغلی (مثال: سرپرست QC)"
                    className="w-full px-3 py-1.5 sm:py-2 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ایمیل سازمانی (user@company.com)"
                    className="w-full px-3 py-1.5 sm:py-2 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all text-xs text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                    dir="ltr"
                  />

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور"
                      className="w-full pl-10 pr-3 py-1.5 sm:py-2 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all text-xs text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-700 p-1 transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-gradient-to-b from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 active:translate-y-0.5 text-white font-bold rounded-xl border-t border-teal-300/40 border-b-2 border-emerald-900 shadow-[0_8px_16px_-4px_rgba(13,148,136,0.4)] transition-all disabled:opacity-50 text-xs"
                  >
                    {loading ? 'در حال ایجاد حساب...' : 'تکمیل و ثبت‌نام'}
                  </button>
                </form>

                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors"
                  >
                    قبلاً ثبت‌نام کردید؟ <span className="text-teal-700 underline">ورود به سیستم</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Logo Below Circle */}
      <div className="mt-6 flex justify-center relative z-10">
        <a
          href="https://kiacell-immune.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center transition-transform duration-300 hover:scale-105"
          aria-label="ورود به سایت کیان ایمن سلول"
        >
          <div className="p-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg shadow-slate-200/40 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="لوگوی کیان ایمن سلول"
              style={{ width: '120px', height: 'auto', display: 'block' }}
              className="object-contain rounded-lg"
            />
          </div>
          <span className="mt-1 text-[11px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
            ورود به سایت شرکت ↗
          </span>
        </a>
      </div>
    </div>
  );
}
