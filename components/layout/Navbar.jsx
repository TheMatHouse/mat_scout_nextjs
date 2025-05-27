"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "../shared/theme-toggle";
import MobileSidebarDrawer from "./MobileSidebarDrawer";

const Navbar = () => {
  const { user, loading } = useCurrentUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <nav className="w-full flex justify-between items-center px-4 py-2">
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href={`/dashboard`}
                className="hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href={`/profile/${user.username}`}
                className="hover:underline"
              >
                Profile
              </Link>
              <LogoutButton className="text-red-400 hover:text-white" />
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
      <MobileSidebarDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        username={user?.username || "me"}
      />
    </>
  );
};

export default Navbar;
