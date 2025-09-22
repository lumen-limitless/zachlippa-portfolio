# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server at localhost:3000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Package Management
This project uses pnpm but also supports npm. Use `pnpm install` or `npm install` for installing dependencies.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS with custom theme configuration
- **UI Components**: shadcn/ui and Magic UI components
- **Content**: MDX for blog posts with syntax highlighting via rehype-pretty-code and shiki
- **Animation**: Framer Motion for page transitions and effects
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

### Key Configuration Files
- `next.config.mjs` - Next.js config with TypeScript/ESLint error ignoring enabled
- `tailwind.config.ts` - Extended Tailwind configuration with custom colors, animations, typography plugin
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
- Animation components use Framer Motion with BlurFade effects
- MDX components handle blog post rendering with syntax highlighting

### Blog System
Blog posts are stored as MDX files in `/content/` and processed using:
- gray-matter for frontmatter parsing
- remark/rehype pipeline for markdown processing
- Dynamic routing via `[slug]` parameter