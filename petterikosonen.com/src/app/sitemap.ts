import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/projects", "/blog", "/research", "/contact", "/kuu", "/labs", "/labs/security", "/labs/llm"].map((path) => ({
    url: `https://petterikosonen.com${path}`,
    changeFrequency: path === "/blog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
