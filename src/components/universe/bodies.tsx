"use client";

import { Billboard, Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  type ShaderMaterial,
  Vector3,
} from "three";
import {
  type Body,
  type BodyId,
  moonOrbitRadius,
  moonRadius,
} from "@/data/universe";
import { soundscape } from "@/lib/soundscape";
import { cn } from "@/lib/utils";
import { bodyPosition, orbitPosition, runtime } from "./runtime";
import {
  ATMOSPHERE_FRAGMENT,
  BILLBOARD_VERTEX,
  CORONA_FRAGMENT,
  PLANET_FRAGMENT,
  RING_FRAGMENT,
  RING_VERTEX,
  SUN_FRAGMENT,
  WORLD_VERTEX,
} from "./shaders";

export type SelectHandler = (id: BodyId, item?: number) => void;

const TAU = Math.PI * 2;
const MAX_FRAME_DELTA = 0.05;
const DRAG_THRESHOLD = 6;
const HOVER_RATE = 8;
const FLASH_DECAY = 1.6;
const ORBIT_SEGMENTS = 192;
const HIT_SCALE = 1.7;
const ATMOSPHERE_SCALE = 1.18;
const RING_INNER = 1.45;
const RING_OUTER = 2.4;
const SATELLITE_ORBIT = 2.75;
const SPIN_SPEED = 0.07;
const LABEL_Z_RANGE: [number, number] = [20, 0];

const setCursor = (active: boolean): void => {
  document.body.style.cursor = active ? "pointer" : "auto";
};

const isDrag = (event: ThreeEvent<MouseEvent>): boolean =>
  event.delta > DRAG_THRESHOLD;

/** Hover and click-flash state, eased so highlights never pop. */
function useHighlight(note: number) {
  const [hovered, setHovered] = useState(false);
  const level = useRef(0);
  const flash = useRef(0);

  useEffect(() => () => setCursor(false), []);

  const step = (delta: number): number => {
    const target = hovered ? 1 : 0;
    level.current += (target - level.current) * Math.min(delta * HOVER_RATE, 1);
    flash.current = Math.max(flash.current - delta * FLASH_DECAY, 0);
    return level.current + flash.current;
  };

  const handlers = {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHovered(true);
      setCursor(true);
      soundscape.hover();
    },
    onPointerOut: () => {
      setHovered(false);
      setCursor(false);
    },
  };

  const ping = (): void => {
    flash.current = 1;
    soundscape.select(note);
  };

  return { hovered, setHovered, step, handlers, ping };
}

type LabelProps = {
  title: string;
  subtitle?: string;
  accent: string;
  height: number;
  visible: boolean;
  compact?: boolean;
  onSelect: () => void;
  onHover?: (hovered: boolean) => void;
};

function Label({
  title,
  subtitle,
  accent,
  height,
  visible,
  compact = false,
  onSelect,
  onHover,
}: LabelProps) {
  return (
    <Html
      center
      position={[0, height, 0]}
      style={{ pointerEvents: "none" }}
      zIndexRange={LABEL_Z_RANGE}
    >
      <button
        className={cn(
          "group flex select-none flex-col items-center whitespace-nowrap rounded-full border border-white/10 bg-black/40 font-mono uppercase backdrop-blur-sm transition-all duration-500 hover:border-white/40 hover:bg-black/70",
          compact
            ? "px-2 py-0.5 text-[9px] tracking-[0.18em]"
            : "px-3 py-1 text-[10px] tracking-[0.28em]",
          visible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        tabIndex={-1}
        type="button"
      >
        <span className="flex items-center gap-1.5 text-white/90">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          {title}
        </span>
        {subtitle ? (
          <span className="text-[8px] text-white/45 tracking-[0.2em]">
            {subtitle}
          </span>
        ) : null}
      </button>
    </Html>
  );
}

function OrbitLine({ body, active }: { body: Body; active: boolean }) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const point = new Vector3();
    for (let i = 0; i < ORBIT_SEGMENTS; i += 1) {
      orbitPosition(body, (i / ORBIT_SEGMENTS) * TAU, point);
      points.push(point.x, point.y, point.z);
    }
    const built = new BufferGeometry();
    built.setAttribute("position", new Float32BufferAttribute(points, 3));
    return built;
  }, [body]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial
        color={active ? body.glow : "#ffffff"}
        depthWrite={false}
        opacity={active ? 0.5 : 0.09}
        transparent
      />
    </lineLoop>
  );
}

type SunProps = {
  body: Body;
  focused: boolean;
  labelsVisible: boolean;
  onSelect: SelectHandler;
};

const CORONA_SIZE = 7;
const SUN_LIGHT_INTENSITY = 2.6;

