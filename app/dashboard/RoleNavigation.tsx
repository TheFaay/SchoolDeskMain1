"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/db/schema";

const roleLinks: Record<Role, { label: string; href: string }[]> = {
  parent: [
    { label: "Home", href: "/dashboard" },
    { label: "Attendance", href: "/dashboard/attendance" },
    { label: "Results", href: "/dashboard/academics/results" },
    { label: "Fees", href: "/fees" },
    { label: "Receipts", href: "/fees/receipts" },
  ],
  teacher: [
    { label: "Home", href: "/dashboard/teacher" },
    { label: "Score entry", href: "/dashboard/teacher/scores" },
    { label: "Attendance", href: "/dashboard/teacher/attendance" },
  ],
  bursar: [
    { label: "Home", href: "/dashboard/bursar" },
    { label: "Debtor export", href: "/dashboard/bursar/export?type=debtors&term=first" },
  ],
  admin: [
    { label: "Admin home", href: "/dashboard/admin" },
    { label: "School setup", href: "/dashboard/admin/manage" },
    { label: "Admissions", href: "/dashboard/admin/admissions" },
    { label: "Calendar", href: "/dashboard/admin/settings" },
    { label: "Finance", href: "/fees" },
    { label: "Parent view", href: "/dashboard" },
  ],
  applicant: [{ label: "Admissions account", href: "/admissions/account" }],
};

export default function RoleNavigation({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = roleLinks[role];

  return (
    <nav aria-label={`${role} dashboard`} className="mx-auto max-w-7xl px-4 pb-3 pt-2 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {links.map((item) => {
          const itemPath = item.href.split("?", 1)[0];
          const isHome = item.label === "Home" || item.label === "Admin home" || item.label === "Parent view";
          const active = isHome
            ? pathname === itemPath
            : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] ${active ? "border-[#12264F] bg-[#12264F] text-white" : "border-slate-200 bg-white text-[#12264F] hover:border-[#C9A227] hover:bg-slate-50"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
