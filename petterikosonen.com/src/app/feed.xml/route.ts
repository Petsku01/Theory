import { blogPosts, researchPosts } from "@/lib/data";

function escapeXml(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars except \t \n \r
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = "https://petterikosonen.com";

  // Combine blog posts and research entries, newest first
  const allPosts = [...blogPosts, ...researchPosts].sort(
    (a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0)
  );

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Petteri Kosonen - Blog &amp; Research</title>
    <link>${baseUrl}</link>
    <description>Commentary, research, and analysis on AI, security, and infrastructure</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${allPosts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(post.link)}</link>
      <description>${escapeXml(post.desc)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${escapeXml(post.link)}</guid>
    </item>`).join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
