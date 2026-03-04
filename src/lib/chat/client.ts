import { createClient } from '@/lib/supabase/client';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  is_deleted: boolean;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
    pronouns: string;
  };
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji_id: string;
}

type MessageCallback = (msg: Message) => void;
type ReactionCallback = (reaction: Reaction & { type: 'added' | 'removed' }) => void;
type TypingCallback = (users: string[]) => void;

class ChatClient {
  private supabase = createClient();
  private socket: Socket | null = null;
  private useSocketFallback = false;
  private channelSubscription: any = null;

  async init() {
    // Try Supabase Realtime first
    try {
      const channel = this.supabase.channel('test');
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.useSocketFallback = false;
          channel.unsubscribe();
        } else if (status === 'CHANNEL_ERROR') {
          this.initSocketFallback();
        }
      });
    } catch {
      this.initSocketFallback();
    }
  }

  private initSocketFallback() {
    this.useSocketFallback = true;
    this.socket = io({ path: '/socket.io/' });
  }

  async getMessages(channelId: string, limit = 50): Promise<Message[]> {
    const { data } = await this.supabase
      .from('messages')
      .select('*, profiles(username, display_name, avatar_url, pronouns)')
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).reverse();
  }

  async sendMessage(channelId: string, content: string, replyTo?: string): Promise<Message | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content,
        reply_to: replyTo || null,
      })
      .select('*, profiles(username, display_name, avatar_url, pronouns)')
      .single();

    if (error) throw error;

    // Also emit through socket for fallback
    if (this.socket && this.useSocketFallback) {
      this.socket.emit('send-message', {
        ...data,
        channelId,
        userId: user.id,
      });
    }

    return data;
  }

  async deleteMessage(messageId: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);
  }

  subscribeToChannel(channelId: string, onMessage: MessageCallback, onReaction?: ReactionCallback) {
    if (this.useSocketFallback && this.socket) {
      this.socket.emit('join-channel', channelId);
      this.socket.on('new-message', onMessage);
      if (onReaction) {
        this.socket.on('reaction-added', (r: Reaction) => onReaction({ ...r, type: 'added' }));
        this.socket.on('reaction-removed', (r: Reaction) => onReaction({ ...r, type: 'removed' }));
      }
      return;
    }

    this.channelSubscription = this.supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload: any) => {
          // Fetch full message with profile
          const { data } = await this.supabase
            .from('messages')
            .select('*, profiles(username, display_name, avatar_url, pronouns)')
            .eq('id', payload.new.id)
            .single();
          if (data) onMessage(data);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `message_id=eq.${channelId}` },
        (payload: any) => {
          if (onReaction) onReaction({ ...payload.new, type: 'added' });
        }
      )
      .subscribe();
  }

  unsubscribeFromChannel(channelId: string) {
    if (this.useSocketFallback && this.socket) {
      this.socket.emit('leave-channel', channelId);
      this.socket.off('new-message');
      this.socket.off('reaction-added');
      this.socket.off('reaction-removed');
      return;
    }

    if (this.channelSubscription) {
      this.supabase.removeChannel(this.channelSubscription);
      this.channelSubscription = null;
    }
  }

  onTyping(channelId: string, callback: TypingCallback) {
    if (this.useSocketFallback && this.socket) {
      this.socket.on('typing-update', (data: { channelId: string; users: string[] }) => {
        if (data.channelId === channelId) callback(data.users);
      });
    }
  }

  emitTyping(channelId: string, username: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit(isTyping ? 'typing-start' : 'typing-stop', { channelId, username });
    }
  }

  async addReaction(messageId: string, emojiId: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: user.id,
      emoji_id: emojiId,
    });
  }

  async removeReaction(messageId: string, emojiId: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji_id', emojiId);
  }

  async getChannels() {
    const { data } = await this.supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true });
    return data || [];
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Singleton
let chatClient: ChatClient | null = null;

export function getChatClient(): ChatClient {
  if (!chatClient) {
    chatClient = new ChatClient();
  }
  return chatClient;
}
