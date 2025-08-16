"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackToProfile({ username, className = "" }) {
  const pathname = usePathname();
  const isFamily = pathname.startsWith("/family/");
  const href = isFamily ? `/family/${username}` : `/${username}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm
                  bg-white text-gray-700 hover:bg-gray-50
                  dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800
                  ${className}`}
      aria-label="Back to profile"
    >
      <ChevronLeft className="w-4 h-4" />
      Back to profile
    </Link>
  );
}
