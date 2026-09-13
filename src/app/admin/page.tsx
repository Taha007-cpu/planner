'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
  icon?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  job_title?: string | null;
  avatar_url?: string | null;
  role: 'super_admin' | 'ceo' | 'manager' | 'employee' | 'admin' | 'user';
  department_id: string | null;
  status: 'pending' | 'approved' | 'blocked';
  created_at: string;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUserId(user.id);

    // بررسی دسترسی ادمین
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthorized =
      myProfile?.role === 'super_admin' ||
      myProfile?.role === 'admin' ||
      user.email === 'tahakheiri2007@gmail.com';

    if (!isAuthorized) {
      alert('دسترسی غیرمجاز! شما مدیر سیستم نیستید.');
      router.push('/');
      return;
    }

    // دریافت دپارتمان‌ها و تمام کاربران
    await Promise.all([fetchDepartments(), fetchProfiles()]);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, icon')
      .order('created_at', { ascending: true });

    if (data) setDepartments(data as Department[]);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProfiles(data as Profile[]);
    }
  };

  const updateUserRole = async (userId: string, newRole: Profile['role']) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } else {
      alert('خطا در تغییر نقش: ' + error.message);
    }
  };

  const updateUserDepartment = async (userId: string, newDeptId: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ department_id: newDeptId || null })
      .eq('id', userId);

    if (!error) {
      setProfiles(profiles.map(p => p.id === userId ? { ...p, department_id: newDeptId || null } : p));
    } else {
      alert('خطا در تغییر دپارتمان: ' + error.message);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: Profile['status']) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (!error) {
      setProfiles(profiles.map(p => p.id === userId ? { ...p, status: newStatus } : p));
    } else {
      alert('خطا در تغییر وضعیت: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* هدر صفحه ادمین */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>⚙️</span> پنل مدیریت سازمان و اعضا
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              تعیین نقش‌ها، دپارتمان سازمانی و وضعیت دسترسی کاربران
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition"
          >
            ← بازگشت به داشبورد اصلی
          </Link>
        </header>

        {/* جدول کاربران */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-200">
              اعضای سازمان ({profiles.length} نفر)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">کاربر</th>
                  <th className="p-3.5">سمت سازمانی</th>
                  <th className="p-3.5">دپارتمان</th>
                  <th className="p-3.5">نقش سیستمی</th>
                  <th className="p-3.5">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {profiles.map((p) => {
                  const isMe = p.id === currentUserId;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      {/* نام و ایمیل و آواتار */}
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-white shrink-0 border border-slate-700">
                          {p.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{p.full_name?.charAt(0) || '👤'}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {p.full_name || 'بدون نام'}
                            {isMe && <span className="text-[10px] text-indigo-400 font-normal">(شما)</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{p.email}</div>
                        </div>
                      </td>

                      {/* سمت سازمانی */}
                      <td className="p-3.5 text-slate-300">
                        {p.job_title || <span className="text-slate-500">—</span>}
                      </td>

                      {/* تخصیص دپارتمان */}
                      <td className="p-3.5">
                        <select
                          value={p.department_id || ''}
                          onChange={(e) => updateUserDepartment(p.id, e.target.value || null)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">بدون دپارتمان</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.icon} {dept.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* نقش سیستمی */}
                      <td className="p-3.5">
                        <select
                          value={p.role}
                          disabled={p.email === 'tahakheiri2007@gmail.com'}
                          onChange={(e) => updateUserRole(p.id, e.target.value as Profile['role'])}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option value="super_admin">👑 ابرادمین</option>
                          <option value="ceo">👔 مدیرعامل</option>
                          <option value="manager">💼 سرتیم / مدیر بخش</option>
                          <option value="employee">👤 کارمند</option>
                          <option value="user">عادی</option>
                        </select>
                      </td>

                      {/* وضعیت دسترسی */}
                      <td className="p-3.5">
                        <select
                          value={p.status}
                          disabled={p.email === 'tahakheiri2007@gmail.com'}
                          onChange={(e) => updateUserStatus(p.id, e.target.value as Profile['status'])}
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none disabled:opacity-50 ${
                            p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            p.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <option value="approved" className="bg-slate-900 text-emerald-400">تایید شده</option>
                          <option value="pending" className="bg-slate-900 text-amber-400">در انتظار تایید</option>
                          <option value="blocked" className="bg-slate-900 text-rose-400">مسدود</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
