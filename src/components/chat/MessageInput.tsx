'use client';

import { useState, useRef, KeyboardEvent, DragEvent } from 'react';
import { Send, X, SmilePlus, ImagePlus, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/chat/client';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  onSend: (content: string, replyTo?: string, imageUrl?: string) => void;
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    onSend(content.trim(), replyingTo?.id, imgUrl);
    setContent('');
    setImagePreview(null);
    setImageFile(null);
    onCancelReply();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
      style={{ padding: '0 1rem 1rem', position: 'relative' }}
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
          borderRadius: '8px 8px 0 0',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <span>Replying to <strong>{replyingTo.display_name}</strong></span>
          <button
            onClick={onCancelReply}
            style={{ background: 'none', padding: 2, color: 'var(--text-muted)', marginLeft: 'auto' }}
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
          borderRadius: replyingTo ? 0 : '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <img src={imagePreview} alt="Preview" style={{ maxHeight: 80, maxWidth: 200, borderRadius: 6 }} />
          <button
            onClick={() => { setImagePreview(null); setImageFile(null); }}
            style={{ background: 'none', padding: 2, color: 'var(--text-muted)' }}
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
          borderRadius: 8,
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
        alignItems: 'flex-end',
        gap: '0.5rem',
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
        borderRadius: (replyingTo || imagePreview) ? '0 0 8px 8px' : 8,
        padding: '0.5rem 0.75rem',
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}
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
          onPaste={handlePaste}
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
          disabled={(!content.trim() && !imageFile) || disabled || uploading}
          style={{
            background: 'none',
            padding: 4,
            color: (content.trim() || imageFile) ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {uploading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </div>

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
