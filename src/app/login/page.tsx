'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">سامانه مدیریت سازمانی</h1>
          <p className="text-sm text-slate-400 mt-2">
            {isLogin ? 'برای ورود اطلاعات حساب خود را وارد کنید' : 'فرم عضویت کارشناسان و مدیران'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: علی احمدی"
                  className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">سمت شغلی</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مثال: سرپرست کنترل کیفیت (QC)"
                  className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">ایمیل سازمانی</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">رمز عبور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm text-left"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'در حال پردازش...' : isLogin ? 'ورود به سامانه' : 'تکمیل ثبت‌نام'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs text-slate-400 hover:text-purple-400 transition-colors"
          >
            {isLogin ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : 'قبلاً حساب ساخته‌اید؟ ورود به سیستم'}
          </button>
        </div>
      </div>
    </div>
  );
}
