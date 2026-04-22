import webpush from "web-push";
import User from "../models/User.js";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("⚠️  VAPID keys not set — push notifications disabled");
    return;
  }
  webpush.setVapidDetails("mailto:admin@pulsechat.app", pub, priv);
  vapidConfigured = true;
  console.log("✅ VAPID configured");
}

/** GET /api/push/vapid-public-key */
export async function getVapidPublicKey(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY || "";
  res.json({ publicKey: key });
}

/** POST /api/push/subscribe */
export async function saveSubscription(req, res) {
  try {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ error: "userId and subscription required" });
    }

    const subStr = JSON.stringify(subscription);

    // Avoid duplicates
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.pushTokens.includes(subStr)) {
      user.pushTokens.push(subStr);
      // Keep max 5 subscriptions per user
      if (user.pushTokens.length > 5) {
        user.pushTokens = user.pushTokens.slice(-5);
      }
      await user.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("saveSubscription error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
}

/** POST /api/push/unsubscribe */
export async function removeSubscription(req, res) {
  try {
    const { userId, subscription } = req.body;
    const subStr = JSON.stringify(subscription);
    await User.findByIdAndUpdate(userId, { $pull: { pushTokens: subStr } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove subscription" });
  }
}

/** Internal: send push to user (called from messageController) */
export async function sendPushToUser(receiverId, payload) {
  ensureVapidConfigured();
  if (!vapidConfigured) return;

  try {
    const user = await User.findById(receiverId).select("pushTokens name");
    if (!user || !user.pushTokens || user.pushTokens.length === 0) return;

    const notification = JSON.stringify({
      title:    payload.title    || "PulseChat",
      body:     payload.body     || "New message",
      icon:     payload.icon     || "/icon-192.png",
      badge:    "/icon-192.png",
      url:      payload.url      || "/chat",
      tag:      payload.tag      || "pulsechat-msg",
      senderId: payload.senderId || "",
    });

    const invalidTokens = [];

    await Promise.allSettled(
      user.pushTokens.map(async (tokenStr) => {
        try {
          const subscription = JSON.parse(tokenStr);

          await webpush.sendNotification(subscription, notification, {
            TTL: 86400, // 24 hours
            urgency: "high",
            topic: "new-message",
          });

          console.log(`📬 Push sent to user ${receiverId}`);
        } catch (err) {
          const code = err.statusCode || err.code;
          // 410 Gone = subscription expired, 404 = endpoint not found
          if (code === 410 || code === 404) {
            console.log(`🗑️  Removing expired subscription for user ${receiverId}`);
            invalidTokens.push(tokenStr);
          } else {
            console.error(`Push failed (${code}):`, err.message);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(receiverId, {
        $pullAll: { pushTokens: invalidTokens },
      });
    }
  } catch (err) {
    console.error("sendPushToUser error:", err);
  }
}
