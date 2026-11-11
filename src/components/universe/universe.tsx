"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type BodyId, buildBodies, type PostSummary } from "@/data/universe";
import { soundscape } from "@/lib/soundscape";
import { IntroGate, NavRail, TopBar } from "./hud";
import { InfoPanel } from "./info-panel";
import { runtime } from "./runtime";

const Scene = dynamic(() => import("./scene"), { ssr: false });

const TOUR_INTERVAL_MS = 11_000;
const DIGIT_KEYS = "123456789";

const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? null
    );
  } catch {
    return false;
  }
};

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable);

export function Universe({ posts }: { posts: readonly PostSummary[] }) {
  const router = useRouter();
  const bodies = useMemo(() => buildBodies(posts), [posts]);
  const [supported, setSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [focusId, setFocusId] = useState<BodyId | null>(null);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [touring, setTouring] = useState(false);
  const [timeScale, setTimeScale] = useState(1);

  const focusIndex = bodies.findIndex((body) => body.id === focusId);
  const focusBody = focusIndex >= 0 ? bodies[focusIndex] : null;

  // Devices without WebGL get the classic page instead of a blank canvas.
  useEffect(() => {
    if (supportsWebGL()) {
      setSupported(true);
    } else {
      router.replace("/classic");
    }
  }, [router]);

  const travel = useCallback(
    (id: BodyId | null, item: number | null = null) => {
      setActiveItem(item);
      setFocusId((current) => {
        if (current !== id) {
          soundscape.travel();
          const next = bodies.find((body) => body.id === id);
          soundscape.setFocus(next ? next.note : null);
        }
        return id;
      });
    },
    [bodies]
  );

  const select = useCallback(
    (id: BodyId | null, item?: number) => {
      setTouring(false);
      travel(id, item ?? null);
    },
    [travel]
  );

  const step = useCallback(
    (direction: 1 | -1, fromTour = false) => {
      if (!fromTour) {
        setTouring(false);
      }
      const count = bodies.length;
      const next =
        focusIndex < 0 && direction < 0
          ? count - 1
          : (focusIndex + direction + count) % count;
      travel(bodies[next].id);
    },
    [bodies, focusIndex, travel]
  );

  const changeTimeScale = useCallback((value: number) => {
    runtime.timeScale = value;
    soundscape.setWarp(value);
    setTimeScale(value);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      if (!(next || soundscape.running)) {
        soundscape.start(bodies);
      }
      soundscape.setMuted(next);
      return next;
    });
  }, [bodies]);

  const enter = useCallback(
    (withSound: boolean) => {
      if (withSound) {
        soundscape.start(bodies);
        soundscape.travel();
      }
      setMuted(!withSound);
      setEntered(true);
    },
    [bodies]
  );

  useEffect(() => {
    if (!(touring && entered)) {
      return;
    }
    const timer = setInterval(() => step(1, true), TOUR_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [touring, entered, step]);

  useEffect(() => {
    if (!entered) {
      return;
    }
    const actions = new Map<string, () => void>([
      ["arrowright", () => step(1)],
      ["arrowleft", () => step(-1)],
      ["escape", () => select(null)],
      ["m", toggleMute],
    ]);
    for (const [index, body] of bodies.entries()) {
      actions.set(DIGIT_KEYS[index], () => select(body.id));
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || isTypingTarget(event.target)) {
        return;
      }
      actions.get(event.key.toLowerCase())?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, bodies, select, step, toggleMute]);

  useEffect(() => {
    const onVisibility = () => soundscape.setSuspended(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      soundscape.dispose();
      runtime.timeScale = 1;
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="dark fixed inset-0 overflow-hidden bg-[#020207] text-white">
      <div className="absolute inset-0 z-0">
        {supported ? (
          <Scene
            activeItem={activeItem}
            bodies={bodies}
            entered={entered}
            focusId={focusId}
            onReady={onReady}
            onSelect={select}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {entered ? null : (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40"
            exit={{ opacity: 0 }}
            initial={{ opacity: 1 }}
            key="intro"
            transition={{ duration: 1.2 }}
          >
            <IntroGate onEnter={enter} ready={ready} />
          </motion.div>
        )}
      </AnimatePresence>

      {entered ? (
        <>
          <TopBar
            muted={muted}
            onTimeScale={changeTimeScale}
            onToggleMute={toggleMute}
            onToggleTour={() => {
              setTouring((current) => !current);
              if (!touring) {
                step(1, true);
              }
            }}
            timeScale={timeScale}
            touring={touring}
          />
          <div className="pointer-events-none absolute inset-x-3 top-16 bottom-20 z-30 flex items-end justify-end sm:inset-x-6 sm:top-20 sm:bottom-24 lg:items-start">
            <AnimatePresence mode="wait">
              {focusBody ? (
                <motion.div
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  className="flex max-h-[52%] w-full lg:max-h-full lg:w-[420px]"
                  exit={{ opacity: 0, y: 16 }}
                  initial={{ opacity: 0, y: 24 }}
                  key={focusBody.id}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <InfoPanel
                    activeItem={activeItem}
                    body={focusBody}
                    index={focusIndex}
                    onClose={() => select(null)}
                    onItemHover={setActiveItem}
                    posts={posts}
                    total={bodies.length}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <NavRail
            bodies={bodies}
            focusId={focusId}
            onSelect={select}
            onStep={step}
          />
        </>
      ) : null}
    </div>
  );
}
