import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/landing`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/oportunidades`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/mercado`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/aprende`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/metodologia`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Dynamic property routes — fetch first page, then all remaining pages
  try {
    const firstPage = await api.properties.list({ page: 1, page_size: 100 });
    const totalPages = firstPage.total_pages;

    const allItems = [...firstPage.items];

    if (totalPages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.properties.list({ page: i + 2, page_size: 100 })
        )
      );
      remainingPages.forEach((p) => allItems.push(...p.items));
    }

    const propertyRoutes: MetadataRoute.Sitemap = allItems.map((p) => ({
      url: `${siteUrl}/properties/${p.id}`,
      lastModified: new Date(p.last_seen_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    return [...staticRoutes, ...propertyRoutes];
  } catch {
    // If the backend is down during build, return only static routes
    return staticRoutes;
  }
}
