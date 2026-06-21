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

const {
  createMessage,
  editMessage,
  deleteMessage,
} = require("./controllers/messageController");
const { initDb } = require("./config/initDb");

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

const presence = new Map();

const addPresence = (workspaceId, userId) => {
  if (!presence.has(workspaceId)) presence.set(workspaceId, new Map());
  const users = presence.get(workspaceId);
  users.set(userId, (users.get(userId) || 0) + 1);
};

const removePresence = (workspaceId, userId) => {
  const users = presence.get(workspaceId);
  if (!users) return;
  const count = (users.get(userId) || 0) - 1;
  if (count <= 0) users.delete(userId);
  else users.set(userId, count);
};

const emitPresence = (workspaceId) => {
  const users = presence.get(workspaceId);
  io.to(workspaceId).emit("presenceUpdate", {
    workspaceId,
    onlineUserIds: users ? [...users.keys()] : [],
  });
};

io.on("connection", (socket) => {
  socket.data.workspaces = new Set();

  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(workspaceId);
    if (!socket.data.workspaces.has(workspaceId)) {
      socket.data.workspaces.add(workspaceId);
      addPresence(workspaceId, socket.user.id);
    }
    emitPresence(workspaceId);
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

  socket.on("startTyping", (data) => {
    socket.to(data.workspaceId).emit("userTyping", {
      channelId: data.channelId,
      username: socket.user.username,
    });
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.workspaceId).emit("userStoppedTyping", {
      channelId: data.channelId,
      username: socket.user.username,
    });
  });

  socket.on("editMessage", async (data) => {
    try {
      const updated = await editMessage({
        messageId: data.messageId,
        userId: socket.user.id,
        content: data.content,
      });
      if (updated) {
        io.to(data.workspaceId).emit("messageEdited", updated);
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });

  socket.on("deleteMessage", async (data) => {
    try {
      const result = await deleteMessage({
        messageId: data.messageId,
        userId: socket.user.id,
      });
      if (result) {
        io.to(data.workspaceId).emit("messageDeleted", result);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });

  socket.on("disconnect", () => {
    for (const workspaceId of socket.data.workspaces) {
      removePresence(workspaceId, socket.user.id);
      emitPresence(workspaceId);
    }
  });
});

initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
