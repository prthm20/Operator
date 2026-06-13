'use client';

import { useEffect, useState, useCallback } from 'react';
import { sendEmail, archiveEmail, createCalendarEvent, getSentEmails, getDraftEmails, getEmailBody,loadMoreEmails } from './actions';

const C = {
  bg: '#0A0C0A', surface: '#141A12', border: '#2A3828',
  green: '#4A7C59', gold: '#C8A84B', red: '#8B2020',
  text: '#D4D9C8', muted: '#6B7560', body: '#A0A890',
  high: '#8B2020', med: '#C8A84B', low: '#4A7C59',
};

const FONT_MONO = "'Share Tech Mono', monospace";
const FONT_COURIER = "'Courier Prime', monospace";

type Priority = 'high' | 'med' | 'low';
type Email = { id: string; from: string; subject: string; snippet: string; body?: string; priority: Priority; time: string; };
type CalEvent = { id: string; name: string; time: string; color: string; };

function PriorityBadge({ p }: { p: Priority }) {
  const map: Record<Priority, { bg: string; color: string; border: string; label: string }> = {
    high: { bg: '#1A0A0A', color: '#8B2020', border: '#8B2020', label: '■ PRIORITY ALPHA' },
    med:  { bg: '#1A1400', color: '#C8A84B', border: '#C8A84B', label: '■ PRIORITY BRAVO' },
    low:  { bg: '#0A1A0A', color: '#4A7C59', border: '#4A7C59', label: '■ PRIORITY CHARLIE' },
  };
  const s = map[p];
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 9, padding: '1px 6px', borderRadius: 1, letterSpacing: 1, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function InboxClient({ threads, events, userEmail }: { threads: any[]; events: any[]; userEmail: string; }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [filtered, setFiltered] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventAttendee, setEventAttendee] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentResult, setAgentResult] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [view, setView] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [draftEmails, setDraftEmails] = useState<Email[]>([]);
  const [loadingView, setLoadingView] = useState(false);
  const [emailBody, setEmailBody] = useState<any[]>([]);
  const [loadingBody, setLoadingBody] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const mapped: Email[] = threads.map((t: any, i: number) => ({
      id: t.id,
      from: t.from || 'UNKNOWN',
      subject: t.subject || '(NO SUBJECT)',
      snippet: t.snippet || '',
      priority: t.priority || (i < 3 ? 'high' : i < 7 ? 'med' : 'low'),
      time: t.date || 'RECENT',
    }));
    setEmails(mapped);
    setFiltered(mapped);

    const mappedEvents: CalEvent[] = (events || []).map((e: any, i: number) => ({
      id: e.id,
      name: e.summary || 'OPERATION',
      time: e.start?.dateTime || e.start?.date || '',
      color: [C.gold, C.green, C.red][i % 3],
    }));
    setCalEvents(mappedEvents);
  }, [threads, events]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? emails.filter(e =>
      e.from.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    ) : emails);
  }, [search, emails]);

  const handleArchive = useCallback(async (id: string) => {
    await archiveEmail(id);
    setEmails(prev => prev.filter(e => e.id !== id));
    setSelected(null);
    showToast('// ARCHIVED');
  }, []);

  const handleSelectEmail = async (e: Email) => {
    setSelected(e);
    setEmailBody([]);
    setLoadingBody(true);
    try {
      const messages = await getEmailBody(e.id);
      setEmailBody(messages);
    } catch { }
    setLoadingBody(false);
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject) return;
    setSending(true);
    try {
      await sendEmail(composeTo, composeSubject, composeBody);
      setShowCompose(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
      showToast('// TRANSMISSION SENT');
    } catch { showToast('// TRANSMISSION FAILED'); }
    setSending(false);
  };

  const handleCreateEvent = async () => {
    if (!eventName || !eventStart || !eventEnd) return;
    setSending(true);
    try {
      await createCalendarEvent(eventName, eventStart, eventEnd, eventAttendee);
      setShowEventModal(false);
      showToast('// OPERATION SCHEDULED');
    } catch { showToast('// SCHEDULING FAILED'); }
    setSending(false);
  };

  const runAgent = async () => {
    if (!agentPrompt) return;
    setAgentLoading(true);
    setAgentResult('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: agentPrompt }),
      });
      const data = await res.json();
      setAgentResult(data.result || '// MISSION COMPLETE');
    } catch {
      setAgentResult('// AGENT COMM FAILURE');
    }
    setAgentLoading(false);
  };

  const handleNavClick = async (nav: 'inbox' | 'sent' | 'drafts') => {
    setView(nav);
    setSelected(null);
    setEmailBody([]);
    if (nav === 'sent' && sentEmails.length === 0) {
      setLoadingView(true);
      const data = await getSentEmails();
      setSentEmails(data.map((m: any) => ({
        id: m.id,
        from: m.payload?.headers?.find((h: any) => h.name === 'To')?.value || 'UNKNOWN',
        subject: m.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(NO SUBJECT)',
        snippet: m.snippet || '',
        priority: 'low' as Priority,
        time: m.payload?.headers?.find((h: any) => h.name === 'Date')?.value || 'SENT',
      })));
      setLoadingView(false);
    }
    if (nav === 'drafts' && draftEmails.length === 0) {
      setLoadingView(true);
      const data = await getDraftEmails();
      setDraftEmails(data.map((d: any) => ({
        id: d.id,
        from: 'SELF',
        subject: d.message?.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(NO SUBJECT)',
        snippet: d.message?.snippet || '',
        priority: 'low' as Priority,
        time: 'DRAFT',
      })));
      setLoadingView(false);
    }
  };

  const openReply = () => {
    if (!selected) return;
    setComposeTo(selected.from);
    setComposeSubject(`Re: ${selected.subject}`);
    setComposeBody('');
    setShowCompose(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'c') { setShowCompose(true); return; }
      if (e.key === 'e' && selected) { handleArchive(selected.id); return; }
      if (e.key === 'r' && selected) { openReply(); return; }
      if (e.key === '/') { document.getElementById('op-search')?.focus(); e.preventDefault(); return; }
      const idx = filtered.findIndex(x => x.id === selected?.id);
      if (e.key === 'j') handleSelectEmail(filtered[idx + 1] || filtered[0]);
      if (e.key === 'k') handleSelectEmail(filtered[idx - 1] || filtered[filtered.length - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, filtered, handleArchive]);
  
  useEffect(() => {
  if (emails.length === 0) return;

  const fetchMore = async () => {
    setLoadingMore(true);
    try {
      const more = await loadMoreEmails(5);
      const mapped: Email[] = more.map((t: any) => ({
        id: t.id,
        from: t.from || 'UNKNOWN',
        subject: t.subject || '(NO SUBJECT)',
        snippet: t.snippet || '',
        priority: t.priority,
        time: t.date || 'RECENT',
      }));
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEmails = mapped.filter(e => !existingIds.has(e.id));
        return [...prev, ...newEmails];
      });
    } catch { }
    setLoadingMore(false);
  };

  fetchMore();
}, [emails.length]);
  const groups: { label: string; p: Priority }[] = [
    { label: 'PRIORITY ALPHA', p: 'high' },
    { label: 'PRIORITY BRAVO', p: 'med' },
    { label: 'PRIORITY CHARLIE', p: 'low' },
  ];

  const activeEmails = view === 'inbox' ? filtered : view === 'sent' ? sentEmails : draftEmails;

  const navItems = [
    { icon: '📥', label: 'INBOX', nav: 'inbox' as const },
    { icon: '📤', label: 'SENT', nav: 'sent' as const },
    { icon: '📝', label: 'DRAFTS', nav: 'drafts' as const },
  ];

  const inputStyle = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, padding: '8px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: FONT_MONO };
  const btnStyle = { background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 2, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: FONT_MONO, letterSpacing: 1 };
  const btnPrimaryStyle = { ...btnStyle, borderColor: C.green, color: C.green };

  return (
    <div style={{ background: C.bg, color: C.text, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: FONT_MONO, position: 'relative' }}>

      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Courier+Prime:wght@400;700&display=swap');`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.surface, border: `1px solid ${C.green}`, color: C.green, padding: '10px 18px', borderRadius: 2, fontWeight: 700, fontSize: 12, zIndex: 100, letterSpacing: 1 }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#0D110C', borderBottom: `2px solid ${C.green}`, padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, marginRight: 8 }}>
          <span style={{ fontFamily: FONT_COURIER, fontSize: 15, color: C.gold, letterSpacing: 3, fontWeight: 700 }}>⬡ OPERATOR</span>
          <span style={{ fontSize: 8, color: C.muted, letterSpacing: 2 }}>SECURE MAIL SYS v2.6</span>
        </div>
        <input
          id="op-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="// SEARCH INTEL DATABASE..."
          style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', fontFamily: FONT_MONO }}
        />
        <button onClick={() => setShowCompose(true)} style={btnPrimaryStyle}>[ COMPOSE ]</button>
        <button onClick={() => setShowAgent(true)} style={{ ...btnStyle, borderColor: C.gold, color: C.gold }}>⬡ AGENT</button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 170, background: C.bg, borderRight: `1px solid ${C.border}`, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, overflowY: 'auto' }}>
          {navItems.map(item => (
            <div key={item.label} onClick={() => handleNavClick(item.nav)}
              style={{ padding: '7px 10px', fontSize: 11, color: view === item.nav ? C.green : C.muted, background: view === item.nav ? C.surface : 'transparent', borderLeft: view === item.nav ? `2px solid ${C.green}` : '2px solid transparent', cursor: 'pointer', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.icon} {item.label}
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
          <div style={{ fontSize: 9, color: C.muted, padding: '4px 10px', letterSpacing: 2 }}>// OPERATIONS</div>

          {calEvents.map(ev => (
            <div key={ev.id} style={{ padding: '5px 10px', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: ev.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>▶ {ev.name}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{ev.time}</div>
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
          <button onClick={() => setShowEventModal(true)}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontFamily: FONT_MONO, letterSpacing: 1, textAlign: 'left', margin: '0 4px' }}>
            + NEW OPERATION
          </button>
        </div>

        {/* Email List */}
        <div style={{ width: 270, borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
          {view === 'inbox' ? (
            groups.map(g => {
              const items = filtered.filter(e => e.priority === g.p);
              if (!items.length) return null;
              return (
                <div key={g.p}>
                  <div style={{ padding: '8px 12px', fontSize: 9, color: C.muted, letterSpacing: 2, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg, zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: C.green }}>▶</span> {g.label}
                  </div>
                  {items.map(e => (
                    <div key={e.id} onClick={() => handleSelectEmail(e)}
                      style={{ padding: '9px 12px', borderBottom: `1px solid ${C.surface}`, cursor: 'pointer', background: selected?.id === e.id ? C.surface : 'transparent', borderLeft: selected?.id === e.id ? `2px solid ${C.green}` : '2px solid transparent', transition: 'background 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C[e.priority], flexShrink: 0 }}></span>
                          {e.from}
                        </span>
                        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{e.time}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</div>
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            <>
              <div style={{ padding: '8px 12px', fontSize: 9, color: C.muted, letterSpacing: 2, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg }}>
                <span style={{ color: C.green }}>▶</span> {view === 'sent' ? 'SENT TRANSMISSIONS' : 'DRAFT TRANSMISSIONS'}
              </div>
              {loadingView && <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 11 }}>// LOADING...</div>}
              {activeEmails.map(e => (
                <div key={e.id} onClick={() => handleSelectEmail(e)}
                  style={{ padding: '9px 12px', borderBottom: `1px solid ${C.surface}`, cursor: 'pointer', background: selected?.id === e.id ? C.surface : 'transparent', borderLeft: selected?.id === e.id ? `2px solid ${C.green}` : '2px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.from}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</div>
                </div>
              ))}
              {!loadingView && activeEmails.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 11 }}>// NO TRANSMISSIONS</div>
              )}
            </>
          )}

          {loadingMore && (
  <div style={{ padding: '10px 12px', fontSize: 10, color: C.muted, letterSpacing: 2, textAlign: 'center' }}>
    // LOADING MORE INTEL...
  </div>
)}
        </div>

        {/* Email Detail */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, gap: 8 }}>
              <span style={{ fontSize: 36, color: C.border }}>⬡</span>
              <span style={{ fontSize: 12, letterSpacing: 2 }}>// AWAITING SELECTION</span>
              <span style={{ fontSize: 10, color: C.border }}>USE J/K TO NAVIGATE</span>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: '#0D110C', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <PriorityBadge p={selected.priority} />
                  <span style={{ fontSize: 8, letterSpacing: 2, padding: '1px 4px', border: `1px solid ${C.red}`, color: C.red, borderRadius: 1 }}>CLASSIFIED</span>
                </div>
                <div style={{ fontFamily: FONT_COURIER, fontSize: 16, color: C.text, marginBottom: 6, fontWeight: 700 }}>{selected.subject}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.green }}>// {selected.from}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{selected.time}</span>
                </div>
              </div>
              <div style={{ flex: 1, padding: 18, fontSize: 12, color: C.body, lineHeight: 1.8, overflowY: 'auto', fontFamily: FONT_MONO }}>
                {loadingBody ? (
                  <span style={{ color: C.muted }}>// DECRYPTING...</span>
                ) : emailBody.length > 0 ? (
                  emailBody.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: 24 }}>
                      {emailBody.length > 1 && (
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                          <span style={{ color: C.green }}>{msg.from}</span> · {msg.date}
                        </div>
                      )}
                      <span style={{ color: C.muted }}>// BEGIN TRANSMISSION //<br/><br/></span>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.body.replace(/<[^>]*>/g, '').trim()}
                      </div>
                      <br/><span style={{ color: C.muted }}>// END TRANSMISSION //</span>
                    </div>
                  ))
                ) : (
                  <div><span style={{ color: C.muted }}>// BEGIN TRANSMISSION //<br/><br/></span>{selected?.snippet}<br/><br/><span style={{ color: C.muted }}>// END TRANSMISSION //</span></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '10px 18px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
                <button onClick={openReply} style={btnPrimaryStyle}>↩ REPLY</button>
                <button onClick={() => handleArchive(selected.id)} style={btnStyle}>ARCHIVE</button>
                <button onClick={() => showToast('// MARKED AS SPAM')} style={btnStyle}>MARK SPAM</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Shortcut bar */}
      <div style={{ padding: '4px 14px', background: C.bg, borderTop: `1px solid ${C.surface}`, display: 'flex', gap: 16, flexShrink: 0 }}>
        {[['C','COMPOSE'],['J/K','NAVIGATE'],['R','REPLY'],['E','ARCHIVE'],['/','SEARCH']].map(([k, v]) => (
          <span key={k} style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 1 }}>
            <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: '1px 5px', fontFamily: FONT_MONO, fontSize: 9, color: C.green }}>{k}</span> {v}
          </span>
        ))}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 2, width: 460, padding: 24 }}>
            <div style={{ fontFamily: FONT_COURIER, color: C.gold, fontSize: 14, marginBottom: 4, display: 'flex', justifyContent: 'space-between', letterSpacing: 2, fontWeight: 700 }}>
              ⬡ NEW TRANSMISSION
              <span onClick={() => setShowCompose(false)} style={{ cursor: 'pointer', color: C.muted, fontSize: 14 }}>✕</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 16 }}>// COMPOSE SECURE MESSAGE</div>
            {[
              { label: 'TO', value: composeTo, setter: setComposeTo, placeholder: 'recipient@domain.com' },
              { label: 'SUBJECT', value: composeSubject, setter: setComposeSubject, placeholder: 'Message subject' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, letterSpacing: 2 }}>{f.label}</div>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, letterSpacing: 2 }}>MESSAGE</div>
              <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="// Enter message body..."
                style={{ ...inputStyle, resize: 'none', height: 100 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCompose(false)} style={btnStyle}>[ CANCEL ]</button>
              <button onClick={handleSend} disabled={sending} style={{ ...btnPrimaryStyle, opacity: sending ? 0.7 : 1 }}>
                {sending ? '// TRANSMITTING...' : '[ SEND ]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 2, width: 420, padding: 24 }}>
            <div style={{ fontFamily: FONT_COURIER, color: C.gold, fontSize: 14, marginBottom: 4, display: 'flex', justifyContent: 'space-between', letterSpacing: 2, fontWeight: 700 }}>
              ⬡ NEW OPERATION
              <span onClick={() => setShowEventModal(false)} style={{ cursor: 'pointer', color: C.muted }}>✕</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 16 }}>// SCHEDULE OPERATION</div>
            {[
              { label: 'OPERATION NAME', value: eventName, setter: setEventName, placeholder: 'Mission briefing', type: 'text' },
              { label: 'START TIME', value: eventStart, setter: setEventStart, placeholder: '', type: 'datetime-local' },
              { label: 'END TIME', value: eventEnd, setter: setEventEnd, placeholder: '', type: 'datetime-local' },
              { label: 'ATTENDEE (OPTIONAL)', value: eventAttendee, setter: setEventAttendee, placeholder: 'agent@domain.com', type: 'email' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, letterSpacing: 2 }}>{f.label}</div>
                <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEventModal(false)} style={btnStyle}>[ CANCEL ]</button>
              <button onClick={handleCreateEvent} disabled={sending} style={{ ...btnStyle, borderColor: C.gold, color: C.gold, opacity: sending ? 0.7 : 1 }}>
                {sending ? '// SCHEDULING...' : '[ CONFIRM ]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      {showAgent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 2, width: 520, padding: 24 }}>
            <div style={{ fontFamily: FONT_COURIER, color: C.gold, fontSize: 14, marginBottom: 4, display: 'flex', justifyContent: 'space-between', letterSpacing: 2, fontWeight: 700 }}>
              ⬡ AGENT COMMAND
              <span onClick={() => setShowAgent(false)} style={{ cursor: 'pointer', color: C.muted }}>✕</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>// ISSUE COMMAND TO AI AGENT</div>
            {[
              "Send an email to aprathamm@gmail.com saying I'll be late to the meeting",
              "Create a calendar event called Team Sync tomorrow at 3pm for 1 hour",
              "Send a calendar invite to aprathamm@gmail.com at 9 AM next Thursday and email them too",
            ].map(ex => (
              <div key={ex} onClick={() => setAgentPrompt(ex)}
                style={{ fontSize: 11, color: C.green, cursor: 'pointer', padding: '5px 0', borderBottom: `1px solid ${C.border}`, letterSpacing: 0.5 }}>
                ▶ {ex}
              </div>
            ))}
            <textarea
              value={agentPrompt}
              onChange={e => setAgentPrompt(e.target.value)}
              placeholder="// Enter command..."
              style={{ ...inputStyle, resize: 'none', height: 80, marginTop: 12 }}
            />
            {agentResult && (
              <div style={{ background: '#0A1A0A', border: `1px solid ${C.green}`, borderRadius: 2, padding: 12, fontSize: 12, color: C.green, marginTop: 12, whiteSpace: 'pre-wrap', fontFamily: FONT_MONO }}>
                <span style={{ color: C.muted }}>// AGENT RESPONSE //<br/></span>
                {agentResult}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setShowAgent(false)} style={btnStyle}>[ CANCEL ]</button>
              <button onClick={runAgent} disabled={agentLoading} style={{ ...btnStyle, borderColor: C.gold, color: C.gold, opacity: agentLoading ? 0.7 : 1 }}>
                {agentLoading ? '// EXECUTING...' : '[ EXECUTE ]'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}