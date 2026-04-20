import User from "../models/User.js";

/**
 * GET /api/users
 * Return all users except the requesting user.
 */
export async function getUsers(req, res) {
  try {
    const { excludeId } = req.query;
    const filter = excludeId ? { _id: { $ne: excludeId } } : {};
    const users = await User.find(filter).select("-__v").sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

/**
 * POST /api/users/upsert
 * Called by NextAuth after Google login to persist the user.
 */
export async function upsertUser(req, res) {
  try {
    const { name, email, image } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { name, image },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(user);
  } catch (err) {
    console.error("upsertUser error:", err);
    res.status(500).json({ error: "Failed to upsert user" });
  }
}

/**
 * GET /api/users/:id
 * Return a single user by MongoDB _id.
 */
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-__v");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}
