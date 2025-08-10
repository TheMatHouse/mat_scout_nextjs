"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export default function AdminSidebarClient({ links = [], title = "Admin" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-700/40 px-3 py-2
                   text-sm font-medium text-white bg-[hsl(222_47%_11%)]
                   hover:bg-[hsl(222_47%_15%)] transition"
        aria-label="Open admin menu"
      >
        <span className="i-lucide-menu" />
        Menu
      </button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity",
          open ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 transform bg-[hsl(222_47%_11%)] text-white shadow-2xl",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
            className="rounded p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded px-3 py-2 text-sm transition",
                  active ? "bg-white/10 font-semibold" : "hover:bg-white/10"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