export function Sun({ body, focused, labelsVisible, onSelect }: SunProps) {
  const surface = useRef<ShaderMaterial>(null);
  const corona = useRef<ShaderMaterial>(null);
  const { step, handlers, ping, setHovered } = useHighlight(body.note);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uA: { value: new Color(body.palette[0]) },
      uB: { value: new Color(body.palette[1]) },
      uC: { value: new Color(body.palette[2]) },
    }),
    [body]
  );
  const coronaUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uGlow: { value: new Color(body.glow) } }),
    [body]
  );

  useEffect(() => {
    runtime.positions.set(body.id, new Vector3());
  }, [body.id]);

  useFrame(({ clock }, delta) => {
    const highlight = step(Math.min(delta, MAX_FRAME_DELTA));
    if (surface.current) {
      surface.current.uniforms.uTime.value = clock.elapsedTime;
      surface.current.uniforms.uHover.value = highlight;
    }
    if (corona.current) {
      corona.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const select = (): void => {
    ping();
    onSelect(body.id);
  };

  return (
    <group>
      <pointLight decay={0} intensity={SUN_LIGHT_INTENSITY} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a WebGL mesh, not a DOM node; keyboard access is provided by the nav rail */}
      <mesh
        {...handlers}
        onClick={(event) => {
          event.stopPropagation();
          if (!isDrag(event)) {
            select();
          }
        }}
      >
        <sphereGeometry args={[body.radius, 96, 64]} />
        <shaderMaterial
          fragmentShader={SUN_FRAGMENT}
          ref={surface}
          uniforms={uniforms}
          vertexShader={WORLD_VERTEX}
        />
      </mesh>
      <Billboard>
        <mesh raycast={() => null} renderOrder={1}>
          <planeGeometry
            args={[body.radius * CORONA_SIZE, body.radius * CORONA_SIZE]}
          />
          <shaderMaterial
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={CORONA_FRAGMENT}
            ref={corona}
            transparent
            uniforms={coronaUniforms}
            vertexShader={BILLBOARD_VERTEX}
          />
        </mesh>
      </Billboard>
      <Label
        accent={body.glow}
        height={body.radius * 1.45}
        onHover={setHovered}
        onSelect={select}
        subtitle={body.name}
        title={body.codename}
        visible={labelsVisible && !focused}
      />
    </group>
  );
}

type MoonProps = {
  body: Body;
  index: number;
  label: string;
  active: boolean;
  labelVisible: boolean;
  onSelect: SelectHandler;
};

const MOON_BASE_SPEED = 0.5;
const MOON_PHASE_STEP = 2.3;
const MOON_HIT_SCALE = 2.4;

function Moon({
  body,
  index,
  label,
  active,
  labelVisible,
  onSelect,
}: MoonProps) {
  const group = useRef<Group>(null);
  const { hovered, handlers, setHovered } = useHighlight(body.note);
  const radius = moonRadius(body);
  const orbit = moonOrbitRadius(body, index);
  const speed = MOON_BASE_SPEED / (1 + index * 0.45);
  const lift = (index % 2 === 0 ? 1 : -1) * 0.12;
  const lit = active || hovered;

  useFrame(() => {
    if (!group.current) {
      return;
    }
    const angle = index * MOON_PHASE_STEP + runtime.simTime * speed;
    group.current.position.set(
      Math.cos(angle) * orbit,
      Math.sin(angle) * orbit * lift,
      Math.sin(angle) * orbit
    );
  });

  const select = (): void => {
    soundscape.select(body.note * (1 + (index % 3) * 0.25));
    onSelect(body.id, index);
  };

  return (
    <group ref={group}>
      <mesh rotation={[0.4, index, 0]}>
        <icosahedronGeometry args={[radius, 2]} />
        <meshStandardMaterial
          color="#b9b2ab"
          emissive={body.glow}
          emissiveIntensity={lit ? 1.4 : 0.06}
          flatShading
          roughness={0.95}
        />
      </mesh>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a WebGL mesh, not a DOM node; keyboard access is provided by the nav rail */}
      <mesh
        {...handlers}
        onClick={(event) => {
          event.stopPropagation();
          if (!isDrag(event)) {
            select();
          }
        }}
      >
        <sphereGeometry args={[radius * MOON_HIT_SCALE, 12, 8]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>
      <Label
        accent={body.glow}
        compact
        height={radius * 2.6}
        onHover={setHovered}
        onSelect={select}
        title={label}
        visible={labelVisible || hovered}
      />
    </group>
  );
}

function Satellites({ body, visible }: { body: Body; visible: boolean }) {
  const group = useRef<Group>(null);
  const orbit = body.radius * SATELLITE_ORBIT;

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={group}>
      {body.satellites.map((name, index) => {
        const angle = (index / body.satellites.length) * TAU;
        return (
          <group
            key={name}
            position={[
              Math.cos(angle) * orbit,
              Math.sin(angle * 3) * 0.25,
              Math.sin(angle) * orbit,
            ]}
          >
            <mesh raycast={() => null}>
              <sphereGeometry args={[body.radius * 0.035, 8, 8]} />
              <meshBasicMaterial color={body.glow} toneMapped={false} />
            </mesh>
            {visible ? (
              <Html
                center
                position={[0, body.radius * 0.16, 0]}
                style={{ pointerEvents: "none" }}
                zIndexRange={LABEL_Z_RANGE}
              >
                <span className="select-none whitespace-nowrap rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[9px] text-white/85 uppercase tracking-[0.16em] backdrop-blur-sm">
                  {name}
                </span>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function Ring({ body }: { body: Body }) {
  const inner = body.radius * RING_INNER;
  const outer = body.radius * RING_OUTER;
  const uniforms = useMemo(
    () => ({
      uInner: { value: inner },
      uOuter: { value: outer },
      uSeed: { value: body.phase },
      uA: { value: new Color(body.palette[1]) },
      uB: { value: new Color(body.palette[2]) },
    }),
    [body, inner, outer]
  );

  return (
    <mesh raycast={() => null} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 160, 1]} />
      <shaderMaterial
        depthWrite={false}
        fragmentShader={RING_FRAGMENT}
        side={DoubleSide}
        transparent
        uniforms={uniforms}
        vertexShader={RING_VERTEX}
      />
    </mesh>
  );
}

type PlanetProps = {
  body: Body;
  focused: boolean;
  labelsVisible: boolean;
  activeItem: number | null;
  onSelect: SelectHandler;
};

export function Planet({
  body,
  focused,
  labelsVisible,
  activeItem,
  onSelect,
}: PlanetProps) {
  const group = useRef<Group>(null);
  const globe = useRef<Mesh>(null);
  const surface = useRef<ShaderMaterial>(null);
  const atmosphere = useRef<ShaderMaterial>(null);
  const { hovered, step, handlers, ping, setHovered } = useHighlight(body.note);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uKind: { value: body.surface },
      uSeed: { value: body.phase * 7.3 },
      uHover: { value: 0 },
      uA: { value: new Color(body.palette[0]) },
      uB: { value: new Color(body.palette[1]) },
      uC: { value: new Color(body.palette[2]) },
      uGlow: { value: new Color(body.glow) },
    }),
    [body]
  );
  const atmosphereUniforms = useMemo(
    () => ({ uGlow: { value: new Color(body.glow) }, uHover: { value: 0 } }),
    [body]
  );

  useEffect(() => {
    runtime.positions.set(body.id, bodyPosition(body, new Vector3()));
  }, [body]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    const position = runtime.positions.get(body.id);
    if (group.current && position) {
      bodyPosition(body, position);
      group.current.position.copy(position);
    }
    if (globe.current) {
      globe.current.rotation.y += delta * SPIN_SPEED;
    }
    const highlight = step(delta);
    if (surface.current) {
      surface.current.uniforms.uTime.value = clock.elapsedTime;
      surface.current.uniforms.uHover.value = highlight;
    }
    if (atmosphere.current) {
      atmosphere.current.uniforms.uHover.value = highlight;
    }
  });

  const select = (): void => {
    ping();
    onSelect(body.id);
  };

  return (
    <>
      <OrbitLine active={hovered || focused} body={body} />
      <group ref={group}>
        <group rotation={[body.tilt, 0, body.tilt * 0.5]}>
          <mesh ref={globe}>
            <sphereGeometry args={[body.radius, 96, 64]} />
            <shaderMaterial
              fragmentShader={PLANET_FRAGMENT}
              ref={surface}
              uniforms={uniforms}
              vertexShader={WORLD_VERTEX}
            />
          </mesh>
          <mesh raycast={() => null} scale={ATMOSPHERE_SCALE}>
            <sphereGeometry args={[body.radius, 48, 32]} />
            <shaderMaterial
              blending={AdditiveBlending}
              depthWrite={false}
              fragmentShader={ATMOSPHERE_FRAGMENT}
              ref={atmosphere}
              side={BackSide}
              transparent
              uniforms={atmosphereUniforms}
              vertexShader={WORLD_VERTEX}
            />
          </mesh>
          {body.ring ? <Ring body={body} /> : null}
          {body.satellites.length > 0 ? (
            <Satellites body={body} visible={focused} />
          ) : null}
        </group>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a WebGL mesh, not a DOM node; keyboard access is provided by the nav rail */}
        <mesh
          {...handlers}
          onClick={(event) => {
            event.stopPropagation();
            if (!isDrag(event)) {
              select();
            }
          }}
        >
          <sphereGeometry args={[body.radius * HIT_SCALE, 16, 12]} />
          <meshBasicMaterial depthWrite={false} opacity={0} transparent />
        </mesh>
        {body.moons.map((label, index) => (
          <Moon
            active={focused && activeItem === index}
            body={body}
            index={index}
            key={label}
            label={label}
            labelVisible={focused}
            onSelect={onSelect}
          />
        ))}
        <Label
          accent={body.glow}
          height={body.radius * (body.ring ? 1.9 : 1.75) + 0.6}
          onHover={setHovered}
          onSelect={select}
          subtitle={body.name}
          title={body.codename}
          visible={labelsVisible && !focused}
        />
      </group>
    </>
  );
}
