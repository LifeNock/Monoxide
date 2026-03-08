'use client';

import { useState, useRef, useEffect, useMemo, KeyboardEvent, DragEvent } from 'react';
import { Send, X, SmilePlus, ImagePlus, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/chat/client';
import EmojiPicker from './EmojiPicker';
import { replaceShortcodes, getShortcodeSuggestions } from '@/lib/emoji-shortcodes';
import { TwemojiEmoji, TwemojiText } from '@/lib/twemoji';

interface MessageInputProps {
  onSend: (content: string, replyTo?: string, imageUrl?: string) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
  channelName?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled,
  channelName,
  onTypingStart,
  onTypingStop,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shortcodeQuery, setShortcodeQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const suggestions = useMemo(() => {
    if (!shortcodeQuery) return [];
    return getShortcodeSuggestions(shortcodeQuery);
  }, [shortcodeQuery]);

  // Extract shortcode query from current cursor position
  const updateShortcodeQuery = (text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    // Look for an unclosed : before cursor
    const match = before.match(/:([a-zA-Z0-9_+-]{1,30})$/);
    if (match) {
      setShortcodeQuery(match[1]);
      setSelectedSuggestion(0);
    } else {
      setShortcodeQuery('');
    }
  };

  const applySuggestion = (suggestion: { id: string; native: string }) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const before = content.slice(0, cursorPos);
    const after = content.slice(cursorPos);
    // Replace the :query with the emoji
    const colonIdx = before.lastIndexOf(':');
    const newContent = before.slice(0, colonIdx) + suggestion.native + after;
    setContent(newContent);
    setShortcodeQuery('');
    setTimeout(() => {
      const newPos = colonIdx + suggestion.native.length;
      textarea.selectionStart = textarea.selectionEnd = newPos;
      textarea.focus();
    }, 0);
  };

  const hasContent = content.trim() || imageFile;

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload failed');
        return null;
      }
      const { url } = await res.json();
      return url;
    } catch {
      alert('Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim() && !imageFile) return;

    let imgUrl: string | undefined;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (!url && !content.trim()) return;
      imgUrl = url || undefined;
    }

    onSend(replaceShortcodes(content.trim()), replyingTo?.id, imgUrl);
    setContent('');
    setImagePreview(null);
    setImageFile(null);
    onCancelReply();
    if (onTypingStop) onTypingStop();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion((s) => (s + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion((s) => (s - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        setShortcodeQuery('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5MB)');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) handleFileSelect(file);
        break;
      }
    }
  };

  return (
    <div
      style={{ padding: '0.25rem 1rem 0.75rem', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Reply indicator */}
      {replyingTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '20px 20px 0 0',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <span>Replying to <strong>{replyingTo.display_name}</strong></span>
          <button
            onClick={onCancelReply}
            style={{ background: 'none', padding: 2, color: 'var(--text-muted)', marginLeft: 'auto', border: 'none', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-tertiary)',
          borderRadius: replyingTo ? 0 : '20px 20px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <img src={imagePreview} alt="Preview" style={{ maxHeight: 80, maxWidth: 200, borderRadius: 6 }} />
          <button
            onClick={() => { setImagePreview(null); setImageFile(null); }}
            style={{ background: 'none', padding: 2, color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--accent-muted)',
          border: '2px dashed var(--accent)',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Drop image here</span>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
        borderRadius: (replyingTo || imagePreview) ? '0 0 20px 20px' : 20,
        padding: '0.4rem 0.4rem 0.4rem 0.75rem',
        minHeight: 44,
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'none', padding: 4, color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
          title="Upload image"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }}
        />
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          style={{ background: 'none', padding: 4, color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
        >
          <SmilePlus size={18} />
        </button>
        <div style={{ flex: 1, position: 'relative', minHeight: 30 }}>
          {/* Twemoji overlay — shows rendered emojis over the textarea */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '6px 4px',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              lineHeight: 1.4,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--text-primary)',
            }}
          >
            {content ? <TwemojiText text={content} size={16} /> : (
              <span style={{ color: 'var(--text-muted)' }}>{`Message #${channelName || 'general'}...`}</span>
            )}
          </div>
          <textarea
            ref={inputRef}
            placeholder=""
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              updateShortcodeQuery(e.target.value, e.target.selectionStart);
              if (e.target.value.trim() && onTypingStart) {
                onTypingStart();
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  if (onTypingStop) onTypingStop();
                }, 3000);
              } else if (!e.target.value.trim() && onTypingStop) {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                onTypingStop();
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            rows={1}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'transparent',
              caretColor: 'var(--text-primary)',
              fontSize: '0.88rem',
              resize: 'none',
              outline: 'none',
              padding: '6px 4px',
              maxHeight: 120,
              fontFamily: 'inherit',
              lineHeight: 1.4,
              boxShadow: 'none',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={(!content.trim() && !imageFile) || disabled || uploading}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: hasContent ? 'pointer' : 'default',
            background: hasContent ? 'var(--accent)' : 'transparent',
            color: hasContent ? '#fff' : 'var(--text-muted)',
            transition: 'background 0.2s, color 0.2s',
            flexShrink: 0,
            padding: 0,
          }}
        >
          {uploading ? <Loader2 size={18} className="spin" /> : <Send size={18} style={{ marginLeft: 2 }} />}
        </button>
      </div>

      {/* Shortcode suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 16,
          right: 16,
          marginBottom: 4,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '4px 0',
          zIndex: 100,
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onClick={() => applySuggestion(s)}
              onMouseEnter={() => setSelectedSuggestion(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '6px 12px',
                background: i === selectedSuggestion ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <TwemojiEmoji emoji={s.native} size={20} />
              <span style={{ color: 'var(--text-secondary)' }}>:{s.id}:</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 8, zIndex: 100 }}>
          <EmojiPicker
            onSelect={(emoji) => {
              setContent((c) => c + emoji);
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
