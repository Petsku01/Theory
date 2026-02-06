import { blogPosts } from "@/lib/data";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = "https://petterikosonen.com";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Petteri Kosonen - Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Notes and write-ups on security and development</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${blogPosts.map(post => `
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
