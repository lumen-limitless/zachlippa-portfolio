"use client";

import { ArrowUpRight, MapPin, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef } from "react";
import CalEmbed from "@/components/cal";
import { DATA } from "@/data/resume";
import type { Body, PostSummary } from "@/data/universe";
import { cn } from "@/lib/utils";

type InfoPanelProps = {
  body: Body;
  index: number;
  total: number;
  activeItem: number | null;
  posts: readonly PostSummary[];
  onClose: () => void;
  onItemHover: (item: number | null) => void;
};

const socials = Object.entries(DATA.contact.social).map(([key, social]) => ({
  key,
  ...social,
}));

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/75 uppercase tracking-wider">
      {children}
    </span>
  );
}

type ItemCardProps = {
  active: boolean;
  accent: string;
  children: ReactNode;
  onHover: (hovered: boolean) => void;
};

/** A content card tied to a moon: hovering it lights the moon, and vice versa. */
function ItemCard({ active, accent, children, onHover }: ItemCardProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [active]);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover only mirrors a highlight onto the matching moon
    <article
      className={cn(
        "rounded-xl border bg-white/[0.03] p-4 transition-colors duration-300",
        active ? "bg-white/[0.07]" : "border-white/10"
      )}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      ref={ref}
      style={active ? { borderColor: accent } : undefined}
    >
      {children}
    </article>
  );
}

