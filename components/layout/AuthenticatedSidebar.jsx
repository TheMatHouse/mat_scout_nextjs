"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, User, Shield } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function AuthenticatedSidebar() {
  const { user, loading } = useUser();
  const pathname = usePathname();

  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isTeamsOpen, setTeamsOpen] = useState(false);

  useEffect(() => {
    setDashboardOpen(pathname.startsWith("/dashboard"));
    setTeamsOpen(pathname.startsWith("/teams"));
  }, [pathname]);

  // While user context is loading, keep a stable sidebar with a spinner
  if (loading) {
    return (
      <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-center items-center py-8 px-6">
        <Spinner size={32} />
      </aside>
    );
  }

  if (!user) return null;

  const mainLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    { href: "/teams", label: "Teams", icon: <Users size={18} /> },
    { href: `/${user.username}`, label: "Profile", icon: <User size={18} /> },
  ];

  const dashboardSubLinks = [
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/styles", label: "Styles/Sports" },
    { href: "/dashboard/matches", label: "Match Reports" },
    { href: "/dashboard/scouting", label: "Scouting Reports" },
    { href: "/dashboard/family", label: "Family" },
  ];

  // ✅ New Teams IA
  const teamSubLinks = [
    { href: "/teams/mine", label: "My Teams" },
    { href: "/teams/find", label: "Find Teams" },
    { href: "/teams/new", label: "Create Team" }, // keep /teams/new since it already exists
  ];

  // Highlight logic for main links: active if you're anywhere under that section
  const isMainActive = (href) => {
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    if (href === "/teams") return pathname.startsWith("/teams");
    return pathname === href;
  };

  return (
    <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-between py-8 px-6">
      <nav className="space-y-4">
        {mainLinks.map((link) => (
          <div key={link.href}>
            {/* Main link */}
            <Link
              href={link.href}
              onClick={() => {
                if (link.href === "/dashboard")
                  setDashboardOpen(!isDashboardOpen);
                if (link.href === "/teams") setTeamsOpen(!isTeamsOpen);
              }}
              className={cn(
                "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
                isMainActive(link.href) &&
                  "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
              )}
            >
              {link.icon}
              {link.label}
            </Link>

            {/* Dashboard submenu */}
            {link.href === "/dashboard" && isDashboardOpen && (
              <div className="pl-6 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {dashboardSubLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "block px-2 py-1 rounded-md transition hover:bg-[hsl(222_47%_20%)] hover:text-white",
                      pathname === sub.href &&
                        "bg-[hsl(222_47%_25%)] text-white font-semibold border-l-4 border-[var(--ms-light-red)]"
                    )}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Teams submenu */}
            {link.href === "/teams" && isTeamsOpen && (
              <div className="pl-6 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {teamSubLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "block px-2 py-1 rounded-md transition hover:bg-[hsl(222_47%_20%)] hover:text-white",
                      pathname === sub.href &&
                        "bg-[hsl(222_47%_25%)] text-white font-semibold border-l-4 border-[var(--ms-light-red)]"
                    )}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Admin link for admins only */}
        {user?.isAdmin && (
          <div className="mt-6">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
                pathname.startsWith("/admin") &&
                  "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
              )}
            >
              <Shield size={18} />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
