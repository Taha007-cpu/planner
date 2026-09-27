import { NextResponse } from 'next/server';

type Priority = 'high' | 'medium' | 'low';

type GeneratedTask = {
  title: string;
  priority: Priority;
};

type AIResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function isValidTaskResponse(value: unknown): value is { tasks: GeneratedTask[] } {
  if (!value || typeof value !== 'object' || !('tasks' in value)) {
    return false;
  }

  const tasks = (value as { tasks: unknown }).tasks;

  return (
    Array.isArray(tasks) &&
    tasks.every(
      (task) =>
        task &&
        typeof task === 'object' &&
        typeof (task as GeneratedTask).title === 'string' &&
        ['high', 'medium', 'low'].includes((task as GeneratedTask).priority),
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return NextResponse.json(
        { error: 'متن هدف ارسال نشده است.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GAPGPT_API_KEY;
    const baseUrl = process.env.GAPGPT_BASE_URL || 'https://api.gapgpt.app/v1';
    const model = process.env.GAPGPT_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'کلید GapGPT تنظیم نشده است.' },
        { status: 500 },
      );
    }

    const systemPrompt =
      'You are a task planner. Break the user prompt into 3 to 7 actionable tasks in Persian. ' +
      'Return ONLY valid JSON in this exact structure: ' +
      '{"tasks":[{"title":"task title in Persian","priority":"high"}]}. ' +
      'Priorities must be exactly: high, medium, or low.';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = (await response.json()) as AIResponse;

    if (!response.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message || 'خطا در ارتباط با GapGPT' },
        { status: response.status || 500 },
      );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'پاسخ معتبری از هوش مصنوعی دریافت نشد.' },
        { status: 502 },
      );
    }

    // حذف Markdown fence بدون استفاده از Regex مشکل‌ساز
    const markdownFence = '`'.repeat(3);
    const rawContent = content
      .replaceAll(`${markdownFence}json`, '')
      .replaceAll(markdownFence, '')
      .trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: 'پاسخ هوش مصنوعی JSON معتبر نیست.' },
        { status: 502 },
      );
    }

    if (!isValidTaskResponse(parsed)) {
      return NextResponse.json(
        { error: 'ساختار پاسخ هوش مصنوعی معتبر نیست.' },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'خطای غیرمنتظره در سرور رخ داد.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

