# Crown Heights Academy public website

This is the public, static Astro site for Crown Heights Academy. It includes school information, admissions, news, and a SchoolDesk platform overview. The working SchoolDesk portal remains a separate Next.js app and deployment.

## Local development

```powershell
cd website
npm.cmd ci
$env:PUBLIC_PORTAL_URL = "http://localhost:3000"
$env:PUBLIC_SITE_URL = "http://localhost:4321"
npm.cmd run dev
```

Set `PUBLIC_PORTAL_URL` to the locally running portal so **Apply now** and **Parent login** open the correct app. Public pages describe JSS 1 to SS 3, the ₦80,000 online application fee, and the 2027/2028 session; the school office confirms assessment arrangements with each applicant. School phone, email, full address, map and social links are optional and omitted until verified. `/platform` describes SchoolDesk features currently in the portal.

## Production deployment on Vercel

Create a separate Vercel project for this site and set **Root Directory** to `website`. Use `npm run build` as the build command and `dist` as the output directory. Install with `npm install` (Vercel) or `npm ci`.

Configure these project environment variables for Production and Preview:

- `PUBLIC_SITE_URL`: the canonical origin of this website (for example `https://www.school-domain.example`). Used for canonical and Open Graph URLs, `sitemap.xml`, and `robots.txt`.
- `PUBLIC_PORTAL_URL`: the deployed Next.js portal origin, with no route suffix. The public links append `/admissions` and `/login`.
- Optional verified public information: `PUBLIC_SCHOOL_PHONE`, `PUBLIC_SCHOOL_EMAIL`, `PUBLIC_SCHOOL_ADDRESS`, `PUBLIC_SCHOOL_MAP_URL`, `PUBLIC_SOCIAL_INSTAGRAM`, `PUBLIC_SOCIAL_FACEBOOK`, and `PUBLIC_SOCIAL_X`.

Both site and portal URLs are required for production builds so the deployed calls to action cannot silently point to localhost. Review the generated sitemap and test application/login destinations after setting the real domains.

## Content

Add Markdown notices under `src/content/news/` with `title`, `summary`, `pubDate`, and `tag` frontmatter. The homepage and `/news` read from this collection.
