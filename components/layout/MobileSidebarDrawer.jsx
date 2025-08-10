"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "../shared/theme-toggle";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default function MobileSidebarDrawer({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, loading } = useUser();

  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isTeamsOpen, setTeamsOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    setDashboardOpen(pathname.startsWith("/dashboard"));
    setTeamsOpen(pathname.startsWith("/teams"));
    setAdminOpen(pathname.startsWith("/admin"));
  }, [pathname]);

  if (loading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity duration-300",
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      )}
      onClick={onClose}
    >
      <aside
        className="absolute top-0 left-0 w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white shadow-lg p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {user ? (
          <>
            <nav className="space-y-4">
              {/* Dashboard */}
              <button
                onClick={() => setDashboardOpen(!isDashboardOpen)}
                className={cn(
                  "block w-full text-left text-lg font-medium hover:text-ms-light-red transition",
                  pathname.startsWith("/dashboard") && "text-ms-light-red"
                )}
              >
                Dashboard
              </button>
              {isDashboardOpen && (
                <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                  {[
                    { href: "/dashboard/settings", label: "Settings" },
                    { href: "/dashboard/styles", label: "Styles/Sports" },
                    { href: "/dashboard/matches", label: "Match Reports" },
                    { href: "/dashboard/scouting", label: "Scouting Reports" },
                    { href: "/dashboard/family", label: "Family" },
                  ].map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onClose}
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

              {/* Teams */}
              <button
                onClick={() => setTeamsOpen(!isTeamsOpen)}
                className={cn(
                  "block w-full text-left text-lg font-medium hover:text-ms-light-red transition",
                  pathname.startsWith("/teams") && "text-ms-light-red"
                )}
              >
                Teams
              </button>
              {isTeamsOpen && (
                <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                  <Link
                    href="/teams"
                    onClick={onClose}
                    className={cn(
                      "block hover:text-white transition",
                      pathname === "/teams" && "text-white font-semibold"
                    )}
                  >
                    My Teams
                  </Link>
                  <Link
                    href="/teams/new"
                    onClick={onClose}
                    className={cn(
                      "block hover:text-white transition",
                      pathname === "/teams/new" && "text-white font-semibold"
                    )}
                  >
                    Create Team
                  </Link>
                </div>
              )}

              {/* Profile */}
              <Link
                href={`/${user.username}`}
                onClick={onClose}
                className={cn(
                  "block text-lg font-medium hover:text-ms-light-red transition",
                  pathname === `/${user.username}` && "text-ms-light-red"
                )}
              >
                Profile
              </Link>

              {/* Admin (only for admins) */}
              {user?.isAdmin && (
                <>
                  <button
                    onClick={() => setAdminOpen(!isAdminOpen)}
                    className={cn(
                      "block w-full text-left text-lg font-medium hover:text-ms-light-red transition mt-2",
                      pathname.startsWith("/admin") && "text-ms-light-red"
                    )}
                  >
                    Admin
                  </button>
                  {isAdminOpen && (
                    <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                      {ADMIN_LINKS.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={onClose}
                          className={cn(
                            "block hover:text-white transition",
                            pathname === l.href && "text-white font-semibold"
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </nav>

            <div className="mt-8 space-y-4 text-sm text-ms-blue-gray">
              <Link
                href="/social"
                onClick={onClose}
              >
                Social
              </Link>
              <LogoutButton className="text-red-400 hover:text-white" />

              {/* Dark/Light Mode Toggle */}
              <div className="pt-4 border-t border-gray-700">
                <ThemeToggle />
              </div>
            </div>
          </>
        ) : (
          <nav className="space-y-4 text-sm text-ms-blue-gray">
            <Link
              href="/"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Home
            </Link>
            <Link
              href="/features"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Features
            </Link>
            <Link
              href="/about"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Contact Us
            </Link>
            <Link
              href="/login"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Sign Up
            </Link>

            <div className="pt-4 border-t border-gray-700">
              <ThemeToggle />
            </div>
          </nav>
        )}
      </aside>
    </div>
  );
}
