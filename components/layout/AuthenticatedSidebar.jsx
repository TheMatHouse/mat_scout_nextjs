// components/layout/AuthenticatedSidebar.jsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

export default function AuthenticatedSidebar({ username }) {
  console.log(username);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardView = searchParams.get("v") || "settings";
  const [isDashboardOpen, setDashboardOpen] = useState(
    pathname === "/dashboard"
  );

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", exact: true },
    { href: `/${username}`, label: "Profile" },
  ];

  const dashboardSubLinks = [
    { v: "settings", label: "Settings" },
    { v: "styles", label: "Styles/Sports" },
    { v: "matches", label: "Match Reports" },
    { v: "family", label: "Family" },
    { v: "scouting", label: "Scouting Reports" },
  ];

  return (
    <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-between py-8 px-6">
      <nav className="space-y-4">
        {mainLinks.map((link) => (
          <div key={link.href}>
            <Link
              href={link.href}
              onClick={() => {
                if (link.href === "/dashboard")
                  setDashboardOpen(!isDashboardOpen);
              }}
              className={cn(
                "block text-lg font-medium hover:text-ms-light-red transition",
                pathname === link.href && "text-ms-light-red"
              )}
            >
              {link.label}
            </Link>
            {link.href === "/dashboard" && isDashboardOpen && (
              <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {dashboardSubLinks.map((sub) => (
                  <Link
                    key={sub.v}
                    href={`/dashboard?v=${sub.v}`}
                    className={cn(
                      "block hover:text-ms-light-red",
                      dashboardView === sub.v &&
                        "text-ms-light-red font-semibold"
                    )}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="space-y-2 text-sm text-ms-blue-gray">
        <Link href="/contact">Contact</Link>
        <Link href="/social">Social</Link>
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
