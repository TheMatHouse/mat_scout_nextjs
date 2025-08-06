"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";

export default function LayoutClient({ children }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const showSidebar =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/teams") ||
    /^\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/family/");

  useEffect(() => {
    if (params.get("error") === "forbidden") {
      toast.error("You are not authorized to access that page.");
    }
  }, [params]);

  return (
    <div className="flex flex-1">
      {showSidebar && (
        <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground">
          <AuthenticatedSidebar />
        </aside>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
