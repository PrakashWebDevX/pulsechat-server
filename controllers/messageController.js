import Message from "../models/Message.js";
import User from "../models/User.js";
import { sendPushToUser } from "./pushController.js";

// Track online users (shared with socket handler)
// We import the onlineUsers map from socketHandler
let getOnlineUsers = () => new Map();
export function setOnlineUsersGetter(fn) {
  getOnlineUsers = fn;
}

/** GET /api/messages/search?q=xxx&userId=xxx */
export { searchMessages } from "./analyticsController.js";

/** GET /api/messages/:userId?myId=xxx */
export async function getMessages(req, res) {
  try {
    const { userId } = req.params;
    const { myId } = req.query;
    if (!myId) return res.status(400).json({ error: "myId required" });

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }).select("-__v");

    await Message.updateMany(
      { senderId: userId, receiverId: myId, status: { $ne: "read" } },
      { status: "read" }
    );

    res.json(messages);
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

/** POST /api/messages */
export async function sendMessage(req, res) {
  try {
    const { senderId, receiverId, message, type, fileUrl, fileName, fileSize, replyTo } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "senderId and receiverId required" });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);
    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const newMsg = await Message.create({
      senderId, receiverId,
      message: message?.trim() || "",
      type: type || "text",
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      replyTo: replyTo || undefined,
      status: "sent",
    });

    // ── Send push notification if receiver is OFFLINE ──────────────────────
    const onlineUsers = getOnlineUsers();
    const isReceiverOnline = onlineUsers.has(receiverId.toString());

    if (!isReceiverOnline) {
      // Determine notification body
      let notifBody = message?.trim() || "";
      if (type === "image") notifBody = "📷 Sent you an image";
      else if (type === "audio") notifBody = "🎤 Sent you a voice message";
      else if (type === "file") notifBody = `📎 Sent you a file: ${fileName || ""}`;
      else if (!notifBody) notifBody = "New message";

      await sendPushToUser(receiverId, {
        title: sender.name,
        body: notifBody,
        icon: sender.image || "/icon-192.png",
        badge: "/icon-192.png",
        url: "/chat",
        tag: `msg-${senderId}`,
        senderId: senderId.toString(),
      });
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error("sendMessage:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
}

/** PATCH /api/messages/:id/edit */
export async function editMessage(req, res) {
  try {
    const { message } = req.body;
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { message: message.trim(), edited: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit message" });
  }
}

/** PATCH /api/messages/:id/delete */
export async function deleteMessage(req, res) {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { deleted: true, message: "This message was deleted", fileUrl: "", type: "text" },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
}

/** PATCH /api/messages/:id/react */
export async function reactToMessage(req, res) {
  try {
    const { userId, emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const idx = msg.reactions.findIndex((r) => r.userId.toString() === userId);
    if (idx !== -1) {
      if (msg.reactions[idx].emoji === emoji) msg.reactions.splice(idx, 1);
      else msg.reactions[idx].emoji = emoji;
    } else {
      msg.reactions.push({ userId, emoji });
    }

    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to react to message" });
  }
}

/** PATCH /api/messages/read */
export async function markAsRead(req, res) {
  try {
    const { senderId, receiverId } = req.body;
    await Message.updateMany(
      { senderId, receiverId, status: { $ne: "read" } },
      { status: "read" }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
}
