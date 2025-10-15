export enum SocketServerEvent {
  Welcome = "welcome",
  RoomCreated = "roomCreated",
  JoinedRoom = "joinedRoom",
  RoomUpdated = "roomUpdated",
  GameStarted = "gameStarted",
  RoomFull = "roomFull",
  RoomNotFound = "roomNotFound",
}

export enum SocketClientEvent {
  CreateRoom = "createRoom",
  JoinRoom = "joinRoom",
  StartGame = "startGame",
}
