import { Router } from "express";
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
} from "../controllers/pushController.js";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe",       saveSubscription);
router.post("/unsubscribe",     removeSubscription);

export default router;