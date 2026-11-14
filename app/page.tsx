import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#806200]">SchoolDesk</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-[#12264F] sm:text-5xl">
        A clearer school day starts here.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
        SchoolDesk brings school updates, attendance, fees and results together for families and staff.
      </p>
      <div className="mt-8">
        <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#12264F] px-6 py-3 font-semibold text-white hover:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]">
          Sign in
        </Link>
      </div>
    </main>
  );
}
