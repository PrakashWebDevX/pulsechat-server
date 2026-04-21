import { Router } from "express";
import {
  createGroup, getUserGroups, getGroup,
  addMember, removeMember, getGroupMessages, sendGroupMessage,
} from "../controllers/groupController.js";

const router = Router();

router.post("/",                          createGroup);
router.get("/",                           getUserGroups);
router.get("/:id",                        getGroup);
router.post("/:id/members",              addMember);
router.delete("/:id/members/:userId",    removeMember);
router.get("/:id/messages",              getGroupMessages);
router.post("/:id/messages",             sendGroupMessage);

export default router;
