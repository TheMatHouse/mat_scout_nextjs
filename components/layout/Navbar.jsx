"use client";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "../shared/theme-toggle";

const MobileSidebarDrawer = dynamic(
  () => import("@/components/layout/MobileSidebarDrawer"),
  { ssr: false }
);

const Navbar = () => {
  const { user, loading } = useCurrentUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ⛔ Prevent hydration mismatch
  if (loading) return null;

  return (
    <>
      <nav className="w-full flex justify-between items-center px-4 py-2">
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href={`/${user.username}`}
                className="hover:underline"
              >
                Profile
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/features"
                className="hover:underline"
              >
                Features
              </Link>
              <Link
                href="/about"
                className="hover:underline"
              >
                About
              </Link>
              <Link
                href="/login"
                className="hover:underline font-semibold text-white bg-ms-red px-4 py-2 rounded"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="hover:underline"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Menu
            size={24}
            onClick={() => setIsMobileOpen(true)}
            className="cursor-pointer"
          />
        </div>
      </nav>

      {/* Mobile Sidebar Drawer */}
      <Suspense fallback={null}>
        <MobileSidebarDrawer
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          username={user?.username || ""}
        />
      </Suspense>
    </>
  );
};

export default Navbar;
