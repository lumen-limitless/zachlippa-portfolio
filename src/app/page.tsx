import Link from "next/link";
import { Universe } from "@/components/universe/universe";
import { getBlogPosts } from "@/data/blog";
import { DATA } from "@/data/resume";
import type { PostSummary } from "@/data/universe";

export default async function Page() {
  const allPosts = await getBlogPosts();
  const posts: PostSummary[] = allPosts
    .map((post) => ({
      slug: post.slug,
      title: String(post.metadata.title ?? post.slug),
      publishedAt: String(post.metadata.publishedAt ?? ""),
      summary: String(post.metadata.summary ?? ""),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <main>
      {/* Server-rendered copy of the content for search engines and screen
          readers; the 3D experience below presents the same information. */}
      <div className="sr-only">
        <h1>{DATA.name}</h1>
        <p>{DATA.description}</p>
        <p>
          This page is an interactive 3D experience. A text version is available
          in the <Link href="/classic">classic view</Link>.
        </p>
        <h2>About</h2>
        <p>{DATA.summary}</p>
        <h2>Work Experience</h2>
        {DATA.work.map((work) => (
          <article key={work.company}>
            <h3>
              {work.title}, {work.company}
            </h3>
            <p>
              {work.start} to {work.end ?? "Present"}, {work.location}
            </p>
            <p>{work.description}</p>
          </article>
        ))}
        <h2>Skills</h2>
        <ul>
          {DATA.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
        <h2>Projects</h2>
        {DATA.projects.map((project) => (
          <article key={project.title}>
            <h3>
              <a href={project.href}>{project.title}</a>
            </h3>
            <p>{project.dates}</p>
            <p>{project.description}</p>
            <p>{project.technologies.join(", ")}</p>
          </article>
        ))}
        <h2>Blog</h2>
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
        <h2>Contact</h2>
        <a href={`mailto:${DATA.contact.email}`}>{DATA.contact.email}</a>
      </div>
      <Universe posts={posts} />
    </main>
  );
}
