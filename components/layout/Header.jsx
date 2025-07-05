"use client";
import Link from "next/link";
import Image from "next/image";
import logoDesktop from "@/assets/matScout_logo.png";
import logoMobile from "@/assets/matScout_logo_mobile.png"; // Add this new file to /assets if it's not already

import Navbar from "@/components/layout/Navbar";

export default function Header() {
  return (
    <header className="w-full sticky top-0 z-50 bg-ms-blue text-ms-nav-text dark:bg-[hsl(222.2_47.4%_11.2%)] dark:text-white shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-4 w-full">
        {/* Mobile Logo */}
        <Image
          src={logoMobile}
          alt="MatScout Logo"
          className="h-28 w-auto block md:hidden"
          priority
        />
        {/* Desktop Logo */}
        <Image
          src={logoDesktop}
          alt="MatScout Logo"
          className="h-28 w-auto hidden md:block"
          priority
        />

        {/* Navigation */}
        <div className="hidden md:block">
          <Navbar />
        </div>
        <div className="block md:hidden">
          <Navbar />
        </div>
      </div>
    </header>
  );
}
