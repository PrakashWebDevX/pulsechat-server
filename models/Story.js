import Story from "../models/Story.js";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/** POST /api/stories — create a story */
export async function createStory(req, res) {
  try {
    const { userId, type, content, caption, bg } = req.body;
    if (!userId || !content) return res.status(400).json({ error: "userId and content required" });

    const story = await Story.create({
      userId,
      type: type || "text",
      content,
      caption: caption || "",
      bg: bg || "#22c55e",
      expiresAt: new Date(Date.now() + TWENTY_FOUR_HOURS),
    });

    const populated = await story.populate("userId", "name image");
    res.status(201).json(populated);
  } catch (err) {
    console.error("createStory:", err);
    res.status(500).json({ error: "Failed to create story" });
  }
}

/** GET /api/stories — get all active stories grouped by user */
export async function getStories(req, res) {
  try {
    const { userId } = req.query;

    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .populate("userId", "name image")
      .sort({ createdAt: -1 });

    // Group by user
    const grouped = {};
    for (const story of stories) {
      const uid = story.userId._id.toString();
      if (!grouped[uid]) {
        grouped[uid] = {
          user: story.userId,
          stories: [],
          hasUnseen: false,
        };
      }
      const seen = userId ? story.views.some((v) => v.userId?.toString() === userId) : false;
      if (!seen) grouped[uid].hasUnseen = true;
      grouped[uid].stories.push(story);
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stories" });
  }
}

/** PATCH /api/stories/:id/view — mark story as viewed */
export async function viewStory(req, res) {
  try {
    const { userId } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    const already = story.views.some((v) => v.userId?.toString() === userId);
    if (!already && userId !== story.userId.toString()) {
      story.views.push({ userId });
      await story.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark viewed" });
  }
}

/** DELETE /api/stories/:id — delete own story */
export async function deleteStory(req, res) {
  try {
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete story" });
  }
}
