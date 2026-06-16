import { createClient } from '@/lib/supabase/server';
import { corsair } from '@/server/corsair';
import { redirect } from 'next/navigation';
import InboxClient from './inbox-client';

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
      tenant.gmail.api.threads.list({ maxResults: 5 }),
      tenant.googlecalendar.api.events.getMany({}),
    ]);

    const threadList = threadsRes?.threads?.slice(0, 5) || [];

    const threadDetails = await Promise.allSettled(
      threadList.map((t: any) => tenant.gmail.api.threads.get({ id: t.id }))
    );

    threads = threadDetails
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => {
        const t = r.value;
        const firstMsg = t.messages?.[0];
        const headers = firstMsg?.payload?.headers || [];
        const get = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
        return {
          id: t.id,
          from: get('From'),
          subject: get('Subject'),
          snippet: firstMsg?.snippet || '',
          date: get('Date'),
          priority: 'low' as const, // classified client-side
        };
      });

    events = eventsRes?.items || [];
  } catch (e: any) {
    if (e.message?.includes('Account not found')) needsConnect = true;
  }

  if (needsConnect) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0C0A', color: '#D4D9C8', fontFamily: 'Share Tech Mono, monospace' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontFamily: 'Courier Prime, monospace', fontSize: 28, color: '#C8A84B', letterSpacing: 4 }}>⬡ OPERATOR</h1>
          <p style={{ color: '#6B7560', letterSpacing: 2, fontSize: 11 }}>// AUTHENTICATION REQUIRED</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/api/connect?plugin=gmail" style={{ background: 'transparent', border: '1px solid #4A7C59', color: '#4A7C59', padding: '10px 20px', borderRadius: 2, fontWeight: 500, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, letterSpacing: 1 }}>[ CONNECT GMAIL ]</a>
            <a href="/api/connect?plugin=googlecalendar" style={{ background: 'transparent', border: '1px solid #C8A84B', color: '#C8A84B', padding: '10px 20px', borderRadius: 2, fontWeight: 500, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, letterSpacing: 1 }}>[ CONNECT CALENDAR ]</a>
          </div>
        </div>
      </main>
    );
  }

  return <InboxClient threads={threads} events={events} userEmail={user.email!} />;
}