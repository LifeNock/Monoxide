import { io, Socket } from 'socket.io-client';

export interface ReplyPreview {
  content: string;
  display_name: string;
  username: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to: string | null;
  reply_to_message: ReplyPreview | null;
  is_deleted: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  pronouns: string;
  role_name: string | null;
  role_color: string | null;
}

export interface TypingUser {
  username: string;
  avatarUrl: string;
}

type MessageCallback = (msg: Message) => void;
type TypingCallback = (users: TypingUser[]) => void;

class ChatClient {
  private socket: Socket | null = null;

  init() {
    if (this.socket) return;
    this.socket = io({ path: '/socket.io/', transports: ['websocket', 'polling'] });
  }

  async getChannels() {
    const res = await fetch('/api/channels');
    return res.json();
  }

  async getMessages(channelId: string): Promise<Message[]> {
    const res = await fetch(`/api/messages?channelId=${channelId}`);
    return res.json();
  }

  async sendMessage(channelId: string, content: string, replyTo?: string, imageUrl?: string): Promise<Message | null> {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, content, replyTo, imageUrl }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send');
    }

    const msg = await res.json();

    if (this.socket) {
      this.socket.emit('send-message', msg);
    }

    return msg;
  }

  async deleteMessage(messageId: string, channelId: string): Promise<boolean> {
    const res = await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });

    if (!res.ok) return false;

    const data = await res.json();

    // Broadcast delete via socket
    if (this.socket && data.ok) {
      this.socket.emit('delete-message', { messageId, channelId });
    }

    return data.ok;
  }

  async getPermissions(): Promise<string[]> {
    const res = await fetch('/api/permissions');
    const data = await res.json();
    return data.permissions || [];
  }

  subscribeToChannel(channelId: string, onMessage: MessageCallback) {
    if (!this.socket) return;

    this.socket.emit('join-channel', channelId);
    this.socket.on('new-message', (msg: Message) => {
      if (msg.channel_id === channelId) {
        onMessage(msg);
      }
    });
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('message-deleted', callback);
  }

  offMessageDeleted() {
    if (!this.socket) return;
    this.socket.off('message-deleted');
  }

  unsubscribeFromChannel(channelId: string) {
    if (!this.socket) return;
    this.socket.emit('leave-channel', channelId);
    this.socket.off('new-message');
    this.socket.off('typing-update');
    this.socket.off('reaction-added');
    this.socket.off('reaction-removed');
    this.socket.off('message-deleted');
  }

  onTyping(channelId: string, callback: TypingCallback) {
    if (!this.socket) return;
    this.socket.on('typing-update', (data: { channelId: string; users: TypingUser[] }) => {
      if (data.channelId === channelId) callback(data.users);
    });
  }

  emitTyping(channelId: string, username: string, isTyping: boolean, avatarUrl?: string) {
    if (!this.socket) return;
    if (isTyping) {
      this.socket.emit('typing-start', { channelId, username, avatarUrl });
    } else {
      this.socket.emit('typing-stop', { channelId, username });
    }
  }

  async getReactions(messageId: string): Promise<{ emoji_id: string; count: number; user_reacted: boolean }[]> {
    const res = await fetch(`/api/reactions?messageId=${messageId}`);
    return res.json();
  }

  async toggleReaction(messageId: string, emoji: string, channelId: string): Promise<{ action: string; emoji: string }> {
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji }),
    });
    const result = await res.json();

    if (this.socket) {
      this.socket.emit(result.action === 'added' ? 'add-reaction' : 'remove-reaction', {
        channelId,
        messageId,
        emoji,
      });
    }

    return result;
  }

  onReactionUpdate(callback: (data: { messageId: string; emoji: string }) => void) {
    if (!this.socket) return;
    this.socket.on('reaction-added', callback);
    this.socket.on('reaction-removed', callback);
  }

  offReactionUpdate() {
    if (!this.socket) return;
    this.socket.off('reaction-added');
    this.socket.off('reaction-removed');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

let chatClient: ChatClient | null = null;

export function getChatClient(): ChatClient {
  if (!chatClient) {
    chatClient = new ChatClient();
  }
  return chatClient;
}
