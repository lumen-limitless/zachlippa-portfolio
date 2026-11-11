# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server at localhost:3000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run Ultracite (Biome) checks
- `npm run typecheck` - Type-check with `tsc --noEmit` (the build also fails on type errors)

### Package Management
This project uses pnpm but also supports npm. Use `pnpm install` or `npm install` for installing dependencies.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 with App Router, React 19, TypeScript 7
- **Styling**: Tailwind CSS 4, configured in CSS (`src/app/globals.css`), with tw-animate-css and the typography plugin
- **UI Components**: shadcn/ui and Magic UI components
- **Content**: MDX for blog posts with syntax highlighting via rehype-pretty-code and shiki
- **Animation**: Motion (`motion/react`) for page transitions and effects
- **3D**: three.js via @react-three/fiber, drei and postprocessing for the universe home page
- **Audio**: Procedural Web Audio soundscape (no audio assets)
- **Analytics**: Vercel Analytics integration
- **Calendar**: Cal.com embed for booking functionality

### Project Structure
- `/src/app/` - Next.js app router pages (page.tsx, layout.tsx, blog routes)
- `/src/components/` - Reusable components including UI library components
  - `/ui/` - shadcn/ui base components (button, card, badge, etc.)
  - `/magicui/` - Custom animation components (blur-fade, dock)
- `/src/data/` - Data configuration files
  - `resume.tsx` - Main portfolio data (personal info, work, skills, projects)
  - `blog.ts` - Blog post processing utilities
- `/content/` - MDX blog posts
- `/public/` - Static assets (images, avatars)

### Universe Home Page
The home page (`/`) is an interactive 3D solar system; the original scrolling page lives at `/classic`.
- `src/app/page.tsx` - Server component: renders screen-reader/SEO content and mounts the universe
- `src/app/(site)/` - Route group for the classic page and blog (constrained layout + dock navbar)
- `src/data/universe.ts` - Maps `resume.tsx` content onto celestial bodies (orbit, palette, note, moons). Add or restyle a world here
- `src/components/universe/` - `universe.tsx` (state, keyboard, HUD wiring), `scene.tsx` (canvas, camera rig, post-processing), `bodies.tsx` (sun, planets, moons, labels), `environment.tsx` (stars, nebula, asteroid belt, comets), `shaders.ts` (GLSL), `hud.tsx` and `info-panel.tsx` (DOM overlay)
- `src/lib/soundscape.ts` - Web Audio engine; must be started from a user gesture
- Each moon corresponds to one content item, so adding a work entry, project or blog post adds a moon automatically
- The scene is loaded client-only (`next/dynamic`, `ssr: false`); devices without WebGL are redirected to `/classic`

### Key Configuration Files
- `next.config.ts` - Next.js config. Type errors fail the build; do not re-enable `ignoreBuildErrors`
- `src/app/globals.css` - Tailwind 4 theme (`@theme inline`), dark variant, plugins and code block styles. There is no `tailwind.config` file
- `components.json` - shadcn/ui component configuration

### Data Architecture
The portfolio is data-driven through a single configuration file (`/src/data/resume.tsx`) containing:
- Personal information (name, avatar, location, description)
- Navigation items
- Social links configuration
- Work experience entries
- Skills array
- Projects and hackathon data structures

All portfolio content updates should be made in the resume.tsx file rather than modifying individual components.

### Component Patterns
- Components use TypeScript with strict mode enabled
- UI components follow shadcn/ui patterns with cn() utility for className merging
- Animation components use Motion with BlurFade effects
- MDX components handle blog post rendering with syntax highlighting

### Blog System
Blog posts are stored as MDX files in `/content/` and processed using:
- gray-matter for frontmatter parsing
- remark/rehype pipeline for markdown processing
- Dynamic routing via `[slug]` parameter