// Feature 4 layout — scoped to the results pages only.
// Loads the agreed fonts (Poppins headings, Inter body) so the shared root
// layout.tsx does not need to change. If the team later adds dashboard-wide
// fonts, delete this file.
import { Inter, Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${poppins.variable} min-h-dvh bg-white font-[family-name:var(--font-inter)] text-slate-900`}
    >
      {children}
    </div>
  );
}
