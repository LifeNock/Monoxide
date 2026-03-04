'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getChatClient, type Message } from '@/lib/chat/client';
import { createClient } from '@/lib/supabase/client';
import { containsFilteredWord, loadFilterWords } from '@/lib/chat/wordFilter';
import ChannelSidebar from '@/components/chat/ChannelSidebar';
import MessageItem from '@/components/chat/MessageItem';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';

interface Channel {
  id: string;
  name: string;
  description: string;
  is_locked: boolean;
}

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterWords, setFilterWords] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const chatClient = getChatClient();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/chat');
        return;
      }
      setCurrentUserId(user.id);

      await chatClient.init();
      const chs = await chatClient.getChannels();
      setChannels(chs);
      if (chs.length > 0) {
        selectChannel(chs[0]);
      }

      const words = await loadFilterWords();
      setFilterWords(words);
    };
    init();

    return () => {
      if (activeChannel) {
        chatClient.unsubscribeFromChannel(activeChannel.id);
      }
    };
  }, []);

  const selectChannel = async (channel: Channel) => {
    if (activeChannel) {
      chatClient.unsubscribeFromChannel(activeChannel.id);
    }

    setActiveChannel(channel);
    setMessages([]);
    setReplyingTo(null);

    const msgs = await chatClient.getMessages(channel.id);
    setMessages(msgs);

    chatClient.subscribeToChannel(channel.id, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    chatClient.onTyping(channel.id, setTypingUsers);

    // Scroll to bottom
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!activeChannel) return;

    if (containsFilteredWord(content, filterWords)) {
      alert('Your message contains a word that is not allowed.');
      return;
    }

    try {
      await chatClient.sendMessage(activeChannel.id, content, replyTo);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  };

  const deleteMessage = async (id: string) => {
    await chatClient.deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 56px)',
      margin: '-1.5rem',
    }}>
      <ChannelSidebar
        channels={channels}
        activeId={activeChannel?.id || null}
        onSelect={(id) => {
          const ch = channels.find((c) => c.id === id);
          if (ch) selectChannel(ch);
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Channel header */}
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
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                — {activeChannel.description}
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem 0',
        }}>
          {messages.length === 0 && activeChannel && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
            }}>
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
              onReact={(messageId) => {
                // Quick react with thumbs up
                chatClient.addReaction(messageId, 'thumbs_up');
              }}
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
            disabled={activeChannel.is_locked}
            channelName={activeChannel.name}
          />
        )}
      </div>
    </div>
  );
}
