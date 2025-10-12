export enum SocketServerEvent {
  Welcome = "welcome",
  RoomCreated = "roomCreated",
  JoinedRoom = "joinedRoom",
  RoomUpdated = "roomUpdated",
  RoomFull = "roomFull",
  RoomNotFound = "roomNotFound",
}

export enum SocketClientEvent {
  CreateRoom = "createRoom",
  JoinRoom = "joinRoom",
}
