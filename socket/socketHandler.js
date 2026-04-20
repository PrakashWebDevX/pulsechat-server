/**
 * Socket.io event handler.
 *
 * Events emitted by CLIENT:
 *   join         { userId }           – register socket for a user
 *   send_message { senderId, receiverId, message, messageId, createdAt }
 *   typing       { senderId, receiverId }
 *   stop_typing  { senderId, receiverId }
 *
 * Events emitted by SERVER:
 *   online_users  [userId, ...]
 *   receive_message  { messageData }
 *   typing        { senderId }
 *   stop_typing   { senderId }
 */

// userId → socketId map (in-memory; use Redis for multi-instance)
const onlineUsers = new Map();

export function initSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Register user ──────────────────────────────────────────────────────
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      // Broadcast updated online list to everyone
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`👤 User ${userId} joined (socket ${socket.id})`);
    });

    // ── Send message ───────────────────────────────────────────────────────
    socket.on("send_message", (data) => {
      const { receiverId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        // Deliver only to the intended recipient
        io.to(receiverSocketId).emit("receive_message", data);
      }
    });

    // ── Typing indicators ──────────────────────────────────────────────────
    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId });
      }
    });

    socket.on("stop_typing", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop_typing", { senderId });
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Find and remove the disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}
