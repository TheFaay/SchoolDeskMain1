// Feature 10 layout — scoped to the login page only.
// Agreed fonts (Poppins headings, Inter body); the shared root layout.tsx
// stays untouched.
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

export default function LoginLayout({
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
