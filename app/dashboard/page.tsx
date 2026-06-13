import { createClient } from '@/lib/supabase/server';
import { corsair } from '@/server/corsair';
import { redirect } from 'next/navigation';
import InboxClient from './inbox-client';
import { classifyEmailPriorities } from './actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let threads: any[] = [];
  let events: any[] = [];
  let needsConnect = false;

  try {
    const tenant = corsair.withTenant(user.id) as any;
    const [threadsRes, eventsRes] = await Promise.all([
      tenant.gmail.api.threads.list({}),
      tenant.googlecalendar.api.events.getMany({}),
    ]);

    const threadList = threadsRes?.threads?.slice(0, 20) || [];
    const threadDetails = await Promise.all(
      threadList.map((t: any) => tenant.gmail.api.threads.get({ id: t.id }))
    );

    const rawThreads = threadDetails.map((t: any) => {
      const firstMsg = t.messages?.[0];
      const headers = firstMsg?.payload?.headers || [];
      const get = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
      return {
        id: t.id,
        from: get('From'),
        subject: get('Subject'),
        snippet: firstMsg?.snippet || '',
        date: get('Date'),
      };
    });

    const priorities = await classifyEmailPriorities(
      rawThreads.map(t => ({ id: t.id, from: t.from, subject: t.subject, snippet: t.snippet }))
    );

    threads = rawThreads.map((t, i) => ({
      ...t,
      priority: (['high', 'med', 'low'].includes(priorities[i]) ? priorities[i] : 'low') as 'high' | 'med' | 'low',
    }));

    events = eventsRes?.items || [];
  } catch (e: any) {
    if (e.message?.includes('Account not found')) needsConnect = true;
  }

  if (needsConnect) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0A0E', color: '#F5E6D3', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#F5A623' }}>✦ Operator</h1>
          <p style={{ color: '#8B7355' }}>Connect your accounts to get started</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/api/connect?plugin=gmail" style={{ background: '#F5A623', color: '#0D0A0E', padding: '10px 20px', borderRadius: 8, fontWeight: 500, textDecoration: 'none' }}>Connect Gmail</a>
            <a href="/api/connect?plugin=googlecalendar" style={{ background: '#E91E8C', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 500, textDecoration: 'none' }}>Connect Calendar</a>
          </div>
        </div>
      </main>
    );
  }

  return <InboxClient threads={threads} events={events} userEmail={user.email!} />;
}