// components/admin/layout/AdminSidebarNav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminSidebarNav({ links = [] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "block px-3 py-2 rounded transition-colors",
              active
                ? "bg-[hsl(222_47%_20%)] text-white font-semibold"
                : "text-gray-200 hover:bg-[hsl(222_47%_20%)] hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
