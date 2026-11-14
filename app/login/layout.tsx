// Feature 10 layout — scoped to the login page only.
// Root layout provides the shared Poppins headings and Inter body fonts.
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-dvh bg-white font-[family-name:var(--font-inter)] text-slate-900"
    >
      {children}
    </div>
  );
}
