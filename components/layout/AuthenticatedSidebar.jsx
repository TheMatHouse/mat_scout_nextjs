// components/layout/AuthenticatedSidebar.jsx
"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users as UsersIcon,
  User as UserIcon,
  Shield,
  HelpCircle, // <-- added
} from "lucide-react";
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

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-center items-center py-8 px-6">
        <Spinner size={32} />
      </aside>
    );
  }

  if (!user) return null;

  const dashboardSubLinks = [
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/settings/bio", label: "Bio" },
    { href: "/dashboard/styles", label: "Styles/Sports" },
    { href: "/dashboard/matches", label: "Match Reports" },
    { href: "/dashboard/scouting", label: "Scouting Reports" },
    { href: "/dashboard/coach-notes", label: "Coach's Notes" },
    { href: "/dashboard/family", label: "Family" },
  ];

  const teamSubLinks = [
    { href: "/teams/mine", label: "My Teams" },
    { href: "/teams/find", label: "Find Teams" },
    { href: "/teams/new", label: "Create Team" },
  ];

  const isMainActive = (href) => {
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    if (href === "/teams") return pathname.startsWith("/teams");
    return pathname === href;
  };

  return (
    <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-between py-8 px-6">
      <nav className="space-y-4">
        {/* Dashboard */}
        <div>
          <Link
            href="/dashboard"
            onClick={() => setDashboardOpen(!isDashboardOpen)}
            className={cn(
              "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
              isMainActive("/dashboard") &&
                "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
            )}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          {isDashboardOpen && (
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
        </div>

        {/* Teams */}
        <div>
          <Link
            href="/teams"
            onClick={() => setTeamsOpen(!isTeamsOpen)}
            className={cn(
              "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
              isMainActive("/teams") &&
                "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
            )}
          >
            <UsersIcon size={18} />
            Teams
          </Link>

          {isTeamsOpen && (
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

        {/* Users — RIGHT AFTER Teams */}
        <div>
          <Link
            href="/users"
            className={cn(
              "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
              isMainActive("/users") &&
                "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
            )}
          >
            <UsersIcon size={18} />
            Users
          </Link>
        </div>

        {/* Profile */}
        <div>
          <Link
            href={`/${user.username}`}
            className={cn(
              "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
              isMainActive(`/${user.username}`) &&
                "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
            )}
          >
            <UserIcon size={18} />
            Profile
          </Link>
        </div>

        {/* Admin link for admins only */}
        {user?.isAdmin && (
          <div className="mt-6 space-y-2">
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
