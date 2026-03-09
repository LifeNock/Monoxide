module.exports = function setupSocketHandlers(io) {
  const typingUsers = new Map(); // channelId -> Map<username, { username, avatarUrl }>
  const dmTypingUsers = new Map(); // conversationId -> Map<username, { username, avatarUrl }>
  const onlineUsers = new Map(); // socketId -> { userId, username, displayName, avatarUrl, ip, hwid, connectedAt }

  // Expose onlineUsers on io instance for API access
  io._onlineUsers = onlineUsers;

  io.on('connection', (socket) => {
    // Track user presence
    socket.on('identify', (data) => {
      if (data && data.userId && data.username) {
        const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || socket.handshake.address
          || 'unknown';
        onlineUsers.set(socket.id, {
          userId: data.userId,
          username: data.username,
          displayName: data.displayName || data.username,
          avatarUrl: data.avatarUrl || null,
          ip,
          hwid: data.hwid || null,
          connectedAt: new Date().toISOString(),
        });
        // Auto-join user's DM rooms
        if (data.userId) {
          socket.join(`user:${data.userId}`);
        }
      }
    });

    // === Channel events ===
    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send-message', (msg) => {
      if (msg && msg.channel_id) {
        io.to(`channel:${msg.channel_id}`).emit('new-message', msg);
      }
    });

    socket.on('typing-start', ({ channelId, username, avatarUrl }) => {
      if (!typingUsers.has(channelId)) typingUsers.set(channelId, new Map());
      typingUsers.get(channelId).set(username, { username, avatarUrl: avatarUrl || '' });
      socket.data = { ...socket.data, username };
      socket.to(`channel:${channelId}`).emit('typing-update', {
        channelId,
        users: Array.from(typingUsers.get(channelId).values()),
      });
    });

    socket.on('typing-stop', ({ channelId, username }) => {
      if (typingUsers.has(channelId)) {
        typingUsers.get(channelId).delete(username);
        socket.to(`channel:${channelId}`).emit('typing-update', {
          channelId,
          users: Array.from(typingUsers.get(channelId).values()),
        });
      }
    });

    socket.on('delete-message', (data) => {
      if (data && data.channelId) {
        io.to(`channel:${data.channelId}`).emit('message-deleted', { messageId: data.messageId });
      }
    });

    socket.on('add-reaction', (data) => {
      io.to(`channel:${data.channelId}`).emit('reaction-added', data);
    });

    socket.on('remove-reaction', (data) => {
      io.to(`channel:${data.channelId}`).emit('reaction-removed', data);
    });

    // === DM events ===
    socket.on('join-dm', (conversationId) => {
      socket.join(`dm:${conversationId}`);
    });

    socket.on('leave-dm', (conversationId) => {
      socket.leave(`dm:${conversationId}`);
    });

    socket.on('send-dm', (msg) => {
      if (msg && msg.conversation_id) {
        io.to(`dm:${msg.conversation_id}`).emit('new-dm', msg);
      }
    });

    socket.on('dm-typing-start', ({ conversationId, username, avatarUrl }) => {
      if (!dmTypingUsers.has(conversationId)) dmTypingUsers.set(conversationId, new Map());
      dmTypingUsers.get(conversationId).set(username, { username, avatarUrl: avatarUrl || '' });
      socket.to(`dm:${conversationId}`).emit('dm-typing-update', {
        conversationId,
        users: Array.from(dmTypingUsers.get(conversationId).values()),
      });
    });

    socket.on('dm-typing-stop', ({ conversationId, username }) => {
      if (dmTypingUsers.has(conversationId)) {
        dmTypingUsers.get(conversationId).delete(username);
        socket.to(`dm:${conversationId}`).emit('dm-typing-update', {
          conversationId,
          users: Array.from(dmTypingUsers.get(conversationId).values()),
        });
      }
    });

    socket.on('delete-dm', (data) => {
      if (data && data.conversationId) {
        io.to(`dm:${data.conversationId}`).emit('dm-deleted', { messageId: data.messageId });
      }
    });

    // === Mention notification ===
    socket.on('mention-notify', (data) => {
      // Send notification to mentioned user's room
      if (data && data.userId) {
        io.to(`user:${data.userId}`).emit('mention', data);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      for (const [, users] of typingUsers) {
        if (socket.data?.username) users.delete(socket.data.username);
      }
      for (const [, users] of dmTypingUsers) {
        if (socket.data?.username) users.delete(socket.data.username);
      }
    });
  });
};
