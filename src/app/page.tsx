"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOut,
  Settings,
  Edit2,
  Globe,
  Settings2,
  CheckCircle2,
  ShieldCheck,
  Package,
  DollarSign,
  Users,
  FlaskConical,
  Trash2,
  Calendar,
  User as UserIcon,
  Camera
} from "lucide-react";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  department: string;
  assignee: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
}

const DEPARTMENTS = [
  { id: "all", label: "همه دپارتمان‌ها", icon: Globe },
  { id: "production", label: "گروه تولید", icon: Settings2 },
  { id: "qc", label: "کنترل کیفیت (QC)", icon: CheckCircle2 },
  { id: "qa", label: "تضمین کیفیت (QA)", icon: ShieldCheck },
  { id: "warehouse", label: "انبار و لجستیک", icon: Package },
  { id: "finance", label: "حسابداری و مالی", icon: DollarSign },
  { id: "hr", label: "امور اداری و منابع انسانی", icon: Users },
  { id: "rnd", label: "تحقیق و توسعه (R & D)", icon: FlaskConical },
];

// پالت رنگ‌های شیک و نئونی برای سمت شغلی
const JOB_BADGE_COLORS = [
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "bg-rose-500/10 text-rose-400 border-rose-500/30",
];

function getJobColor(text: string | null | undefined): string {
  if (!text) return JOB_BADGE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % JOB_BADGE_COLORS.length;
  return JOB_BADGE_COLORS[index];
}

