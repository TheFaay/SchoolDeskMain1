export function GET() {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const sitemap = siteUrl ? `Sitemap: ${new URL("/sitemap.xml", `${siteUrl}/`).toString()}\n` : "";
  return new Response(`User-agent: *\nAllow: /\n${sitemap}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
