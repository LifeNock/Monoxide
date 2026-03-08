'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatClient, type Message, type TypingUser } from '@/lib/chat/client';
import { MessageCircle } from 'lucide-react';
import ChannelSidebar from '@/components/chat/ChannelSidebar';
import MessageItem from '@/components/chat/MessageItem';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';

interface Channel {
  id: string;
  name: string;
  description: string;
  is_locked: number;
}

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji_id: string; count: number; user_reacted: boolean }[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [canDeleteOthers, setCanDeleteOthers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef<string | null>(null);
  const chatClient = getChatClient();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.user) {
        setCurrentUserId(meData.user.id);
        setCurrentUsername(meData.user.username || '');
        setCurrentAvatarUrl(meData.user.avatar_url || '');
      }

      chatClient.init();

      // Fetch permissions
      const perms = await chatClient.getPermissions();
      setCanDeleteOthers(perms.includes('delete_messages'));

      const chs = await chatClient.getChannels();
      setChannels(chs);
      if (chs.length > 0) selectChannel(chs[0]);
    };
    init();

    return () => {
      if (activeChannelRef.current) chatClient.unsubscribeFromChannel(activeChannelRef.current);
    };
  }, []);

  const selectChannel = async (channel: Channel) => {
    if (activeChannelRef.current) chatClient.unsubscribeFromChannel(activeChannelRef.current);

    setActiveChannel(channel);
    activeChannelRef.current = channel.id;
    setMessages([]);
    setReplyingTo(null);
    setTypingUsers([]);

    const msgs = await chatClient.getMessages(channel.id);
    setMessages(msgs);

    // Fetch reactions for all messages
    const reactionMap: Record<string, any[]> = {};
    await Promise.all(msgs.map(async (msg: Message) => {
      const r = await chatClient.getReactions(msg.id);
      if (r.length > 0) reactionMap[msg.id] = r;
    }));
    setReactions(reactionMap);

    chatClient.subscribeToChannel(channel.id, (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    chatClient.onTyping(channel.id, setTypingUsers);

    chatClient.onReactionUpdate(async (data) => {
      const r = await chatClient.getReactions(data.messageId);
      setReactions(prev => ({ ...prev, [data.messageId]: r }));
    });

    // Listen for message deletions from other users
    chatClient.onMessageDeleted((data) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    setTimeout(scrollToBottom, 100);
  };

  const sendMessage = async (content: string, replyTo?: string, imageUrl?: string) => {
    if (!activeChannel) return;
    try {
      const msg = await chatClient.sendMessage(activeChannel.id, content, replyTo, imageUrl);
      if (msg) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!activeChannel) return;
    const success = await chatClient.deleteMessage(id, activeChannel.id);
    if (success) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeChannel) return;
    await chatClient.toggleReaction(messageId, emoji, activeChannel.id);
    const r = await chatClient.getReactions(messageId);
    setReactions(prev => ({ ...prev, [messageId]: r }));
  };

  return (
    <>
      <style>{`
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-messages-list > * {
          animation: msgFadeIn 0.2s ease both;
        }
        .chat-empty-state {
          animation: fadeIn 0.4s ease;
        }
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        .msg-row { transition: background 0.15s ease; }
        .msg-row:hover { background: var(--bubble-bg); }
        .msg-actions {
          opacity: 0;
          transform: translateY(4px) scale(0.95);
          transition: opacity 0.15s ease, transform 0.15s ease;
          pointer-events: none;
        }
        .msg-row:hover .msg-actions,
        .msg-actions.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .msg-action-btn {
          background: none;
          padding: 5px;
          color: var(--text-muted);
          cursor: pointer;
          border: none;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease;
        }
        .msg-action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          transform: scale(1.1);
        }
        .msg-action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }
        .msg-bubble {
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .msg-row:hover .msg-bubble {
          transform: translateX(2px);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .reaction-btn {
          transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease !important;
        }
        .reaction-btn:hover {
          transform: scale(1.12) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }
        .reaction-btn:active {
          transform: scale(0.95) !important;
        }
        .msg-avatar {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .msg-avatar:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .msg-username {
          transition: opacity 0.15s ease;
        }
        .msg-username:hover {
          opacity: 0.8;
        }
        .msg-image {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease;
        }
        .msg-image:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          border-radius: 14px !important;
        }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 3rem)', margin: '-1.5rem', overflow: 'hidden' }}>
        <ChannelSidebar
          channels={channels.map((c) => ({ ...c, is_locked: !!c.is_locked }))}
          activeId={activeChannel?.id || null}
          onSelect={(id) => {
            const ch = channels.find((c) => c.id === id);
            if (ch) selectChannel(ch);
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Channel header bar */}
          {activeChannel && (
            <div style={{
              padding: '0.6rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
              background: 'var(--bg-primary)',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>#</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {activeChannel.name}
              </span>
              {activeChannel.description && (
                <>
                  <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeChannel.description}
                  </span>
                </>
              )}
            </div>
          )}

          <div ref={messagesContainerRef} className="chat-scroll" style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: '0.75rem 0',
            display: 'flex', flexDirection: 'column',
          }}>
            {messages.length === 0 && activeChannel && (
              <div className="chat-empty-state" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                color: 'var(--text-muted)',
                gap: '0.75rem',
                padding: '2rem',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MessageCircle size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Welcome to #{activeChannel.name}
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    This is the start of the conversation. Say something!
                  </div>
                </div>
              </div>
            )}
            <div className="chat-messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: 'auto' }}>
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  canDeleteOthers={canDeleteOthers}
                  onReply={setReplyingTo}
                  onDelete={deleteMessage}
                  onReact={handleReact}
                  reactions={reactions[msg.id] || []}
                />
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <TypingIndicator users={typingUsers} />

          {activeChannel && (
            <MessageInput
              onSend={sendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              disabled={!!activeChannel.is_locked}
              channelName={activeChannel.name}
              onTypingStart={() => {
                if (activeChannel && currentUsername) {
                  chatClient.emitTyping(activeChannel.id, currentUsername, true, currentAvatarUrl);
                }
              }}
              onTypingStop={() => {
                if (activeChannel && currentUsername) {
                  chatClient.emitTyping(activeChannel.id, currentUsername, false);
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
