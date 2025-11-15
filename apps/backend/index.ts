import express from "express";
import type { Request, Response } from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import {
  MAX_ROOM_SIZE,
  SocketClientEvent,
  SocketClientEventsMap,
  type SocketRoomState,
  SocketServerEvent,
  SocketServerEventsMap,
  type ChatMessage,
  type CanvasDrawingPayload,
  type CanvasStrokeSegment,
  type CanvasPoint,
} from "@scribble/shared";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Hello from the Bun backend!" });
});

const httpServer = createServer(app);

type ServerToClientEvents = SocketServerEventsMap;

type ClientToServerEvents = SocketClientEventsMap;

type InterServerEvents = Record<string, never>;

type SocketData = {
  username?: string;
  roomId?: string;
};

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

type Room = {
  id: string;
  hostId: string;
  hostUsername: string;
  roomName: string;
  members: Map<string, string>;
  currentPlayerId: string | null;
  chatMessages: ChatMessage[];
};

const rooms = new Map<string, Room>();
const MAX_CHAT_HISTORY = 100;

const createRoomCode = () => randomUUID().slice(0, 6).toUpperCase();

const broadcastRoomUpdate = (room: Room) => {
  const roomState: SocketRoomState = {
    roomId: room.id,
    members: Array.from(room.members.entries()).map(([id, name]) => ({
      id,
      name,
    })),
    hostUsername: room.hostUsername,
    currentPlayerId: room.currentPlayerId,
    chatMessages: room.chatMessages,
  };
  io.to(room.id).emit(SocketServerEvent.RoomUpdated, roomState);
};

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.emit(
    SocketServerEvent.Welcome,
    "Connected to the Scribble realtime service."
  );

  socket.on(SocketClientEvent.CreateRoom, ({ username, roomTitle }) => {
    const trimmedName = username?.trim();
    if (!trimmedName) {
      return;
    }

    const roomId = createRoomCode();
    const room: Room = {
      id: roomId,
      hostId: socket.id,
      hostUsername: trimmedName,
      roomName: roomTitle,
      members: new Map([[socket.id, trimmedName]]),
      currentPlayerId: socket.id,
      chatMessages: [],
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.username = trimmedName;
    socket.data.roomId = roomId;

    socket.emit(SocketServerEvent.RoomCreated, { roomId });
    socket.emit(SocketServerEvent.JoinedRoom, {
      roomId,
      username: trimmedName,
      playerId: socket.id,
    });
    broadcastRoomUpdate(room);
  });

  const chooseNextCurrentPlayer = (room: Room) => {
    const nextPlayerId = room.members.keys().next().value ?? null;
    room.currentPlayerId = nextPlayerId ?? null;
  };

  socket.on(SocketClientEvent.JoinRoom, ({ roomId, username }) => {
    const trimmedRoomId = roomId?.trim().toUpperCase();
    const trimmedName = username?.trim();

    if (!trimmedRoomId || !trimmedName) {
      return;
    }

    const room = rooms.get(trimmedRoomId);
    if (!room) {
      socket.emit(SocketServerEvent.RoomNotFound, {
        roomId: trimmedRoomId,
      });
      return;
    }

    if (room.members.size >= MAX_ROOM_SIZE) {
      socket.emit(SocketServerEvent.RoomFull, { roomId: trimmedRoomId });
      return;
    }

    room.members.set(socket.id, trimmedName);
    socket.join(trimmedRoomId);
    socket.data.username = trimmedName;
    socket.data.roomId = trimmedRoomId;

    socket.emit(SocketServerEvent.JoinedRoom, {
      roomId: trimmedRoomId,
      username: trimmedName,
      playerId: socket.id,
    });

    if (!room.currentPlayerId) {
      chooseNextCurrentPlayer(room);
    }

    broadcastRoomUpdate(room);
  });

  socket.on(
    SocketClientEvent.SendChatMessage,
    ({ roomId, message, authorId }) => {
      const trimmedRoomId = roomId?.trim().toUpperCase();
      const trimmedMessage = message?.trim();
      const normalizedAuthorId = authorId?.trim();
      if (!trimmedRoomId || !trimmedMessage || !normalizedAuthorId) {
        return;
      }

      const room = rooms.get(trimmedRoomId);
      if (!room) {
        socket.emit(SocketServerEvent.RoomNotFound, {
          roomId: trimmedRoomId,
        });
        return;
      }

      if (!room.members.has(socket.id)) {
        return;
      }

      if (normalizedAuthorId !== socket.id) {
        return;
      }

      const author = room.members.get(socket.id);
      if (!author) {
        return;
      }

      const chatMessage: ChatMessage = {
        id: randomUUID(),
        author,
        authorId: socket.id,
        text: trimmedMessage,
        timestamp: Date.now(),
      };

      room.chatMessages.push(chatMessage);
      if (room.chatMessages.length > MAX_CHAT_HISTORY) {
        room.chatMessages.shift();
      }

      broadcastRoomUpdate(room);
    }
  );

  const sanitizePoint = (point: CanvasPoint): CanvasPoint | null => {
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return { x, y };
  };

  const sanitizeSegments = (segments: CanvasStrokeSegment[]) => {
    return segments
      .map((segment) => {
        const strokeId =
          typeof segment?.strokeId === "string"
            ? segment.strokeId.trim()
            : undefined;
        const color =
          typeof segment?.color === "string" ? segment.color.trim() : undefined;
        const size = Number(segment?.size);
        if (
          !strokeId ||
          !color ||
          !Number.isFinite(size) ||
          !Array.isArray(segment?.points)
        ) {
          return null;
        }

        const sanitizedPoints = segment.points
          .map((point) => sanitizePoint(point))
          .filter((point): point is CanvasPoint => point !== null);

        if (sanitizedPoints.length === 0) {
          return null;
        }

        return {
          strokeId,
          color,
          size,
          points: sanitizedPoints,
        };
      })
      .filter(
        (segment): segment is CanvasStrokeSegment => segment !== null
      );
  };

  socket.on(
    SocketClientEvent.SendDrawing,
    ({ roomId, authorId, segments }: CanvasDrawingPayload) => {
      const trimmedRoomId = roomId?.trim().toUpperCase();
      if (!trimmedRoomId) {
        return;
      }

      const room = rooms.get(trimmedRoomId);
      if (!room) {
        socket.emit(SocketServerEvent.RoomNotFound, {
          roomId: trimmedRoomId,
        });
        return;
      }

      if (!room.members.has(socket.id)) {
        return;
      }

      if (authorId !== socket.id) {
        return;
      }

      if (!Array.isArray(segments) || segments.length === 0) {
        return;
      }

      const sanitizedSegments = sanitizeSegments(segments);
      if (sanitizedSegments.length === 0) {
        return;
      }

      socket.to(trimmedRoomId).emit(SocketServerEvent.DrawingBroadcast, {
        roomId: trimmedRoomId,
        authorId: socket.id,
        segments: sanitizedSegments,
      });
    }
  );

  socket.on(
    SocketClientEvent.ClearCanvas,
    ({ roomId, authorId }: { roomId: string; authorId: string }) => {
      const trimmedRoomId = roomId?.trim().toUpperCase();
      if (!trimmedRoomId) {
        return;
      }

      const room = rooms.get(trimmedRoomId);
      if (!room) {
        socket.emit(SocketServerEvent.RoomNotFound, {
          roomId: trimmedRoomId,
        });
        return;
      }

      if (!room.members.has(socket.id)) {
        return;
      }

      if (authorId !== socket.id) {
        return;
      }

      socket.to(trimmedRoomId).emit(SocketServerEvent.CanvasCleared, {
        roomId: trimmedRoomId,
        authorId: socket.id,
      });
    }
  );

  socket.on(SocketClientEvent.StartGame, ({ roomId }) => {
    const trimmedRoomId = roomId?.trim().toUpperCase();
    if (!trimmedRoomId) {
      return;
    }

    const room = rooms.get(trimmedRoomId);
    if (!room) {
      socket.emit(SocketServerEvent.RoomNotFound, {
        roomId: trimmedRoomId,
      });
      return;
    }

    if (socket.id !== room.hostId) {
      return;
    }

    io.to(room.id).emit(SocketServerEvent.GameStarted, { roomId: room.id });
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);

    const { roomId, username } = socket.data;
    if (!roomId || !username) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.members.delete(socket.id);

    if (room.currentPlayerId === socket.id) {
      chooseNextCurrentPlayer(room);
    }

    if (room.members.size === 0 || socket.id === room.hostId) {
      rooms.delete(roomId);
      io.to(roomId).socketsLeave(roomId);
      return;
    }

    broadcastRoomUpdate(room);
  });
});

httpServer.listen(port, () => {
  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Socket.IO server ready on ws://localhost:${port}`);
});
