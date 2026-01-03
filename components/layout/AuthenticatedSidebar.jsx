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
  Wrench,
  Settings,
  Gauge,
  FileBarChart2,
  BarChart3,
  MessageSquare,
  BookOpen,
  HelpCircle,
  UsersRound,
} from "lucide-react";
import Spinner from "@/components/shared/Spinner";

const AuthenticatedSidebar = () => {
  const { user, loading } = useUser();
  const pathname = usePathname();

  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isTeamsOpen, setTeamsOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    setDashboardOpen(pathname.startsWith("/dashboard"));
    setTeamsOpen(pathname.startsWith("/teams"));
    setAdminOpen(pathname === "/admin" || pathname.startsWith("/admin/"));
  }, [pathname]);

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col justify-center items-center py-8 px-6">
        <Spinner size={32} />
      </aside>
    );
  }

  if (!user) return null;

  const isAdmin =
    !!user &&
    (user.isAdmin === true ||
      user.role === "admin" ||
      user.roles?.includes?.("admin"));

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

  const adminSubLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <Gauge size={16} /> },
    { href: "/admin/users", label: "Users", icon: <UsersIcon size={16} /> },
    {
      href: "/admin/family-members",
      label: "Family Members",
      icon: <UsersRound size={16} />,
    },
    { href: "/admin/teams", label: "Teams", icon: <UsersIcon size={16} /> },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: <FileBarChart2 size={16} />,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: <Settings size={16} />,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: <BarChart3 size={16} />,
    },
    {
      href: "/admin/messages",
      label: "Messages",
      icon: <MessageSquare size={16} />,
    },
    {
      href: "/admin/techniques",
      label: "Techniques",
      icon: <BookOpen size={16} />,
    },
    { href: "/admin/faqs", label: "FAQs", icon: <HelpCircle size={16} /> },
    {
      href: "/admin/maintenance",
      label: "Maintenance",
      icon: <Wrench size={16} />,
    },
  ];

  const isMainActive = (href) => {
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    if (href === "/teams") return pathname.startsWith("/teams");
    if (href === "/admin")
      return pathname === "/admin" || pathname.startsWith("/admin/");
    return pathname === href;
  };

  return (
    <aside className="hidden md:flex w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex-col">
      {/* (A) Scroll area */}
      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-8 px-6 pb-28 space-y-4">
        {/* Profile (moved to top) */}
        <Link
          href={`/${user.username}`}
          className={cn(
            "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
            pathname === `/${user.username}` &&
              "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
          )}
        >
          <UserIcon size={18} />
          Profile
        </Link>

        {/* Dashboard */}
        <div>
          <Link
            href="/dashboard"
            onClick={(e) => {
              if (pathname.startsWith("/dashboard")) {
                e.preventDefault();
                setDashboardOpen((s) => !s);
              }
            }}
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
            onClick={(e) => {
              if (pathname.startsWith("/teams")) {
                e.preventDefault();
                setTeamsOpen((s) => !s);
              }
            }}
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

        {/* Admin */}
        {(isAdmin || pathname.startsWith("/admin")) && (
          <div>
            <Link
              href="/admin/dashboard"
              onClick={(e) => {
                if (pathname === "/admin" || pathname.startsWith("/admin/")) {
                  e.preventDefault();
                  setAdminOpen((s) => !s);
                }
              }}
              className={cn(
                "flex items-center gap-2 text-lg font-medium px-2 py-2 rounded-md transition hover:text-ms-light-red hover:bg-[hsl(222_47%_20%)]",
                isMainActive("/admin") &&
                  "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold border-l-4 border-[var(--ms-light-red)]"
              )}
            >
              <Shield size={18} />
              Admin Panel
            </Link>

            {isAdminOpen && (
              <div className="pl-6 mt-2 space-y-2 text-sm text-ms-blue-gray">
                {adminSubLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md transition hover:bg-[hsl(222_47%_20%)] hover:text-white",
                      (pathname === sub.href ||
                        pathname.startsWith(sub.href + "/")) &&
                        "bg-[hsl(222_47%_25%)] text-white font-semibold border-l-4 border-[var(--ms-light-red)]"
                    )}
                  >
                    {sub.icon}
                    <span>{sub.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default AuthenticatedSidebar;
