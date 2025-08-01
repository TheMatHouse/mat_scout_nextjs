"use client";
import Link from "next/link";
import Image from "next/image";
import logoDesktop from "@/assets/matScout_logo.png";
import logoMobile from "@/assets/matScout_logo_mobile.png";

import Navbar from "@/components/layout/Navbar";
import NotificationBell from "@/components/notifications/NotificationBell"; // ✅ Import the bell

export default function Header() {
  return (
    <header className="w-full sticky top-0 z-50 bg-ms-blue text-ms-nav-text dark:bg-[hsl(222.2_47.4%_11.2%)] dark:text-white shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-4 w-full">
        {/* Mobile Logo */}
        <Link
          href="/"
          className="block md:hidden"
        >
          <Image
            src={logoMobile}
            alt="MatScout Logo"
            className="h-28 w-auto block md:hidden"
            priority
          />
        </Link>

        {/* Desktop Logo */}
        <Link
          href="/"
          className="hidden md:block"
        >
          <Image
            src={logoDesktop}
            alt="MatScout Logo"
            className="h-28 w-auto"
            priority
          />
        </Link>

        {/* Navigation + Bell */}
        <div className="flex items-center space-x-6">
          {/* Desktop Navbar */}
          <div className="hidden md:block">
            <Navbar />
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Mobile Navbar */}
          <div className="block md:hidden">
            <Navbar />
          </div>
        </div>
      </div>
    </header>
  );
}
