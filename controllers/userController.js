import User from "../models/User.js";

export async function getUsers(req, res) {
  try {
    const { excludeId } = req.query;
    const filter = excludeId ? { _id: { $ne: excludeId } } : {};
    const users = await User.find(filter).select("-__v -pushTokens").sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function upsertUser(req, res) {
  try {
    const { name, email, image } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email required" });

    const user = await User.findOneAndUpdate(
      { email },
      { name, image },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to upsert user" });
  }
}

export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-__v -pushTokens");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

/** PATCH /api/users/:id/profile — update bio, username, image */
export async function updateProfile(req, res) {
  try {
    const { bio, username, image, name } = req.body;
    const update = {};
    if (bio !== undefined)      update.bio = bio.slice(0, 150);
    if (username !== undefined) update.username = username.trim();
    if (image !== undefined)    update.image = image;
    if (name !== undefined)     update.name = name.trim();

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-__v -pushTokens");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
}

/** POST /api/users/:id/push-token — save web push subscription */
export async function savePushToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });

    await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { pushTokens: token } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save token" });
  }
}
