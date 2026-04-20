import { Router } from "express";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
} from "../controllers/messageController.js";

const router = Router();

router.get("/:userId", getMessages);        // GET  /api/messages/:userId?myId=xxx
router.post("/", sendMessage);              // POST /api/messages
router.patch("/:id/edit", editMessage);     // PATCH /api/messages/:id/edit
router.patch("/:id/delete", deleteMessage); // PATCH /api/messages/:id/delete
router.patch("/:id/react", reactToMessage); // PATCH /api/messages/:id/react
router.patch("/read", markAsRead);          // PATCH /api/messages/read

export default router;
