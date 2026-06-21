const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const channelRoutes = require("./routes/channelRoutes");

const { createMessage } = require("./controllers/messageController");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: FRONTEND_URL }));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from the Huddle Backend!");
});

app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);

app.use("/api/workspaces/:workspaceId/channels", channelRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(workspaceId);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const savedMessage = await createMessage({
        content: data.content,
        channelId: data.channelId,
        userId: socket.user.id,
      });

      if (savedMessage) {
        io.to(data.workspaceId).emit("receiveMessage", savedMessage);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  socket.on("disconnect", () => {});
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
