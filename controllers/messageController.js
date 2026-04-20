import Message from "../models/Message.js";
import User from "../models/User.js";

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
    })
      .sort({ createdAt: 1 })
      .select("-__v");

    // Mark all unread incoming messages as read
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
    if (!message?.trim() && !fileUrl) {
      return res.status(400).json({ error: "message or fileUrl required" });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);
    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });

    const newMsg = await Message.create({
      senderId,
      receiverId,
      message: message?.trim() || "",
      type: type || "text",
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      replyTo: replyTo || undefined,
      status: "sent",
    });

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
    const { id } = req.params;
    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    const msg = await Message.findByIdAndUpdate(
      id,
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
    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Toggle: remove if same emoji exists, else add/replace
    const existingIdx = msg.reactions.findIndex(
      (r) => r.userId.toString() === userId
    );

    if (existingIdx !== -1) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        msg.reactions.splice(existingIdx, 1); // remove
      } else {
        msg.reactions[existingIdx].emoji = emoji; // replace
      }
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
