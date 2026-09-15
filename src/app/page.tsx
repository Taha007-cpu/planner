"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOut,
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
  User as UserIcon,
  Camera,
  PlusCircle
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
  role: string | null;
  is_admin?: boolean;
}

const ROLE_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  superadmin: {
    label: "سوپر ادمین",
    color: "bg-amber-100/90 text-amber-900 border-b-2 border-amber-300 shadow-[0_2px_8px_rgba(251,191,36,0.25)] hover:shadow-[0_0_14px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-extrabold",
    icon: "👑"
  },
  ceo: {
    label: "مدیر عامل",
    color: "bg-rose-100/90 text-rose-900 border-b-2 border-rose-300 shadow-[0_2px_8px_rgba(244,63,94,0.25)] hover:shadow-[0_0_14px_rgba(244,63,94,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-extrabold",
    icon: "🏢"
  },
  manager: {
    label: "مدیر بخش",
    color: "bg-purple-100/90 text-purple-900 border-b-2 border-purple-300 shadow-[0_2px_8px_rgba(168,85,247,0.25)] hover:shadow-[0_0_14px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-extrabold",
    icon: "👔"
  }
};

function getRoleBadge(profile: Profile | null) {
  const raw = (profile?.role || "").trim().toLowerCase();
  const map: Record<string, keyof typeof ROLE_BADGES> = {
    superadmin: "superadmin",
    super_admin: "superadmin",
    admin: "superadmin",
    ceo: "ceo",
    manager: "manager",
    "سوپر ادمین": "superadmin",
    "مدیر عامل": "ceo",
    "مدیر بخش": "manager"
  };
  const key = map[raw] || map[(profile?.role || "").trim()];
  if (key) return ROLE_BADGES[key];
  if (profile?.is_admin) return ROLE_BADGES.superadmin;
  return null;
}

const DEPARTMENTS = [
  {
    id: "all",
    label: "همه دپارتمان‌ها",
    icon: Globe,
    active: "bg-emerald-600 text-white border-emerald-700 shadow-[0_4px_16px_rgba(16,185,129,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/70 hover:text-emerald-800 hover:border-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
  },
  {
    id: "production",
    label: "گروه تولید",
    icon: Settings2,
    active: "bg-sky-500 text-white border-sky-600 shadow-[0_4px_16px_rgba(14,165,233,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50/80 hover:text-sky-800 hover:border-sky-300 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]"
  },
  {
    id: "qc",
    label: "کنترل کیفیت (QC)",
    icon: CheckCircle2,
    active: "bg-teal-500 text-white border-teal-600 shadow-[0_4px_16px_rgba(20,184,166,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50/80 hover:text-teal-800 hover:border-teal-300 hover:shadow-[0_0_15px_rgba(45,212,191,0.3)]"
  },
  {
    id: "qa",
    label: "تضمین کیفیت (QA)",
    icon: ShieldCheck,
    active: "bg-indigo-500 text-white border-indigo-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50/80 hover:text-indigo-800 hover:border-indigo-300 hover:shadow-[0_0_15px_rgba(129,140,248,0.3)]"
  },
  {
    id: "warehouse",
    label: "انبار و لجستیک",
    icon: Package,
    active: "bg-amber-500 text-amber-950 border-amber-600 shadow-[0_4px_16px_rgba(245,158,11,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50/80 hover:text-amber-900 hover:border-amber-300 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]"
  },
  {
    id: "finance",
    label: "حسابداری و مالی",
    icon: DollarSign,
    active: "bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/80 hover:text-emerald-800 hover:border-emerald-300 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
  },
  {
    id: "hr",
    label: "امور اداری و منابع انسانی",
    icon: Users,
    active: "bg-purple-500 text-white border-purple-600 shadow-[0_4px_16px_rgba(168,85,247,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50/80 hover:text-purple-800 hover:border-purple-300 hover:shadow-[0_0_15px_rgba(192,132,252,0.3)]"
  },
  {
    id: "rnd",
    label: "تحقیق و توسعه (R & D)",
    icon: FlaskConical,
    active: "bg-fuchsia-500 text-white border-fuchsia-600 shadow-[0_4px_16px_rgba(217,70,239,0.35)]",
    idle: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-fuchsia-50/80 hover:text-fuchsia-800 hover:border-fuchsia-300 hover:shadow-[0_0_15px_rgba(232,121,249,0.3)]"
  }
];

