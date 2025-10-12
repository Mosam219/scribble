import { io, type Socket } from "socket.io-client";
import {
  SocketClientEvent,
  type SocketClientEventsMap,
  type SocketServerEventsMap,
} from "@scribble/shared";

type HomeServiceConfig = {
  endpoint?: string;
};

type ServerEvents = SocketServerEventsMap;
type ClientEvents = SocketClientEventsMap;

type CreateRoomPayload = Parameters<
  ClientEvents[SocketClientEvent.CreateRoom]
>[0];

type JoinRoomPayload = Parameters<ClientEvents[SocketClientEvent.JoinRoom]>[0];

export class HomeService {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private config?: HomeServiceConfig;

  constructor(config?: HomeServiceConfig = {}) {
    this.config = config;
  }

  connect(listeners: Partial<ServerEvents> = {}) {
    if (!this.socket) {
      const endpoint =
        this.config?.endpoint ??
        import.meta.env.VITE_SOCKET_URL ??
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : "http://localhost:3001");

      this.socket = io(endpoint, {
        transports: ["websocket"],
      });
    }

    for (const eventName of Object.keys(listeners) as Array<
      keyof ServerEvents
    >) {
      const handler = listeners[eventName];
      if (handler && this.socket) {
        this.socket.on(eventName, handler);
      }
    }
  }

  on<Event extends keyof ServerEvents>(
    event: Event,
    handler: ServerEvents[Event]
  ) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.on(event, handler);
  }

  createRoom(payload: CreateRoomPayload) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.emit(SocketClientEvent.CreateRoom, payload);
  }

  joinRoom(payload: JoinRoomPayload) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.emit(SocketClientEvent.JoinRoom, payload);
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
  }
}