function SocialLinks() {
  return (
    <ul className="flex flex-wrap gap-2">
      {socials.map((social) => (
        <li key={social.key}>
          <a
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/80 text-xs transition-colors hover:border-white/40 hover:text-white"
            href={social.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <social.icon className="size-3.5" />
            {social.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

function AboutContent() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Image
          alt={DATA.name}
          className="size-16 rounded-full border border-white/20 object-cover"
          height={64}
          src={DATA.avatarUrl}
          width={64}
        />
        <div>
          <p className="font-semibold text-lg text-white">{DATA.name}</p>
          <a
            className="flex items-center gap-1 text-white/60 text-xs hover:text-white"
            href={DATA.locationLink}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MapPin className="size-3" />
            {DATA.location}
          </a>
        </div>
      </div>
      <p className="whitespace-pre-line text-pretty text-sm text-white/75 leading-relaxed">
        {DATA.summary}
      </p>
      <SocialLinks />
    </div>
  );
}

/** Entries in `resume.tsx` are literal types, so optional fields are checked as plain strings. */
const hasValue = (value: string): boolean => value.length > 0;

type ItemProps = Pick<InfoPanelProps, "activeItem" | "onItemHover"> & {
  accent: string;
};

function ExperienceContent({ activeItem, accent, onItemHover }: ItemProps) {
  return (
    <div className="space-y-3">
      {DATA.work.map((work, index) => (
        <ItemCard
          accent={accent}
          active={activeItem === index}
          key={work.title}
          onHover={(hovered) => onItemHover(hovered ? index : null)}
        >
          <div className="flex items-start gap-3">
            {hasValue(work.logoUrl) ? (
              <Image
                alt={work.company}
                className="size-10 rounded-full border border-white/15 bg-white object-contain"
                height={40}
                src={work.logoUrl}
                width={40}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 font-semibold text-sm text-white"
              >
                {work.company.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {hasValue(work.href) ? (
                <a
                  className="group flex items-center gap-1 font-semibold text-sm text-white"
                  href={work.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {work.title}
                  <ArrowUpRight className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                </a>
              ) : (
                <p className="font-semibold text-sm text-white">{work.title}</p>
              )}
              <p className="text-white/70 text-xs">{work.company}</p>
              <p className="mt-0.5 font-mono text-[10px] text-white/45 uppercase tracking-wider">
                {work.start} to {work.end ?? "Present"} · {work.location}
              </p>
            </div>
          </div>
          <p className="mt-3 text-pretty text-white/70 text-xs leading-relaxed">
            {work.description}
          </p>
          <ul className="mt-3 space-y-2">
            {work.highlights.map((highlight) => (
              <li
                className="flex gap-2 text-pretty text-white/70 text-xs leading-relaxed"
                key={highlight}
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                {highlight}
              </li>
            ))}
          </ul>
        </ItemCard>
      ))}
    </div>
  );
}

function SkillsContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70 leading-relaxed">
        Each light circling the ring is a tool in regular use. Drag to spin the
        planet and read them in orbit.
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {DATA.skills.map((skill, index) => (
          <li
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85"
            key={skill}
          >
            <span className="font-mono text-[10px] text-white/35">
              {String(index + 1).padStart(2, "0")}
            </span>
            {skill}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Project = (typeof DATA.projects)[number];

/** Screenshot or video when one exists; otherwise the headline result. */
function ProjectMedia({
  project,
  accent,
}: {
  project: Project;
  accent: string;
}) {
  if (project.video || project.image) {
    return (
      <a
        className="block overflow-hidden rounded-lg border border-white/10"
        href={project.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {project.video ? (
          <video
            autoPlay
            className="h-36 w-full object-cover object-top"
            loop
            muted
            playsInline
            src={project.video}
          />
        ) : (
          <Image
            alt={project.title}
            className="h-36 w-full object-cover object-top"
            height={300}
            src={project.image}
            width={500}
          />
        )}
      </a>
    );
  }
  if (!project.metric) {
    return null;
  }
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3"
      style={{
        background: `linear-gradient(120deg, ${accent}26, transparent 70%)`,
      }}
    >
      <span className="shrink-0 font-bold text-3xl text-white tracking-tight">
        {project.metric.value}
      </span>
      <span className="text-white/65 text-xs leading-snug">
        {project.metric.label}
      </span>
    </div>
  );
}

function ProjectsContent({ activeItem, accent, onItemHover }: ItemProps) {
  return (
    <div className="space-y-3">
      {DATA.projects.map((project, index) => (
        <ItemCard
          accent={accent}
          active={activeItem === index}
          key={project.title}
          onHover={(hovered) => onItemHover(hovered ? index : null)}
        >
          <ProjectMedia accent={accent} project={project} />
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-sm text-white">
              {project.title}
            </h3>
            <time className="shrink-0 font-mono text-[10px] text-white/45 uppercase tracking-wider">
              {project.dates}
            </time>
          </div>
          {project.description ? (
            <p className="mt-1 text-pretty text-white/70 text-xs leading-relaxed">
              {project.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1">
            {project.org ? (
              <span
                className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{ borderColor: accent, color: accent }}
              >
                {project.closedSource
                  ? `${project.org} · Closed source`
                  : project.org}
              </span>
            ) : null}
            {project.technologies.map((tech) => (
              <Chip key={tech}>{tech}</Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.links.map((link) => (
              <a
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium text-[11px] text-black transition-opacity hover:opacity-80"
                href={link.href}
                key={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.icon}
                {link.type}
              </a>
            ))}
          </div>
        </ItemCard>
      ))}
    </div>
  );
}

function BlogContent({
  activeItem,
  accent,
  onItemHover,
  posts,
}: ItemProps & { posts: readonly PostSummary[] }) {
  return (
    <div className="space-y-3">
      {posts.length === 0 ? (
        <p className="text-sm text-white/60">No transmissions yet.</p>
      ) : null}
      {posts.map((post, index) => (
        <ItemCard
          accent={accent}
          active={activeItem === index}
          key={post.slug}
          onHover={(hovered) => onItemHover(hovered ? index : null)}
        >
          <Link className="group block" href={`/blog/${post.slug}`}>
            <p className="font-mono text-[10px] text-white/45 uppercase tracking-wider">
              {post.publishedAt}
            </p>
            <h3 className="mt-1 flex items-center gap-1 font-semibold text-sm text-white">
              {post.title}
              <ArrowUpRight className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
            </h3>
            {post.summary ? (
              <p className="mt-1 text-white/70 text-xs leading-relaxed">
                {post.summary}
              </p>
            ) : null}
          </Link>
        </ItemCard>
      ))}
      <Link
        className="inline-flex items-center gap-1 text-white/70 text-xs underline-offset-4 hover:text-white hover:underline"
        href="/blog"
      >
        Open the full archive
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
}

function ContactContent() {
  return (
    <div className="space-y-5">
      <p className="text-pretty text-sm text-white/75 leading-relaxed">
        Want to chat? Send a message to{" "}
        <a
          className="text-white underline underline-offset-4"
          href={`mailto:${DATA.contact.email}`}
        >
          {DATA.contact.email}
        </a>
        , or book fifteen minutes on my calendar.
      </p>
      <CalEmbed />
      <SocialLinks />
    </div>
  );
}

export function InfoPanel({
  body,
  index,
  total,
  activeItem,
  posts,
  onClose,
  onItemHover,
}: InfoPanelProps) {
  const itemProps = { activeItem, accent: body.glow, onItemHover };

  return (
    <section
      aria-label={body.name}
      className="pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl"
      style={{ boxShadow: `0 0 60px -20px ${body.glow}` }}
    >
      <header className="relative shrink-0 border-white/10 border-b px-5 pt-4 pb-4">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${body.glow}, transparent)`,
          }}
        />
        <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.3em]">
          World {String(index + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")} · {body.codename}
        </p>
        <h2 className="mt-1 font-bold text-2xl text-white tracking-tight">
          {body.name}
        </h2>
        <p className="text-white/60 text-xs">{body.tagline}</p>
        <button
          aria-label="Return to overview"
          className="absolute top-3 right-3 rounded-full border border-white/10 p-1.5 text-white/60 transition-colors hover:border-white/40 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {body.id === "core" ? <AboutContent /> : null}
        {body.id === "experience" ? <ExperienceContent {...itemProps} /> : null}
        {body.id === "skills" ? <SkillsContent /> : null}
        {body.id === "projects" ? <ProjectsContent {...itemProps} /> : null}
        {body.id === "transmissions" ? (
          <BlogContent {...itemProps} posts={posts} />
        ) : null}
        {body.id === "contact" ? <ContactContent /> : null}
      </div>
    </section>
  );
}
