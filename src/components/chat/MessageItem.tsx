'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Reply, SmilePlus, CornerDownRight } from 'lucide-react';
import type { Message } from '@/lib/chat/client';
import UserPopup from './UserPopup';
import EmojiPicker from './EmojiPicker';
import { TwemojiText, TwemojiEmoji } from '@/lib/twemoji';

interface MessageItemProps {
  message: Message;
  currentUserId: string | null;
  canDeleteOthers: boolean;
  onReply: (msg: Message) => void;
  onDelete: (id: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  reactions?: { emoji_id: string; count: number; user_reacted: boolean }[];
}

export default function MessageItem({
  message,
  currentUserId,
  canDeleteOthers,
  onReply,
  onDelete,
  onReact,
  reactions = [],
}: MessageItemProps) {
  const [hovering, setHovering] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const avatarRef = useRef<HTMLDivElement>(null);
  const isOwn = currentUserId === message.user_id;
  const showDelete = isOwn || canDeleteOthers;

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleAvatarClick = () => {
    if (!avatarRef.current) return;
    const rect = avatarRef.current.getBoundingClientRect();
    // Position popup to the right of the avatar, vertically centered on it
    setPopupPos({ x: rect.right + 12, y: rect.top - 20 });
    setShowPopup(true);
  };

  const renderRichText = (text: string) => {
    const parts: { type: 'text' | 'codeblock'; content: string; lang?: string }[] = [];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'codeblock', content: match[2], lang: match[1] || undefined });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.map((part, i) => {
      if (part.type === 'codeblock') {
        return (
          <pre key={i} style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '0.6rem 0.75rem',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            overflowX: 'auto',
            margin: '0.3rem 0',
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {part.lang && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                {part.lang}
              </span>
            )}
            <code>{part.content}</code>
          </pre>
        );
      }
      return <span key={i}>{renderInlineFormatting(part.content)}</span>;
    });
  };

  const renderInlineFormatting = (text: string) => {
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`([^`]+?)`)/g;
    const elements: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<TwemojiText key={`t${lastIndex}`} text={text.slice(lastIndex, match.index)} />);
      }

      if (match[2]) {
        elements.push(<strong key={match.index}><em>{match[2]}</em></strong>);
      } else if (match[3]) {
        elements.push(<strong key={match.index}>{match[3]}</strong>);
      } else if (match[4]) {
        elements.push(<em key={match.index}>{match[4]}</em>);
      } else if (match[5]) {
        elements.push(<del key={match.index}>{match[5]}</del>);
      } else if (match[6]) {
        elements.push(
          <code key={match.index} style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.82rem',
            fontFamily: 'monospace',
          }}>
            {match[6]}
          </code>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      elements.push(<TwemojiText key={`t${lastIndex}`} text={text.slice(lastIndex)} />);
    }

    return elements.length > 0 ? elements : <TwemojiText text={text} />;
  };

  const replyPreview = message.reply_to_message;

  return (
    <>
      <div
        className="msg-row"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setShowReactPicker(false); }}
        style={{
          padding: '0.375rem 1rem',
          position: 'relative',
          borderRadius: 8,
          margin: '0 0.25rem',
        }}
      >
        {/* Reply preview */}
        {replyPreview && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            paddingLeft: '0.5rem',
            marginBottom: '0.2rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            <CornerDownRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {replyPreview.display_name}
            </span>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
              opacity: 0.7,
            }}>
              {replyPreview.content || 'Image'}
            </span>
          </div>
        )}

        {/* Avatar + username/role/time row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.25rem',
          paddingLeft: '0.25rem',
          position: 'relative',
          zIndex: 3,
        }}>
          <div
            ref={avatarRef}
            onClick={handleAvatarClick}
            className="msg-avatar"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              flexShrink: 0,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            {message.avatar_url && (
              <img
                src={message.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          <span
            onClick={handleAvatarClick}
            className="msg-username"
            style={{
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              color: message.role_color || 'var(--text-primary)',
            }}
          >
            {message.display_name || 'Unknown'}
          </span>
          {message.role_name && message.role_name !== '@everyone' && (
            <span style={{
              padding: '1px 5px', borderRadius: 3, fontSize: '0.6rem',
              fontWeight: 600, background: `${message.role_color}22`,
              color: message.role_color || 'var(--text-muted)',
              lineHeight: 1.4,
            }}>
              {message.role_name}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{time}</span>
        </div>

        {/* Bubble container */}
        <div style={{
          position: 'relative',
          maxWidth: '75%',
        }}>
          {/* Hover actions */}
          <div
            className={`msg-actions${showReactPicker ? ' visible' : ''}`}
            style={{
              position: 'absolute',
              top: -12,
              right: 0,
              display: 'flex',
              gap: '1px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '2px',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <button
              className="msg-action-btn"
              onClick={() => setShowReactPicker(!showReactPicker)}
              title="React"
            >
              <SmilePlus size={14} />
            </button>
            <button
              className="msg-action-btn"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <Reply size={14} />
            </button>
            {showDelete && (
              <button
                className="msg-action-btn danger"
                onClick={() => onDelete(message.id)}
                title={isOwn ? 'Delete' : 'Delete (Moderator)'}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {showReactPicker && (
            <div style={{
              position: 'absolute',
              top: -10,
              right: 0,
              zIndex: 100,
              transform: 'translateY(-100%)',
              animation: 'fadeInScale 0.15s ease',
            }}>
              <EmojiPicker
                onSelect={(emoji) => {
                  onReact(message.id, emoji);
                  setShowReactPicker(false);
                }}
                onClose={() => setShowReactPicker(false)}
              />
            </div>
          )}

          <div
            className="msg-bubble"
            style={{
              background: 'var(--bubble-bg)',
              border: '1px solid var(--bubble-border)',
              borderRadius: replyPreview ? '8px 16px 16px 4px' : '16px 16px 16px 4px',
              padding: '0.6rem 0.85rem',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {message.content && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
                lineHeight: 1.5,
                margin: 0,
              }}>
                {renderRichText(message.content)}
              </div>
            )}

            {message.image_url && (
              <div style={{ marginTop: message.content ? 6 : 0 }}>
                <img
                  src={message.image_url}
                  alt="Attachment"
                  className="msg-image"
                  style={{
                    maxWidth: 360,
                    maxHeight: 280,
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'block',
                  }}
                  onClick={() => window.open(message.image_url!, '_blank')}
                />
              </div>
            )}
          </div>

          {/* Reactions */}
          {reactions.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              {reactions.map((r) => (
                <button
                  key={r.emoji_id}
                  className="reaction-btn"
                  onClick={() => onReact(message.id, r.emoji_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    background: r.user_reacted ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                    border: r.user_reacted ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <TwemojiEmoji emoji={r.emoji_id} size={14} />
                  <span style={{ fontWeight: 500 }}>{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {showPopup && createPortal(
        <UserPopup
          username={message.username}
          displayName={message.display_name || 'Unknown'}
          avatarUrl={message.avatar_url}
          pronouns={message.pronouns}
          onClose={() => setShowPopup(false)}
          position={popupPos}
        />,
        document.body
      )}
    </>
  );
}
