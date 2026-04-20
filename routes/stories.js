import { Router } from "express";
import { createStory, getStories, viewStory, deleteStory } from "../controllers/storyController.js";

const router = Router();

router.post("/",           createStory);
router.get("/",            getStories);
router.patch("/:id/view",  viewStory);
router.delete("/:id",      deleteStory);

export default router;
