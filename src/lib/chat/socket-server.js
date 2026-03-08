module.exports = function setupSocketHandlers(io) {
  const typingUsers = new Map(); // channelId -> Map<username, { username, avatarUrl }>

  io.on('connection', (socket) => {
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

    socket.on('disconnect', () => {
      for (const [, users] of typingUsers) {
        if (socket.data?.username) users.delete(socket.data.username);
      }
    });
  });
};
