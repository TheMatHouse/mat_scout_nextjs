"use client";
import Link from "next/link";
import Image from "next/image";
import logoDesktop from "@/assets/matScout_logo.png";
import logoMobile from "@/assets/matScout_logo_mobile.png";
import Navbar from "@/components/layout/Navbar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { user } = useUser();
  const { loading } = useUser();

  // ✅ If user state is loading, render a placeholder (same height as header)
  if (loading) {
    return (
      <header className="w-full sticky top-0 z-50 bg-ms-blue shadow-sm h-20"></header>
    );
  }

  return (
    <header className="w-full sticky top-0 z-50 bg-ms-blue text-ms-nav-text dark:text-white shadow-sm">
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
          <div className="hidden md:flex items-center gap-4">
            <Navbar />
            {/* FAQ link (desktop) */}
            <Link
              href="/faq"
              className="rounded-md px-3 py-2 text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition"
            >
              FAQ
            </Link>
          </div>

          {/* Notification Bell */}
          {user && <NotificationBell />}

          {/* Mobile Navbar */}
          <div className="flex md:hidden items-center gap-3">
            <Navbar />
            {/* FAQ link (mobile) */}
            <Link
              href="/faq"
              className="rounded-md px-3 py-2 text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition"
            >
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
