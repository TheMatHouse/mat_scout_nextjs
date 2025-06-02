"use client";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/matScout_logo.png";
import Navbar from "@/components/layout/Navbar";

export default function Header() {
  return (
    <header className="w-full sticky top-0 z-50 bg-ms-blue text-ms-nav-text dark:bg-[hsl(222.2_47.4%_11.2%)] dark:text-white shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-4 w-full">
        <Image
          src={logo}
          alt="MatScout Logo"
          className="h-28 w-auto"
          priority
        />
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
