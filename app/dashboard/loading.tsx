export default function Loading() {
  return (
    <div style={{
      background: '#0A0C0A',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Share Tech Mono', monospace",
      gap: 16,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');`}</style>
      <span style={{ fontSize: 48, color: '#2A3828' }}>⬡</span>
      <span style={{ fontSize: 12, color: '#4A7C59', letterSpacing: 3 }}>// LOADING INTEL...</span>
      <span style={{ fontSize: 10, color: '#6B7560', letterSpacing: 2 }}>DECRYPTING TRANSMISSIONS</span>
    </div>
  );
}