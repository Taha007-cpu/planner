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

const DEFAULT_JOB_TITLES = [
  'مدیر عامل',
  'مدیر ارشد اجرایی',
  'مدیر بخش / سرتیم',
  'سرپرست خط تولید',
  'کارشناس تولید',
  'کارشناس کنترل کیفیت (QC)',
  'کارشناس تضمین کیفیت (QA)',
  'مدیر انبار و لجستیک',
  'کارشناس انبار',
  'مدیر مالی و اداری',
  'حسابدار ارشد',
  'کارشناس حسابداری',
  'مدیر منابع انسانی (HR)',
  'کارشناس جذب و منابع انسانی',
  'مدیر تحقیق و توسعه (R&D)',
  'کارشناس فرمولاسیون و R&D',
  'کارشناس فنی و نگهداری',
  'کارشناس بازرگانی و خرید',
  'کارمند اداری',
];

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: 'production', name: 'گروه تولید', icon: '⚙️' },
  { id: 'qc', name: 'کنترل کیفیت (QC)', icon: '🔍' },
  { id: 'qa', name: 'تضمین کیفیت (QA)', icon: '📋' },
  { id: 'warehouse', name: 'انبار و لجستیک', icon: '📦' },
  { id: 'finance', name: 'حسابداری و مالی', icon: '💰' },
  { id: 'hr', name: 'امور اداری و منابع انسانی', icon: '👥' },
  { id: 'rnd', name: 'تحقیق و توسعه (R&D)', icon: '🔬' },
];

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [customJobInputId, setCustomJobInputId] = useState<string | null>(null);
  const [customJobText, setCustomJobText] = useState('');
  const router = useRouter();

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, icon')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setDepartments(data as Department[]);
      } else {
        setDepartments(FALLBACK_DEPARTMENTS);
      }
    } catch {
      setDepartments(FALLBACK_DEPARTMENTS);
    }
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

  const checkAdminAndFetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUserId(user.id);

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

    await Promise.all([fetchDepartments(), fetchProfiles()]);
    setLoading(false);
  };

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const updateUserRole = async (userId: string, newRole: Profile['role']) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );
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
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, department_id: newDeptId || null } : p))
      );
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
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: newStatus } : p))
      );
    } else {
      alert('خطا در تغییر وضعیت: ' + error.message);
    }
  };

  const updateUserJobTitle = async (userId: string, newJobTitle: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ job_title: newJobTitle })
      .eq('id', userId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, job_title: newJobTitle } : p))
      );
      setCustomJobInputId(null);
      setCustomJobText('');
    } else {
      alert('خطا در تغییر سمت: ' + error.message);
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
              تعیین نقش‌ها، دپارتمان سازمانی، سمت شغلی و وضعیت دسترسی کاربران
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
                  <th className="p-3.5">سمت سازمانی (کشویی)</th>
                  <th className="p-3.5">دپارتمان (کشویی)</th>
                  <th className="p-3.5">نقش سیستمی</th>
                  <th className="p-3.5">وضعیت (کشویی)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {profiles.map((p) => {
                  const isMe = p.id === currentUserId;
                  const isSuperAdminUser = p.email === 'tahakheiri2007@gmail.com';
                  const isCustomInputOpen = customJobInputId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      {/* نام و ایمیل و آواتار */}
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-white shrink-0 border border-slate-700">
                          {p.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.avatar_url} alt={p.full_name || 'آواتار'} className="w-full h-full object-cover" />
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

                      {/* سمت سازمانی - کشویی با امکان وارد کردن دستی */}
                      <td className="p-3.5">
                        {isCustomInputOpen ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customJobText}
                              onChange={(e) => setCustomJobText(e.target.value)}
                              placeholder="عنوان سمت جدید..."
                              className="bg-slate-800 border border-indigo-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-32"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => updateUserJobTitle(p.id, customJobText.trim() || null)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[11px] text-white font-bold"
                            >
                              ثبت
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomJobInputId(null)}
                              className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <select
                            value={
                              DEFAULT_JOB_TITLES.includes(p.job_title || '')
                                ? p.job_title || ''
                                : p.job_title
                                ? 'custom_existing'
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                setCustomJobInputId(p.id);
                                setCustomJobText(p.job_title || '');
                              } else {
                                updateUserJobTitle(p.id, val || null);
                              }
                            }}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[170px]"
                          >
                            <option value="">بدون سمت</option>
                            {p.job_title && !DEFAULT_JOB_TITLES.includes(p.job_title) && (
                              <option value="custom_existing">{p.job_title} (سفارشی)</option>
                            )}
                            {DEFAULT_JOB_TITLES.map((title) => (
                              <option key={title} value={title}>
                                {title}
                              </option>
                            ))}
                            <option value="__custom__">✏️ ثبت سمت سفارشی...</option>
                          </select>
                        )}
                      </td>

                      {/* تخصیص دپارتمان - کشویی */}
                      <td className="p-3.5">
                        <select
                          value={p.department_id || ''}
                          onChange={(e) => updateUserDepartment(p.id, e.target.value || null)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">بدون دپارتمان</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.icon ? `${dept.icon} ` : ''}{dept.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* نقش سیستمی */}
                      <td className="p-3.5">
                        <select
                          value={p.role}
                          disabled={isSuperAdminUser}
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

                      {/* وضعیت دسترسی - کشویی */}
                      <td className="p-3.5">
                        <select
                          value={p.status}
                          disabled={isSuperAdminUser}
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
