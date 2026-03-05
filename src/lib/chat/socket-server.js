module.exports = function setupSocketHandlers(io) {
  const typingUsers = new Map(); // channelId -> Set of usernames

  io.on('connection', (socket) => {
    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send-message', (msg) => {
      // Broadcast the full message object to everyone in the channel (including sender)
      if (msg && msg.channel_id) {
        io.to(`channel:${msg.channel_id}`).emit('new-message', msg);
      }
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
      for (const [, users] of typingUsers) {
        users.delete(socket.data?.username);
      }
    });
  });
};
