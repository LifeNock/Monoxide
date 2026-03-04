'use client';

import { ArrowLeft, X, ExternalLink } from 'lucide-react';

interface ProxyFrameProps {
  url: string;
  onClose: () => void;
}

export default function ProxyFrame({ url, onClose }: ProxyFrameProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Top bar */}
      <div style={{
        height: 40,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.75rem',
        gap: '0.5rem',
      }}>
        <button
          onClick={() => {
            const iframe = document.getElementById('proxy-iframe') as HTMLIFrameElement;
            if (iframe?.contentWindow) {
              iframe.contentWindow.history.back();
            }
          }}
          style={{
            background: 'none',
            color: 'var(--text-secondary)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{
          flex: 1,
          background: 'var(--input-bg)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {url}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            color: 'var(--text-secondary)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Iframe */}
      <iframe
        id="proxy-iframe"
        src={url}
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
