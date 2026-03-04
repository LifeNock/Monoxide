import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  is_deleted: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  pronouns: string;
}

type MessageCallback = (msg: Message) => void;
type TypingCallback = (users: string[]) => void;

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

  async sendMessage(channelId: string, content: string, replyTo?: string): Promise<Message | null> {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, content, replyTo }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send');
    }

    const msg = await res.json();

    // Broadcast via socket
    if (this.socket) {
      this.socket.emit('send-message', msg);
    }

    return msg;
  }

  async deleteMessage(messageId: string) {
    await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
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

  unsubscribeFromChannel(channelId: string) {
    if (!this.socket) return;
    this.socket.emit('leave-channel', channelId);
    this.socket.off('new-message');
    this.socket.off('typing-update');
  }

  onTyping(channelId: string, callback: TypingCallback) {
    if (!this.socket) return;
    this.socket.on('typing-update', (data: { channelId: string; users: string[] }) => {
      if (data.channelId === channelId) callback(data.users);
    });
  }

  emitTyping(channelId: string, username: string, isTyping: boolean) {
    if (!this.socket) return;
    this.socket.emit(isTyping ? 'typing-start' : 'typing-stop', { channelId, username });
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
