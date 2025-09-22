"use client";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "../shared/theme-toggle";
import { useUser } from "@/context/UserContext";

const MobileSidebarDrawer = dynamic(
  () => import("@/components/layout/MobileSidebarDrawer"),
  { ssr: false }
);

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useUser();

  return (
    <>
      <nav className="w-full flex justify-between items-center px-4 py-2">
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
                href="/users"
                className="hover:underline"
              >
                Users
              </Link>
              <Link
                href="/contact"
                className="hover:underline"
              >
                Contact Us
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
                href="/users"
                className="hover:underline"
              >
                Users
              </Link>
              <Link
                href="/teams"
                className="hover:underline"
              >
                Teams
              </Link>
              <Link
                href="/contact"
                className="hover:underline"
              >
                Contact Us
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
        <div className="md:hidden">
          <Menu
            size={24}
            onClick={() => setIsMobileOpen(true)}
            className="cursor-pointer"
          />
        </div>
      </nav>
      <Suspense fallback={null}>
        <MobileSidebarDrawer
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />
      </Suspense>
    </>
  );
};

export default Navbar;
