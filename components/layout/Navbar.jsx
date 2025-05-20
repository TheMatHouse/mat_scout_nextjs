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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="max-w-7xl mx-auto px-4 flex items-center justify-between">
      {/* Desktop nav */}
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

      {/* Mobile menu toggle */}
      <div className="md:hidden flex items-center">
        <Menu
          size={24}
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer"
        />
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-ms-blue text-white z-50 p-4 flex flex-col gap-4 md:hidden">
          <ThemeToggle />
          <SignedIn>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link
              href="/features"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <SignInButton />
            <SignUpButton />
          </SignedOut>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
