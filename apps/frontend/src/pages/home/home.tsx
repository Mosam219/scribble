import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HomeService } from "@/services/homeService";
import { SocketServerEvent } from "@scribble/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FC, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { StepCardProps } from "./types";
import StepCard from "./stepCard";
import { Copy } from "lucide-react";

const steps: StepCardProps[] = [
  {
    number: 1,
    title: "Draw what you see (or think you see)",
    description: "Keep your lines bold and your clues clever.",
    styles: {
      container: "shadow-sm shadow-emerald-500/10",
      badge: "bg-emerald-500/15 text-emerald-300",
    },
  },
  {
    number: 2,
    title: "Guess quickly to steal the spotlight",
    description: "Speed matters. Nab points before your friends catch up.",
    styles: {
      container: "shadow-sm shadow-purple-500/10",
      badge: "bg-purple-500/15 text-purple-200",
    },
  },
  {
    number: 3,
    title: "Climb the leaderboard and flex your art muscles",
    description: "Each round gets spicier. Stay sharp and claim the crown.",
    styles: {
      container: "shadow-sm shadow-sky-500/10",
      badge: "bg-sky-500/15 text-sky-200",
    },
  },
];

const Home: FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"join" | "create" | "lobby">(
    roomId ? "join" : "create"
  );
  const [userName, setUserName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string>(
    roomId?.toUpperCase() ?? ""
  );
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const [members, setMembers] = useState<string[]>([]);
  const [hostUsername, setHostUsername] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const serviceRef = useRef<HomeService | null>(null);

  useEffect(() => {
    const service = new HomeService();
    serviceRef.current = service;

    setStatusMessage("Connecting to the game server...");

    service.connect({
      [SocketServerEvent.Welcome]: (message) => {
        setStatusMessage(message);
      },
      [SocketServerEvent.RoomCreated]: ({ roomId: createdRoomId }) => {
        setActiveRoomId(createdRoomId);
        setJoinCode(createdRoomId);
        setStatusMessage(`Room ${createdRoomId} created.`);
        setMode("lobby");
      },
      [SocketServerEvent.JoinedRoom]: ({ roomId: joinedRoomId, username }) => {
        setActiveRoomId(joinedRoomId);
        setJoinCode(joinedRoomId);
        setUserName(username);
        setMode("lobby");
        setStatusMessage(`You joined room ${joinedRoomId}.`);
      },
      [SocketServerEvent.RoomUpdated]: ({
        roomId: updatedRoomId,
        members,
        hostUsername: hostName,
      }) => {
        setActiveRoomId(updatedRoomId);
        setMembers(members);
        setHostUsername(hostName);
      },
      [SocketServerEvent.GameStarted]: ({ roomId: startedRoomId }) => {
        setStatusMessage("Game starting...");
        navigate(`/${startedRoomId}/game`);
      },
      [SocketServerEvent.RoomFull]: ({ roomId: fullRoomId }) => {
        setStatusMessage(`Room ${fullRoomId} is full. Try another code.`);
      },
      [SocketServerEvent.RoomNotFound]: ({ roomId: missingRoomId }) => {
        setStatusMessage(`Room ${missingRoomId} could not be found.`);
        setActiveRoomId("");
        setMembers([]);
        setHostUsername("");
      },
    });

    return () => {
      service.disconnect();
      serviceRef.current = null;
    };
  }, [navigate]);

  const targetRoomId = activeRoomId || joinCode;

  const joinDisabled = useMemo(
    () => userName.trim().length === 0 || targetRoomId.trim().length < 4,
    [userName, targetRoomId]
  );

  const createDisabled = useMemo(
    () => userName.trim().length === 0 || roomTitle.trim().length === 0,
    [userName, roomTitle]
  );

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const service = serviceRef.current;
    if (joinDisabled || !service) {
      return;
    }
    const username = userName.trim();
    const roomCode = targetRoomId.trim().toUpperCase();
    setStatusMessage(`Joining room ${roomCode}...`);
    setJoinCode(roomCode);
    service.joinRoom({ roomId: roomCode, username });
  };

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const service = serviceRef.current;
    if (createDisabled || !service) {
      return;
    }
    const username = userName.trim();
    setStatusMessage("Creating room...");
    setUserName(username);
    setMode("join");
    setMembers([]);
    setHostUsername(username);
    service.createRoom({ username, roomTitle });
  };

  const handleStartGame = () => {
    const service = serviceRef.current;
    if (!service || !activeRoomId) {
      return;
    }
    setStatusMessage("Starting game...");
    service.startGame({ roomId: activeRoomId });
  };

  const renderLobby = () => {
    if (!activeRoomId) {
      return null;
    }

    const players =
      members.length > 0 || userName
        ? Array.from(
            new Set(members.length > 0 ? members : userName ? [userName] : [])
          )
        : [];

    const sortedPlayers = players.sort((a, b) => {
      if (a === userName) return -1;
      if (b === userName) return 1;
      return a.localeCompare(b);
    });

    const isHost = userName === hostUsername;

    return (
      <Card className="border-primary/30 bg-primary/5 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-primary">
                Lobby ready
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Share this code to bring your friends into the game.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 rounded-lg border border-primary/20 bg-background/80 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-primary">
              Room code
            </p>
            <p className="text-2xl font-semibold tracking-[0.4em] text-primary">
              {activeRoomId}
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10"
                type="button"
                onClick={async () => {
                  try {
                    if (
                      typeof navigator === "undefined" ||
                      !navigator.clipboard
                    ) {
                      throw new Error("Clipboard not available");
                    }
                    await navigator.clipboard.writeText(activeRoomId);
                    setCopiedCode(true);
                    setStatusMessage(`Room code ${activeRoomId} copied.`);
                    window.setTimeout(() => setCopiedCode(false), 2000);
                  } catch {
                    setStatusMessage("Unable to copy the room code.");
                  }
                }}
                aria-label="Copy room code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </p>
            {copiedCode && (
              <span className="text-xs font-medium text-emerald-400">
                Copied to clipboard
              </span>
            )}
          </div>

          {statusMessage && (
            <div className="flex items-center gap-2 rounded-md border border-primary/10 bg-primary/10 px-3 py-2 text-sm text-primary">
              {statusMessage}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Players</span>
              <span>{sortedPlayers.length}</span>
            </div>
            {sortedPlayers.length === 0 ? (
              <p className="rounded-md border border-dashed border-primary/20 px-3 py-4 text-center text-sm text-muted-foreground">
                Waiting for players to join…
              </p>
            ) : (
              <ul className="space-y-2">
                {sortedPlayers.map((member) => (
                  <li
                    key={member}
                    className="flex items-center justify-between rounded-lg border border-primary/15 bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm"
                  >
                    <span>{member}</span>
                    {member === userName && (
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                        You
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter>
          {isHost ? (
            <Button type="button" className="w-full" onClick={handleStartGame}>
              Start game
            </Button>
          ) : (
            <p className="w-full text-center text-sm text-muted-foreground">
              Waiting for the host to start the game…
            </p>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderJoinRoom = () => (
    <form onSubmit={handleJoinRoom} className="h-full">
      <Card className="h-full border-emerald-500/25 bg-emerald-950/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Join a room</CardTitle>
          <CardDescription>
            Drop the room code your friend sent you and hop right in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="join-name">Your nickname</Label>
            <Input
              id="join-name"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="e.g. SketchMaster"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-code">Room code</Label>
            {activeRoomId ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-base font-semibold uppercase tracking-[0.35em] text-emerald-200">
                {activeRoomId}
              </div>
            ) : (
              <Input
                id="join-code"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value.toUpperCase())
                }
                placeholder="4+ characters"
                minLength={4}
                className="uppercase tracking-[0.35em]"
                required
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="flex w-full flex-col items-stretch space-y-4">
          <Button type="submit" disabled={joinDisabled} className="w-full">
            Enter lobby
          </Button>
        </CardFooter>
      </Card>
    </form>
  );

  const renderCreateRoom = () => (
    <form onSubmit={handleCreateRoom} className="h-full">
      <Card className="h-full border-purple-500/25 bg-purple-950/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Create a room</CardTitle>
          <CardDescription>
            Name your lobby, claim host, and share the code with everyone else.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="host-name">Host nickname</Label>
            <Input
              id="host-name"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="e.g. DoodleQueen"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-title">Room name</Label>
            <Input
              id="room-title"
              value={roomTitle}
              onChange={(event) => setRoomTitle(event.target.value)}
              placeholder="e.g. Friday Night Sketch"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex w-full flex-col items-stretch space-y-4">
          <Button
            type="submit"
            variant="secondary"
            disabled={createDisabled}
            className="w-full bg-purple-600 hover:bg-purple-500"
          >
            Spin up lobby
          </Button>
        </CardFooter>
      </Card>
    </form>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-[-20%] -z-10 h-[50vh] bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),transparent_60%)]" />
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu blur-3xl sm:top-[-20rem]">
          <div className="mx-auto h-[24rem] w-[40rem] max-w-full rounded-full bg-primary/30 opacity-60 blur-3xl" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:px-10 sm:py-24 lg:flex-row lg:items-center lg:gap-20">
          <section className="max-w-xl space-y-6">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Party Game
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Scribble: sketch fast, guess faster, rule the room.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Host a private lobby, invite your friends, and race the clock to
              decode each other&apos;s doodles. Scribble keeps the rounds tight,
              the prompts hilarious, and the leaderboard always within reach.
            </p>
            <ul className="space-y-4 text-sm text-muted-foreground sm:text-base">
              {steps.map((step) => (
                <StepCard key={step.number} {...step} />
              ))}
            </ul>
          </section>

          <section className="w-full max-w-lg space-y-6">
            {mode === "join" ? renderJoinRoom() : null}
            {mode === "create" ? (
              <>
                {renderCreateRoom()}
                <div className="text-center text-sm text-muted-foreground">
                  Already have a code?{" "}
                  <Button
                    variant="link"
                    className="px-0"
                    type="button"
                    onClick={() => setMode("join")}
                  >
                    Switch to join flow
                  </Button>
                </div>
              </>
            ) : null}
            {mode === "lobby" ? renderLobby() : null}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Home;
