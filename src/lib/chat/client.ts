import { io, Socket } from 'socket.io-client';

export interface ReplyPreview {
  content: string;
  display_name: string;
  username: string;
}

export interface Message {
  id: string;
  channel_id: string;
  conversation_id?: string;
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

  // Track active subscriptions so we can re-join on reconnect
  private activeChannelId: string | null = null;
  private activeConvId: string | null = null;
  private channelMessageCb: MessageCallback | null = null;
  private dmMessageCb: MessageCallback | null = null;

  init() {
    if (this.socket) return;
    this.socket = io({ path: '/socket.io/', transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      this.identify();
      // Re-join active rooms on reconnect
      if (this.activeChannelId) {
        this.socket!.emit('join-channel', this.activeChannelId);
      }
      if (this.activeConvId) {
        this.socket!.emit('join-dm', this.activeConvId);
      }
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  private async identify() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.user) return;
      const hwid = typeof window !== 'undefined' ? localStorage.getItem('monoxide-hwid') : null;
      this.socket?.emit('identify', {
        userId: data.user.id,
        username: data.user.username,
        displayName: data.user.display_name,
        avatarUrl: data.user.avatar_url,
        hwid,
      });
    } catch {}
  }

  // === Channel methods ===

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
    if (this.socket) this.socket.emit('send-message', msg);
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

    // Track active subscription
    this.activeChannelId = channelId;
    this.channelMessageCb = onMessage;

    // Join room
    this.socket.emit('join-channel', channelId);

    // Remove old listener before adding new one to prevent duplicates
    this.socket.off('new-message');
    this.socket.on('new-message', (msg: Message) => {
      if (msg.channel_id === channelId) onMessage(msg);
    });
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void) {
    if (!this.socket) return;
    this.socket.off('message-deleted');
    this.socket.on('message-deleted', callback);
  }

  offMessageDeleted() {
    this.socket?.off('message-deleted');
  }

  unsubscribeFromChannel(channelId: string) {
    if (!this.socket) return;
    this.socket.emit('leave-channel', channelId);
    this.socket.off('new-message');
    this.socket.off('typing-update');
    this.socket.off('reaction-added');
    this.socket.off('reaction-removed');
    this.socket.off('message-deleted');
    this.activeChannelId = null;
    this.channelMessageCb = null;
  }

  onTyping(channelId: string, callback: TypingCallback) {
    if (!this.socket) return;
    this.socket.off('typing-update');
    this.socket.on('typing-update', (data: { channelId: string; users: TypingUser[] }) => {
      if (data.channelId === channelId) callback(data.users);
    });
  }

  emitTyping(channelId: string, username: string, isTyping: boolean, avatarUrl?: string) {
    if (!this.socket) return;
    this.socket.emit(isTyping ? 'typing-start' : 'typing-stop', { channelId, username, avatarUrl });
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
      this.socket.emit(result.action === 'added' ? 'add-reaction' : 'remove-reaction', { channelId, messageId, emoji });
    }
    return result;
  }

  onReactionUpdate(callback: (data: { messageId: string; emoji: string }) => void) {
    if (!this.socket) return;
    this.socket.off('reaction-added');
    this.socket.off('reaction-removed');
    this.socket.on('reaction-added', callback);
    this.socket.on('reaction-removed', callback);
  }

  offReactionUpdate() {
    this.socket?.off('reaction-added');
    this.socket?.off('reaction-removed');
  }

  // === DM methods ===

  async getConversations() {
    const res = await fetch('/api/dm/conversations');
    return res.json();
  }

  async createConversation(userIds: string[], name?: string) {
    const res = await fetch('/api/dm/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, name }),
    });
    return res.json();
  }

  async getDmMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`/api/dm/messages?conversationId=${conversationId}`);
    return res.json();
  }

  async sendDm(conversationId: string, content: string, replyTo?: string, imageUrl?: string): Promise<Message | null> {
    const res = await fetch('/api/dm/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content, replyTo, imageUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send');
    }
    const msg = await res.json();
    if (this.socket) this.socket.emit('send-dm', msg);
    return msg;
  }

  async deleteDm(messageId: string, conversationId: string): Promise<boolean> {
    const res = await fetch('/api/dm/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (this.socket && data.ok) {
      this.socket.emit('delete-dm', { messageId, conversationId });
    }
    return data.ok;
  }

  subscribeToDm(conversationId: string, onMessage: MessageCallback) {
    if (!this.socket) return;

    // Track active subscription
    this.activeConvId = conversationId;
    this.dmMessageCb = onMessage;

    // Join room
    this.socket.emit('join-dm', conversationId);

    // Remove old listener before adding new one
    this.socket.off('new-dm');
    this.socket.on('new-dm', (msg: Message) => {
      if (msg.conversation_id === conversationId) onMessage(msg);
    });
  }

  unsubscribeFromDm(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('leave-dm', conversationId);
    this.socket.off('new-dm');
    this.socket.off('dm-typing-update');
    this.socket.off('dm-deleted');
    this.activeConvId = null;
    this.dmMessageCb = null;
  }

  onDmDeleted(callback: (data: { messageId: string }) => void) {
    this.socket?.off('dm-deleted');
    this.socket?.on('dm-deleted', callback);
  }

  offDmDeleted() {
    this.socket?.off('dm-deleted');
  }

  onDmTyping(conversationId: string, callback: TypingCallback) {
    if (!this.socket) return;
    this.socket.off('dm-typing-update');
    this.socket.on('dm-typing-update', (data: { conversationId: string; users: TypingUser[] }) => {
      if (data.conversationId === conversationId) callback(data.users);
    });
  }

  emitDmTyping(conversationId: string, username: string, isTyping: boolean, avatarUrl?: string) {
    if (!this.socket) return;
    this.socket.emit(isTyping ? 'dm-typing-start' : 'dm-typing-stop', { conversationId, username, avatarUrl });
  }

  // === Mentions ===

  onMention(callback: (data: any) => void) {
    this.socket?.off('mention');
    this.socket?.on('mention', callback);
  }

  offMention() {
    this.socket?.off('mention');
  }

  async getMentionCount(): Promise<number> {
    const res = await fetch('/api/mentions');
    const data = await res.json();
    return data.count || 0;
  }

  async markMentionsRead(opts: { channelId?: string; conversationId?: string }) {
    await fetch('/api/mentions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeChannelId = null;
    this.activeConvId = null;
    this.channelMessageCb = null;
    this.dmMessageCb = null;
  }
}

let chatClient: ChatClient | null = null;

export function getChatClient(): ChatClient {
  if (!chatClient) {
    chatClient = new ChatClient();
  }
  return chatClient;
}
