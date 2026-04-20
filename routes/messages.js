import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/messageController.js";

const router = Router();

router.get("/:userId", getMessages); // GET  /api/messages/:userId?myId=xxx
router.post("/", sendMessage);       // POST /api/messages

export default router;
