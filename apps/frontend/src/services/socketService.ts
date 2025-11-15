import { io, type Socket } from "socket.io-client";
import {
  SocketClientEvent,
  SocketServerEvent,
  type SocketClientEventsMap,
  type SocketRoomState,
  type SocketServerEventsMap,
} from "@scribble/shared";

type SocketServiceConfig = {
  endpoint?: string;
};

type ServerEvents = SocketServerEventsMap;
type ClientEvents = SocketClientEventsMap;

type CreateRoomPayload = Parameters<
  ClientEvents[SocketClientEvent.CreateRoom]
>[0];

type JoinRoomPayload = Parameters<ClientEvents[SocketClientEvent.JoinRoom]>[0];
type StartGamePayload = Parameters<
  ClientEvents[SocketClientEvent.StartGame]
>[0];

export class SocketService {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private config?: SocketServiceConfig;
  private listenersInitialized = false;
  private roomState: SocketRoomState | null = null;
  private roomStateSubscribers = new Set<
    (state: SocketRoomState | null) => void
  >();
  private currentUsername: string | null = null;

  constructor(config: SocketServiceConfig = {}) {
    this.config = config;
  }

  private ensureSocket() {
    if (this.socket) {
      return this.socket;
    }

    const endpoint =
      this.config?.endpoint ??
      import.meta.env.VITE_SOCKET_URL ??
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : "http://localhost:3001");

    this.socket = io(endpoint, {
      transports: ["websocket"],
    });

    this.registerCoreListeners(this.socket);

    return this.socket;
  }

  private registerCoreListeners(socket: Socket<ServerEvents, ClientEvents>) {
    if (this.listenersInitialized) {
      return;
    }

    socket.on(SocketServerEvent.RoomUpdated, this.handleRoomUpdated);
    socket.on(SocketServerEvent.RoomNotFound, this.handleRoomNotFound);
    socket.on(SocketServerEvent.JoinedRoom, this.handleJoinedRoom);
    socket.on("disconnect", this.handleDisconnected);

    this.listenersInitialized = true;
  }

  private handleRoomUpdated = (state: SocketRoomState) => {
    this.roomState = state;
    this.notifyRoomState();
  };

  private handleRoomNotFound = () => {
    this.roomState = null;
    this.notifyRoomState();
    this.currentUsername = null;
  };

  private handleJoinedRoom: ServerEvents[SocketServerEvent.JoinedRoom] = ({
    username,
  }) => {
    this.currentUsername = username;
  };

  private handleDisconnected = () => {
    this.roomState = null;
    this.notifyRoomState();
    this.currentUsername = null;
  };

  private notifyRoomState() {
    for (const listener of this.roomStateSubscribers) {
      listener(this.roomState);
    }
  }

  getRoomState() {
    return this.roomState;
  }

  subscribeToRoomState(
    listener: (state: SocketRoomState | null) => void
  ): () => void {
    this.roomStateSubscribers.add(listener);
    listener(this.roomState);
    return () => {
      this.roomStateSubscribers.delete(listener);
    };
  }

  connect(listeners: Partial<ServerEvents> = {}) {
    const socket = this.ensureSocket();
    const cleanups: Array<() => void> = [];

    for (const eventName of Object.keys(listeners) as Array<
      keyof ServerEvents
    >) {
      const handler = listeners[eventName];
      if (!handler) {
        continue;
      }
      socket.on(eventName, handler);
      cleanups.push(() => socket.off(eventName, handler));
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  on<Event extends keyof ServerEvents>(
    event: Event,
    handler: ServerEvents[Event]
  ) {
    const socket = this.ensureSocket();
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }

  createRoom(payload: CreateRoomPayload) {
    const socket = this.ensureSocket();
    socket.emit(SocketClientEvent.CreateRoom, payload);
  }

  joinRoom(payload: JoinRoomPayload) {
    const socket = this.ensureSocket();
    socket.emit(SocketClientEvent.JoinRoom, payload);
  }

  startGame(payload: StartGamePayload) {
    const socket = this.ensureSocket();
    socket.emit(SocketClientEvent.StartGame, payload);
  }

  getCurrentUsername() {
    return this.currentUsername;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.listenersInitialized = false;
    this.roomState = null;
    this.notifyRoomState();
    this.currentUsername = null;
  }
}
