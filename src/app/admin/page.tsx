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
  full_name: string | null;
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
  
  // State برای ویرایش سمت سفارشی
  const [customJobInputId, setCustomJobInputId] = useState<string | null>(null);
  const [customJobText, setCustomJobText] = useState('');

  // State برای ویرایش دستی نام کاربر
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameText, setEditingNameText] = useState('');

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

    if (error) {
      console.error('خطای دریافت لیست اعضا:', error.message);
      alert('خطا در دریافت کاربران: ' + error.message);
      return;
    }

    if (data) {
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

  // تابع تغییر نام کاربر
  const updateUserName = async (userId: string, newName: string) => {
    const trimmed = newName.trim();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed || null })
      .eq('id', userId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, full_name: trimmed || null } : p))
      );
      setEditingNameId(null);
      setEditingNameText('');
    } else {
      alert('خطا در تغییر نام: ' + error.message);
    }
  };

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
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* هدر صفحه ادمین */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border-2 border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>⚙️</span> پنل مدیریت سازمان و اعضا
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              تعیین نقش‌ها، نام اعضا، دپارتمان سازمانی، سمت شغلی و وضعیت دسترسی کاربران
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-semibold border-2 border-emerald-300 transition"
          >
            ← بازگشت به داشبورد اصلی
          </Link>
        </header>

        {/* جدول کاربران */}
        <div className="bg-white rounded-2xl border-2 border-slate-200/80 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">
              اعضای سازمان ({profiles.length} نفر)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">کاربر و نام</th>
                  <th className="p-3.5">سمت سازمانی (کشویی)</th>
                  <th className="p-3.5">دپارتمان (کشویی)</th>
                  <th className="p-3.5">نقش سیستمی</th>
                  <th className="p-3.5">وضعیت (کشویی)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profiles.map((p) => {
                  const isMe = p.id === currentUserId;
                  const isSuperAdminUser = p.email === 'tahakheiri2007@gmail.com';
                  const isCustomInputOpen = customJobInputId === p.id;
                  const isEditingName = editingNameId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/50 transition">
                      {/* نام و ایمیل و آواتار (با قابلیت ویرایش سریع نام) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 group">
                          {/* آواتار */}
                          <div className="relative w-11 h-11 rounded-2xl p-[2px] bg-gradient-to-b from-emerald-200 via-teal-100 to-slate-200 shadow-[0_4px_10px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-all duration-300 shrink-0">
                            <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center font-black text-emerald-800 text-sm">
                              {p.avatar_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={p.avatar_url} alt={p.full_name || 'کاربر'} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
                                  {p.full_name ? p.full_name.charAt(0) : '👤'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* بخش ویرایش نام یا نمایش نام */}
                          <div className="flex flex-col gap-0.5">
                            {isEditingName ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                  type="text"
                                  value={editingNameText}
                                  onChange={(e) => setEditingNameText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') updateUserName(p.id, editingNameText);
                                    if (e.key === 'Escape') setEditingNameId(null);
                                  }}
                                  placeholder="نام و نام خانوادگی..."
                                  className="bg-emerald-50 border-2 border-emerald-400 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none w-36"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => updateUserName(p.id, editingNameText)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNameId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                                  {p.full_name || <span className="text-slate-400 font-normal">بدون نام</span>}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNameId(p.id);
                                    setEditingNameText(p.full_name || '');
                                  }}
                                  className="text-slate-400 hover:text-emerald-700 text-[11px] p-0.5 hover:bg-emerald-100 rounded transition"
                                  title="ویرایش نام"
                                >
                                  ✏️
                                </button>
                                {isMe && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_2px_6px_rgba(16,185,129,0.4)] tracking-wide">
                                    شما
                                  </span>
                                )}
                              </div>
                            )}

                            <span className="text-[11px] font-mono text-slate-500 tracking-tight" dir="ltr">
                              {p.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* سمت سازمانی */}
                      <td className="p-3.5">
                        {isCustomInputOpen ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customJobText}
                              onChange={(e) => setCustomJobText(e.target.value)}
                              placeholder="عنوان سمت جدید..."
                              className="bg-slate-50 border-2 border-indigo-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-sm w-36"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => updateUserJobTitle(p.id, customJobText.trim() || null)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs text-white font-black shadow-[0_2px_0_0_#4338ca] transition-all cursor-pointer"
                            >
                              ثبت
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomJobInputId(null)}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 font-bold border border-slate-200 transition-all cursor-pointer"
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
                            className="bg-indigo-50/70 text-indigo-950 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-[0_0_14px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 rounded-xl px-3 py-1.5 text-xs font-black outline-none transition-all duration-300 cursor-pointer max-w-[190px]"
                          >
                            <option value="" className="bg-white text-slate-700">بدون سمت</option>
                            {p.job_title && !DEFAULT_JOB_TITLES.includes(p.job_title) && (
                              <option value="custom_existing" className="bg-white text-slate-900">{p.job_title} (سفارشی)</option>
                            )}
                            {DEFAULT_JOB_TITLES.map((title) => (
                              <option key={title} value={title} className="bg-white text-slate-900">
                                {title}
                              </option>
                            ))}
                            <option value="__custom__" className="bg-white text-emerald-800 font-black">✏️ ثبت سمت سفارشی...</option>
                          </select>
                        )}
                      </td>

                      {/* دپارتمان */}
                      <td className="p-3.5">
                        <select
                          value={p.department_id || ''}
                          onChange={(e) => updateUserDepartment(p.id, e.target.value || null)}
                          className="bg-sky-50/70 text-sky-950 border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50 hover:shadow-[0_0_14px_rgba(14,165,233,0.25)] hover:-translate-y-0.5 rounded-xl px-3 py-1.5 text-xs font-black outline-none transition-all duration-300 cursor-pointer"
                        >
                          <option value="" className="bg-white text-slate-700">بدون دپارتمان</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id} className="bg-white text-slate-900">
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
                          className="bg-purple-50/70 text-purple-950 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-[0_0_14px_rgba(168,85,247,0.25)] hover:-translate-y-0.5 rounded-xl px-3 py-1.5 text-xs font-black outline-none transition-all duration-300 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="super_admin" className="bg-white text-slate-900">👑 ابرادمین</option>
                          <option value="ceo" className="bg-white text-slate-900">👔 مدیرعامل</option>
                          <option value="manager" className="bg-white text-slate-900">💼 سرتیم / مدیر بخش</option>
                          <option value="employee" className="bg-white text-slate-900">👤 کارمند</option>
                          <option value="user" className="bg-white text-slate-900">عادی</option>
                        </select>
                      </td>

                      {/* وضعیت دسترسی */}
                      <td className="p-3.5">
                        <select
                          value={p.status}
                          disabled={isSuperAdminUser}
                          onChange={(e) => updateUserStatus(p.id, e.target.value as Profile['status'])}
                          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-black outline-none transition-all duration-300 disabled:opacity-50 cursor-pointer ${
                            p.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5'
                              : p.status === 'pending'
                              ? 'bg-amber-50 text-amber-950 border-amber-300 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5'
                              : 'bg-rose-50 text-rose-950 border-rose-300 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:-translate-y-0.5'
                          }`}
                        >
                          <option value="approved" className="bg-white text-emerald-800 font-bold">تایید شده</option>
                          <option value="pending" className="bg-white text-amber-800 font-bold">در انتظار تایید</option>
                          <option value="blocked" className="bg-white text-rose-800 font-bold">مسدود</option>
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
