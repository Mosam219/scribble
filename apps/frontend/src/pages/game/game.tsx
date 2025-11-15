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
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { ChatMessage } from "./components/chatPanel";
import { ChatPanel } from "./components/chatPanel";
import { Canvas, type CanvasHandle } from "./components/canvas";

const mockMessages: ChatMessage[] = [
  {
    id: 1,
    author: "SketchMaster",
    text: "That looks like a dragon!",
    time: "12:05",
  },
  { id: 2, author: "You", text: "Nope, hotter!", time: "12:06" },
  { id: 3, author: "GuessGuru", text: "Is it a rocket?", time: "12:06" },
  { id: 4, author: "LineLegend", text: "I see it now 😄", time: "12:07" },
];

function Game() {
  const canvasRef = useRef<CanvasHandle | null>(null);
  const { roomId } = useParams();
  const service = useSocketService();
  const currentUsername = service.getCurrentUsername();
  const [lobbyState, setLobbyState] = useState<SocketRoomState | null>(() =>
    service.getRoomState()
  );

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
        isCurrent: player.name === lobbyState.currentPlayerUsername,
        isSelf: currentUsername ? player.name === currentUsername : false,
      }))
      .sort((a, b) => {
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentUsername, lobbyState]);

  const activeRoomId = lobbyState?.roomId ?? roomId ?? "Loading...";

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
            <p>Round 1 of 10</p>
            <p>Prompt revealed in 00:12</p>
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
              <Button variant="outline" className="w-full">
                Ready up
              </Button>
              <Button variant="secondary" className="w-full">
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
              <Canvas ref={canvasRef} />
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div>
                Prompt:{" "}
                <span className="font-semibold text-primary">Hidden</span>
              </div>
              <div>
                Time left:{" "}
                <span className="font-semibold text-primary">01:32</span>
              </div>
            </CardFooter>
          </Card>

          <ChatPanel messages={mockMessages} />
        </div>
      </div>
    </main>
  );
}

export default Game;
