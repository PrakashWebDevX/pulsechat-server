import { Router } from "express";
import { getUsers, upsertUser, getUserById } from "../controllers/userController.js";

const router = Router();

router.get("/", getUsers);          // GET  /api/users?excludeId=xxx
router.post("/upsert", upsertUser); // POST /api/users/upsert
router.get("/:id", getUserById);    // GET  /api/users/:id

export default router;
