'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Monitor, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp, Wifi, WifiOff, ArrowLeft, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
  pairing_token: string;
  guacamole_url: string | null;
  protocol: string;
  paired: boolean;
  last_seen: string | null;
  created_at: string;
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 min
}

export default function ConnectPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [newName, setNewName] = useState('My Computer');
  const [adding, setAdding] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Machine | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dockerOs, setDockerOs] = useState<'windows' | 'mac' | 'ubuntu' | 'fedora' | 'arch' | 'opensuse'>('windows');
  const [activeMonitor, setActiveMonitor] = useState<1 | 2>(1);
  const [refreshing, setRefreshing] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sessionContainerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  const fetchMachines = () => {
    fetch('/api/connect/machines')
      .then(r => r.json())
      .then(data => { setMachines(data.machines || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, 30000);
    return () => clearInterval(interval);
  }, []);

  const addMachine = async () => {
    setAdding(true);
    const res = await fetch('/api/connect/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, protocol: 'vnc' }),
    });
    const data = await res.json();
    if (data.machine) {
      setMachines(prev => [data.machine, ...prev]);
      setShowAdd(false);
      setNewName('My Computer');
    }
    setAdding(false);
  };

  const deleteMachine = async (id: string) => {
    await fetch('/api/connect/machines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setMachines(prev => prev.filter(m => m.id !== id));
  };

  const startSession = useCallback(async (machine: Machine) => {
    setConnecting(true);
    setConnectionError(null);
    setActiveSession(machine);

    // Wait for container to mount
    await new Promise(r => setTimeout(r, 100));

    if (!canvasContainerRef.current) {
      setConnectionError('Display container not ready');
      setConnecting(false);
      return;
    }

    try {
      // Load noVNC from static bundle (avoids webpack top-level-await issue)
      let RFB = (window as any).noVNC?.default;
      if (!RFB) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/novnc.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load noVNC'));
          document.head.appendChild(script);
        });
        RFB = (window as any).noVNC?.default;
      }
      if (!RFB) throw new Error('noVNC failed to initialize');

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${window.location.host}/connect-proxy/${machine.id}`;

      const rfb = new RFB(canvasContainerRef.current, wsUrl, {
        wsProtocols: ['binary'],
      });

      rfb.viewOnly = false;
      rfb.focusOnClick = true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.clipViewport = false;
      rfb.qualityLevel = 6;
      rfb.compressionLevel = 2;

      rfb.addEventListener('connect', () => {
        setConnecting(false);
        setConnected(true);
        // Focus the canvas so keyboard input works immediately
        const canvas = canvasContainerRef.current?.querySelector('canvas');
        if (canvas) canvas.focus();
      });

      rfb.addEventListener('disconnect', (e: any) => {
        setConnected(false);
        setConnecting(false);
        if (!e.detail.clean) {
          setConnectionError('Connection lost. Click Connect to retry.');
        }
      });

      rfb.addEventListener('credentialsrequired', () => {
        // Send empty password for passwordless VNC
        rfb.sendCredentials({ password: '' });
      });

      rfbRef.current = rfb;
    } catch (err: any) {
      setConnectionError(err.message || 'Failed to connect');
      setConnecting(false);
    }
  }, []);

  const endSession = useCallback(() => {
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    // Exit browser fullscreen and release keyboard
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
      (navigator as any).keyboard.unlock();
    }
    setActiveSession(null);
    setConnected(false);
    setConnecting(false);
    setConnectionError(null);
    setFullscreen(false);
    setActiveMonitor(1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = sessionContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen({ navigationUI: 'hide' } as any);
        if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
          await (navigator as any).keyboard.lock([]);
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Sync fullscreen state and unlock keyboard on exit
  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setFullscreen(fs);
      if (!fs && 'keyboard' in navigator && (navigator as any).keyboard?.unlock) {
        (navigator as any).keyboard.unlock();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const refreshMachines = async () => {
    setRefreshing(true);
    await fetch('/api/connect/machines')
      .then(r => r.json())
      .then(data => setMachines(data.machines || []))
      .catch(() => {});
    setTimeout(() => setRefreshing(false), 600);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Active remote session view
  if (activeSession) {
    return (
      <div
        ref={sessionContainerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#000',
        }}
      >
        {/* noVNC container is 2x viewport width so scaleViewport
            scales each monitor to exactly 1x viewport width.
            Parent clips to show one monitor at a time. */}
        <style>{`
          .novnc-clip { position: relative; width: 100%; height: 100%; overflow: hidden; }
          .novnc-inner {
            position: absolute;
            width: 200%;
            height: 100%;
            top: 0;
            transition: left 0.4s ease;
          }
          .novnc-inner canvas { cursor: default !important; }
        `}</style>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <button
            onClick={endSession}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} /> Disconnect
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Monitor size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeSession.name}</span>
            {connecting && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connecting...</span>}
            {connected && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Connected</span>}
            {connectionError && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{connectionError}</span>}
          </div>
          {/* Monitor switcher */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveMonitor(1)}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: activeMonitor === 1 ? 600 : 400,
                borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeMonitor === 1 ? 'var(--accent)' : 'transparent',
                color: activeMonitor === 1 ? 'var(--bg-primary)' : 'var(--text-muted)',
              }}
            >
              Display 1
            </button>
            <button
              onClick={() => setActiveMonitor(2)}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: activeMonitor === 2 ? 600 : 400,
                borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeMonitor === 2 ? 'var(--accent)' : 'transparent',
                color: activeMonitor === 2 ? 'var(--bg-primary)' : 'var(--text-muted)',
              }}
            >
              Display 2
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="btn-secondary"
            style={{ padding: '6px', display: 'flex' }}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
        <div className="novnc-clip" style={{ flex: 1, background: '#000' }}>
          <div
            ref={canvasContainerRef}
            className="novnc-inner"
            style={{ left: activeMonitor === 1 ? '0%' : '-100%' }}
            tabIndex={0}
            onClick={() => {
              const canvas = canvasContainerRef.current?.querySelector('canvas');
              if (canvas) canvas.focus();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <Image src="/monoxidelogo.png" alt="" width={48} height={38} className="logo-adaptive" style={{ objectFit: 'contain' }} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, flex: 1 }}>
          Monoxide<sup style={{ fontSize: '0.5em', verticalAlign: 'super', opacity: 0.5 }}>™</sup> <span style={{ color: 'var(--text-secondary)' }}>Connect</span>
        </h1>
        <button
          onClick={refreshMachines}
          disabled={refreshing}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex',
            color: 'var(--text-muted)', borderRadius: 6, transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          title="Refresh machines"
        >
          <RefreshCw size={18} style={{ transition: 'transform 0.6s ease', transform: refreshing ? 'rotate(360deg)' : 'none' }} />
        </button>
      </div>
      <p className="animate-in stagger-1" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Access your home computer from anywhere through your browser.
      </p>

      {/* Setup Guide Toggle */}
      <button
        onClick={() => setShowSetup(!showSetup)}
        className="animate-in stagger-2"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          color: 'var(--accent)',
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1rem',
          cursor: 'pointer',
        }}
      >
        {showSetup ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        How to set up your computer
      </button>

      {showSetup && (
        <div className="card" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Setup Guide</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Step 1 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ background: 'var(--accent)', color: 'var(--bg-primary)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                <strong style={{ color: 'var(--text-primary)' }}>Install Docker on your home computer</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginLeft: 30, marginBottom: '0.5rem' }}>
                Docker is what runs the remote desktop server. Select your operating system:
              </p>

              {/* OS Tabs */}
              <div style={{ marginLeft: 30, display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {([
                  { id: 'windows', label: 'Windows' },
                  { id: 'mac', label: 'macOS' },
                  { id: 'ubuntu', label: 'Ubuntu / Debian' },
                  { id: 'fedora', label: 'Fedora / RHEL' },
                  { id: 'arch', label: 'Arch' },
                  { id: 'opensuse', label: 'openSUSE' },
                ] as const).map(os => (
                  <button
                    key={os.id}
                    onClick={() => setDockerOs(os.id)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: dockerOs === os.id ? 600 : 400,
                      borderRadius: 6,
                      background: dockerOs === os.id ? 'var(--accent)' : 'var(--bg-primary)',
                      color: dockerOs === os.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${dockerOs === os.id ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {os.label}
                  </button>
                ))}
              </div>

              {/* OS-specific instructions */}
              <div style={{
                marginLeft: 30,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
              }}>
                {dockerOs === 'windows' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong></p>
                    <p>1. Download <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Docker Desktop for Windows</a></p>
                    <p>2. Run the installer and follow the prompts</p>
                    <p>3. Restart your computer if prompted</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <p>Open <strong>Docker Desktop</strong> from the Start menu. Wait for the whale icon in the taskbar to stop animating &mdash; that means it&apos;s ready.</p>
                  </>
                )}
                {dockerOs === 'mac' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong></p>
                    <p>1. Download <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Docker Desktop for Mac</a></p>
                    <p>2. Open the .dmg and drag Docker to Applications</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <p>Open <strong>Docker</strong> from Applications or Spotlight. Wait for the whale icon in the menu bar to stop animating.</p>
                  </>
                )}
                {dockerOs === 'ubuntu' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong> Run these commands in Terminal:</p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER`}
                    </code>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Log out and back in after the <code style={{ fontSize: '0.76rem' }}>usermod</code> command for group changes to take effect.</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
{`sudo systemctl enable --now docker`}
                    </code>
                  </>
                )}
                {dockerOs === 'fedora' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong> Run these commands in Terminal:</p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`sudo dnf install -y docker docker-compose
sudo usermod -aG docker $USER`}
                    </code>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Log out and back in after the <code style={{ fontSize: '0.76rem' }}>usermod</code> command for group changes to take effect.</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
{`sudo systemctl enable --now docker`}
                    </code>
                  </>
                )}
                {dockerOs === 'arch' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong> Run these commands in Terminal:</p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`sudo pacman -S docker docker-compose
sudo usermod -aG docker $USER`}
                    </code>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Log out and back in after the <code style={{ fontSize: '0.76rem' }}>usermod</code> command for group changes to take effect.</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
{`sudo systemctl enable --now docker`}
                    </code>
                  </>
                )}
                {dockerOs === 'opensuse' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install:</strong> Run these commands in Terminal:</p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`sudo zypper install -y docker docker-compose
sudo usermod -aG docker $USER`}
                    </code>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Log out and back in after the <code style={{ fontSize: '0.76rem' }}>usermod</code> command for group changes to take effect.</p>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Start Docker:</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
{`sudo systemctl enable --now docker`}
                    </code>
                  </>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ background: 'var(--accent)', color: 'var(--bg-primary)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                <strong style={{ color: 'var(--text-primary)' }}>Install a VNC server on your home PC</strong>
              </div>
              <div style={{
                marginLeft: 30,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
              }}>
                {dockerOs === 'windows' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install TigerVNC:</strong></p>
                    <p>1. Download <a href="https://github.com/TigerVNC/tigervnc/releases" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>TigerVNC (winvnc)</a> from GitHub Releases</p>
                    <p>2. Look for <code style={{ fontSize: '0.76rem' }}>tigervnc-winvnc-X.X.X.exe</code> and install it</p>
                    <p>3. Run <strong>WinVNC</strong> from the Start menu</p>
                    <p>4. Right-click the tray icon &rarr; <strong>Configuration</strong></p>
                    <p>5. Set Authentication to <strong>None</strong> and Encryption to <strong>None</strong></p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>No password needed &mdash; security is handled by Monoxide&apos;s encrypted tunnel.</p>
                  </>
                )}
                {dockerOs === 'mac' && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Screen Sharing (built-in):</strong></p>
                    <p>1. Open <strong>System Settings</strong> &rarr; <strong>General</strong> &rarr; <strong>Sharing</strong></p>
                    <p>2. Enable <strong>Screen Sharing</strong></p>
                    <p>3. Click the info button and note the VNC port (default 5900)</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>macOS has a built-in VNC server &mdash; no extra install needed.</p>
                  </>
                )}
                {(dockerOs === 'ubuntu' || dockerOs === 'fedora' || dockerOs === 'arch' || dockerOs === 'opensuse') && (
                  <>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Install TigerVNC:</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{dockerOs === 'ubuntu' ? 'sudo apt install -y tigervnc-scraping-server' :
 dockerOs === 'fedora' ? 'sudo dnf install -y tigervnc-server' :
 dockerOs === 'arch' ? 'sudo pacman -S tigervnc' :
 'sudo zypper install -y tigervnc'}
                    </code>
                    <p style={{ marginTop: '0.4rem' }}><strong style={{ color: 'var(--text-primary)' }}>Quick start (test it first):</strong></p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`x0vncserver -display :0 -SecurityTypes None -rfbport 5900`}
                    </code>
                    <p style={{ marginTop: '0.6rem' }}><strong style={{ color: 'var(--text-primary)' }}>Auto-start on boot (recommended):</strong></p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>Create a systemd service so VNC starts automatically:</p>
                    <code style={{ display: 'block', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-primary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`sudo tee /etc/systemd/system/x0vncserver.service << 'EOF'
[Unit]
Description=TigerVNC x0vncserver
After=graphical.target

[Service]
Type=simple
ExecStart=/usr/bin/x0vncserver -display :0 -SecurityTypes None -rfbport 5900
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now x0vncserver`}
                    </code>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>VNC will now start automatically whenever you log in. Check status with <code style={{ fontSize: '0.76rem' }}>systemctl status x0vncserver</code>.</p>
                  </>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ background: 'var(--accent)', color: 'var(--bg-primary)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</span>
                <strong style={{ color: 'var(--text-primary)' }}>Add a machine below &amp; run the setup</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginLeft: 30 }}>
                Click <strong>&quot;Add Machine&quot;</strong> below, then run the setup command on your home PC. It automatically installs websockify, a Cloudflare tunnel, and a heartbeat &mdash; all as Docker containers that <strong>restart automatically</strong> on boot. You only need to run the setup once.
              </p>
            </div>

            {/* Step 4 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ background: 'var(--accent)', color: 'var(--bg-primary)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>4</span>
                <strong style={{ color: 'var(--text-primary)' }}>Connect!</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginLeft: 30 }}>
                Once paired, your machine shows as <strong style={{ color: 'var(--success)' }}>Online</strong>. Click <strong>Connect</strong> to view your desktop in real-time. Everything persists across reboots &mdash; just keep Docker running (it starts automatically on most systems).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Machine */}
      <div className="animate-in stagger-3" style={{ marginBottom: '1.5rem' }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="btn-primary" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '10px 20px', fontSize: '0.85rem',
          }}>
            <Plus size={16} /> Add Machine
          </button>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>New Machine</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="My Computer"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={addMachine} className="btn-primary" disabled={adding} style={{ fontSize: '0.85rem' }}>
                {adding ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ fontSize: '0.85rem' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Machines List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading machines...</p>
      ) : machines.length === 0 ? (
        <div className="card animate-in stagger-4" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <Monitor size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>No machines yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
            Add a machine and follow the setup guide to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {machines.map((machine, i) => {
            const online = isOnline(machine.last_seen);
            return (
              <div key={machine.id} className={`card animate-in stagger-${Math.min(i + 4, 8)}`} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'var(--accent-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Monitor size={20} style={{ color: online ? 'var(--success)' : 'var(--text-muted)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{machine.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    {machine.paired ? (
                      <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: online ? 'var(--success)' : 'var(--text-muted)' }}>
                        {online ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {online ? 'Online' : `Offline${machine.last_seen ? ` (last: ${new Date(machine.last_seen).toLocaleTimeString()})` : ''}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Waiting for pairing...</span>
                    )}
                  </div>

                  {/* Show token and setup command for unpaired machines */}
                  {!machine.paired && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <code style={{
                          fontSize: '0.72rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          maxWidth: 240,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--text-secondary)',
                        }}>
                          {machine.pairing_token}
                        </code>
                        <button
                          onClick={() => copyToken(machine.pairing_token)}
                          style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                        >
                          {copiedToken === machine.pairing_token ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '0.5rem 0.75rem',
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}>
{`curl -fsSL ${typeof window !== 'undefined' ? window.location.origin : ''}/connect-setup.sh | bash -s -- \\
  --token ${machine.pairing_token} \\
  --server ${typeof window !== 'undefined' ? window.location.origin : ''}`}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {machine.paired && online && (
                    <button
                      onClick={() => startSession(machine)}
                      className="btn-primary"
                      disabled={connecting}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteMachine(machine.id)}
                    style={{
                      background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      padding: 6, display: 'flex', borderRadius: 6, transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
