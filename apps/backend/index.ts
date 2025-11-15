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
  currentPlayerUsername: string | null;
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
    currentPlayerUsername: room.currentPlayerUsername,
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
      currentPlayerUsername: trimmedName,
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
    const nextPlayer = room.members.values().next().value ?? null;
    room.currentPlayerUsername = nextPlayer ?? null;
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

    if (!room.currentPlayerUsername) {
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

    if (room.currentPlayerUsername === username) {
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
