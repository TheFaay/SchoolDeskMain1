import { config as loadEnvFile } from "dotenv";

import { defineConfig } from "drizzle-kit";

// Neon writes branch values to .env.local; load it before the .env fallback.
loadEnvFile({ path: ".env.local" });
loadEnvFile({ path: ".env" });

const directDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL_DIRECT;

if (!directDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not set. Add the direct Neon URL to your .env.local file.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: directDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
