'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'ceo' | 'manager' | 'employee' | 'admin' | 'user';
  department_id: string | null;
  status: 'pending' | 'approved' | 'blocked';
  created_at: string;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'admin' ||
      user.email === 'tahakheiri2007@gmail.com';

    if (!isSuperAdmin) {
      alert('دسترسی مجاز نیست!');
      router.push('/');
      return;
    }

    await fetchData();
  };

  const fetchData = async () => {
    const { data: deps } = await supabase.from('departments').select('*').order('name');
    if (deps) setDepartments(deps);

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && users) {
      setProfiles(users as Profile[]);
    }
    setLoading(false);
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      alert('خطا در ذخیره‌سازی: ' + error.message);
    } else {
      setProfiles(profiles.map(p => (p.id === id ? { ...p, ...updates } : p)));
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      setProfiles(profiles.filter(p => p.id !== id));
    } else {
      alert('خطا در حذف: ' + error.message);
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
        
        {/* نوار بالای پنل مدیریت */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              پنل مدیریت ساختار سازمانی
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">تعیین نقش‌های سازمانی، انتساب به تیم‌ها و فعال‌سازی دسترسی‌ها</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium border border-slate-700 transition"
          >
            ← بازگشت به میز کار
          </button>
        </div>

        {/* جدول کاربران */}
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">کاربر</th>
                  <th className="p-4">نقش سازمانی</th>
                  <th className="p-4">دپارتمان / تیم</th>
                  <th className="p-4">وضعیت دسترسی</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="font-medium text-white">{p.full_name || 'کاربر بدون نام'}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </td>

                    {/* انتخاب نقش */}
                    <td className="p-4">
                      <select
                        value={p.role === 'admin' ? 'super_admin' : p.role === 'user' ? 'employee' : p.role}
                        onChange={(e) => updateProfile(p.id, { role: e.target.value as any })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="super_admin">👑 سوپر ادمین</option>
                        <option value="ceo">👔 مدیر عامل (CEO)</option>
                        <option value="manager">💼 سرتیم / مدیر بخش</option>
                        <option value="employee">👤 کارشناس / کارمند</option>
                      </select>
                    </td>

                    {/* دپارتمان */}
                    <td className="p-4">
                      <select
                        value={p.department_id || ''}
                        onChange={(e) => updateProfile(p.id, { department_id: e.target.value || null })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">(بدون دپارتمان)</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* وضعیت تایید */}
                    <td className="p-4">
                      <select
                        value={p.status}
                        onChange={(e) => updateProfile(p.id, { status: e.target.value as any })}
                        className={`border rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium outline-none ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : p.status === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <option value="approved" className="bg-slate-900 text-emerald-400">تأیید شده</option>
                        <option value="pending" className="bg-slate-900 text-amber-400">در انتظار تایید</option>
                        <option value="blocked" className="bg-slate-900 text-rose-400">مسدود</option>
                      </select>
                    </td>

                    {/* عملیات */}
                    <td className="p-4 text-center">
                      {p.role !== 'super_admin' && p.role !== 'admin' && (
                        <button
                          onClick={() => deleteUser(p.id)}
                          className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition text-xs"
                        >
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
