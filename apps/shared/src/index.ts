import { SocketClientEvent, SocketServerEvent } from "./enums";

export * from "./enums";

export const MAX_ROOM_SIZE = 8;

export type Player = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  authorId: string;
  text: string;
  timestamp: number;
};

export type CanvasPoint = {
  x: number;
  y: number;
};

export type CanvasStrokeSegment = {
  strokeId: string;
  color: string;
  size: number;
  points: CanvasPoint[];
};

export type CanvasDrawingPayload = {
  roomId: string;
  authorId: string;
  segments: CanvasStrokeSegment[];
};

export type SocketRoomState = {
  roomId: string;
  members: Player[];
  hostUsername: string;
  currentPlayerId: string | null;
  chatMessages: ChatMessage[];
};

export type SocketServerEventPayloads = {
  [SocketServerEvent.Welcome]: string;
  [SocketServerEvent.RoomCreated]: { roomId: string };
  [SocketServerEvent.JoinedRoom]: {
    roomId: string;
    username: string;
    playerId: string;
  };
  [SocketServerEvent.RoomUpdated]: SocketRoomState;
  [SocketServerEvent.GameStarted]: { roomId: string };
  [SocketServerEvent.RoomFull]: { roomId: string };
  [SocketServerEvent.RoomNotFound]: { roomId: string };
  [SocketServerEvent.DrawingBroadcast]: CanvasDrawingPayload;
  [SocketServerEvent.CanvasCleared]: { roomId: string; authorId: string };
};

export type SocketClientEventPayloads = {
  [SocketClientEvent.CreateRoom]: { username: string; roomTitle: string };
  [SocketClientEvent.JoinRoom]: { roomId: string; username: string };
  [SocketClientEvent.StartGame]: { roomId: string };
  [SocketClientEvent.SendChatMessage]: {
    roomId: string;
    message: string;
    authorId: string;
  };
  [SocketClientEvent.SendDrawing]: CanvasDrawingPayload;
  [SocketClientEvent.ClearCanvas]: { roomId: string; authorId: string };
};

export type SocketServerEventsMap = {
  [Event in SocketServerEvent]: (
    payload: SocketServerEventPayloads[Event]
  ) => void;
};

export type SocketClientEventsMap = {
  [Event in SocketClientEvent]: (
    payload: SocketClientEventPayloads[Event]
  ) => void;
};
