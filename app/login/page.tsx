'use client';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0A0C0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Courier+Prime:wght@400;700&display=swap');`}</style>

      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 24, left: 24, width: 40, height: 40, borderTop: '2px solid #4A7C59', borderLeft: '2px solid #4A7C59' }} />
      <div style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderTop: '2px solid #4A7C59', borderRight: '2px solid #4A7C59' }} />
      <div style={{ position: 'absolute', bottom: 24, left: 24, width: 40, height: 40, borderBottom: '2px solid #4A7C59', borderLeft: '2px solid #4A7C59' }} />
      <div style={{ position: 'absolute', bottom: 24, right: 24, width: 40, height: 40, borderBottom: '2px solid #4A7C59', borderRight: '2px solid #4A7C59' }} />

      {/* Status bar top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#4A7C59', opacity: 0.6 }} />

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 48, color: '#C8A84B', letterSpacing: 6, fontFamily: "'Courier Prime', monospace", fontWeight: 700 }}>⬡</div>
        </div>

        <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 32, color: '#C8A84B', letterSpacing: 6, fontWeight: 700, marginBottom: 4 }}>
          OPERATOR
        </div>
        <div style={{ fontSize: 10, color: '#6B7560', letterSpacing: 4, marginBottom: 2 }}>
          SECURE MAIL SYSTEM v2.6
        </div>
        <div style={{ fontSize: 9, color: '#2A3828', letterSpacing: 3, marginBottom: 40 }}>
          ████████████████████
        </div>

        {/* Auth box */}
        <div style={{
          background: '#141A12',
          border: '1px solid #2A3828',
          borderRadius: 2,
          padding: '32px 40px',
          width: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{ fontSize: 9, color: '#6B7560', letterSpacing: 3, textAlign: 'left' }}>// AUTHENTICATION REQUIRED</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: '#6B7560', letterSpacing: 2, textAlign: 'left' }}>CLEARANCE LEVEL</div>
            <div style={{ background: '#0A0C0A', border: '1px solid #2A3828', padding: '8px 12px', fontSize: 12, color: '#4A7C59', letterSpacing: 1 }}>
              ■ AUTHORIZED PERSONNEL ONLY
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: '#6B7560', letterSpacing: 2, textAlign: 'left' }}>AUTHENTICATION METHOD</div>
            <button
              onClick={signInWithGoogle}
              style={{
                background: 'transparent',
                border: '1px solid #4A7C59',
                color: '#4A7C59',
                padding: '12px 20px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Share Tech Mono', monospace",
                letterSpacing: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.background = '#0D110C';
                (e.target as HTMLButtonElement).style.borderColor = '#C8A84B';
                (e.target as HTMLButtonElement).style.color = '#C8A84B';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.background = 'transparent';
                (e.target as HTMLButtonElement).style.borderColor = '#4A7C59';
                (e.target as HTMLButtonElement).style.color = '#4A7C59';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              [ SIGN IN WITH GOOGLE ]
            </button>
          </div>

          <div style={{ borderTop: '1px solid #2A3828', paddingTop: 16, fontSize: 9, color: '#2A3828', letterSpacing: 2, textAlign: 'center' }}>
            // UNAUTHORIZED ACCESS PROHIBITED
          </div>
        </div>

        {/* Bottom status */}
        <div style={{ marginTop: 24, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#6B7560', letterSpacing: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4A7C59', display: 'inline-block' }}></span>
            SYSTEM ONLINE
          </div>
          <div style={{ fontSize: 9, color: '#2A3828' }}>|</div>
          <div style={{ fontSize: 9, color: '#6B7560', letterSpacing: 1 }}>ENCRYPTION: AES-256</div>
          <div style={{ fontSize: 9, color: '#2A3828' }}>|</div>
          <div style={{ fontSize: 9, color: '#6B7560', letterSpacing: 1 }}>STATUS: STANDBY</div>
        </div>
      </div>

      {/* Status bar bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#4A7C59', opacity: 0.6 }} />
    </main>
  );
}