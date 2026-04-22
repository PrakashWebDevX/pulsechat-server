import Message from "../models/Message.js";
import User from "../models/User.js";

/** GET /api/analytics?userId=xxx */
export async function getAnalytics(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [sent, received] = await Promise.all([
      Message.find({ senderId: userId, createdAt: { $gte: thirtyDaysAgo } }),
      Message.find({ receiverId: userId, createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const all = [...sent, ...received];

    // Messages by day of week
    const dayCount = Array(7).fill(0);
    all.forEach((m) => { dayCount[new Date(m.createdAt).getDay()]++; });
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const messagesByDay = days.map((d, i) => ({ day: d, count: dayCount[i] }));
    const mostActiveDay = days[dayCount.indexOf(Math.max(...dayCount))];

    // Messages by hour
    const hourCount = Array(24).fill(0);
    all.forEach((m) => { hourCount[new Date(m.createdAt).getHours()]++; });
    const messagesByHour = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: hourCount[i] }));
    const mostActiveHour = `${hourCount.indexOf(Math.max(...hourCount))}:00`;

    // Media shared
    const mediaShared = sent.filter((m) => m.type !== "text").length;

    // Top contact
    const contactCount = {};
    sent.forEach((m) => {
      if (m.receiverId) {
        const id = m.receiverId.toString();
        contactCount[id] = (contactCount[id] || 0) + 1;
      }
    });
    const topContactId = Object.entries(contactCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
    let topContact = "None";
    if (topContactId) {
      const u = await User.findById(topContactId).select("name");
      topContact = u?.name || "Unknown";
    }

    // Avg response time (rough estimate)
    let totalResponseMs = 0; let responseCount = 0;
    const sentIds = new Set(sent.map((m) => m.receiverId?.toString()));
    for (const recvMsg of received) {
      const reply = sent.find((s) =>
        s.receiverId?.toString() === recvMsg.senderId?.toString() &&
        new Date(s.createdAt) > new Date(recvMsg.createdAt)
      );
      if (reply) {
        totalResponseMs += new Date(reply.createdAt).getTime() - new Date(recvMsg.createdAt).getTime();
        responseCount++;
      }
    }
    const avgMs = responseCount > 0 ? totalResponseMs / responseCount : 0;
    const avgResponseTime = avgMs === 0 ? "N/A" : avgMs < 60000 ? `${Math.round(avgMs / 1000)}s` : avgMs < 3600000 ? `${Math.round(avgMs / 60000)}m` : `${Math.round(avgMs / 3600000)}h`;

    res.json({
      totalMessages: all.length,
      sentMessages: sent.length,
      receivedMessages: received.length,
      totalChats: Object.keys(contactCount).length,
      mediaShared,
      avgResponseTime,
      mostActiveDay,
      mostActiveHour,
      topContact,
      messagesByDay,
      messagesByHour,
    });
  } catch (err) {
    console.error("analytics error:", err);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
}

/** GET /api/messages/search?q=xxx&userId=xxx */
export async function searchMessages(req, res) {
  try {
    const { q, userId } = req.query;
    if (!q || !userId) return res.status(400).json({ error: "q and userId required" });

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      message: { $regex: q, $options: "i" },
      deleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("senderId", "name image");

    res.json(messages.map((m) => ({
      _id: m._id,
      message: m.message,
      senderName: (m.senderId as any)?.name || "Unknown",
      createdAt: m.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
}
