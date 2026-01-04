"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "@/components/shared/theme-toggle";
import { ChevronRight, ChevronDown } from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/messages", label: "Messages" },
];

function SectionRow({ label, href, isOpen, setOpen, active, onNavigate }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "text-lg font-medium hover:text-ms-light-red transition",
          active && "text-ms-light-red"
        )}
      >
        {label}
      </Link>

      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-[hsl(222_47%_20%)]"
        title={isOpen ? "Collapse" : "Expand"}
      >
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
    </div>
  );
}

const MobileSidebarDrawer = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
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

              {/* Dashboard */}
              <div>
                <SectionRow
                  label="Dashboard"
                  href="/dashboard"
                  isOpen={isDashboardOpen}
                  setOpen={setDashboardOpen}
                  active={pathname.startsWith("/dashboard")}
                  onNavigate={onClose}
                />
                {isDashboardOpen && (
                  <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                    {[
                      { href: "/dashboard/settings", label: "Settings" },
                      { href: "/dashboard/settings/bio", label: "Bio" },
                      { href: "/dashboard/styles", label: "Styles/Sports" },
                      { href: "/dashboard/matches", label: "Match Reports" },
                      {
                        href: "/dashboard/scouting",
                        label: "Scouting Reports",
                      },
                      {
                        href: "/dashboard/coach-notes",
                        label: "Coach's Notes",
                      },
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
              </div>

              {/* Teams */}
              <div>
                <SectionRow
                  label="Teams"
                  href="/teams"
                  isOpen={isTeamsOpen}
                  setOpen={setTeamsOpen}
                  active={pathname.startsWith("/teams")}
                  onNavigate={onClose}
                />
                {isTeamsOpen && (
                  <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                    <Link
                      href="/teams/mine"
                      onClick={onClose}
                      className={cn(
                        "block hover:text-white transition",
                        pathname === "/teams/mine" && "text-white font-semibold"
                      )}
                    >
                      My Teams
                    </Link>
                    <Link
                      href="/teams/find"
                      onClick={onClose}
                      className={cn(
                        "block hover:text-white transition",
                        pathname === "/teams/find" && "text-white font-semibold"
                      )}
                    >
                      Find Teams
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
              </div>

              {/* Users */}
              <Link
                href="/users"
                onClick={onClose}
                className={cn(
                  "block text-lg font-medium hover:text-ms-light-red transition",
                  pathname === "/users" && "text-ms-light-red"
                )}
              >
                Users
              </Link>

              <Link
                href="/faq"
                onClick={onClose}
                className="block text-lg font-medium hover:text-ms-light-red transition"
              >
                FAQ
              </Link>

              <Link
                href="/contact"
                onClick={onClose}
                className="block text-lg font-medium hover:text-ms-light-red transition"
              >
                Contact Us
              </Link>

              {/* Admin */}
              {user?.isAdmin && (
                <div>
                  <SectionRow
                    label="Admin"
                    href="/admin/dashboard"
                    isOpen={isAdminOpen}
                    setOpen={setAdminOpen}
                    active={pathname.startsWith("/admin")}
                    onNavigate={onClose}
                  />
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
                </div>
              )}
            </nav>

            <div className="mt-8 space-y-4 text-sm text-ms-blue-gray">
              <LogoutButton className="text-red-400 hover:text-white" />
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
              href="/users"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Users
            </Link>
            <Link
              href="/teams"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              Teams
            </Link>
            <Link
              href="/faq"
              onClick={onClose}
              className="block hover:text-white transition"
            >
              FAQ
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
              Log In
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
};

export default MobileSidebarDrawer;
