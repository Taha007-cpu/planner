"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Department {
  id: string;
  name: string;
  icon?: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string | null;
  job_title?: string | null;
  department_id: string | null;
}

interface TaskAssignee {
  user_id: string;
  profile: Profile | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  department_id: string | null;
  created_at: string;
  task_assignees?: TaskAssignee[];
}

// تابع انتخاب پالت رنگ اختصاصی و رندوم بر اساس هویت کاربر
function getUserBadgeStyle(seed?: string | null) {
  const palettes = [
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-cyan-500/5",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/5",
    "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/5",
    "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shadow-fuchsia-500/5",
    "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-sky-500/5",
    "bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-teal-500/5",
    "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/5",
    "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-violet-500/5",
  ];

  if (!seed) return palettes[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | "all">("all");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [deptId, setDeptId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // بررسی احراز هویت و لود دیتا
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // دریافت پروفایل کاربر جاری
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profData) setProfile(profData);

      // دریافت دپارتمان‌ها
      const { data: deptData } = await supabase
        .from("departments")
        .select("*")
        .order("created_at", { ascending: true });
      if (deptData) {
        setDepartments(deptData);
        if (deptData.length > 0) setDeptId(deptData[0].id);
      }

      // دریافت اعضا
      const { data: membersData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (membersData) setMembers(membersData);

      fetchTasks();
    };

    checkUser();
  }, [router]);

  // واکشی تسک‌ها همراه با Assignee
  const fetchTasks = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        task_assignees (
          user_id,
          profile:profiles (
            id, full_name, avatar_url, email, role, department_id
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
    } else if (data) {
      setTasks(data as any);
    }
    setFetching(false);
  };

  // ایجاد تسک جدید
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert([
          {
            title,
            description: description || null,
            priority,
            department_id: deptId || null,
            status: "todo",
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (taskError) throw taskError;

      if (newTask && assigneeId) {
        const { error: assignError } = await supabase
          .from("task_assignees")
          .insert([
            {
              task_id: newTask.id,
              user_id: assigneeId,
              assigned_by: user.id,
            },
          ]);
        if (assignError) throw assignError;
      }

      setTitle("");
      setDescription("");
      setAssigneeId("");
      fetchTasks();
    } catch (err: any) {
      alert("خطا در ایجاد تسک: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // تغییر وضعیت تسک (تیک زدن)
  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", taskId);

    if (!error) {
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
    }
  };

  // حذف تسک
  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setTasks(tasks.filter((t) => t.id !== taskId));
    }
  };

  // خروج از حساب
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isAdmin =
    profile?.role === "super_admin" ||
    profile?.role === "admin" ||
    user?.email?.toLowerCase().includes("admin");

  const filteredTasks = tasks.filter((t) =>
    selectedDept === "all" ? true : t.department_id === selectedDept
  );

  return (
    <div
      className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-8 font-sans antialiased selection:bg-indigo-500/30"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ======================= نوار اطلاعات کاربر (HEADER) ======================= */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          {/* سمت راست: آواتار بزرگ + نام و بج باکس شغلی + ایمیل */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 p-[2px] shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-[#0a0f1c] rounded-[10px] overflow-hidden flex items-center justify-center">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile?.full_name || "User Avatar"}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-indigo-300">
                    {profile?.full_name ? profile.full_name.slice(0, 2) : "کاربر"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col text-right min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  {profile?.full_name || "کاربر سیستم"}
                </h1>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0">
                    👑 سوپر ادمین
                  </span>
                )}
              </div>

              {/* ردیف باکس عنوان شغلی با رنگ رندوم + ایمیل */}
              <div className="flex items-center gap-2.5 text-xs mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium backdrop-blur-md shadow-sm transition-all ${getUserBadgeStyle(
                    user?.id || profile?.job_title || user?.email
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                  {profile?.job_title || "کارشناس"}
                </span>

                <span className="text-slate-700">•</span>

                <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px] sm:max-w-none">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* سمت چپ: دکمه تنظیمات ادمین + دکمه خروج */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  router.push("/admin");
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>تنظیمات ادمین</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all duration-200 cursor-pointer active:scale-95"
            >
              خروج
            </button>
          </div>
        </header>

        {/* ======================= بدنه اصلی (SIDEBAR + MAIN) ======================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ستون سمت راست: دپارتمان‌ها (Sidebar) */}
          <aside className="lg:col-span-1 space-y-2 p-3 rounded-2xl bg-[#0d1322]/80 border border-slate-800/80 backdrop-blur-xl h-fit">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 flex items-center justify-between border-b border-slate-800/60 mb-1">
              <span>دپارتمان‌ها</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">
                {departments.length + 1}
              </span>
            </div>

            <button
              onClick={() => setSelectedDept("all")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                selectedDept === "all"
                  ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <span>همه دپارتمان‌ها</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/20">
                {tasks.length}
              </span>
            </button>

            {departments.map((dept) => {
              const count = tasks.filter((t) => t.department_id === dept.id).length;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    selectedDept === dept.id
                      ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{dept.icon || "📁"}</span>
                    <span className="truncate">{dept.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/20">
                    {count}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* ستون اصلی (فرم ساخت + لیست کارت‌ها) */}
          <main className="lg:col-span-3 space-y-6">
            {/* کارت ثبت تسک جدید */}
            <div className="p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800/80 backdrop-blur-xl shadow-xl">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <span className="text-indigo-400 font-bold text-base">＋</span> ثبت تسک جدید
              </h2>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">عنوان تسک</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تست کیفی بچ تولیدی ۱۴۰۳..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#12192c] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">دپارتمان مربوطه</label>
                    <select
                      value={deptId}
                      onChange={(e) => setDeptId(e.target.value)}
                      className="w-full bg-[#12192c] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id} className="bg-slate-900">
                          {d.icon || "📁"} {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ارجاع به مسئول (Assignee)</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full bg-[#12192c] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">تعیین نشده (بدون مسئول)</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id} className="bg-slate-900">
                          👤 {m.full_name || m.email} ({m.role || "عضو"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اولویت</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as const).map((p) => {
                        const labels = { low: "عادی", medium: "متوسط 🟡", high: "فوری 🔴" };
                        const isSelected = priority === p;
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`py-2 text-[11px] font-medium rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                                : "bg-[#12192c] border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">توضیحات تکمیلی (اختیاری)</label>
                  <textarea
                    rows={2}
                    placeholder="جزییات، استانداردها یا اقدامات لازم..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#12192c] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "در حال ثبت..." : "افزودن به لیست کارها"}
                </button>
              </form>
            </div>

            {/* لیست تسک‌ها */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>📋 لیست تسک‌های جاری</span>
                <span>مجموع: {filteredTasks.length}</span>
              </div>

              {fetching ? (
                <div className="text-center py-12 text-xs text-slate-500 animate-pulse">
                  در حال دریافت تسک‌ها...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0d1322]/40 border border-dashed border-slate-800 text-slate-500 text-xs">
                  هیچ فعالیتی در این دپارتمان ثبت نشده است.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = task.task_assignees?.[0]?.profile;
                  const isDone = task.status === "done";

                  return (
                    <div
                      key={task.id}
                      className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                        isDone
                          ? "bg-[#0a0f1c]/40 border-slate-900 opacity-60"
                          : "bg-[#0d1322]/80 border-slate-800/80 hover:border-slate-700 shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* دکمه وضعیت چک‌باکس */}
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-700 hover:border-indigo-500 bg-slate-900/50"
                          }`}
                        >
                          {isDone && <span className="text-xs">✓</span>}
                        </button>

                        {/* عنوان و توضیحات */}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-xs font-medium truncate ${
                              isDone ? "line-through text-slate-500" : "text-slate-200"
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* برچسب‌ها و آواتار سمت چپ کارت */}
                      <div className="flex items-center gap-2.5 mr-3 shrink-0">
                        {/* آواتار مسئول */}
                        {assignee && (
                          <div
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800"
                            title={`مسئول: ${assignee.full_name || assignee.email}`}
                          >
                            {assignee.avatar_url ? (
                              <Image
                                src={assignee.avatar_url}
                                alt="Assignee"
                                width={18}
                                height={18}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-indigo-500/30 text-[9px] flex items-center justify-center text-indigo-300 font-bold">
                                {assignee.full_name?.[0] || "U"}
                              </div>
                            )}
                            <span className="text-[10px] text-slate-300 max-w-[80px] truncate">
                              {assignee.full_name || assignee.email?.split("@")[0]}
                            </span>
                          </div>
                        )}

                        {/* برچسب اولویت */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                            task.priority === "high"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : task.priority === "medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800/60 text-slate-400 border-slate-700/60"
                          }`}
                        >
                          {task.priority === "high" ? "فوری" : task.priority === "medium" ? "متوسط" : "عادی"}
                        </span>

                        {/* دکمه حذف */}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 text-xs transition-opacity cursor-pointer"
                          title="حذف تسک"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
