import { SocketClientEvent, SocketServerEvent } from "./enums";

export * from "./enums";

export const MAX_ROOM_SIZE = 8;

export type SocketRoomState = {
  roomId: string;
  members: string[];
  hostUsername: string;
};

export type SocketServerEventPayloads = {
  [SocketServerEvent.Welcome]: string;
  [SocketServerEvent.RoomCreated]: { roomId: string };
  [SocketServerEvent.JoinedRoom]: { roomId: string; username: string };
  [SocketServerEvent.RoomUpdated]: SocketRoomState;
  [SocketServerEvent.GameStarted]: { roomId: string };
  [SocketServerEvent.RoomFull]: { roomId: string };
  [SocketServerEvent.RoomNotFound]: { roomId: string };
};

export type SocketClientEventPayloads = {
  [SocketClientEvent.CreateRoom]: { username: string; roomTitle: string };
  [SocketClientEvent.JoinRoom]: { roomId: string; username: string };
  [SocketClientEvent.StartGame]: { roomId: string };
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
