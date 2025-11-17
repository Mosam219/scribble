import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSocketService } from "@/contexts/socketServiceContext";
import { cn } from "@/lib/utils";
import type { SocketRoomState } from "@scribble/shared";
import { Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatPanel } from "./components/chatPanel";
import { Canvas, type CanvasHandle } from "./components/canvas";
import {
  SocketServerEvent,
  type CanvasStrokeSegment,
  type LeaderboardEntry,
} from "@scribble/shared";

function Game() {
  const canvasRef = useRef<CanvasHandle | null>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const service = useSocketService();
  const currentPlayer = service.getCurrentPlayer();
  const currentPlayerId = currentPlayer?.id ?? null;
  const currentUsername = currentPlayer?.name ?? service.getCurrentUsername();
  const [lobbyState, setLobbyState] = useState<SocketRoomState | null>(() =>
    service.getRoomState()
  );
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [leaderboardPopup, setLeaderboardPopup] = useState<{
    visible: boolean;
    entries: LeaderboardEntry[];
    round: number;
  }>({ visible: false, entries: [], round: 0 });

  useEffect(() => {
    const unsubscribe = service.subscribeToRoomState(setLobbyState);
    return unsubscribe;
  }, [service]);

  const players = useMemo(() => {
    if (!lobbyState) {
      return [];
    }

    return lobbyState.members
      .map((player) => ({
        ...player,
        isHost: player.name === lobbyState.hostUsername,
        isCurrent: player.id === lobbyState.currentPlayerId,
        isSelf: currentPlayerId
          ? player.id === currentPlayerId
          : currentUsername
          ? player.name === currentUsername
          : false,
      }))
      .sort((a, b) => {
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentUsername, currentPlayerId, lobbyState]);

  const activeRoomId = lobbyState?.roomId ?? roomId ?? "Loading...";
  const chatMessages = lobbyState?.chatMessages ?? [];
  const leaderboardEntries = lobbyState?.leaderboard ?? [];
  const isCurrentDrawer =
    Boolean(
      lobbyState?.currentPlayerId &&
        currentPlayer?.id === lobbyState.currentPlayerId
    ) && Boolean(currentPlayer);
  const canDraw = isCurrentDrawer && Boolean(selectedWord);

  const currentDrawerName = useMemo(() => {
    if (!lobbyState?.currentPlayerId) {
      return null;
    }
    return (
      lobbyState.members.find(
        (member) => member.id === lobbyState.currentPlayerId
      )?.name ?? null
    );
  }, [lobbyState]);

  const wordLengthHint = lobbyState?.currentWordLength ?? null;
  const roundNumber = lobbyState?.round ?? 0;
  const totalRounds = lobbyState?.totalRounds ?? 1;
  const turnEndsAt = lobbyState?.turnEndsAt ?? null;
  console.log(isCurrentDrawer, wordOptions, selectedWord, "dsds");
  const statusMessage = (() => {
    if (!lobbyState) {
      return "Connecting to the game...";
    }
    if (isCurrentDrawer && wordOptions.length > 0) {
      return "Choose a word to start drawing.";
    }
    if (isCurrentDrawer && !selectedWord) {
      return "Waiting for your word choice...";
    }
    if (canDraw && currentPlayer) {
      return "It's your turn to draw!";
    }
    if (currentDrawerName) {
      if (wordLengthHint) {
        return `${currentDrawerName} is drawing a ${wordLengthHint}-letter word`;
      }
      return `${currentDrawerName} is drawing`;
    }
    return "Waiting for the game to start";
  })();

  useEffect(() => {
    if (!turnEndsAt) {
      setRemainingMs(0);
      return;
    }
    const updateRemaining = () => {
      setRemainingMs(Math.max(0, turnEndsAt - Date.now()));
    };
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 200);
    return () => window.clearInterval(interval);
  }, [turnEndsAt]);

  useEffect(() => {
    if (!isCurrentDrawer) {
      setSelectedWord(null);
      setWordOptions([]);
    }
  }, [isCurrentDrawer]);

  const handleLeaveLobby = () => {
    const destinationRoomId = lobbyState?.roomId ?? roomId ?? "";
    service.disconnect();
    if (destinationRoomId) {
      navigate(`/${destinationRoomId}`);
      return;
    }
    navigate("/");
  };

  const handleSendChatMessage = (message: string) => {
    if (!lobbyState?.roomId || !currentPlayer) {
      return;
    }
    service.sendChatMessage({
      roomId: lobbyState.roomId,
      message,
      authorId: currentPlayer.id,
    });
  };

  const handleLocalDrawing = useCallback(
    (segments: CanvasStrokeSegment[]) => {
      if (!lobbyState?.roomId || !currentPlayer || segments.length === 0) {
        return;
      }
      service.sendDrawing({
        roomId: lobbyState.roomId,
        authorId: currentPlayer.id,
        segments,
      });
    },
    [currentPlayer, lobbyState?.roomId, service]
  );

  const handleClearCanvas = useCallback(() => {
    if (!lobbyState?.roomId || !currentPlayer) {
      canvasRef.current?.clear();
      return;
    }
    service.sendClearCanvas({
      roomId: lobbyState.roomId,
      authorId: currentPlayer.id,
    });
    canvasRef.current?.clear();
  }, [currentPlayer, lobbyState?.roomId, service]);

  const handleWordSelection = (word: string) => {
    if (!lobbyState?.roomId || !isCurrentDrawer) {
      return;
    }
    setSelectedWord(word);
    setWordOptions([]);
    service.selectWord({ roomId: lobbyState.roomId, word });
  };

  useEffect(() => {
    const removeDrawingListener = service.on(
      SocketServerEvent.DrawingBroadcast,
      ({ segments }) => {
        if (!segments.length) {
          return;
        }
        canvasRef.current?.applyRemoteSegments(segments);
      }
    );
    const removeClearListener = service.on(
      SocketServerEvent.CanvasCleared,
      () => {
        canvasRef.current?.clear();
      }
    );
    console.log("dmaskldnsalkdn");
    const removeWordOptions = service.on(
      SocketServerEvent.WordOptions,
      ({ words }) => {
        setWordOptions(words);
        setSelectedWord(null);
      }
    );
    const removeTurnStarted = service.on(
      SocketServerEvent.TurnStarted,
      ({ drawerId }) => {
        if (!isCurrentDrawer || drawerId !== currentPlayerId) {
          setSelectedWord(null);
        }
        setLeaderboardPopup((popup) => ({ ...popup, visible: false }));
      }
    );
    const removeTurnEnded = service.on(SocketServerEvent.TurnEnded, () => {
      setWordOptions([]);
      setSelectedWord(null);
    });
    const removeLeaderboardShown = service.on(
      SocketServerEvent.LeaderboardShown,
      ({ leaderboard, round }) => {
        setLeaderboardPopup({
          visible: true,
          entries: leaderboard,
          round,
        });
        setTimeout(() => {
          setLeaderboardPopup((prev) => ({
            ...prev,
            visible: false,
          }));
        }, 5000);
      }
    );
    const removeGameEnded = service.on(SocketServerEvent.GameEnded, () => {
      setWordOptions([]);
      setSelectedWord(null);
      setLeaderboardPopup({ visible: false, entries: [], round: 0 });
    });

    return () => {
      removeDrawingListener();
      removeClearListener();
      removeWordOptions();
      removeTurnStarted();
      removeTurnEnded();
      removeLeaderboardShown();
      removeGameEnded();
    };
  }, [currentPlayerId, isCurrentDrawer, service]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary">
              Room
            </p>
            <h1 className="text-2xl font-semibold text-primary">
              {activeRoomId}
            </h1>
          </div>
          <div className="space-y-1 text-right text-sm text-muted-foreground sm:text-base">
            <p>
              Round {Math.max(1, roundNumber)} of {totalRounds}
            </p>
            <p>
              Time left:{" "}
              {turnEndsAt
                ? `${Math.max(0, Math.ceil(remainingMs / 1000))}s`
                : "Waiting"}
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,_1fr)_360px]">
          <Card className="flex flex-col border-primary/20 bg-background/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Players
                </CardTitle>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {players.length} online
                </p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {players.length === 0 ? (
                <p className="rounded-md border border-dashed border-primary/20 px-3 py-4 text-center text-sm text-muted-foreground">
                  Waiting for players to join…
                </p>
              ) : (
                <ul className="space-y-2">
                  {players.map((player) => (
                    <li
                      key={player.id}
                      className={cn(
                        "rounded-xl border border-primary/10 bg-background/70 px-3 py-2 shadow-sm transition hover:border-primary/30",
                        player.isCurrent
                          ? "border-primary/50 bg-primary/15 shadow-md"
                          : player.isHost && "border-primary/30 bg-primary/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.isHost ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                            Host
                          </span>
                        ) : null}
                        {player.isCurrent ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">
                            Drawing
                          </span>
                        ) : null}
                        {!player.isHost && !player.isCurrent ? (
                          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-muted-foreground">
                            Player
                          </span>
                        ) : null}
                        {player.isSelf ? (
                          <span className="rounded-full bg-secondary/40 px-2 py-0.5 text-secondary-foreground">
                            You
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              <Button
                variant="secondary"
                className="w-full"
                type="button"
                onClick={handleLeaveLobby}
              >
                Leave lobby
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col border-primary/20 bg-background/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Drawing board
                </CardTitle>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Use your mouse or stylus to sketch the prompt
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {isCurrentDrawer && wordOptions.length > 0 ? (
                <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
                    Choose a word
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {wordOptions.map((word) => (
                      <Button
                        key={word}
                        type="button"
                        variant="secondary"
                        className="text-base font-semibold"
                        onClick={() => handleWordSelection(word)}
                      >
                        {word}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Canvas
                ref={canvasRef}
                statusMessage={statusMessage}
                canDraw={canDraw}
                onLocalSegments={handleLocalDrawing}
                onRequestClear={handleClearCanvas}
                clearDisabled={!canDraw}
              />
              {leaderboardPopup.visible ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-background p-6 text-center shadow-xl">
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                      Round {leaderboardPopup.round} results
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-foreground">
                      Leaderboard
                    </h3>
                    <ul className="mt-4 space-y-2">
                      {leaderboardPopup.entries
                        .slice(0, 5)
                        .map((entry, idx) => (
                          <li
                            key={entry.playerId}
                            className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-2 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-muted-foreground">
                                #{idx + 1}
                              </span>
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <span className="font-semibold text-primary">
                              {entry.score}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Next turn will start shortly...
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div>
                Prompt:{" "}
                <span className="font-semibold text-primary">
                  {isCurrentDrawer && selectedWord
                    ? selectedWord
                    : wordLengthHint
                    ? `${wordLengthHint} letters`
                    : "Hidden"}
                </span>
              </div>
              <div>
                Time left:{" "}
                <span className="font-semibold text-primary">
                  {turnEndsAt
                    ? `${Math.max(0, Math.ceil(remainingMs / 1000))}s`
                    : "—"}
                </span>
              </div>
            </CardFooter>
          </Card>

          <ChatPanel
            messages={chatMessages}
            disabled={!lobbyState || !currentPlayer}
            onSendMessage={
              lobbyState && currentPlayer ? handleSendChatMessage : undefined
            }
          />
        </div>
      </div>
    </main>
  );
}

export default Game;
