'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      if (isSignUp) {
        // ثبت‌نام کاربر جدید
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        setInfoMsg('ثبت‌نام انجام شد! حساب شما پس از تأیید سوپر ادمین فعال می‌شود.');
        setIsSignUp(false);
      } else {
        // ورود به حساب
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // بررسی وضعیت دسترسی کاربر در جدول profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', data.user.id)
          .single();

        if (profile?.status === 'pending') {
          await supabase.auth.signOut();
          setErrorMsg('حساب شما هنوز توسط مدیر سیستم تأیید نشده است.');
          setLoading(false);
          return;
        }

        if (profile?.status === 'blocked') {
          await supabase.auth.signOut();
          setErrorMsg('دسترسی این حساب مسدود شده است.');
          setLoading(false);
          return;
        }

        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطایی رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            سامانه مدیریت و پلنر
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'ایجاد حساب کاربری سازمانی جدید' : 'ورود به میز کار'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">نام و نام خانوادگی</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: علی محمدی"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-300 mb-1.5 font-medium">ایمیل کاری / شخصی</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5 font-medium">کلمه عبور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md transition mt-2"
          >
            {loading ? 'در حال پردازش...' : isSignUp ? 'ثبت درخواست عضویت' : 'ورود به حساب'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-800 pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            {isSignUp ? 'قبلاً ثبت‌نام کرده‌اید؟ ورود به حساب' : 'حساب کاربری ندارید؟ درخواست عضویت'}
          </button>
        </div>

      </div>
    </div>
  );
}
