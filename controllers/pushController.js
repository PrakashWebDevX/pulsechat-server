import webpush from "web-push";
import User from "../models/User.js";

// Configure VAPID — set these in your .env
webpush.setVapidDetails(
  "mailto:admin@pulsechat.app",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key so the frontend can subscribe.
 */
export async function getVapidPublicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
}

/**
 * POST /api/push/subscribe
 * Save a push subscription for a user.
 * Body: { userId, subscription }
 */
export async function saveSubscription(req, res) {
  try {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ error: "userId and subscription required" });
    }

    // Store subscription as JSON string in user's pushTokens array
    const subStr = JSON.stringify(subscription);

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { pushTokens: subStr } },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("saveSubscription error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
}

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription for a user.
 */
export async function removeSubscription(req, res) {
  try {
    const { userId, subscription } = req.body;
    const subStr = JSON.stringify(subscription);

    await User.findByIdAndUpdate(userId, {
      $pull: { pushTokens: subStr },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove subscription" });
  }
}

/**
 * Send a push notification to a specific user.
 * Called internally (not an API route) when a message is sent to offline user.
 */
export async function sendPushToUser(receiverId, payload) {
  try {
    const user = await User.findById(receiverId).select("pushTokens");
    if (!user || !user.pushTokens || user.pushTokens.length === 0) return;

    const notification = JSON.stringify(payload);
    const invalidTokens = [];

    await Promise.all(
      user.pushTokens.map(async (tokenStr) => {
        try {
          let subscription;
          try {
            subscription = JSON.parse(tokenStr);
          } catch {
            return; // Skip invalid tokens
          }

          await webpush.sendNotification(subscription, notification);
        } catch (err) {
          // 410 = subscription expired/invalid, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            invalidTokens.push(tokenStr);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(receiverId, {
        $pull: { pushTokens: { $in: invalidTokens } },
      });
    }
  } catch (err) {
    console.error("sendPushToUser error:", err);
  }
}
