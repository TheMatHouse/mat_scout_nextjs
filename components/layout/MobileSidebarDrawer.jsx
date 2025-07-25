"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";

export default function MobileSidebarDrawer({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, loading } = useUser();

  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isTeamsOpen, setTeamsOpen] = useState(false);

  useEffect(() => {
    setDashboardOpen(pathname.startsWith("/dashboard"));
    setTeamsOpen(pathname.startsWith("/teams"));
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
            </nav>

            <div className="mt-8 space-y-2 text-sm text-ms-blue-gray">
              <Link
                href="/social"
                onClick={onClose}
              >
                Social
              </Link>
              <LogoutButton className="text-red-400 hover:text-white" />
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
          </nav>
        )}
      </aside>
    </div>
  );
}
