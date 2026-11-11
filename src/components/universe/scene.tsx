"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { type ComponentRef, useEffect, useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import type { Body, BodyId } from "@/data/universe";
import { soundscape } from "@/lib/soundscape";
import { Planet, type SelectHandler, Sun } from "./bodies";
import { AsteroidBelt, Comets, Nebula, SimClock, Stars } from "./environment";
import { runtime } from "./runtime";

export type SceneProps = {
  bodies: readonly Body[];
  focusId: BodyId | null;
  activeItem: number | null;
  entered: boolean;
  onSelect: SelectHandler;
  onReady: () => void;
};

const ORIGIN = new Vector3();
const INTRO_POSITION: [number, number, number] = [0, 150, 400];
const INTRO_DISTANCE = 430;
const OVERVIEW_DISTANCE = 245;
const MAX_FRAME_DELTA = 0.1;
const TARGET_RATE = 3.5;
const FLY_RATE = 2.4;
const ARRIVAL_TOLERANCE = 0.02;
const ALIGNED_DOT = 0.995;
const BASE_FOV = 50;
const FLY_FOV = 64;
const FOV_RATE = 3;
const SHIFT_RATE = 3;
const WIDE_LAYOUT = 1024;
const MAX_PANEL_SHIFT = 220;
const PANEL_SHIFT_RATIO = 0.17;
const SHEET_SHIFT_RATIO = 0.2;
const PORTRAIT_REFERENCE = 1.25;
const MAX_PORTRAIT_SCALE = 1.7;
const FREE_MIN_DISTANCE = 0.1;
const FREE_MAX_DISTANCE = 2000;
/** Approach angle off the sun line, so worlds are seen three-quarters lit. */
const APPROACH_ANGLE = 0.75;
const APPROACH_LIFT = 0.28;
const UP = new Vector3(0, 1, 0);

const damp = (rate: number, delta: number): number =>
  1 - Math.exp(-rate * delta);

const restingDistance = (
  body: Body | null,
  entered: boolean,
  portraitScale: number
): number => {
  if (!entered) {
    return INTRO_DISTANCE;
  }
  if (body) {
    return body.viewDistance * Math.sqrt(portraitScale);
  }
  return OVERVIEW_DISTANCE * portraitScale;
};

/** How far to slide the view so the focused world clears the info panel. */
const panelShift = (
  open: boolean,
  width: number,
  height: number
): [number, number] => {
  if (!open) {
    return [0, 0];
  }
  if (width >= WIDE_LAYOUT) {
    return [Math.min(MAX_PANEL_SHIFT, width * PANEL_SHIFT_RATIO), 0];
  }
  return [0, height * SHEET_SHIFT_RATIO];
};

type FlightStep = {
  camera: PerspectiveCamera;
  target: Vector3;
  destination: Vector3;
  planet: boolean;
  restDistance: number;
  ease: number;
  offset: Vector3;
  approach: Vector3;
};

/**
 * Moves the camera one frame closer to its resting distance. Approaching a
 * planet also swings the camera round to the sunlit side. Returns true once
 * the camera has arrived.
 */
const flyStep = ({
  camera,
  target,
  destination,
  planet,
  restDistance,
  ease,
  offset,
  approach,
}: FlightStep): boolean => {
  offset.copy(camera.position).sub(target);
  const distance = offset.length();
  const next = distance + (restDistance - distance) * ease;
  offset.normalize();
  let aligned = true;
  if (planet) {
    approach
      .copy(destination)
      .multiplyScalar(-1)
      .setY(0)
      .normalize()
      .applyAxisAngle(UP, APPROACH_ANGLE)
      .setY(APPROACH_LIFT)
      .normalize();
    offset.lerp(approach, ease).normalize();
    aligned = offset.dot(approach) > ALIGNED_DOT;
  }
  camera.position.copy(target).addScaledVector(offset, next);
  return (
    aligned && Math.abs(next - restDistance) < restDistance * ARRIVAL_TOLERANCE
  );
};

type RigProps = {
  bodies: readonly Body[];
  focusId: BodyId | null;
  entered: boolean;
};

/**
 * Orbit controls that follow whichever world is in focus. Travelling only
 * changes the distance to the target, so the viewer keeps their bearing and
 * can keep orbiting freely once they arrive.
 */
