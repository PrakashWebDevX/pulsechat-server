import { setOnlineUsersGetter } from "../controllers/messageController.js";

const onlineUsers = new Map(); // userId → socketId

// Share onlineUsers map with messageController for push notification checks
setOnlineUsersGetter(() => onlineUsers);

export function initSocket(io) {
  io.on("connection", (socket) => {

    // ── Register user ──────────────────────────────────────────────────────
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("join_groups", (groupIds) => {
      if (Array.isArray(groupIds)) groupIds.forEach((id) => socket.join(`group:${id}`));
    });

    // ── Private message ────────────────────────────────────────────────────
    socket.on("send_message", (data) => {
      try {
        const s = onlineUsers.get(data.receiverId);
        if (s) {
          io.to(s).emit("receive_message", data);
          socket.emit("message_delivered", { messageId: data.messageId });
        }
        // Note: push notification for offline users is handled in messageController.js
      } catch {}
    });

    // ── Group message ──────────────────────────────────────────────────────
    socket.on("send_group_message", (data) => {
      try { socket.to(`group:${data.groupId}`).emit("receive_group_message", data); } catch {}
    });

    // ── Read receipts ──────────────────────────────────────────────────────
    socket.on("message_read", ({ senderId, receiverId }) => {
      const s = onlineUsers.get(senderId);
      if (s) io.to(s).emit("message_read", { receiverId });
    });

    // ── Reactions ──────────────────────────────────────────────────────────
    socket.on("message_reaction", (data) => {
      try {
        if (data.groupId) { socket.to(`group:${data.groupId}`).emit("message_reaction", data); }
        else { const s = onlineUsers.get(data.receiverId); if (s) io.to(s).emit("message_reaction", data); }
      } catch {}
    });

    // ── Edit / Delete ──────────────────────────────────────────────────────
    socket.on("message_edit", (data) => {
      try {
        if (data.groupId) { socket.to(`group:${data.groupId}`).emit("message_edited", data); }
        else { const s = onlineUsers.get(data.receiverId); if (s) io.to(s).emit("message_edited", data); }
      } catch {}
    });

    socket.on("message_delete", (data) => {
      try {
        if (data.groupId) { socket.to(`group:${data.groupId}`).emit("message_deleted", data); }
        else { const s = onlineUsers.get(data.receiverId); if (s) io.to(s).emit("message_deleted", data); }
      } catch {}
    });

    // ── Typing ─────────────────────────────────────────────────────────────
    socket.on("typing", ({ senderId, receiverId, groupId, senderName }) => {
      try {
        if (groupId) { socket.to(`group:${groupId}`).emit("typing", { senderId, senderName, groupId }); }
        else { const s = onlineUsers.get(receiverId); if (s) io.to(s).emit("typing", { senderId }); }
      } catch {}
    });

    socket.on("stop_typing", ({ senderId, receiverId, groupId }) => {
      try {
        if (groupId) { socket.to(`group:${groupId}`).emit("stop_typing", { senderId, groupId }); }
        else { const s = onlineUsers.get(receiverId); if (s) io.to(s).emit("stop_typing", { senderId }); }
      } catch {}
    });

    // ── WebRTC Signaling ───────────────────────────────────────────────────
    socket.on("call_user", ({ callerId, callerName, callerImage, receiverId, callType, offer }) => {
      try {
        const s = onlineUsers.get(receiverId);
        if (s) io.to(s).emit("incoming_call", { callerId, callerName, callerImage, callType, offer });
        else socket.emit("call_failed", { reason: "User is offline" });
      } catch {}
    });

    socket.on("call_answer", ({ callerId, answer }) => {
      try { const s = onlineUsers.get(callerId); if (s) io.to(s).emit("call_answered", { answer }); } catch {}
    });

    socket.on("ice_candidate", ({ targetId, candidate }) => {
      try { const s = onlineUsers.get(targetId); if (s) io.to(s).emit("ice_candidate", { candidate }); } catch {}
    });

    socket.on("end_call", ({ targetId }) => {
      try { const s = onlineUsers.get(targetId); if (s) io.to(s).emit("call_ended"); } catch {}
    });

    socket.on("reject_call", ({ callerId }) => {
      try { const s = onlineUsers.get(callerId); if (s) io.to(s).emit("call_rejected"); } catch {}
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) { onlineUsers.delete(uid); break; }
      }
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });
}
