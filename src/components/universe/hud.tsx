"use client";

import {
  ChevronLeft,
  ChevronRight,
  Orbit,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DATA } from "@/data/resume";
import type { Body, BodyId } from "@/data/universe";
import { cn } from "@/lib/utils";

const MAX_WARP = 12;
const WARP_STEP = 0.5;

const glass =
  "border border-white/10 bg-black/50 backdrop-blur-xl transition-colors";

type IconButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function IconButton({ label, active, onClick, children }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        glass,
        "flex size-9 items-center justify-center rounded-full text-white/70 hover:border-white/40 hover:text-white",
        active && "border-white/50 text-white"
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

type IntroGateProps = {
  ready: boolean;
  onEnter: (withSound: boolean) => void;
};

export function IntroGate({ ready, onEnter }: IntroGateProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(2,2,7,0.35),rgba(2,2,7,0.9))] px-6 text-center">
      <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.5em]">
        An interactive portfolio
      </p>
      <p className="mt-4 font-bold text-5xl text-white tracking-tighter sm:text-7xl">
        {DATA.name}
      </p>
      <p className="mt-3 max-w-md text-sm text-white/65 sm:text-base">
        {DATA.description}. Every world in this system is a chapter of the work.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <button
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black text-sm transition-transform hover:scale-105 disabled:opacity-50"
          disabled={!ready}
          onClick={() => onEnter(true)}
          type="button"
        >
          <Volume2 className="size-4" />
          {ready ? "Enter with sound" : "Charting the system"}
        </button>
        <button
          className={cn(
            glass,
            "flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white/80 hover:border-white/40 hover:text-white disabled:opacity-50"
          )}
          disabled={!ready}
          onClick={() => onEnter(false)}
          type="button"
        >
          <VolumeX className="size-4" />
          Enter silently
        </button>
      </div>
      <Link
        className="mt-6 text-white/50 text-xs underline underline-offset-4 hover:text-white"
        href="/classic"
      >
        Prefer a simple page? Open the classic view
      </Link>
    </div>
  );
}

type TopBarProps = {
  muted: boolean;
  touring: boolean;
  timeScale: number;
  onToggleMute: () => void;
  onToggleTour: () => void;
  onTimeScale: (value: number) => void;
};

export function TopBar({
  muted,
  touring,
  timeScale,
  onToggleMute,
  onToggleTour,
  onTimeScale,
}: TopBarProps) {
  const paused = timeScale === 0;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4 sm:p-6">
      <div className="pointer-events-auto">
        <p className="font-bold text-sm text-white uppercase tracking-[0.3em]">
          {DATA.name}
        </p>
        <p className="mt-0.5 hidden font-mono text-[10px] text-white/50 uppercase tracking-[0.2em] sm:block sm:max-w-xs lg:max-w-md">
          {DATA.description}
        </p>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <label
          className={cn(
            glass,
            "hidden h-9 items-center gap-2 rounded-full px-3 font-mono text-[10px] text-white/60 uppercase tracking-wider md:flex"
          )}
        >
          Time
          <input
            aria-label="Time warp"
            className="h-1 w-24 cursor-pointer accent-white"
            max={MAX_WARP}
            min={0}
            onChange={(event) => onTimeScale(Number(event.target.value))}
            step={WARP_STEP}
            type="range"
            value={timeScale}
          />
          <span className="w-8 text-right text-white/85">{timeScale}x</span>
        </label>
        <IconButton
          label={paused ? "Resume orbits" : "Pause orbits"}
          onClick={() => onTimeScale(paused ? 1 : 0)}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </IconButton>
        <IconButton
          active={touring}
          label={touring ? "Stop guided tour" : "Start guided tour"}
          onClick={onToggleTour}
        >
          <Orbit className="size-4" />
        </IconButton>
        <IconButton
          label={muted ? "Turn sound on" : "Turn sound off"}
          onClick={onToggleMute}
        >
          {muted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </IconButton>
        <Link
          className={cn(
            glass,
            "hidden h-9 items-center rounded-full px-3 font-mono text-[10px] text-white/70 uppercase tracking-wider hover:border-white/40 hover:text-white sm:flex"
          )}
          href="/classic"
        >
          Classic
        </Link>
      </div>
    </header>
  );
}

type NavRailProps = {
  bodies: readonly Body[];
  focusId: BodyId | null;
  onSelect: (id: BodyId | null) => void;
  onStep: (direction: 1 | -1) => void;
};

export function NavRail({ bodies, focusId, onSelect, onStep }: NavRailProps) {
  return (
    <nav
      aria-label="Worlds"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-3 sm:p-5"
    >
      <p className="hidden font-mono text-[10px] text-white/40 uppercase tracking-[0.2em] lg:block">
        Drag to orbit · Scroll to zoom · Click a world or the void · Arrow keys
        travel · Esc returns
      </p>
      <div
        className={cn(
          glass,
          "pointer-events-auto flex max-w-full items-center gap-1 rounded-full p-1"
        )}
      >
        <button
          aria-label="Previous world"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => onStep(-1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          <li>
            <button
              aria-current={focusId === null}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                focusId === null
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
              onClick={() => onSelect(null)}
              type="button"
            >
              System
            </button>
          </li>
          {bodies.map((body) => {
            const active = focusId === body.id;
            return (
              <li key={body.id}>
                <button
                  aria-current={active}
                  aria-label={body.name}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => onSelect(body.id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: body.glow,
                      boxShadow: active ? `0 0 10px ${body.glow}` : undefined,
                    }}
                  />
                  <span className={cn(!active && "hidden sm:inline")}>
                    {body.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          aria-label="Next world"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => onStep(1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
