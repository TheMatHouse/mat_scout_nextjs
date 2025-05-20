// components/layout/Sidebar.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/scout-reports", label: "Scout Reports" },
  ];

  // Add profile link if username is available
  if (user?.username) {
    links.push({ href: `/${user.username}`, label: "Profile" });
  }

  return (
    <aside className="w-64 h-full bg-[hsl(222.2_47.4%_11.2%)] text-white flex flex-col justify-between py-8 px-6">
      <nav className="space-y-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block text-lg font-medium hover:text-ms-light-red transition",
              pathname === link.href && "text-ms-light-red"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 text-sm text-ms-blue-gray">
        <Link href="/contact">Contact</Link>
        <Link href="/social">Social</Link>
      </div>
    </aside>
  );
}
