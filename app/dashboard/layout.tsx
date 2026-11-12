// Feature 10 layout — scoped to the dashboard pages.
// Shared navy header with a sign-out button (students of the role demo
// need to switch accounts), plus the agreed fonts so the shared root
// layout.tsx stays untouched.
import { Inter, Poppins } from "next/font/google";

import SignOutButton from "./SignOutButton";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${poppins.variable} min-h-dvh bg-white font-[family-name:var(--font-inter)] text-slate-900`}
    >
      <header className="bg-[#12264F]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#C9A227]">
              School portal
            </p>
            <p className="font-[family-name:var(--font-poppins)] text-sm font-semibold text-white sm:text-base">
              Crown Heights Academy
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
