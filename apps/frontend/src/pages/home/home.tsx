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

  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [roomTitle, setRoomTitle] = useState("");

  const joinDisabled = useMemo(
    () => joinName.trim().length === 0 || joinCode.trim().length < 4,
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
    <form
      onSubmit={handleJoinRoom}
      className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-sm"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-50">Join a room</h2>
        <p className="mt-1 text-sm text-slate-400">
          Drop the room code your friend sent you and hop right in.
        </p>
      </div>
      <div className="space-y-5">
        <label className="block text-sm font-medium text-slate-200">
          Your nickname
          <input
            type="text"
            value={joinName}
            onChange={(event) => setJoinName(event.target.value)}
            placeholder="e.g. SketchMaster"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base outline-none ring-emerald-500/40 transition focus:border-emerald-500/70 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Room code
          <input
            type="text"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="4+ characters"
            minLength={4}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base uppercase tracking-widest outline-none ring-emerald-500/40 transition focus:border-emerald-500/70 focus:ring-2"
            required
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={joinDisabled}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
      >
        Enter lobby
      </button>
    </form>
  );

  const renderCreateRoom = () => (
    <form
      onSubmit={handleCreateRoom}
      className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 p-8 shadow-2xl shadow-purple-500/20 backdrop-blur-sm"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-50">Create a room</h2>
        <p className="mt-1 text-sm text-slate-400">
          Name your lobby, claim host, and share the code with everyone else.
        </p>
      </div>
      <div className="space-y-5">
        <label className="block text-sm font-medium text-slate-200">
          Host nickname
          <input
            type="text"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="e.g. DoodleQueen"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base outline-none ring-purple-500/30 transition focus:border-purple-500/70 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Room name
          <input
            type="text"
            value={roomTitle}
            onChange={(event) => setRoomTitle(event.target.value)}
            placeholder="e.g. Friday Night Sketch"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base outline-none ring-purple-500/30 transition focus:border-purple-500/70 focus:ring-2"
            required
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={createDisabled}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-purple-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-500/60"
      >
        Spin up lobby
      </button>
    </form>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu blur-3xl sm:top-[-20rem]">
          <div className="mx-auto h-[24rem] w-[40rem] max-w-full rounded-full bg-emerald-500/40 opacity-40 blur-3xl" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:px-10 sm:py-24 lg:flex-row lg:items-center lg:gap-20">
          <section className="max-w-xl space-y-6">
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Party Game
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Scribble: sketch fast, guess faster, rule the room.
            </h1>
            <p className="text-lg leading-relaxed text-slate-300">
              Host a private lobby, invite your friends, and race the clock to
              decode each other&apos;s doodles. Scribble keeps the rounds tight,
              the prompts hilarious, and the leaderboard always within reach.
            </p>
            <ul className="space-y-4 text-sm text-slate-300 sm:text-base">
              {steps.map((step) => (
                <StepCard key={step.number} {...step} />
              ))}
            </ul>
          </section>

          <section className="w-full max-w-lg space-y-8">
            {roomId ? renderJoinRoom() : renderCreateRoom()}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Home;
