import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = Number(process.env.PORT) || 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Track room state in memory
  const rooms = new Map<string, {
    participants: Map<string, { id: string; name: string; isHost: boolean; isMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean }>;
    lobby: Map<string, { id: string; name: string }>;
    isLocked: boolean;
    passcode: string | null;
    spotlightId: string | null;
  }>();

  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    socket.on("join-room", ({ roomId, name, passcode }: { roomId: string; name: string; passcode?: string }) => {
      // Basic input sanitization and validation
      const sanitizedName = (name || "").slice(0, 32).trim();
      const sanitizedRoomId = (roomId || "").slice(0, 64).trim();
      const sanitizedPasscode = (passcode || "").trim();

      if (!sanitizedRoomId) {
        socket.emit("error", { message: "Invalid Room ID." });
        return;
      }

      let room = rooms.get(sanitizedRoomId);

      // Handle room initialization
      if (!room) {
        room = {
          participants: new Map(),
          lobby: new Map(),
          isLocked: false,
          passcode: sanitizedPasscode || null, // First person sets the passcode if provided
          spotlightId: null,
        };
        rooms.set(sanitizedRoomId, room);
      }

      // Check passcode if room has one
      if (room.passcode && room.passcode !== sanitizedPasscode) {
        // If the user who just joined is the very first one, they might have set it. 
        // But if there are already participants, they must match.
        if (room.participants.size > 0) {
          socket.emit("error", { message: "Incorrect meeting passcode.", type: "AUTH_REQUIRED" });
          return;
        }
      }

      // Handle locked room (Lobby)
      if (room.isLocked) {
        const lobbyData = { id: socket.id, name: sanitizedName };
        room.lobby.set(socket.id, lobbyData);
        socket.emit("waiting-in-lobby", { roomId: sanitizedRoomId });
        
        // Notify host(s)
        const host = Array.from(room.participants.values()).find(p => p.isHost);
        if (host) {
          io.to(host.id).emit("lobby-update", Array.from(room.lobby.values()));
        }
        return;
      }

      const isHost = room.participants.size === 0;
      const userData = {
        id: socket.id,
        name: sanitizedName || `User ${socket.id.slice(0, 4)}`,
        isHost,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
      };

      room.participants.set(socket.id, userData);
      socket.join(sanitizedRoomId);

      // Tell the user they've joined
      const participants = Array.from(room.participants.values());
      socket.emit("room-joined", { 
        roomId: sanitizedRoomId, 
        me: userData, 
        participants: participants.filter(p => p.id !== socket.id),
        isLocked: room.isLocked,
        spotlightId: room.spotlightId,
        hasPasscode: !!room.passcode
      });

      // Notify others
      socket.to(sanitizedRoomId).emit("user-joined", userData);
    });

    // Lobby Administration
    socket.on("lobby-decision", ({ roomId, userId, action }: { roomId: string; userId: string; action: "admit" | "deny" }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      
      if (requester?.isHost && room) {
        const lobbyUser = room.lobby.get(userId);
        if (lobbyUser) {
          if (action === "admit") {
            room.lobby.delete(userId);
            
            const userData = {
              id: userId,
              name: lobbyUser.name,
              isHost: false,
              isMuted: false,
              isVideoOff: false,
              isScreenSharing: false,
            };
            
            room.participants.set(userId, userData);
            const userSocket = io.sockets.sockets.get(userId);
            if (userSocket) {
              userSocket.join(roomId);
              const participants = Array.from(room.participants.values());
              userSocket.emit("room-joined", { 
                roomId, 
                me: userData, 
                participants: participants.filter(p => p.id !== userId),
                isLocked: room.isLocked,
                spotlightId: room.spotlightId,
                hasPasscode: !!room.passcode
              });
              socket.to(roomId).emit("user-joined", userData);
            }
          } else {
            room.lobby.delete(userId);
            io.to(userId).emit("error", { message: "The host declined your entry request." });
          }
          
          // Update host with new lobby state
          socket.emit("lobby-update", Array.from(room.lobby.values()));
        }
      }
    });

    socket.on("signal", ({ to, from, signal }: { to: string; from: string; signal: any }) => {
      io.to(to).emit("signal", { from, signal });
    });

    socket.on("update-state", ({ roomId, state }: { roomId: string; state: any }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.participants.get(socket.id);
        if (user) {
          Object.assign(user, state);
          io.to(roomId).emit("user-updated", user);
        }
      }
    });

    socket.on("send-transcript", ({ roomId, text }: { roomId: string; text: string }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.participants.get(socket.id);
        if (user && text && text.trim()) {
          const transcript = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: socket.id,
            senderName: user.name,
            text,
            timestamp: Date.now(),
          };
          io.to(roomId).emit("new-transcript", transcript);
        }
      }
    });

    socket.on("send-message", ({ roomId, text }: { roomId: string; text: string }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.participants.get(socket.id);
        if (user && text && text.trim()) {
          const message = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: socket.id,
            senderName: user.name,
            text: text.slice(0, 500), // Limit message length
            timestamp: Date.now(),
            reactions: {},
          };
          io.to(roomId).emit("new-message", message);
        }
      }
    });

    socket.on("react-to-message", ({ roomId, messageId, emoji }: { roomId: string; messageId: string; emoji: string }) => {
      // Validate emoji to prevent abuse
      if (emoji && emoji.length <= 8) {
        io.to(roomId).emit("message-reacted", { messageId, emoji, userId: socket.id });
      }
    });

    // Host Controls
    socket.on("mute-all", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost && room) {
        io.to(roomId).emit("force-mute-all");
        // Update state in server as well
        room.participants.forEach(p => {
          if (!p.isHost) p.isMuted = true;
        });
      }
    });

    socket.on("mute-user", ({ roomId, userId }: { roomId: string; userId: string }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost && room) {
        io.to(userId).emit("force-mute");
        const target = room.participants.get(userId);
        if (target) target.isMuted = true;
      }
    });

    socket.on("stop-video-user", ({ roomId, userId }: { roomId: string; userId: string }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost && room) {
        io.to(userId).emit("force-stop-video");
        const target = room.participants.get(userId);
        if (target) target.isVideoOff = true;
      }
    });

    socket.on("promote-host", ({ roomId, userId }: { roomId: string; userId: string }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost) {
        const target = room.participants.get(userId);
        if (target) {
          // Add to current requester that they are no longer host
          requester.isHost = false;
          io.to(roomId).emit("user-updated", requester);
          
          // Promote target
          target.isHost = true;
          io.to(roomId).emit("user-updated", target);
        }
      }
    });

    socket.on("kick-user", ({ roomId, userId }: { roomId: string; userId: string }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost) {
        io.to(userId).emit("kicked");
        const userSocket = io.sockets.sockets.get(userId);
        userSocket?.leave(roomId);
        room.participants.delete(userId);
        io.to(roomId).emit("user-left", userId);
      }
    });

    socket.on("lock-room", ({ roomId, locked }: { roomId: string; locked: boolean }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost) {
        room.isLocked = locked;
        io.to(roomId).emit("room-locked", locked);
      }
    });

    socket.on("spotlight-user", ({ roomId, userId }: { roomId: string; userId: string | null }) => {
      const room = rooms.get(roomId);
      const requester = room?.participants.get(socket.id);
      if (requester?.isHost) {
        room.spotlightId = userId;
        io.to(roomId).emit("spotlight-updated", userId);
      }
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        if (room.participants.has(socket.id)) {
          const user = room.participants.get(socket.id);
          room.participants.delete(socket.id);
          
          if (room.participants.size === 0) {
            rooms.delete(roomId);
          } else if (user?.isHost) {
            // Assign new host
            const nextId = room.participants.keys().next().value;
            const nextUser = room.participants.get(nextId);
            if (nextUser) {
              nextUser.isHost = true;
              io.to(roomId).emit("user-updated", nextUser);
            }
          }
          
          io.to(roomId).emit("user-left", socket.id);
        }
      });
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`MeetLite Pro Server running on http://localhost:${PORT}`);
  });
}

startServer();
