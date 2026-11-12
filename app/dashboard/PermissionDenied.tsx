// Feature 10: exactly the message a wrong-role visitor must see, shared by
// every gated page so the wording never drifts. Shows a "Back to my
// dashboard" button that sends the visitor to their own role's page.

import Link from "next/link";

import { roleHomePath } from "@/lib/auth/roleHome";
import { getCurrentUser } from "@/lib/auth/session";

export default async function PermissionDenied() {
  const user = await getCurrentUser();
  const href = user ? roleHomePath(user.role) : "/login";

  return (
    <div
      role="alert"
      className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center"
    >
      <p className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-red-800">
        Access denied
      </p>
      <p className="mt-2 text-sm text-red-700">
        You do not have permission to open this page.
      </p>
      <Link
        href={href}
        className="mt-5 inline-block rounded-xl bg-[#12264F] px-5 py-3 text-sm font-semibold text-white shadow-sm active:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-[#C9A227]"
      >
        Back to my dashboard
      </Link>
    </div>
  );
}