export default function DashboardPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDept, setSelectedDept] = useState("all");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDept, setTaskDept] = useState("production");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDesc, setTaskDesc] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          startTransition(() => router.push("/auth/login"));
          return;
        }
        if (isMounted) setUserEmail(session.user.email ?? null);
        const { data: pData } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (isMounted && pData) {
          setProfile(pData);
          setEditFullName(pData.full_name || "");
          setEditJobTitle(pData.job_title || "");
          setAvatarPreview(pData.avatar_url || null);
        }
        const { data: tData } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
        if (isMounted && tData) setTasks(tData);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    startTransition(() => router.push("/auth/login"));
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
        status: "pending" as const
      };
      const { data, error } = await supabase.from("tasks").insert([newTask]).select().single();
      if (error) throw error;
      if (data) {
        setTasks((prev) => [data, ...prev]);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignee("");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ثبت تسک");
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
      console.error(err);
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
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        finalAvatarUrl = data.publicUrl;
      }
      const updates = {
        id: user.id,
        full_name: editFullName.trim() || null,
        job_title: editJobTitle.trim() || null,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setIsEditProfileOpen(false);
      setAvatarFile(null);
    } catch (err: any) {
      alert(err.message || "خطا در ذخیره پروفایل");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredTasks = tasks.filter((t) => selectedDept === "all" || t.department === selectedDept);
  const activeRoleBadge = getRoleBadge(profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-800 font-bold">
        <div className="w-10 h-10 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <header className="bg-white border-2 border-slate-200/80 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl border-2 border-emerald-300 bg-emerald-50 shadow-sm group-hover:shadow-[0_0_16px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-[#00875A] font-black text-xl">
                    {profile?.full_name ? profile.full_name[0] : "U"}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="absolute -bottom-1 -left-1 p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow cursor-pointer transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">{profile?.full_name || "کاربر سیستم"}</h1>
                {activeRoleBadge && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-xl flex items-center gap-1 ${activeRoleBadge.color}`}>
                    <span>{activeRoleBadge.icon}</span>
                    <span>{activeRoleBadge.label}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-black">
                  {profile?.job_title || "کارشناس"}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50/80 hover:bg-rose-500 text-rose-800 hover:text-white border border-rose-200 text-xs font-black shadow-[0_2px_0_0_#fecdd3] hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9 space-y-6 order-2 lg:order-1">
            <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                <PlusCircle className="w-5 h-5 text-[#00875A]" />
                <span>ثبت تسک جدید</span>
              </h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-900 mb-1 font-black">عنوان تسک *</label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full bg-slate-50/80 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-900 mb-1 font-black">دپارتمان</label>
                    <select
                      value={taskDept}
                      onChange={(e) => setTaskDept(e.target.value)}
                      className="w-full bg-slate-50/80 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none cursor-pointer"
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
                  <div>
                    <label className="block text-xs text-slate-900 mb-1 font-black">ارجاع به مسئول</label>
                    <input
                      type="text"
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full bg-slate-50/80 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-900 mb-1 font-black">سطح اولویت</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTaskPriority("low")}
                        className={`py-2 px-3 text-xs rounded-xl border-2 font-black cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          taskPriority === "low"
                            ? "bg-sky-500 text-white border-sky-600 shadow-[0_0_18px_rgba(14,165,233,0.5)] -translate-y-0.5"
                            : "bg-sky-50/80 border-sky-300 text-sky-950 hover:bg-sky-100/90 hover:border-sky-400 hover:shadow-[0_0_14px_rgba(56,189,248,0.35)] hover:-translate-y-0.5"
                        }`}
                      >
                        <span>📌</span>
                        <span className="font-extrabold tracking-wide">عادی</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskPriority("medium")}
                        className={`py-2 px-3 text-xs rounded-xl border-2 font-black cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          taskPriority === "medium"
                            ? "bg-amber-500 text-amber-950 border-amber-600 shadow-[0_0_18px_rgba(245,158,11,0.5)] -translate-y-0.5 font-black"
                            : "bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100/90 hover:border-amber-400 hover:shadow-[0_0_14px_rgba(251,191,36,0.35)] hover:-translate-y-0.5"
                        }`}
                      >
                        <span>⚡</span>
                        <span className="font-extrabold tracking-wide">متوسط</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskPriority("high")}
                        className={`py-2 px-3 text-xs rounded-xl border-2 font-black cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          taskPriority === "high"
                            ? "bg-rose-500 text-white border-rose-600 shadow-[0_0_18px_rgba(244,63,94,0.5)] -translate-y-0.5"
                            : "bg-rose-50/80 border-rose-300 text-rose-950 hover:bg-rose-100/90 hover:border-rose-400 hover:shadow-[0_0_14px_rgba(244,63,94,0.35)] hover:-translate-y-0.5"
                        }`}
                      >
                        <span>🚨</span>
                        <span className="font-extrabold tracking-wide">فوری</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-900 mb-1 font-black">توضیحات</label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full bg-slate-50/80 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none resize-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingTask}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer disabled:opacity-50 shadow-[0_3px_0_0_#047857] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  {submittingTask ? "در حال ثبت..." : "ثبت و افزودن"}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-900 border-slate-200 pb-2">
                <span>لیست تسک‌ها</span>
              </div>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-black bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  تسک جدیدی در این بخش وجود ندارد
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((t) => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900">{t.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${
                            t.priority === "high" ? "bg-rose-100 text-rose-800" : 
                            t.priority === "medium" ? "bg-amber-100 text-amber-800" : 
                            "bg-sky-100 text-sky-800"
                          }`}>
                            {t.priority === "high" ? "🚨 فوری" : t.priority === "medium" ? "⚡ متوسط" : "📌 عادی"}
                          </span>
                        </div>
                        {t.description && <p className="text-xs font-semibold text-slate-700">{t.description}</p>}
                      </div>
                      <button onClick={() => handleDeleteTask(t.id)} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-black text-slate-900 px-2 pb-2 border-b-2 border-slate-100">
                <span>دپارتمان‌ها</span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 font-black">{tasks.length} تسک</span>
              </div>
              <div className="space-y-2 pt-2.5">
                {DEPARTMENTS.map((dept) => {
                  const Icon = dept.icon;
                  const isSelected = selectedDept === dept.id;
                  const count = dept.id === "all" ? tasks.length : tasks.filter((t) => t.department === dept.id).length;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDept(dept.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 border cursor-pointer ${
                        isSelected
                          ? `${dept.active} -translate-y-0.5`
                          : `${dept.idle} hover:-translate-y-0.5`
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{dept.label}</span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-black transition-all ${isSelected ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-700"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="group relative bg-gradient-to-b from-white to-slate-50 border-2 border-slate-200/90 rounded-2xl p-6 text-center shadow-[0_4px_0_0_#cbd5e1] hover:shadow-[0_2px_0_0_#cbd5e1] hover:border-emerald-400 transition-all duration-300 hover:-translate-y-1 flex items-center justify-center overflow-hidden cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-teal-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative w-full flex items-center justify-center py-2">
                <img
                  src="/logo2.png"
                  alt="Kian Immune Cell"
                  className="w-auto h-24 max-w-full object-contain filter drop-shadow-sm group-hover:drop-shadow-[0_0_18px_rgba(0,135,90,0.45)] group-hover:scale-105 transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#00875A]" />
              <span>ویرایش پروفایل</span>
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl border-2 border-emerald-300 bg-emerald-50 overflow-hidden flex items-center justify-center relative shadow-sm">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black shadow-sm cursor-pointer hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>انتخاب تصویر</span>
                </button>
              </div>
              <div>
                <label className="block text-xs text-slate-900 mb-1 font-black">نام کامل</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-900 mb-1 font-black">سمت شغلی</label>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:border-[#00875A] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? "در حال ذخیره..." : "ذخیره"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
