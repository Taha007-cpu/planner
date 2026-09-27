  import { Resend } from 'resend';

  const resend = new Resend(process.env.RESEND_API_KEY);

  interface TaskEmailParams {
    toEmail: string;
    userName: string;
    taskTitle: string;
    taskDescription?: string;
    assignedByName?: string;
    priority?: string;
    dueDate?: string;
    departmentName?: string;
  }

  export async function sendTaskNotificationEmail({
    toEmail,
    userName,
    taskTitle,
    taskDescription,
    assignedByName = 'مدیر سیستم',
    priority = 'متوسط',
    dueDate,
    departmentName,
  }: TaskEmailParams) {
    try {
      const isDepartment = !!departmentName;
      const subject = isDepartment
        ? `📢 تسک گروهی جدید برای دپارتمان ${departmentName}: ${taskTitle}`
        : `🎯 تسک جدید به شما محول شد: ${taskTitle}`;

      const priorityBadgeColor =
        priority === 'فوری' || priority === 'بالا' || priority === 'high'
          ? '#ef4444'
          : priority === 'متوسط' || priority === 'medium'
          ? '#f59e0b'
          : '#10b981';

      const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; direction: rtl; }
          .card { max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: ${priorityBadgeColor}20; color: ${priorityBadgeColor}; border: 1px solid ${priorityBadgeColor}40; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px; line-height: 1.5; }
          .desc { font-size: 14px; line-height: 1.8; color: #9ca3af; margin: 0 0 24px; white-space: pre-wrap; background: #1a2234; padding: 14px; border-radius: 10px; border-right: 3px solid #3b82f6; }
          .info-row { display: flex; justify-content: space-between; font-size: 13px; color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #1f2937; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 24px; }
          .footer { text-align: center; font-size: 11px; color: #6b7280; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">اولویت: ${priority}</div>
          <h2 class="title">${taskTitle}</h2>
          
          <p style="font-size: 14px; color: #d1d5db; margin: 0 0 16px;">
            سلام <strong>${userName}</strong> عزیز،<br>
            ${isDepartment ? `یک تسک جدید برای دپارتمان <strong>${departmentName}</strong> ثبت شد.` : `یک تسک جدید توسط <strong>${assignedByName}</strong> به شما محول شد.`}
          </p>

          ${taskDescription ? `<div class="desc">${taskDescription}</div>` : ''}

          <div style="margin: 16px 0;">
            ${dueDate ? `<div class="info-row"><span>مهلت انجام:</span><strong style="color:#f3f4f6;">${dueDate}</strong></div>` : ''}
            <div class="info-row"><span>ثبت‌کننده:</span><strong style="color:#f3f4f6;">${assignedByName}</strong></div>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks" class="btn">
            مشاهده تسک در پنل کاربری ←
          </a>

          <div class="footer">این ایمیل به صورت خودکار از اتوماسیون سازمانی ارسال شده است.</div>
        </div>
      </body>
      </html>
      `;

      // ارسال از طریق Resend
      // در حالت تستی بدون دامنه اختصاصی، From باید onboarding@resend.dev باشد
      const response = await resend.emails.send({
        from: 'اتوماسیون سازمانی <onboarding@resend.dev>',
        to: [toEmail],
        subject: subject,
        html: htmlContent,
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('خطا در ارسال ایمیل:', error);
      return { success: false, error };
    }
  }
