// Socket.io chat handlers — fallback when Supabase Realtime is unavailable
module.exports = function setupSocketHandlers(io) {
  const typingUsers = new Map(); // channelId -> Set of usernames

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send-message', (data) => {
      // Broadcast to channel
      io.to(`channel:${data.channelId}`).emit('new-message', {
        id: data.id,
        channel_id: data.channelId,
        user_id: data.userId,
        content: data.content,
        reply_to: data.replyTo || null,
        created_at: new Date().toISOString(),
        profiles: data.profile,
      });
    });

    socket.on('typing-start', ({ channelId, username }) => {
      if (!typingUsers.has(channelId)) typingUsers.set(channelId, new Set());
      typingUsers.get(channelId).add(username);
      socket.to(`channel:${channelId}`).emit('typing-update', {
        channelId,
        users: Array.from(typingUsers.get(channelId)),
      });
    });

    socket.on('typing-stop', ({ channelId, username }) => {
      if (typingUsers.has(channelId)) {
        typingUsers.get(channelId).delete(username);
        socket.to(`channel:${channelId}`).emit('typing-update', {
          channelId,
          users: Array.from(typingUsers.get(channelId)),
        });
      }
    });

    socket.on('add-reaction', (data) => {
      io.to(`channel:${data.channelId}`).emit('reaction-added', data);
    });

    socket.on('remove-reaction', (data) => {
      io.to(`channel:${data.channelId}`).emit('reaction-removed', data);
    });

    socket.on('disconnect', () => {
      // Clean up typing indicators
      for (const [channelId, users] of typingUsers) {
        users.delete(socket.data?.username);
      }
    });
  });
};
