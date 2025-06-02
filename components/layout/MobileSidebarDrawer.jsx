"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/shared/LogoutButton";
import { useUser } from "@/context/UserContext";

export default function MobileSidebarDrawer({ isOpen, onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const dashboardView = searchParams.get("v") || "settings";
  const [isDashboardOpen, setDashboardOpen] = useState(true);

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
        className="absolute top-0 left-0 w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {user ? (
          <>
            <nav className="space-y-4">
              <Link
                href="/dashboard"
                onClick={() => {
                  setDashboardOpen(!isDashboardOpen);
                  onClose();
                }}
                className={cn(
                  "block text-lg font-medium hover:text-ms-light-red transition",
                  pathname === "/dashboard" && "text-ms-light-red"
                )}
              >
                Dashboard
              </Link>
              {isDashboardOpen && (
                <div className="pl-4 mt-2 space-y-2 text-sm text-ms-blue-gray">
                  {[
                    { v: "settings", label: "Settings" },
                    { v: "styles", label: "Styles/Sports" },
                    { v: "matches", label: "Match Reports" },
                    { v: "scouting", label: "Scouting Reports" },
                    { v: "family", label: "Family" },
                  ].map((sub) => (
                    <Link
                      key={sub.v}
                      href={`/dashboard?v=${sub.v}`}
                      onClick={onClose}
                      className={cn(
                        "block hover:text-white transition",
                        dashboardView === sub.v && "text-white font-semibold"
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href={`/${user.username}`}
                onClick={onClose}
              >
                Profile
              </Link>
            </nav>
            <div className="mt-8 space-y-2 text-sm text-ms-blue-gray">
              <Link
                href="/contact"
                onClick={onClose}
              >
                Contact
              </Link>
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
              href="/#features"
              onClick={onClose}
            >
              Features
            </Link>
            <Link
              href="/about"
              onClick={onClose}
            >
              About
            </Link>
            <Link
              href="/login"
              onClick={onClose}
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={onClose}
            >
              Sign Up
            </Link>
          </nav>
        )}
      </aside>
    </div>
  );
}
