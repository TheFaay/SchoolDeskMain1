"use client";

// Feature 10: sign out from any dashboard page, then go back to /login.
// Useful in the demo for switching between the four role accounts.

import { createAuthClient } from "better-auth/react";
import { useState } from "react";

const authClient = createAuthClient();

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await authClient.signOut();
    // Full page load to /login so no trace of the previous user stays on
    // screen (router state included).
    window.location.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10 active:bg-white/15 disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
