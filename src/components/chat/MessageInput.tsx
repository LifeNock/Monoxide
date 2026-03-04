'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, X, SmilePlus } from 'lucide-react';
import type { Message } from '@/lib/chat/client';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  onSend: (content: string, replyTo?: string) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
  channelName?: string;
}

export default function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled,
  channelName,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content.trim(), replyingTo?.id);
    setContent('');
    onCancelReply();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '0 1rem 1rem', position: 'relative' }}>
      {/* Reply indicator */}
      {replyingTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px 8px 0 0',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <span>Replying to <strong>{replyingTo.profiles?.display_name}</strong></span>
          <button
            onClick={onCancelReply}
            style={{ background: 'none', padding: 2, color: 'var(--text-muted)', marginLeft: 'auto' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
        borderRadius: replyingTo ? '0 0 8px 8px' : 8,
        padding: '0.5rem 0.75rem',
      }}>
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}
        >
          <SmilePlus size={18} />
        </button>
        <textarea
          ref={inputRef}
          placeholder={`Message #${channelName || 'general'}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            resize: 'none',
            outline: 'none',
            padding: '4px 0',
            maxHeight: 120,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          style={{
            background: 'none',
            padding: 4,
            color: content.trim() ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 8 }}>
          <EmojiPicker
            onSelect={(emojiId) => {
              setContent((c) => c + `:${emojiId}:`);
              setShowEmoji(false);
              inputRef.current?.focus();
            }}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}
    </div>
  );
}
