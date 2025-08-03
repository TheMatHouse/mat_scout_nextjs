"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeamTabs({ tabs }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 px-4 py-3 border-b border-gray-300 dark:border-gray-700 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative pb-2 font-medium transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-300 hover:text-blue-500"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
