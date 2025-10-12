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
  roomName: string;
  members: Set<string>;
};

const rooms = new Map<string, Room>();

const createRoomCode = () => randomUUID().slice(0, 6).toUpperCase();

const broadcastRoomUpdate = (room: Room) => {
  const roomState: SocketRoomState = {
    roomId: room.id,
    members: Array.from(room.members.values()),
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
      roomName: roomTitle,
      members: new Set([trimmedName]),
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.username = trimmedName;
    socket.data.roomId = roomId;

    socket.emit(SocketServerEvent.RoomCreated, { roomId });
    socket.emit(SocketServerEvent.JoinedRoom, {
      roomId,
      username: trimmedName,
    });
    broadcastRoomUpdate(room);
  });

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

    room.members.add(trimmedName);
    socket.join(trimmedRoomId);
    socket.data.username = trimmedName;
    socket.data.roomId = trimmedRoomId;

    socket.emit(SocketServerEvent.JoinedRoom, {
      roomId: trimmedRoomId,
      username: trimmedName,
    });
    broadcastRoomUpdate(room);
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

    room.members.delete(username);

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