function CameraRig({ bodies, focusId, entered }: RigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const flying = useRef(true);
  const previousTarget = useRef(new Vector3());
  const offset = useRef(new Vector3());
  const approach = useRef(new Vector3());
  const shift = useRef({ x: 0, y: 0 });
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);
  const body = bodies.find((candidate) => candidate.id === focusId) ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new destination restarts the flight
  useEffect(() => {
    flying.current = true;
  }, [focusId, entered]);

  useFrame((_, rawDelta) => {
    const orbit = controls.current;
    if (!orbit) {
      return;
    }
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    const aspect = size.width / size.height;
    const portraitScale = Math.min(
      Math.max(PORTRAIT_REFERENCE / aspect, 1),
      MAX_PORTRAIT_SCALE
    );

    // Follow the focused world, carrying the camera along with the target.
    const destination = (body && runtime.positions.get(body.id)) || ORIGIN;
    previousTarget.current.copy(orbit.target);
    orbit.target.lerp(destination, damp(TARGET_RATE, delta));
    camera.position.add(
      offset.current.copy(orbit.target).sub(previousTarget.current)
    );

    const restDistance = restingDistance(body, entered, portraitScale);

    if (flying.current) {
      orbit.minDistance = FREE_MIN_DISTANCE;
      orbit.maxDistance = FREE_MAX_DISTANCE;
      const arrived = flyStep({
        camera,
        target: orbit.target,
        destination,
        planet: body?.kind === "planet",
        restDistance,
        ease: damp(FLY_RATE, delta),
        offset: offset.current,
        approach: approach.current,
      });
      if (arrived) {
        flying.current = false;
      }
    } else if (body) {
      orbit.minDistance = body.radius * 1.5;
      orbit.maxDistance = restDistance * 2.4;
    } else {
      orbit.minDistance = 28;
      orbit.maxDistance = restDistance * 1.7;
    }

    orbit.autoRotate = !body;
    orbit.autoRotateSpeed = entered ? 0.12 : 0.35;

    const targetFov = flying.current && entered ? FLY_FOV : BASE_FOV;
    camera.fov += (targetFov - camera.fov) * damp(FOV_RATE, delta);

    // Slide the world out from under the info panel.
    const [shiftX, shiftY] = panelShift(Boolean(body), size.width, size.height);
    const ease = damp(SHIFT_RATE, delta);
    shift.current.x += (shiftX - shift.current.x) * ease;
    shift.current.y += (shiftY - shift.current.y) * ease;
    camera.setViewOffset(
      size.width,
      size.height,
      shift.current.x,
      shift.current.y,
      size.width,
      size.height
    );

    orbit.update();
  });

  return (
    <OrbitControls
      dampingFactor={0.06}
      enableDamping
      enablePan={false}
      makeDefault
      onStart={() => {
        flying.current = false;
      }}
      ref={controls}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
    />
  );
}

const PROBE_INTERVAL = 5;
const NEAR_FACTOR = 2;
const FAR_FACTOR = 16;

/** Feeds each world's distance and screen position to the soundscape. */
function AudioProbe({ bodies }: { bodies: readonly Body[] }) {
  const frame = useRef(0);
  const projected = useRef(new Vector3());

  useFrame(({ camera }) => {
    frame.current += 1;
    if (frame.current % PROBE_INTERVAL !== 0 || !soundscape.running) {
      return;
    }
    for (const body of bodies) {
      const position = runtime.positions.get(body.id);
      if (!position) {
        continue;
      }
      const distance = camera.position.distanceTo(position);
      const near = body.radius * NEAR_FACTOR;
      const far = body.radius * FAR_FACTOR;
      const closeness = 1 - (distance - near) / (far - near);
      const proximity = Math.min(Math.max(closeness, 0), 1) ** 2;
      const pan = projected.current.copy(position).project(camera).x;
      soundscape.updateBody(body.id, proximity, pan);
    }
  });

  return null;
}

export default function Scene({
  bodies,
  focusId,
  activeItem,
  entered,
  onSelect,
  onReady,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: INTRO_POSITION, fov: BASE_FOV, near: 0.5, far: 4000 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={onReady}
      onPointerMissed={() => {
        if (entered) {
          runtime.cometRequests += 1;
          soundscape.chime((Math.random() - 0.5) * 1.4);
        }
      }}
    >
      <color args={["#020207"]} attach="background" />
      <ambientLight intensity={0.14} />
      <SimClock />
      <Nebula />
      <Stars />
      <AsteroidBelt />
      <Comets />
      {bodies.map((body) =>
        body.kind === "star" ? (
          <Sun
            body={body}
            focused={focusId === body.id}
            key={body.id}
            labelsVisible={entered}
            onSelect={onSelect}
          />
        ) : (
          <Planet
            activeItem={activeItem}
            body={body}
            focused={focusId === body.id}
            key={body.id}
            labelsVisible={entered}
            onSelect={onSelect}
          />
        )
      )}
      <CameraRig bodies={bodies} entered={entered} focusId={focusId} />
      <AudioProbe bodies={bodies} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.95}
          luminanceSmoothing={0.25}
          luminanceThreshold={0.9}
          mipmapBlur
        />
        <Vignette darkness={0.62} offset={0.22} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
