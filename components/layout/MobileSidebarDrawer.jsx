"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";

export default function MobileSidebarDrawer({ isOpen, onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();

  const dashboardView = searchParams.get("v") || "settings";
  const [isDashboardOpen, setDashboardOpen] = useState(true);

  if (loading || !user) return null;

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: `/${user.username}`, label: "Profile" },
  ];

  const dashboardSubLinks = [
    { v: "settings", label: "Settings" },
    { v: "styles", label: "Styles/Sports" },
    { v: "matches", label: "Match Reports" },
    { v: "scouting", label: "Scouting Reports" },
    { v: "family", label: "Family" },
  ];

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
        <nav className="space-y-4">
          {mainLinks.map((link) => (
            <div key={link.href}>
              <Link
                href={link.href}
                onClick={() => {
                  if (link.href === "/dashboard")
                    setDashboardOpen(!isDashboardOpen);
                  onClose();
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
            </div>
          ))}
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
      </aside>
    </div>
  );
}
