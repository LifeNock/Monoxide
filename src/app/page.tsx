import Image from 'next/image';
import Link from 'next/link';
import FunFact from '@/components/FunFact';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '2rem',
    }}>
      <Image
        src="/MonoxideLogo.png"
        alt="Monoxide"
        width={120}
        height={120}
        priority
      />
      <h1 className="wordmark" style={{ fontSize: '3rem', color: 'var(--accent)' }}>
        MONOXIDE
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', textAlign: 'center' }}>
        The all-in-one unblocked platform
      </p>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <Link href="/proxy">
          <button className="btn-primary" style={{ minWidth: 140 }}>Proxy</button>
        </Link>
        <Link href="/games">
          <button className="btn-primary" style={{ minWidth: 140 }}>Games</button>
        </Link>
        <Link href="/chat">
          <button className="btn-secondary" style={{ minWidth: 140 }}>Chat</button>
        </Link>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '0.5rem',
      }}>
        <Link href="/login">
          <button className="btn-secondary">Log In</button>
        </Link>
        <Link href="/signup">
          <button className="btn-primary">Sign Up</button>
        </Link>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <FunFact />
      </div>
    </div>
  );
}
