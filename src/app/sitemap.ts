import { getBlogPosts } from '@/data/blog';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getBlogPosts();

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `https://zachlippa.dev/blog/${post.slug}`,
    lastModified: new Date(post.metadata.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: 'https://zachlippa.dev',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://zachlippa.dev/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogEntries,
  ];
}
