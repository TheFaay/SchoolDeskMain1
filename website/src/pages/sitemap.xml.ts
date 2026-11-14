const paths = ["/", "/about/", "/platform/", "/admissions/", "/news/", "/contact/"];
const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

export function GET() {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!siteUrl) return new Response("PUBLIC_SITE_URL is required to generate the sitemap", { status: 500 });
  const urls = paths.map((path) => `<url><loc>${escapeXml(new URL(path, `${siteUrl}/`).toString())}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
