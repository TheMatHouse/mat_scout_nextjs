// components/layout/Navbar.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/matScout_logo_new.png";
import { Menu } from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import ThemeToggle from "../shared/theme-toggle";
import MobileSidebarDrawer from "./MobileSidebarDrawer";
import { useUser } from "@clerk/nextjs";

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useUser();

  return (
    <>
      <nav className="w-full flex justify-between items-center px-4 py-2">
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <ThemeToggle />
          <SignedIn>
            <Link
              href="/dashboard"
              className="hover:underline"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
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
            <SignInButton />
            <SignUpButton />
          </SignedOut>
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
