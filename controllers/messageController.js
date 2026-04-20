import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * GET /api/messages/:userId
 * Fetch the full conversation between the authenticated user and :userId.
 * Query param: ?myId=<currentUserId>
 */
export async function getMessages(req, res) {
  try {
    const { userId } = req.params; // chat partner
    const { myId } = req.query;    // current user

    if (!myId) {
      return res.status(400).json({ error: "myId query param is required" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    })
      .sort({ createdAt: 1 }) // oldest first
      .select("-__v");

    res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

/**
 * POST /api/messages
 * Persist a new message. Real-time delivery is handled by Socket.io;
 * this endpoint is the durable write path.
 */
export async function sendMessage(req, res) {
  try {
    const { senderId, receiverId, message } = req.body;

    if (!senderId || !receiverId || !message?.trim()) {
      return res.status(400).json({ error: "senderId, receiverId, and message are required" });
    }

    // Verify both users exist
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ error: "Sender or receiver not found" });
    }

    const newMessage = await Message.create({ senderId, receiverId, message: message.trim() });
    res.status(201).json(newMessage);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
}
