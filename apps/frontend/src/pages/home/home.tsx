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
import { useMemo, useState } from "react";
import type { FC, FormEvent } from "react";
import { useParams } from "react-router-dom";
import type { StepCardProps } from "./types";
import StepCard from "./stepCard";

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

  const [mode, setMode] = useState<"join" | "create">("create");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [roomTitle, setRoomTitle] = useState("");

  const joinDisabled = useMemo(
    () =>
      joinName.trim().length === 0 || (!roomId && joinCode.trim().length < 4),
    [joinName, joinCode]
  );

  const createDisabled = useMemo(
    () => createName.trim().length === 0 || roomTitle.trim().length === 0,
    [createName, roomTitle]
  );

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (joinDisabled) {
      return;
    }
    console.log("Join room", {
      player: joinName.trim(),
      code: joinCode.trim().toUpperCase(),
    });
  };

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createDisabled) {
      return;
    }
    console.log("Create room", {
      host: createName.trim(),
      roomName: roomTitle.trim(),
    });
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
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="e.g. SketchMaster"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-code">Room code</Label>
            {!roomId ? (
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
            ) : (
              <div className="uppercase tracking-[0.35em] mt-1">{roomId}</div>
            )}
          </div>
        </CardContent>
        <CardFooter>
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
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
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
        <CardFooter>
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
            {roomId || mode == "join" ? (
              renderJoinRoom()
            ) : (
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
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Home;
