const portalOrigin = import.meta.env.PUBLIC_PORTAL_URL?.trim().replace(/\/+$/, "");
const siteOrigin = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

if (import.meta.env.PROD && !portalOrigin) {
  throw new Error("Set PUBLIC_PORTAL_URL to the deployed portal origin before building the public website.");
}

if (import.meta.env.PROD && !siteOrigin) {
  throw new Error("Set PUBLIC_SITE_URL to the deployed public website origin before building the public website.");
}

export const portalBaseUrl = portalOrigin || "http://localhost:3000";
export const applicationUrl = new URL("/admissions", portalBaseUrl).toString();
export const parentLoginUrl = new URL("/login", portalBaseUrl).toString();
