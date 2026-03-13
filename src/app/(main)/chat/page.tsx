'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatClient, type Message, type TypingUser } from '@/lib/chat/client';
import { MessageCircle, Users, Plus, Search, X, Hash, Lock, UserPlus, Settings2, LogOut as LeaveIcon, Crown, Trash2 } from 'lucide-react';
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

interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  icon_url: string | null;
  owner_id: string | null;
  participants: { user_id: string; username: string; display_name: string; avatar_url: string | null }[];
  last_message: { content: string; display_name: string; created_at: string } | null;
  unread_count: number;
}

type ChatTab = 'global' | 'dms';

export default function ChatPage() {
  const [tab, setTab] = useState<ChatTab>('global');

  // === Global chat state ===
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji_id: string; count: number; user_reacted: boolean }[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [canDeleteOthers, setCanDeleteOthers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef<string | null>(null);
  const chatClient = getChatClient();

  // === DM state ===
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmReplyingTo, setDmReplyingTo] = useState<Message | null>(null);
  const [dmTypingUsers, setDmTypingUsers] = useState<TypingUser[]>([]);
  const activeConvRef = useRef<string | null>(null);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);

  // === New DM/Group modal ===
  const [showNewDm, setShowNewDm] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creatingConv, setCreatingConv] = useState(false);

  // === Group settings modal ===
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');

  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
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
      const perms = await chatClient.getPermissions();
      setCanDeleteOthers(perms.includes('delete_messages'));
      const chs = await chatClient.getChannels();
      setChannels(chs);
      if (chs.length > 0) selectChannel(chs[0]);
      loadConversations();
    };
    init();
    return () => {
      if (activeChannelRef.current) chatClient.unsubscribeFromChannel(activeChannelRef.current);
      if (activeConvRef.current) chatClient.unsubscribeFromDm(activeConvRef.current);
    };
  }, []);

  // === Global Chat functions ===
  const selectChannel = async (channel: Channel) => {
    if (activeChannelRef.current) chatClient.unsubscribeFromChannel(activeChannelRef.current);
    setActiveChannel(channel);
    activeChannelRef.current = channel.id;
    setMessages([]);
    setReplyingTo(null);
    setTypingUsers([]);

    const msgs = await chatClient.getMessages(channel.id);
    setMessages(msgs);

    const reactionMap: Record<string, any[]> = {};
    await Promise.all(msgs.map(async (msg: Message) => {
      const r = await chatClient.getReactions(msg.id);
      if (r.length > 0) reactionMap[msg.id] = r;
    }));
    setReactions(reactionMap);

    chatClient.subscribeToChannel(channel.id, (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      scrollToBottom(messagesEndRef);
    });
    chatClient.onTyping(channel.id, setTypingUsers);
    chatClient.onReactionUpdate(async (data) => {
      const r = await chatClient.getReactions(data.messageId);
      setReactions(prev => ({ ...prev, [data.messageId]: r }));
    });
    chatClient.onMessageDeleted((data) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    // Mark channel mentions as read
    chatClient.markMentionsRead({ channelId: channel.id });

    setTimeout(() => scrollToBottom(messagesEndRef), 100);
  };

  const sendMessage = async (content: string, replyTo?: string, imageUrl?: string) => {
    if (!activeChannel) return;
    try {
      const msg = await chatClient.sendMessage(activeChannel.id, content, replyTo, imageUrl);
      if (msg) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        scrollToBottom(messagesEndRef);
      }
    } catch (err: any) { alert(err.message || 'Failed to send message'); }
  };

  const deleteMessage = async (id: string) => {
    if (!activeChannel) return;
    const success = await chatClient.deleteMessage(id, activeChannel.id);
    if (success) setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeChannel) return;
    await chatClient.toggleReaction(messageId, emoji, activeChannel.id);
    const r = await chatClient.getReactions(messageId);
    setReactions(prev => ({ ...prev, [messageId]: r }));
  };

  // === DM functions ===
  const loadConversations = async () => {
    const convs = await chatClient.getConversations();
    setConversations(convs);
  };

  const selectConversation = async (conv: Conversation) => {
    if (activeConvRef.current) chatClient.unsubscribeFromDm(activeConvRef.current);
    setActiveConv(conv);
    activeConvRef.current = conv.id;
    setDmMessages([]);
    setDmReplyingTo(null);
    setDmTypingUsers([]);

    const msgs = await chatClient.getDmMessages(conv.id);
    setDmMessages(msgs);

    chatClient.subscribeToDm(conv.id, (msg) => {
      setDmMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      scrollToBottom(dmMessagesEndRef);
    });
    chatClient.onDmDeleted((data) => {
      setDmMessages(prev => prev.filter(m => m.id !== data.messageId));
    });
    chatClient.onDmTyping(conv.id, setDmTypingUsers);

    // Mark DM mentions as read
    chatClient.markMentionsRead({ conversationId: conv.id });

    // Update unread count in local state
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));

    setTimeout(() => scrollToBottom(dmMessagesEndRef), 100);
  };

  const sendDm = async (content: string, replyTo?: string, imageUrl?: string) => {
    if (!activeConv) return;
    try {
      const msg = await chatClient.sendDm(activeConv.id, content, replyTo, imageUrl);
      if (msg) {
        setDmMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        scrollToBottom(dmMessagesEndRef);
      }
    } catch (err: any) { alert(err.message || 'Failed to send'); }
  };

  const deleteDm = async (id: string) => {
    if (!activeConv) return;
    const success = await chatClient.deleteDm(id, activeConv.id);
    if (success) setDmMessages(prev => prev.filter(m => m.id !== id));
  };

  // === Search users for new DM ===
  const searchUsers = async (query: string) => {
    setSearchUser(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.filter((u: any) => u.id !== currentUserId && !selectedUsers.find(s => s.id === u.id)));
    }
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;
    setCreatingConv(true);
    const result = await chatClient.createConversation(
      selectedUsers.map(u => u.id),
      selectedUsers.length > 1 ? groupName || undefined : undefined
    );
    if (result.id) {
      setShowNewDm(false);
      setSelectedUsers([]);
      setGroupName('');
      setSearchUser('');
      await loadConversations();
      // Find and select the conversation
      const convs = await chatClient.getConversations();
      setConversations(convs);
      const newConv = convs.find((c: Conversation) => c.id === result.id);
      if (newConv) {
        setTab('dms');
        selectConversation(newConv);
      }
    }
    setCreatingConv(false);
  };

  // Group management
  const kickUser = async (userId: string) => {
    if (!activeConv) return;
    const res = await fetch('/api/dm/conversations/participants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConv.id, userId }),
    });
    if (res.ok) {
      setActiveConv(prev => prev ? {
        ...prev,
        participants: prev.participants.filter(p => p.user_id !== userId),
      } : null);
      loadConversations();
    }
  };

  const leaveGroup = async () => {
    if (!activeConv) return;
    await fetch('/api/dm/conversations/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConv.id }),
    });
    setActiveConv(null);
    activeConvRef.current = null;
    loadConversations();
    setShowGroupSettings(false);
  };

  const updateGroupName = async () => {
    if (!activeConv || !editGroupName.trim()) return;
    await fetch('/api/dm/conversations/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConv.id, name: editGroupName }),
    });
    setActiveConv(prev => prev ? { ...prev, name: editGroupName } : null);
    loadConversations();
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    const other = conv.participants.find(p => p.user_id !== currentUserId);
    return other?.display_name || other?.username || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'group') return conv.icon_url;
    const other = conv.participants.find(p => p.user_id !== currentUserId);
    return other?.avatar_url || null;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <>
      <style>{`
        @keyframes msgFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .chat-messages-list > * { animation: msgFadeIn 0.2s ease both; }
        .chat-empty-state { animation: fadeIn 0.4s ease; }
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        .msg-row { transition: background 0.15s ease; }
        .msg-row:hover { background: var(--bubble-bg); }
        .msg-actions { opacity: 0; transform: translateY(4px) scale(0.95); transition: opacity 0.15s ease, transform 0.15s ease; pointer-events: none; }
        .msg-row:hover .msg-actions, .msg-actions.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .msg-action-btn { background: none; padding: 5px; color: var(--text-muted); cursor: pointer; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease; }
        .msg-action-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); transform: scale(1.1); }
        .msg-action-btn.danger:hover { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .msg-bubble { transition: transform 0.15s ease, box-shadow 0.2s ease; }
        .msg-row:hover .msg-bubble { transform: translateX(2px); box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .reaction-btn { transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease !important; }
        .reaction-btn:hover { transform: scale(1.12) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; }
        .reaction-btn:active { transform: scale(0.95) !important; }
        .msg-avatar { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .msg-avatar:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .msg-username { transition: opacity 0.15s ease; }
        .msg-username:hover { opacity: 0.8; }
        .msg-image { transition: transform 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease; }
        .msg-image:hover { transform: scale(1.02); box-shadow: 0 4px 20px rgba(0,0,0,0.25); border-radius: 14px !important; }
        .chat-tab { padding: 0.5rem 1rem; border: none; background: none; color: var(--text-muted); font-size: 0.82rem; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; font-family: inherit; }
        .chat-tab:hover { color: var(--text-primary); }
        .chat-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 600; }
        .dm-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: none; width: 100%; text-align: left; background: none; font-family: inherit; }
        .dm-item:hover { background: var(--bg-tertiary); }
        .dm-item.active { background: var(--accent-muted); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease; }
        .modal-content { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; width: 420px; max-width: 90vw; max-height: 80vh; overflow-y: auto; animation: fadeInScale 0.2s ease; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 3rem)', margin: '-1.5rem', overflow: 'hidden' }}>
        {/* Left panel: tabs + sidebar content */}
        <div style={{ width: 260, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button className={`chat-tab${tab === 'global' ? ' active' : ''}`} onClick={() => setTab('global')}>
              <Hash size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Global
            </button>
            <button className={`chat-tab${tab === 'dms' ? ' active' : ''}`} onClick={() => setTab('dms')} style={{ position: 'relative' }}>
              <Users size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />DMs
              {totalUnread > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', fontSize: '0.6rem', fontWeight: 700, borderRadius: 8, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
          </div>

          {/* Sidebar content based on tab */}
          {tab === 'global' ? (
            <ChannelSidebar
              channels={channels.map(c => ({ ...c, is_locked: !!c.is_locked }))}
              activeId={activeChannel?.id || null}
              onSelect={(id) => { const ch = channels.find(c => c.id === id); if (ch) selectChannel(ch); }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* New DM button */}
              <div style={{ padding: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => setShowNewDm(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
                  borderRadius: 8, border: '1px dashed var(--border)', background: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={16} /> New Message
                </button>
              </div>

              {/* Conversation list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2 }} className="chat-scroll">
                {conversations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No conversations yet
                  </div>
                ) : conversations.map(conv => (
                  <button
                    key={conv.id}
                    className={`dm-item${activeConv?.id === conv.id ? ' active' : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getConversationAvatar(conv) ? (
                        <img src={getConversationAvatar(conv)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : conv.type === 'group' ? (
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {getConversationName(conv)[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getConversationName(conv)}
                        </span>
                        {conv.type === 'group' && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({conv.participants.length})</span>
                        )}
                      </div>
                      {conv.last_message && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.last_message.content || 'Image'}
                        </div>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.6rem', fontWeight: 700, borderRadius: 8, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {tab === 'global' ? (
            <>
              {/* Channel header */}
              {activeChannel && (
                <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, background: 'var(--bg-primary)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>#</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{activeChannel.name}</span>
                  {activeChannel.description && (
                    <>
                      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem' }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChannel.description}</span>
                    </>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.75rem 0', display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 && activeChannel && (
                  <div className="chat-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.75rem', padding: '2rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Welcome to #{activeChannel.name}</div>
                      <div style={{ fontSize: '0.82rem' }}>This is the start of the conversation. Say something!</div>
                    </div>
                  </div>
                )}
                <div className="chat-messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: 'auto' }}>
                  {messages.map(msg => (
                    <MessageItem key={msg.id} message={msg} currentUserId={currentUserId} canDeleteOthers={canDeleteOthers} onReply={setReplyingTo} onDelete={deleteMessage} onReact={handleReact} reactions={reactions[msg.id] || []} />
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              <TypingIndicator users={typingUsers} />

              {activeChannel && (
                <MessageInput onSend={sendMessage} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} disabled={!!activeChannel.is_locked} channelName={activeChannel.name}
                  onTypingStart={() => { if (activeChannel && currentUsername) chatClient.emitTyping(activeChannel.id, currentUsername, true, currentAvatarUrl); }}
                  onTypingStop={() => { if (activeChannel && currentUsername) chatClient.emitTyping(activeChannel.id, currentUsername, false); }}
                />
              )}
            </>
          ) : (
            <>
              {/* DM header */}
              {activeConv ? (
                <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, background: 'var(--bg-primary)' }}>
                  {activeConv.type === 'group' ? <Users size={16} style={{ color: 'var(--text-muted)' }} /> : <MessageCircle size={16} style={{ color: 'var(--text-muted)' }} />}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{getConversationName(activeConv)}</span>
                  {activeConv.type === 'group' && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({activeConv.participants.length} members)</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => { setShowGroupSettings(true); setEditGroupName(activeConv.name || ''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                        <Settings2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-primary)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select a conversation</span>
                </div>
              )}

              {/* DM Messages */}
              <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.75rem 0', display: 'flex', flexDirection: 'column' }}>
                {!activeConv ? (
                  <div className="chat-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.75rem', padding: '2rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Direct Messages</div>
                      <div style={{ fontSize: '0.82rem' }}>Select a conversation or start a new one</div>
                    </div>
                  </div>
                ) : dmMessages.length === 0 ? (
                  <div className="chat-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.75rem', padding: '2rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>No messages yet. Say hello!</div>
                  </div>
                ) : (
                  <div className="chat-messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: 'auto' }}>
                    {dmMessages.map(msg => (
                      <MessageItem key={msg.id} message={msg} currentUserId={currentUserId} canDeleteOthers={false} onReply={setDmReplyingTo} onDelete={deleteDm} onReact={() => {}} reactions={[]} />
                    ))}
                  </div>
                )}
                <div ref={dmMessagesEndRef} />
              </div>

              <TypingIndicator users={dmTypingUsers} />

              {activeConv && (
                <MessageInput onSend={sendDm} replyingTo={dmReplyingTo} onCancelReply={() => setDmReplyingTo(null)} channelName={getConversationName(activeConv)}
                  onTypingStart={() => { if (activeConv && currentUsername) chatClient.emitDmTyping(activeConv.id, currentUsername, true, currentAvatarUrl); }}
                  onTypingStop={() => { if (activeConv && currentUsername) chatClient.emitDmTyping(activeConv.id, currentUsername, false); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* New DM Modal */}
      {showNewDm && (
        <div className="modal-overlay" onClick={() => setShowNewDm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>New Message</h3>
              <button onClick={() => setShowNewDm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {selectedUsers.map(u => (
                  <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '3px 8px', borderRadius: 16, background: 'var(--accent-muted)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {u.display_name || u.username}
                    <button onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={searchUser}
                onChange={e => searchUsers(e.target.value)}
                placeholder="Search users..."
                style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 32px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '0.75rem', maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => { setSelectedUsers(prev => [...prev, u]); setSearchUser(''); setSearchResults([]); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: 6, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.username[0]?.toUpperCase()}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.display_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Group name (only for 2+ selected users) */}
            {selectedUsers.length > 1 && (
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', marginBottom: '0.75rem', fontFamily: 'inherit' }}
              />
            )}

            <button onClick={createConversation} disabled={selectedUsers.length === 0 || creatingConv}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: 'none', background: selectedUsers.length > 0 ? 'var(--accent)' : 'var(--bg-tertiary)', color: selectedUsers.length > 0 ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: selectedUsers.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {creatingConv ? 'Creating...' : selectedUsers.length > 1 ? 'Create Group Chat' : 'Start Conversation'}
            </button>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && activeConv?.type === 'group' && (
        <div className="modal-overlay" onClick={() => setShowGroupSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Group Settings</h3>
              <button onClick={() => setShowGroupSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Group name edit (owner only) */}
            {activeConv.owner_id === currentUserId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Group Name</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={updateGroupName} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                </div>
              </div>
            )}

            {/* Members list */}
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Members ({activeConv.participants.length}/15)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1rem' }}>
              {activeConv.participants.map(p => (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(p.username || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p.display_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 4 }}>@{p.username}</span>
                  </div>
                  {p.user_id === activeConv.owner_id && (
                    <Crown size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  )}
                  {activeConv.owner_id === currentUserId && p.user_id !== currentUserId && (
                    <button onClick={() => kickUser(p.user_id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="Kick">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Leave group */}
            <button onClick={leaveGroup} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              <LeaveIcon size={15} /> Leave Group
            </button>
          </div>
        </div>
      )}
    </>
  );
}
