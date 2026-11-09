import { MetadataRoute } from "next";

const baseUrl = "https://petterikosonen.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-11-09T13:11:54+02:00"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-05-28T11:46:40+03:00"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date("2026-03-23T16:23:12+02:00"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date("2026-06-16T16:30:38+03:00"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: new Date("2026-06-03T16:07:30+03:00"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/labs`,
      lastModified: new Date("2026-06-03T16:46:06+03:00"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/labs/llm`,
      lastModified: new Date("2026-06-03T16:46:06+03:00"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/labs/security`,
      lastModified: new Date("2026-06-03T16:46:06+03:00"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-06-29T02:03:28+03:00"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kuu`,
      lastModified: new Date("2026-03-23T21:06:19+02:00"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