export default function DashboardPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  // فیلتر دپارتمان فعال
  const [selectedDept, setSelectedDept] = useState("all");

  // فیلدهای فرم ثبت تسک
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDept, setTaskDept] = useState("production");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDesc, setTaskDesc] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  // مودال ویرایش پروفایل
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          startTransition(() => {
            router.push("/auth/login");
          });
          return;
        }

        if (isMounted) {
          setUserEmail(session.user.email ?? null);
        }

        const userId = session.user.id;

        // دریافت پروفایل
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (isMounted && profileData) {
          setProfile(profileData);
          setEditFullName(profileData.full_name || "");
          setEditJobTitle(profileData.job_title || "");
          setAvatarPreview(profileData.avatar_url || null);
        }

        // دریافت تسک‌ها
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });

        if (isMounted && tasksData) {
          setTasks(tasksData);
        }
      } catch (err) {
        console.error("خطا در بارگذاری اطلاعات:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    startTransition(() => {
      router.push("/auth/login");
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setSubmittingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("کاربر لاگین نیست");

      const newTask = {
        user_id: user.id,
        title: taskTitle.trim(),
        department: taskDept,
        assignee: taskAssignee.trim() || null,
        priority: taskPriority,
        description: taskDesc.trim() || null,
        status: "pending" as const,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks((prev) => [data, ...prev]);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignee("");
        setTaskPriority("medium");
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || "خطا در ثبت تسک");
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("خطا در حذف:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("کاربر یافت نشد");

      let finalAvatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const updates = {
        id: user.id,
        full_name: editFullName.trim() || null,
        job_title: editJobTitle.trim() || null,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(updates);

      if (profileError) throw profileError;

      setProfile(updates);
      setIsEditProfileOpen(false);
      setAvatarFile(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || "خطا در ذخیره پروفایل");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredTasks = tasks.filter(
    (t) => selectedDept === "all" || t.department === selectedDept
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060813] flex items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a14] text-slate-100 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* هدر بالایی با فریم مشخص */}
        <header className="bg-[#0b101e]/90 border border-slate-800/80 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          {/* سمت راست: مشخصات کاربر، نشان ادمین، کادر سمت شغلی و عکس */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end md:justify-start">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-800 shadow-md">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-600/30 text-indigo-300 font-bold">
                    {profile?.full_name ? profile.full_name[0] : "U"}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="absolute -bottom-1 -left-1 p-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow-md transition-colors cursor-pointer"
                title="ویرایش عکس و اطلاعات"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight">
                  {profile?.full_name || "کاربر سیستم"}
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1 shadow-sm">
                  <span>👑</span>
                  <span>سوپر ادمین</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {/* کادر مدرن و رنگی سمت شغلی */}
                <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold shadow-sm ${getJobColor(profile?.job_title || profile?.full_name)}`}>
                  {profile?.job_title || "کارشناس"}
                </span>
                <span>•</span>
                <span className="text-slate-400">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* سمت چپ: تنظیمات ادمین و خروج */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>تنظیمات ادمین</span>
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors cursor-pointer"
            >
              خروج
            </button>
          </div>
        </header>

        {/* بدنه اصلی داشبورد */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* بخش اصلی (سمت چپ): فرم ثبت تسک جدید و لیست تسک‌ها */}
          <div className="lg:col-span-9 space-y-6 order-2 lg:order-1">
            
            {/* کارت فرم ثبت تسک جدید */}
            <div className="bg-[#0b101e]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-indigo-400 text-base">+</span>
                  <span>ثبت تسک جدید</span>
                </h2>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* عنوان تسک */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">عنوان تسک</label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="مثال: تست کیفی بچ تولیدی ۱۴۰۳ ..."
                      className="w-full bg-[#111728] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* دپارتمان مربوطه */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">دپارتمان مربوطه</label>
                    <select
                      value={taskDept}
                      onChange={(e) => setTaskDept(e.target.value)}
                      className="w-full bg-[#111728] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="production">⚙️ گروه تولید</option>
                      <option value="qc">🔍 کنترل کیفیت (QC)</option>
                      <option value="qa">📋 تضمین کیفیت (QA)</option>
                      <option value="warehouse">📦 انبار و لجستیک</option>
                      <option value="finance">💰 حسابداری و مالی</option>
                      <option value="hr">👥 امور اداری و منابع انسانی</option>
                      <option value="rnd">🔬 تحقیق و توسعه (R & D)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* ارجاع به مسئول */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">ارجاع به مسئول (Assignee)</label>
                    <input
                      type="text"
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      placeholder="تعیین نشده (بدون مسئول)"
                      className="w-full bg-[#111728] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* دکمه‌های انتخاب اولویت */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">اولویت</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTaskPriority("low")}
                        className={`py-2 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          taskPriority === "low"
                            ? "bg-blue-600/30 border-blue-500 text-blue-300 font-bold"
                            : "bg-[#111728] border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        عادی
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskPriority("medium")}
                        className={`py-2 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          taskPriority === "medium"
                            ? "bg-amber-600/30 border-amber-500 text-amber-300 font-bold"
                            : "bg-[#111728] border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        متوسط
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskPriority("high")}
                        className={`py-2 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          taskPriority === "high"
                            ? "bg-rose-600/30 border-rose-500 text-rose-300 font-bold"
                            : "bg-[#111728] border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        فوری
                      </button>
                    </div>
                  </div>
                </div>

                {/* توضیحات تکمیلی */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">توضیحات تکمیلی (اختیاری)</label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="جزییات، استانداردها یا اقدامات لازم..."
                    className="w-full bg-[#111728] border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* دکمه افزودن */}
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingTask ? "در حال افزودن..." : "افزودن به لیست کارها"}
                </button>
              </form>
            </div>

            {/* لیست تسک‌های جاری */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-medium">📋 لیست تسک‌های جاری</span>
                <span>مجموع: {filteredTasks.length}</span>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="bg-[#0b101e]/60 border border-slate-800/60 rounded-2xl py-16 text-center text-xs text-slate-500">
                  هیچ فعالیتی در این دپارتمان ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#0b101e] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{t.title}</h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              t.priority === "high"
                                ? "bg-rose-500/20 text-rose-400"
                                : t.priority === "medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {t.priority === "high" ? "فوری" : t.priority === "medium" ? "متوسط" : "عادی"}
                          </span>
                        </div>
                        {t.description && <p className="text-[11px] text-slate-400">{t.description}</p>}
                        {t.assignee && (
                          <span className="text-[10px] text-slate-500">مسئول: {t.assignee}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* سایدبار سمت راست (دپارتمان‌ها) */}
          <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            <div className="bg-[#0b101e]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 py-1">
                <span>دپارتمان‌ها</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {tasks.length}
                </span>
              </div>

              <div className="space-y-1">
                {DEPARTMENTS.map((dept) => {
                  const Icon = dept.icon;
                  const isSelected = selectedDept === dept.id;
                  const count =
                    dept.id === "all"
                      ? tasks.length
                      : tasks.filter((t) => t.department === dept.id).length;

                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDept(dept.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{dept.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          isSelected ? "bg-indigo-700 text-white" : "text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* مودال ویرایش پروفایل کاربر */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e1526] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-400" />
              <span>ویرایش مشخصات کاربر</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl border-2 border-indigo-500/40 bg-[#141b2d] overflow-hidden flex items-center justify-center relative shadow-inner">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-pointer transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>آپلود تصویر جدید</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="مثال: کاربر سیستم"
                  className="w-full bg-[#141b2d] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">سمت شغلی</label>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder="مثال: کارشناس"
                  className="w-full bg-[#141b2d] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
