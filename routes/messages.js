import { Router } from "express";
import { getMessages, sendMessage, editMessage, deleteMessage, reactToMessage, markAsRead } from "../controllers/messageController.js";
import { searchMessages } from "../controllers/analyticsController.js";

const router = Router();

router.get("/search",      searchMessages);      // GET /api/messages/search?q=xxx&userId=xxx
router.get("/:userId",     getMessages);         // GET /api/messages/:userId?myId=xxx
router.post("/",           sendMessage);         // POST /api/messages
router.patch("/:id/edit",  editMessage);
router.patch("/:id/delete",deleteMessage);
router.patch("/:id/react", reactToMessage);
router.patch("/read",      markAsRead);

export default router;
