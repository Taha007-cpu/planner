'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Department {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  task_type: 'personal' | 'work' | 'shared';
  department_id?: string | null;
  created_by: string;
  assigned_to?: string | null;
  created_at: string;
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
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskType, setTaskType] = useState<'personal' | 'work' | 'shared'>('work');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserProfile(profile as Profile);
      if (profile.department_id) {
        setSelectedDeptId(profile.department_id);
      }
    } else if (user.email === 'tahakheiri2007@gmail.com') {
      setUserProfile({
        id: user.id,
        email: user.email,
        full_name: 'مدیر ارشد',
        job_title: 'مدیر ارشد سیستم',
        role: 'super_admin',
        department_id: null,
        status: 'approved',
      });
    }

    await Promise.all([fetchDepartments(), fetchTasks()]);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setDepartments(data as Department[]);
      if (data.length > 0) {
        setSelectedDeptId((prev) => prev || data[0].id);
      }
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (!file.type.startsWith('image/')) {
      alert('فقط فایل تصویری مجاز است!');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم عکس حداکثر باید ۲ مگابایت باشد.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userProfile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, avatar_url: publicUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطای ناشناخته';
      alert('خطا در آپلود عکس: ' + message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userProfile) return;

    const targetDeptId = taskType === 'personal' ? null : selectedDeptId || null;

    const newTask = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      task_type: taskType,
      department_id: targetDeptId,
      created_by: userProfile.id,
      assigned_to: taskType === 'work' ? userProfile.id : null,
      is_completed: false,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (!error && data) {
      setTasks([data as Task, ...tasks]);
      setTitle('');
      setDescription('');
    } else {
      alert('خطا در افزودن تسک: ' + (error?.message || ''));
    }
  };

  const toggleTask = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !currentState })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.map((t) => (t.id === id ? { ...t, is_completed: !currentState } : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isSuperAdmin =
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'admin' ||
    userProfile?.email === 'tahakheiri2007@gmail.com';

  const activeDepartment = departments.find((d) => d.id === activeTab);

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return t.task_type === 'personal';
    return t.department_id === activeTab;
  });

  const deptMap = new Map(departments.map((d) => [d.id, d]));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ۱. هدر سایت و هویت کاربر */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-purple-500/20 overflow-hidden transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {userProfile?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={userProfile.avatar_url} alt="آواتار" className="w-full h-full object-cover" />
                ) : (
                  <span>{userProfile?.full_name?.charAt(0) || '؟'}</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">{userProfile?.full_name || 'کاربر'}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                  {userProfile?.role === 'super_admin' ? '👑 ابرادمین' :
                   userProfile?.role === 'ceo' ? '👔 مدیر عامل' :
                   userProfile?.role === 'manager' ? '💼 سرتیم' : '👤 کارشناس'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {userProfile?.job_title || 'سمت سازمانی ثبت نشده'}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-slate-400 text-xs hidden sm:inline" dir="ltr">{userProfile?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isSuperAdmin && (
              <Link
                href="/admin"
                className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                ⚙️ پنل مدیریت
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 text-xs sm:text-sm border border-slate-700 transition"
            >
              خروج
            </button>
          </div>
        </header>

        {/* ۲. داشبورد چندپنجره‌ای دپارتمان‌ها */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>🏢</span> پنجره‌های دپارتمانی سازمان
            </span>
            <span className="text-xs text-indigo-400 font-medium">
              تسک‌های جاری: {filteredTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>🌐</span> کل سازمان
              <span className="bg-black/30 px-1.5 py-0.5 rounded-md text-[10px]">{tasks.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${
                activeTab === 'personal'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white border-slate-600 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>🔒</span> کارتابل شخصی
              <span className="bg-black/30 px-1.5 py-0.5 rounded-md text-[10px]">
                {tasks.filter((t) => t.task_type === 'personal').length}
              </span>
            </button>

            <div className="w-px h-6 bg-slate-800 shrink-0 mx-1" />

            {departments.map((dept) => {
              const count = tasks.filter((t) => t.department_id === dept.id).length;
              const isActive = activeTab === dept.id;

              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    setActiveTab(dept.id);
                    setSelectedDeptId(dept.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-transparent shadow-lg'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{dept.icon || '📁'}</span>
                  <span>{dept.name}</span>
                  {count > 0 && (
                    <span className="bg-black/30 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeDepartment && (
            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">{activeDepartment.icon}</span>
                <span className="font-bold text-white">{activeDepartment.name}</span>
                <span className="text-slate-400 hidden sm:inline">— {activeDepartment.description}</span>
              </div>
              <span className="text-[11px] text-slate-400">پنجره فعال دپارتمان</span>
            </div>
          )}
        </div>

        {/* ۳. فرم ثبت تسک */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span>➕</span> ثبت تسک جدید
          </h2>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="عنوان تسک..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="sm:col-span-2 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                required
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="low">🟢 اولویت کم</option>
                <option value="medium">🟡 اولویت متوسط</option>
                <option value="high">🔴 اولویت فوری</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="توضیحات تکمیلی (اختیاری)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />

              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as 'personal' | 'work' | 'shared')}
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="work">💼 تسک کاری سازمان</option>
                <option value="shared">👥 تسک اشتراکی تیم</option>
                <option value="personal">🔒 تسک شخصی (محرمانه)</option>
              </select>

              <select
                value={selectedDeptId}
                disabled={taskType === 'personal'}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className={`bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition ${
                  taskType === 'personal' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white font-semibold rounded-xl text-sm shadow-md transition"
            >
              افزودن تسک به پنجره دپارتمان
            </button>
          </form>
        </div>

        {/* ۴. لیست تسک‌ها */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-bold text-slate-300">
            <span>
              📋 تسک‌های {activeDepartment ? activeDepartment.name : activeTab === 'personal' ? 'شخصی' : 'سازمان'}
            </span>
            <span className="text-xs text-slate-500 font-normal">
              نمایش: {filteredTasks.length} از {tasks.length}
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
              هیچ تسکی در این پنجره وجود ندارد.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const taskDept = task.department_id ? deptMap.get(task.department_id) : null;

              return (
                <div
                  key={task.id}
                  className={`flex items-start justify-between p-4 rounded-xl border transition ${
                    task.is_completed
                      ? 'bg-slate-900/20 border-slate-800/40 opacity-60'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleTask(task.id, task.is_completed)}
                      className="mt-1 h-4 w-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <h3 className={`text-sm font-semibold ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {task.priority === 'high' ? 'فوری' : task.priority === 'medium' ? 'متوسط' : 'عادی'}
                        </span>

                        {taskDept && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                            <span>{taskDept.icon}</span>
                            <span>{taskDept.name}</span>
                          </span>
                        )}

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {task.task_type === 'personal' ? '🔒 شخصی' : task.task_type === 'work' ? '💼 سازمانی' : '👥 اشتراکی'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
