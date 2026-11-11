import { DATA } from "@/data/resume";

/**
 * Maps the portfolio content in `resume.tsx` onto celestial bodies.
 * Content stays in `resume.tsx`; this file only decides how it looks in space.
 */

export type BodyId =
  | "core"
  | "experience"
  | "skills"
  | "projects"
  | "transmissions"
  | "contact";

export type PostSummary = {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
};

/** Surface shader variants: 0 terran, 1 gas, 2 lava, 3 ice, 4 dune. */
export type Surface = 0 | 1 | 2 | 3 | 4;

export type Body = {
  id: BodyId;
  /** Section name shown in navigation. */
  name: string;
  /** In-universe name of the world. */
  codename: string;
  tagline: string;
  kind: "star" | "planet";
  radius: number;
  orbitRadius: number;
  /** Radians per second at 1x time. */
  orbitSpeed: number;
  phase: number;
  inclination: number;
  tilt: number;
  surface: Surface;
  palette: readonly [string, string, string];
  glow: string;
  ring: boolean;
  /** Base frequency (Hz) of this world's voice in the soundscape. */
  note: number;
  /** Labels of orbiting moons, one per content item. */
  moons: readonly string[];
  /** Labels scattered around the ring (skills). */
  satellites: readonly string[];
  viewDistance: number;
};

const MOON_ORBIT_BASE = 1.9;
const MOON_ORBIT_STEP = 0.6;
const MOON_SIZE = 0.17;
const VIEW_RADIUS_FACTOR = 6;
const VIEW_EXTENT_FACTOR = 3.5;
const RING_OUTER = 2.4;

export const moonOrbitRadius = (body: Body, index: number): number =>
  body.radius * (MOON_ORBIT_BASE + index * MOON_ORBIT_STEP);

export const moonRadius = (body: Body): number => body.radius * MOON_SIZE;

const viewDistance = (
  radius: number,
  moonCount: number,
  ring: boolean
): number => {
  const moonExtent =
    moonCount > 0
      ? radius * (MOON_ORBIT_BASE + (moonCount - 1) * MOON_ORBIT_STEP)
      : 0;
  const ringExtent = ring ? radius * RING_OUTER : 0;
  const extent = Math.max(moonExtent, ringExtent);
  return Math.max(radius * VIEW_RADIUS_FACTOR, extent * VIEW_EXTENT_FACTOR);
};

type BodySeed = Omit<Body, "viewDistance">;

export function buildBodies(posts: readonly PostSummary[]): Body[] {
  const seeds: BodySeed[] = [
    {
      id: "core",
      name: "About",
      codename: DATA.name,
      tagline: DATA.description,
      kind: "star",
      radius: 9,
      orbitRadius: 0,
      orbitSpeed: 0,
      phase: 0,
      inclination: 0,
      tilt: 0,
      surface: 0,
      palette: ["#ff7a18", "#ffd27a", "#fff4d6"],
      glow: "#ffb347",
      ring: false,
      note: 146.83,
      moons: [],
      satellites: [],
    },
    {
      id: "experience",
      name: "Experience",
      codename: "Forge",
      tagline: "Where the work gets built",
      kind: "planet",
      radius: 3.2,
      orbitRadius: 26,
      orbitSpeed: 0.06,
      phase: 0.6,
      inclination: 0.05,
      tilt: 0.2,
      surface: 2,
      palette: ["#1a0f0d", "#5a2a1a", "#ff5a1f"],
      glow: "#ff6b35",
      ring: false,
      note: 174.61,
      moons: DATA.work.map((work) => work.company),
      satellites: [],
    },
    {
      id: "skills",
      name: "Skills",
      codename: "Prism",
      tagline: "The toolkit, in orbit",
      kind: "planet",
      radius: 5,
      orbitRadius: 46,
      orbitSpeed: 0.042,
      phase: 2.4,
      inclination: -0.04,
      tilt: 0.38,
      surface: 1,
      palette: ["#3b2a7a", "#c98bff", "#ffd9a8"],
      glow: "#b388ff",
      ring: true,
      note: 220,
      moons: [],
      satellites: DATA.skills,
    },
    {
      id: "projects",
      name: "Projects",
      codename: "Atlas",
      tagline: "Shipped worlds",
      kind: "planet",
      radius: 4,
      orbitRadius: 76,
      orbitSpeed: 0.03,
      phase: 4.1,
      inclination: 0.06,
      tilt: 0.41,
      surface: 0,
      palette: ["#0b3d91", "#2e8b57", "#c2a36b"],
      glow: "#5ab8ff",
      ring: false,
      note: 261.63,
      moons: DATA.projects.map((project) => project.title),
      satellites: [],
    },
    {
      id: "transmissions",
      name: "Blog",
      codename: "Echo",
      tagline: "Transmissions from the field",
      kind: "planet",
      radius: 3,
      orbitRadius: 94,
      orbitSpeed: 0.022,
      phase: 5.5,
      inclination: -0.07,
      tilt: 0.1,
      surface: 3,
      palette: ["#bfe9ff", "#6fb7e0", "#eafcff"],
      glow: "#8fe3ff",
      ring: false,
      note: 293.66,
      moons: posts.map((post) => post.title),
      satellites: [],
    },
    {
      id: "contact",
      name: "Contact",
      codename: "Beacon",
      tagline: "Open a channel",
      kind: "planet",
      radius: 3.4,
      orbitRadius: 116,
      orbitSpeed: 0.016,
      phase: 1.5,
      inclination: 0.04,
      tilt: 0.3,
      surface: 4,
      palette: ["#5b1a4a", "#e0568f", "#ffc2a1"],
      glow: "#ff6ec7",
      ring: false,
      note: 329.63,
      moons: Object.keys(DATA.contact.social).map((name) =>
        name === "email" ? "Email" : name
      ),
      satellites: [],
    },
  ];

  return seeds.map((seed) => ({
    ...seed,
    viewDistance: viewDistance(seed.radius, seed.moons.length, seed.ring),
  }));
}
