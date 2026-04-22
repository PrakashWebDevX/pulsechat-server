import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./models/db.js";
import userRoutes     from "./routes/users.js";
import messageRoutes  from "./routes/messages.js";
import groupRoutes    from "./routes/groups.js";
import storyRoutes    from "./routes/stories.js";
import analyticsRoutes from "./routes/analytics.js";
import { initSocket } from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", methods: ["GET","POST"], credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "20mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", version: "3.0" }));
app.use("/api/users",     userRoutes);
app.use("/api/messages",  messageRoutes);
app.use("/api/groups",    groupRoutes);
app.use("/api/stories",   storyRoutes);
app.use("/api/analytics", analyticsRoutes);

initSocket(io);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  httpServer.listen(PORT, () => console.log(`🚀 Server v3.0 running on port ${PORT}`));
});

export { io };
