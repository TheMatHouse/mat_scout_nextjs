// components/layout/Header.jsx
"use client";
import Link from "next/link";
import Image from "next/image";
import logoDesktop from "@/assets/matScout_logo.png";
import logoMobile from "@/assets/matScout_logo_mobile.png";
import Navbar from "@/components/layout/Navbar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { user, loading } = useUser();

  // Keep the header height stable while auth state loads
  if (loading) {
    return (
      <header className="sticky top-0 inset-x-0 z-50 bg-ms-blue shadow-sm h-16 md:h-20" />
    );
  }

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-ms-blue text-ms-nav-text dark:text-white shadow-sm">
      {/* Constrained inner content; outer header provides the full-bleed background */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Logo */}
          <Link
            href="/"
            className="block md:hidden h-10"
          >
            <Image
              src={logoMobile}
              alt="MatScout Logo"
              priority
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Logo */}
          <Link
            href="/"
            className="hidden md:block h-12 md:h-16"
          >
            <Image
              src={logoDesktop}
              alt="MatScout Logo"
              priority
              className="h-full w-auto"
            />
          </Link>

          {/* Navigation + Notifications */}
          <div className="flex items-center gap-4">
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              <Navbar />
            </div>

            {/* Notification bell (only when logged in) */}
            {user && <NotificationBell />}

            {/* Mobile nav */}
            <div className="flex md:hidden items-center gap-3">
              <Navbar />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
