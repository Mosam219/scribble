export enum SocketServerEvent {
  Welcome = "welcome",
  RoomCreated = "roomCreated",
  JoinedRoom = "joinedRoom",
  RoomUpdated = "roomUpdated",
  GameStarted = "gameStarted",
  RoomFull = "roomFull",
  RoomNotFound = "roomNotFound",
  DrawingBroadcast = "drawingBroadcast",
  CanvasCleared = "canvasCleared",
  WordOptions = "wordOptions",
  TurnStarted = "turnStarted",
  TurnEnded = "turnEnded",
  GameEnded = "gameEnded",
  LeaderboardShown = "leaderboardShown",
}

export enum SocketClientEvent {
  CreateRoom = "createRoom",
  JoinRoom = "joinRoom",
  StartGame = "startGame",
  SendChatMessage = "sendChatMessage",
  SendDrawing = "sendDrawing",
  ClearCanvas = "clearCanvas",
  SelectWord = "selectWord",
}
