"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  Object3D,
  type ShaderMaterial,
  Vector3,
} from "three";
import { runtime } from "./runtime";
import {
  NEBULA_FRAGMENT,
  NEBULA_VERTEX,
  STAR_FRAGMENT,
  STAR_VERTEX,
} from "./shaders";

const MAX_FRAME_DELTA = 0.05;
const TAU = Math.PI * 2;

/** Advances simulated time. Orbits read from it, so time warp is one number. */
export function SimClock() {
  useFrame((_, delta) => {
    runtime.simTime += Math.min(delta, MAX_FRAME_DELTA) * runtime.timeScale;
  });
  return null;
}

const NEBULA_RADIUS = 1400;

export function Nebula() {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh frustumCulled={false} renderOrder={-2}>
      <sphereGeometry args={[NEBULA_RADIUS, 48, 32]} />
      <shaderMaterial
        depthWrite={false}
        fragmentShader={NEBULA_FRAGMENT}
        ref={material}
        side={BackSide}
        uniforms={uniforms}
        vertexShader={NEBULA_VERTEX}
      />
    </mesh>
  );
}

const STAR_COUNT = 5200;
const STAR_INNER = 420;
const STAR_DEPTH = 620;
const STAR_TINTS = ["#ffffff", "#cfe0ff", "#ffe6c4", "#ffd0d8", "#bfd4ff"];
const BRIGHT_STAR_CHANCE = 0.035;

export function Stars() {
  const material = useRef<ShaderMaterial>(null);
  const pixelRatio = useThree((state) => state.viewport.dpr);

  const { positions, sizes, phases, colors } = useMemo(() => {
    const positionArray = new Float32Array(STAR_COUNT * 3);
    const sizeArray = new Float32Array(STAR_COUNT);
    const phaseArray = new Float32Array(STAR_COUNT);
    const colorArray = new Float32Array(STAR_COUNT * 3);
    const tint = new Color();
    const point = new Vector3();
    for (let i = 0; i < STAR_COUNT; i += 1) {
      point
        .randomDirection()
        .multiplyScalar(STAR_INNER + Math.random() * STAR_DEPTH);
      positionArray.set([point.x, point.y, point.z], i * 3);
      const bright = Math.random() < BRIGHT_STAR_CHANCE;
      sizeArray[i] = bright
        ? 3.4 + Math.random() * 2.4
        : 0.9 + Math.random() * 1.7;
      phaseArray[i] = Math.random();
      tint.set(STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)]);
      const intensity = bright ? 1.6 : 0.45 + Math.random() * 0.6;
      colorArray.set(
        [tint.r * intensity, tint.g * intensity, tint.b * intensity],
        i * 3
      );
    }
    return {
      positions: positionArray,
      sizes: sizeArray,
      phases: phaseArray,
      colors: colorArray,
    };
  }, []);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 } }),
    []
  );

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime;
      material.current.uniforms.uPixelRatio.value = pixelRatio;
    }
  });

  return (
    <points frustumCulled={false} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[sizes, 1]} attach="attributes-aSize" />
        <bufferAttribute args={[phases, 1]} attach="attributes-aPhase" />
        <bufferAttribute args={[colors, 3]} attach="attributes-aColor" />
      </bufferGeometry>
      <shaderMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={STAR_FRAGMENT}
        ref={material}
        transparent
        uniforms={uniforms}
        vertexShader={STAR_VERTEX}
      />
    </points>
  );
}

const ASTEROID_COUNT = 520;
const BELT_INNER = 59.5;
const BELT_WIDTH = 4.5;
const BELT_HEIGHT = 1.6;
const BELT_SPIN = 0.012;

export function AsteroidBelt() {
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) {
      return;
    }
    const dummy = new Object3D();
    for (let i = 0; i < ASTEROID_COUNT; i += 1) {
      const angle = Math.random() * TAU;
      const radius = BELT_INNER + Math.random() * BELT_WIDTH;
      dummy.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * BELT_HEIGHT,
        Math.sin(angle) * radius
      );
      dummy.rotation.set(
        Math.random() * TAU,
        Math.random() * TAU,
        Math.random() * TAU
      );
      const scale = 0.08 + Math.random() ** 3 * 0.42;
      dummy.scale.set(
        scale * (0.7 + Math.random() * 0.6),
        scale * (0.7 + Math.random() * 0.6),
        scale
      );
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = runtime.simTime * BELT_SPIN;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh
        args={[undefined, undefined, ASTEROID_COUNT]}
        frustumCulled={false}
        ref={mesh}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8d857c" flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}

const COMET_POOL = 6;
const COMET_SHELL = 210;
const COMET_SPEED = 190;
const COMET_LIFE = 1.5;
const COMET_LENGTH = 16;
const AMBIENT_COMET_MIN = 7;
const AMBIENT_COMET_SPREAD = 9;
const X_AXIS = new Vector3(1, 0, 0);

type CometState = {
  active: boolean;
  age: number;
  origin: Vector3;
  direction: Vector3;
};

/** Shooting stars: a few arrive on their own, more when you click the void. */
export function Comets() {
  const meshes = useRef<(Mesh | null)[]>([]);
  const consumed = useRef(0);
  const nextAmbient = useRef(AMBIENT_COMET_MIN);
  const states = useMemo<CometState[]>(
    () =>
      Array.from({ length: COMET_POOL }, () => ({
        active: false,
        age: 0,
        origin: new Vector3(),
        direction: new Vector3(),
      })),
    []
  );
  const ids = useMemo(
    () => Array.from({ length: COMET_POOL }, (_, i) => `comet-${i}`),
    []
  );

  const launch = () => {
    const comet = states.find((state) => !state.active);
    if (!comet) {
      return;
    }
    comet.origin.randomDirection().multiplyScalar(COMET_SHELL);
    comet.origin.y = Math.abs(comet.origin.y) * 0.6 + 20;
    // Travel roughly tangent to the shell so it streaks across the sky.
    comet.direction.randomDirection().cross(comet.origin).normalize();
    comet.age = 0;
    comet.active = true;
  };

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    if (consumed.current < runtime.cometRequests) {
      consumed.current = runtime.cometRequests;
      launch();
    }
    if (clock.elapsedTime > nextAmbient.current) {
      nextAmbient.current =
        clock.elapsedTime +
        AMBIENT_COMET_MIN +
        Math.random() * AMBIENT_COMET_SPREAD;
      launch();
    }
    for (const [index, comet] of states.entries()) {
      const mesh = meshes.current[index];
      if (!mesh) {
        continue;
      }
      if (!comet.active) {
        mesh.visible = false;
        continue;
      }
      comet.age += delta;
      const progress = comet.age / COMET_LIFE;
      if (progress >= 1) {
        comet.active = false;
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position
        .copy(comet.origin)
        .addScaledVector(comet.direction, comet.age * COMET_SPEED);
      mesh.quaternion.setFromUnitVectors(X_AXIS, comet.direction);
      (mesh.material as MeshBasicMaterial).opacity = Math.sin(
        progress * Math.PI
      );
    }
  });

  return (
    <>
      {ids.map((id, index) => (
        <mesh
          frustumCulled={false}
          key={id}
          ref={(node) => {
            meshes.current[index] = node;
          }}
          scale={[COMET_LENGTH, 0.22, 0.22]}
          visible={false}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial
            blending={AdditiveBlending}
            color={[2.4, 2.8, 3.6]}
            depthWrite={false}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </>
  );
}
