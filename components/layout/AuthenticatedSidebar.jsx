"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

export default function AuthenticatedSidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isTeamsOpen, setTeamsOpen] = useState(false);

  useEffect(() => {
    setDashboardOpen(pathname.startsWith("/dashboard"));
    setTeamsOpen(pathname.startsWith("/teams"));
  }, [pathname]);

  if (!user) return null;

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", exact: true },
    { href: "/teams", label: "Teams" },
    { href: `/${user.username}`, label: "Profile" },
  ];

  const dashboardSubLinks = [
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/styles", label: "Styles/Sports" },
    { href: "/dashboard/matches", label: "Match Reports" },
    { href: "/dashboard/scouting", label: "Scouting Reports" },
    { href: "/dashboard/family", label: "Family" },
  ];

  const teamSubLinks = [
    { href: "/teams", label: "My Teams" },
    { href: "/teams/new", label: "Create Team" },
  ];

  return (
    <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-between py-8 px-6">
      <nav className="space-y-4">
        {mainLinks.map((link) => (
          <div key={link.href}>
            <Link
              href={link.href}
              onClick={() => {
                if (link.href === "/dashboard") {
                  setDashboardOpen(!isDashboardOpen);
                }
                if (link.href === "/teams") {
                  setTeamsOpen(!isTeamsOpen);
                }
              }}
              className={cn(
                "block text-lg font-medium hover:text-ms-light-red transition",
                pathname === link.href && "text-ms-light-red"
              )}
            >
              {link.label}
            </Link>

            {/* Dashboard submenu */}
            {link.href === "/dashboard" && isDashboardOpen && (
              <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {dashboardSubLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "block hover:text-white transition",
                      pathname === sub.href && "text-white font-semibold"
                    )}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Teams submenu */}
            {link.href === "/teams" && isTeamsOpen && (
              <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {teamSubLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "block hover:text-white transition",
                      pathname === sub.href && "text-white font-semibold"
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
        <Link
          href="/logout"
          className="text-red-400 hover:text-white"
        >
          Logout
        </Link>
      </div>
    </aside>
  );
}
