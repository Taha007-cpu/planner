import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskNotificationEmail } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      taskTitle,
      taskDescription,
      priority,
      dueDate,
      assignedUserIds = [],
      assigneeName,
      departmentId,
      createdByName = 'مدیر سیستم',
    } = body;

    let targetEmails: { email: string; name: string }[] = [];

    // ۱. بررسی کاربران بر اساس ID اگر ارسال شده باشد
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .in('id', assignedUserIds);

      if (users) {
        targetEmails.push(...users.filter(u => !!u.email).map(u => ({ email: u.email, name: u.full_name || 'کاربر گرامی' })));
      }
    }

    // ۲. بررسی بر اساس نام مسئول (اگر نام ارسال شده بود)
    if (targetEmails.length === 0 && assigneeName) {
      const { data: userByName } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .ilike('full_name', `%${assigneeName.trim()}%`)
        .maybeSingle();

      if (userByName?.email) {
        targetEmails.push({ email: userByName.email, name: userByName.full_name });
      }
    }

    // ۳. بررسی بر اساس دپارتمان
    if (departmentId) {
      const { data: deptMembers } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('department_id', departmentId);

      if (deptMembers) {
        targetEmails.push(...deptMembers.filter(u => !!u.email).map(u => ({ email: u.email, name: u.full_name || 'همکار گرامی' })));
      }
    }

    // ۴. فال‌بک تست: اگر هیچ ایمیلی پیدا نشد یا در حالت آزمایشی Resend هستیم
    // ایمیل پیش‌فرض تست را از متغیر محیطی یا ایمیل سازنده می‌گیرد
    const fallbackEmail = process.env.TEST_NOTIFICATION_EMAIL || process.env.RESEND_TEST_EMAIL;
    if (targetEmails.length === 0 && fallbackEmail) {
      targetEmails.push({ email: fallbackEmail, name: assigneeName || 'کاربر سیستم' });
    }

    // حذف موارد تکراری
    const uniqueTargets = Array.from(new Map(targetEmails.map(item => [item.email, item])).values());

    if (uniqueTargets.length === 0) {
      console.warn("هیچ ایمیل مقصدی برای ارسال اعلان تسک پیدا نشد.");
      return NextResponse.json({ success: true, count: 0, message: "No recipients found" });
    }

    // ارسال ایمیل‌ها
    const results = await Promise.allSettled(
      uniqueTargets.map(target =>
        sendTaskNotificationEmail({
          toEmail: target.email,
          userName: target.name,
          taskTitle,
          taskDescription,
          assignedByName: createdByName,
          priority,
          dueDate,
        })
      )
    );

    return NextResponse.json({ success: true, count: uniqueTargets.length, results });
  } catch (error: any) {
    console.error('Error in send-task-email API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
