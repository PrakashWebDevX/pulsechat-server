import Group from "../models/Group.js";
import Message from "../models/Message.js";

/** POST /api/groups — create a group */
export async function createGroup(req, res) {
  try {
    const { name, description, memberIds, createdBy } = req.body;
    if (!name || !createdBy) return res.status(400).json({ error: "name and createdBy required" });

    const members = [
      { userId: createdBy, role: "admin" },
      ...(memberIds || []).filter((id) => id !== createdBy).map((id) => ({ userId: id, role: "member" })),
    ];

    const group = await Group.create({ name, description: description || "", createdBy, members });
    const populated = await group.populate("members.userId", "name email image");
    res.status(201).json(populated);
  } catch (err) {
    console.error("createGroup:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
}

/** GET /api/groups?userId=xxx — get all groups for a user */
export async function getUserGroups(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const groups = await Group.find({ "members.userId": userId })
      .populate("members.userId", "name email image")
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
}

/** GET /api/groups/:id — get group details */
export async function getGroup(req, res) {
  try {
    const group = await Group.findById(req.params.id).populate("members.userId", "name email image");
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch group" });
  }
}

/** POST /api/groups/:id/members — add member */
export async function addMember(req, res) {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const already = group.members.find((m) => m.userId.toString() === userId);
    if (already) return res.status(400).json({ error: "Already a member" });

    group.members.push({ userId, role: "member" });
    await group.save();
    const populated = await group.populate("members.userId", "name email image");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
}

/** DELETE /api/groups/:id/members/:userId — remove member */
export async function removeMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.members = group.members.filter((m) => m.userId.toString() !== req.params.userId);
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: "Failed to remove member" });
  }
}

/** GET /api/groups/:id/messages — get group messages */
export async function getGroupMessages(req, res) {
  try {
    const messages = await Message.find({ groupId: req.params.id })
      .populate("senderId", "name image")
      .sort({ createdAt: 1 })
      .select("-__v");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch group messages" });
  }
}

/** POST /api/groups/:id/messages — send group message */
export async function sendGroupMessage(req, res) {
  try {
    const { senderId, message, type, fileUrl, fileName, fileSize, replyTo } = req.body;
    if (!senderId) return res.status(400).json({ error: "senderId required" });

    const msg = await Message.create({
      senderId,
      groupId: req.params.id,
      message: message || "",
      type: type || "text",
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      replyTo: replyTo || undefined,
      status: "sent",
    });

    // Touch group updatedAt for sorting
    await Group.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });

    const populated = await msg.populate("senderId", "name image");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to send group message" });
  }
}
