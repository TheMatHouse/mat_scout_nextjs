"use client";
import { useState } from "react";
//import ThemeSwitch from "@/components/ThemeSwitch";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/mat_scout_logo.png";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
} from "@clerk/nextjs";
// ICONS

//import { IoMenu } from "react-icons/io5";
//import { doLogout } from "@/app/actions";
import ThemeToggle from "./theme-toggle";
import { Menu } from "lucide-react";

const Navbar = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getMenuClasses = () => {
    let menuClasses = [];
    if (isOpen) {
      menuClasses = [
        "flex",
        "flex-col",
        "absolute",
        "top-[130px]",
        "bg-ms-blue",
        "w-full",
        "left-0",
        "p-4",
        "gap-4",
        "z-50",
      ];
    } else {
      menuClasses = ["hidden", "md:flex"];
    }

    return menuClasses.join(" ");
  };
  return (
    <nav className="bg-ms-blue p-4 sm:p-6 md:flex md:justify-between md:items-center text-white">
      <div className="container mx-auto flex justify-between items-center">
        <a
          href=""
          className="text-2xl font-bold"
        >
          <Image
            src={logo}
            alt="Mat Scout - Logo"
            height={100}
            priority={true}
            className="ml-4"
          />
        </a>
        <div className={getMenuClasses()}>
          <div className="pr-2">
            <ThemeToggle />
          </div>

          <>
            <Link
              href="/"
              className="text-2xl  hover:text-gray-400 px-3"
              onClick={() => setIsOpen(isOpen && setIsOpen(false))}
            >
              Home
            </Link>
            <Link
              href="/features"
              className="text-2xl hover:text-gray-400 px-3"
              onClick={() => setIsOpen(isOpen && setIsOpen(false))}
            >
              Features
            </Link>
            <Link
              href="/about"
              className="text-2xl hover:text-gray-400 px-3"
              onClick={() => setIsOpen(isOpen && setIsOpen(false))}
            >
              About Us
            </Link>
            <SignedIn>
              <SignOutButton className="text-2xl hover:text-gray-400 px-3 -mt-2" />
            </SignedIn>
            <SignedOut>
              <SignInButton className="text-2xl hover:text-gray-400 px-3 -mt-2" />
            </SignedOut>
          </>
        </div>

        <div className="md:hidden flex items-center">
          <Menu
            size={24}
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
