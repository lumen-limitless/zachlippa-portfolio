import type { Vector3 } from "three";
import type { Body } from "@/data/universe";

/**
 * Per-frame simulation state shared between the scene, the camera rig and the
 * audio probe. It is mutated inside the render loop, so it deliberately lives
 * outside React state.
 */
export const runtime = {
  /** Simulated seconds; advances at `timeScale` times real time. */
  simTime: 0,
  timeScale: 1,
  /** World position of every body, written each frame by the body itself. */
  positions: new Map<string, Vector3>(),
  /** Incremented to request a comet; consumed by the comet pool. */
  cometRequests: 0,
};

export const orbitPosition = (
  body: Body,
  angle: number,
  out: Vector3
): Vector3 =>
  out.set(
    Math.cos(angle) * body.orbitRadius,
    Math.sin(angle) * body.orbitRadius * body.inclination,
    Math.sin(angle) * body.orbitRadius
  );

export const bodyPosition = (body: Body, out: Vector3): Vector3 =>
  orbitPosition(body, body.phase + runtime.simTime * body.orbitSpeed, out);
