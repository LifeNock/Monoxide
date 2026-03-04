'use client';

import { useState, useEffect, useRef } from 'react';
import { getChatClient, type Message } from '@/lib/chat/client';
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatClient = getChatClient();

  useEffect(() => {
    const init = async () => {
      // Get current user
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.user) setCurrentUserId(meData.user.id);

      chatClient.init();
      const chs = await chatClient.getChannels();
      setChannels(chs);
      if (chs.length > 0) selectChannel(chs[0]);
    };
    init();

    return () => {
      if (activeChannel) chatClient.unsubscribeFromChannel(activeChannel.id);
    };
  }, []);

  const selectChannel = async (channel: Channel) => {
    if (activeChannel) chatClient.unsubscribeFromChannel(activeChannel.id);

    setActiveChannel(channel);
    setMessages([]);
    setReplyingTo(null);

    const msgs = await chatClient.getMessages(channel.id);
    setMessages(msgs);

    chatClient.subscribeToChannel(channel.id, (msg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    chatClient.onTyping(channel.id, setTypingUsers);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!activeChannel) return;
    try {
      const msg = await chatClient.sendMessage(activeChannel.id, content, replyTo);
      if (msg) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const deleteMessage = async (id: string) => {
    await chatClient.deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', margin: '-1.5rem' }}>
      <ChannelSidebar
        channels={channels.map((c) => ({ ...c, is_locked: !!c.is_locked }))}
        activeId={activeChannel?.id || null}
        onSelect={(id) => {
          const ch = channels.find((c) => c.id === id);
          if (ch) selectChannel(ch);
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeChannel && (
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ fontWeight: 600 }}>#{activeChannel.name}</span>
            {activeChannel.description && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>— {activeChannel.description}</span>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {messages.length === 0 && activeChannel && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No messages yet. Say something!
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              onReply={setReplyingTo}
              onDelete={deleteMessage}
              onReact={() => {}}
            />
          ))}
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
          />
        )}
      </div>
    </div>
  );
}
