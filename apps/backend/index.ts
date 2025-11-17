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
  round: number;
  totalRounds: number;
  turnOrder: string[];
  turnIndex: number;
  currentWord: string | null;
  currentWordLength: number | null;
  pendingWordChoices: string[];
  turnEndsAt: number | null;
  turnTimer: NodeJS.Timeout | null;
  gameActive: boolean;
  scores: Map<string, number>;
};

const rooms = new Map<string, Room>();
const MAX_CHAT_HISTORY = 100;
const TOTAL_ROUNDS = 1;
const TURN_DURATION_MS = 30_000;
const WORD_OPTIONS_PER_TURN = 3;
const WORD_BANK = [
  "Sunrise",
  "Mountain",
  "River",
  "Castle",
  "Robot",
  "Guitar",
  "Pizza",
  "Spaceship",
  "Butterfly",
  "Dragon",
  "Rainbow",
  "Forest",
  "Camera",
  "Lighthouse",
  "Volcano",
];

const createRoomCode = () => randomUUID().slice(0, 6).toUpperCase();

const broadcastRoomUpdate = (room: Room) => {
  const leaderboard = Array.from(room.scores.entries())
    .map(([playerId, score]) => {
      const name = room.members.get(playerId) ?? "Unknown";
      return { playerId, name, score };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const roomState: SocketRoomState = {
    roomId: room.id,
    members: Array.from(room.members.entries()).map(([id, name]) => ({
      id,
      name,
    })),
    hostUsername: room.hostUsername,
    currentPlayerId: room.currentPlayerId,
    round: room.round,
    totalRounds: room.totalRounds,
    turnEndsAt: room.turnEndsAt,
    currentWordLength: room.currentWordLength,
    leaderboard,
    chatMessages: room.chatMessages,
  };
  io.to(room.id).emit(SocketServerEvent.RoomUpdated, roomState);
};

const pickRandomWords = (count: number) => {
  const available = [...WORD_BANK];
  const selections: string[] = [];
  while (selections.length < count && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    const [word] = available.splice(index, 1);
    if (word) {
      selections.push(word);
    }
  }
  return selections;
};

const resetTurnState = (room: Room) => {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  room.turnEndsAt = null;
  room.currentWord = null;
  room.currentWordLength = null;
  room.pendingWordChoices = [];
};

const finishGame = (room: Room) => {
  resetTurnState(room);
  room.gameActive = false;
  room.turnOrder = [];
  room.turnIndex = 0;
  room.currentPlayerId = null;
  room.round = 0;
  broadcastRoomUpdate(room);
  io.to(room.id).emit(SocketServerEvent.GameEnded, { roomId: room.id });
};

const beginNextTurn = (room: Room) => {
  resetTurnState(room);

  if (!room.turnOrder.length || room.turnIndex >= room.turnOrder.length) {
    finishGame(room);
    return;
  }

  const drawerId = room.turnOrder[room.turnIndex];
  if (!drawerId || !room.members.has(drawerId)) {
    room.turnOrder.splice(room.turnIndex, 1);
    beginNextTurn(room);
    return;
  }

  room.currentPlayerId = drawerId;
  room.pendingWordChoices = pickRandomWords(WORD_OPTIONS_PER_TURN);
  broadcastRoomUpdate(room);

  setTimeout(() => {
    io.to(drawerId).emit(SocketServerEvent.WordOptions, {
      roomId: room.id,
      words: room.pendingWordChoices,
      round: room.round,
      totalRounds: room.totalRounds,
    });
  }, 1000);
};

const startDrawingPhase = (room: Room, drawerId: string, word: string) => {
  room.currentWord = word;
  room.currentWordLength = word.length;
  room.pendingWordChoices = [];
  const turnEndsAt = Date.now() + TURN_DURATION_MS;
  room.turnEndsAt = turnEndsAt;
  broadcastRoomUpdate(room);

  io.to(room.id).emit(SocketServerEvent.CanvasCleared, {
    roomId: room.id,
    authorId: "system",
  });

  io.to(room.id).emit(SocketServerEvent.TurnStarted, {
    roomId: room.id,
    drawerId,
    round: room.round,
    totalRounds: room.totalRounds,
    turnEndsAt,
  });

  room.turnTimer = setTimeout(() => {
    endCurrentTurn(room.id);
  }, TURN_DURATION_MS);
};

const endCurrentTurn = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const previousDrawer = room.currentPlayerId ?? null;
  resetTurnState(room);
  room.turnIndex += 1;

  io.to(room.id).emit(SocketServerEvent.TurnEnded, {
    roomId: room.id,
    drawerId: previousDrawer,
    nextDrawerId:
      room.turnIndex < room.turnOrder.length
        ? room.turnOrder[room.turnIndex]
        : null,
    round: room.round,
    totalRounds: room.totalRounds,
  });

  if (room.turnIndex >= room.turnOrder.length) {
    finishGame(room);
    return;
  }

  const leaderboardSnapshot = Array.from(room.scores.entries())
    .map(([playerId, score]) => ({
      playerId,
      name: room.members.get(playerId) ?? "Unknown",
      score,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  io.to(room.id).emit(SocketServerEvent.LeaderboardShown, {
    roomId: room.id,
    leaderboard: leaderboardSnapshot,
    round: room.round,
  });

  setTimeout(() => {
    beginNextTurn(room);
  }, 5000);
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
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      turnOrder: [],
      turnIndex: 0,
      currentWord: null,
      currentWordLength: null,
      pendingWordChoices: [],
      turnEndsAt: null,
      turnTimer: null,
      gameActive: false,
      scores: new Map([[socket.id, 0]]),
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
    if (room.gameActive) {
      return;
    }
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
    if (!room.scores.has(socket.id)) {
      room.scores.set(socket.id, 0);
    }
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

      const normalizedCurrentWord = room.currentWord
        ? room.currentWord.trim().toLowerCase()
        : null;
      const isDrawer = room.currentPlayerId === socket.id;
      const messageMatchesPrompt =
        !isDrawer &&
        room.gameActive &&
        normalizedCurrentWord &&
        trimmedMessage.toLowerCase() === normalizedCurrentWord;

      const displayText = messageMatchesPrompt
        ? `${author} guessed the word!`
        : trimmedMessage;

      if (messageMatchesPrompt) {
        const currentScore = room.scores.get(socket.id) ?? 0;
        room.scores.set(socket.id, currentScore + 10);
      }

      const chatMessage: ChatMessage = {
        id: randomUUID(),
        author,
        authorId: socket.id,
        text: displayText,
        timestamp: Date.now(),
      };

      room.chatMessages.push(chatMessage);
      if (room.chatMessages.length > MAX_CHAT_HISTORY) {
        room.chatMessages.shift();
      }

      broadcastRoomUpdate(room);
    }
  );

  socket.on(SocketClientEvent.SelectWord, ({ roomId, word }) => {
    const trimmedRoomId = roomId?.trim().toUpperCase();
    const trimmedWord = word?.trim();

    if (!trimmedRoomId || !trimmedWord) {
      return;
    }

    const room = rooms.get(trimmedRoomId);
    if (!room) {
      socket.emit(SocketServerEvent.RoomNotFound, {
        roomId: trimmedRoomId,
      });
      return;
    }

    if (!room.gameActive) {
      return;
    }

    if (room.currentPlayerId !== socket.id) {
      return;
    }

    if (!room.pendingWordChoices.includes(trimmedWord)) {
      return;
    }

    room.pendingWordChoices = [];
    startDrawingPhase(room, socket.id, trimmedWord);
  });

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
      .filter((segment): segment is CanvasStrokeSegment => segment !== null);
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

    if (room.gameActive) {
      return;
    }

    const turnOrder = Array.from(room.members.keys());
    if (turnOrder.length === 0) {
      return;
    }

    room.turnOrder = turnOrder;
    room.turnIndex = 0;
    room.round = 1;
    room.totalRounds = TOTAL_ROUNDS;
    room.gameActive = true;
    room.currentPlayerId = null;

    broadcastRoomUpdate(room);
    io.to(room.id).emit(SocketServerEvent.GameStarted, { roomId: room.id });
    beginNextTurn(room);
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
    room.scores.delete(socket.id);

    if (room.members.size === 0 || socket.id === room.hostId) {
      resetTurnState(room);
      rooms.delete(roomId);
      io.to(roomId).socketsLeave(roomId);
      return;
    }

    if (room.gameActive && room.currentPlayerId === socket.id) {
      endCurrentTurn(room.id);
      return;
    }

    if (!room.gameActive && room.currentPlayerId === socket.id) {
      chooseNextCurrentPlayer(room);
    }

    broadcastRoomUpdate(room);
  });
});

httpServer.listen(port, () => {
  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Socket.IO server ready on ws://localhost:${port}`);
});
