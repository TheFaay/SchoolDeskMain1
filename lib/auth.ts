// Feature 10: the single Better Auth instance for the whole app.
// Database: our shared Postgres (Neon) with the four Better Auth tables
// from migration 0001 (user, session, account, verification).
// Roles live on the extra `role` column of `user` (parent/teacher/bursar/admin).

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";

import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: true,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      after(async () => {
        try {
          const { sendEmail } = await import("@/lib/email/send");
          await sendEmail({ to: user.email, subject: "Reset your Crown Heights Academy password", text: `Use this secure link to reset your password. It expires shortly.\n\n${url}\n\nIf you did not request this, ignore this email.` });
        } catch {
          // Keep reset requests generic and avoid logging personal reset links.
        }
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendEmail } = await import("@/lib/email/send");
      await sendEmail({
        to: user.email,
        subject: "Verify your Crown Heights Academy applicant account",
        text: `Verify your email address to sign in to the admissions portal. This link expires in one hour.\n\n${url}\n\nIf you did not create this account, you can ignore this email.`,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "applicant",
        input: false,
      },
    },
  },
  // Lets Better Auth set/clear cookies inside Next.js server actions.
  plugins: [nextCookies()],
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};
