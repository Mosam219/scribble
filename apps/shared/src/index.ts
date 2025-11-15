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

export type SocketRoomState = {
  roomId: string;
  members: Player[];
  hostUsername: string;
  currentPlayerUsername: string | null;
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
