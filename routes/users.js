import { Router } from "express";
import { getUsers, upsertUser, getUserById, updateProfile, savePushToken } from "../controllers/userController.js";

const router = Router();

router.get("/",                    getUsers);
router.post("/upsert",             upsertUser);
router.get("/:id",                 getUserById);
router.patch("/:id/profile",       updateProfile);
router.post("/:id/push-token",     savePushToken);

export default router;
