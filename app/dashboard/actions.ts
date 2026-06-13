'use server';

import { createClient } from '@/lib/supabase/server';
import { corsair } from '@/server/corsair';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { tenant: corsair.withTenant(user.id) as any, user };
}

export async function sendEmail(to: string, subject: string, body: string) {
  const { tenant } = await getTenant();

  const raw = btoa(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain\r\n\r\n${body}`)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await tenant.gmail.api.messages.send({ raw });
  revalidatePath('/dashboard');
}

export async function archiveEmail(id: string) {
  const { tenant } = await getTenant();
  await tenant.gmail.api.messages.modify({
    id,
    removeLabelIds: ['INBOX'],
  });
  revalidatePath('/dashboard');
}

export async function createCalendarEvent(summary: string, start: string, end: string, attendees?: string) {
  const { tenant } = await getTenant();
  await tenant.googlecalendar.api.events.create({
    calendarId: 'primary',
    event: {
      summary,
      start: { dateTime: new Date(start).toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: new Date(end).toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: attendees ? [{ email: attendees }] : [],
    },
  });
  revalidatePath('/dashboard');
}
export async function getSentEmails() {
  const { tenant } = await getTenant();
  const res = await tenant.gmail.api.messages.list({ labelIds: ['SENT'], maxResults: 20 });
  const messages = res?.messages || [];

  // Fetch each message to get snippet
  const detailed = await Promise.all(
    messages.map((m: any) => tenant.gmail.api.messages.get({ id: m.id }))
  );

  return detailed;
}
export async function getDraftEmails() {
  const { tenant } = await getTenant();
  const res = await tenant.gmail.api.drafts.list({});
  const drafts = res?.drafts || [];

  const detailed = await Promise.all(
    drafts.map((d: any) => tenant.gmail.api.drafts.get({ id: d.id }))
  );

  return detailed;
}

export async function getEmailBody(threadId: string) {
  const { tenant } = await getTenant();
  const thread = await tenant.gmail.api.threads.get({ id: threadId });
  const messages = thread.messages || [];

  return messages.map((msg: any) => {
    const headers = msg.payload?.headers || [];
    const get = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

    const extractBody = (part: any): string => {
      // Prefer plain text over HTML
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
      if (part.parts) {
        // Try to find text/plain first
        const plainPart = part.parts.find((p: any) => p.mimeType === 'text/plain');
        if (plainPart?.body?.data) {
          return Buffer.from(plainPart.body.data, 'base64url').toString('utf-8');
        }
        // Fall back to recursive extraction
        return part.parts.map(extractBody).filter(Boolean).join('\n');
      }
      // Last resort: HTML with tags stripped
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        return html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s{2,}/g, '\n')
          .trim();
      }
      return '';
    };

    return {
      id: msg.id,
      from: get('From'),
      to: get('To'),
      subject: get('Subject'),
      date: get('Date'),
      body: extractBody(msg.payload) || msg.snippet,
    };
  });
}
export async function classifyEmailPriorities(emails: { id: string; from: string; subject: string; snippet: string }[]): Promise<string[]> {
  const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      max_tokens: 500,
      messages: [{
        role: 'system',
        content: 'You are an email priority classifier. Respond only with a JSON array of strings.',
      }, {
        role: 'user',
        content: `Classify each email as "high", "med", or "low" priority.

High: urgent, personal, financial, security alerts, requires action, from real people you know
Med: newsletters you care about, work updates, important notifications
Low: marketing, promotions, automated emails, bulk newsletters, social media notifications

Emails:
${emails.map((e, i) => `${i}. From: ${e.from} | Subject: ${e.subject} | Preview: ${e.snippet}`).join('\n')}

Respond ONLY with a JSON array like: ["high","low","med","low"]
Same order as input. No explanation, no markdown.`
      }]
    })
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '[]';
  try {
    const parsed = JSON.parse(text.trim());
    return parsed;
  } catch {
    return emails.map(() => 'low');
  }
}