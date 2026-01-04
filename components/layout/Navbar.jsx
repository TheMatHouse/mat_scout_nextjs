"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import LogoutButton from "@/components/shared/LogoutButton";
import ThemeToggle from "../shared/theme-toggle";
import { useUser } from "@/context/UserContext";

const MobileSidebarDrawer = dynamic(
  () => import("@/components/layout/MobileSidebarDrawer"),
  { ssr: false }
);

const DEFAULT_AVATAR_URL =
  "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

function getDisplayAvatarUrl(user) {
  if (!user) return DEFAULT_AVATAR_URL;

  let baseAvatarUrl = user.avatar;

  if (user.avatarType === "google") baseAvatarUrl = user.googleAvatar;
  if (user.avatarType === "facebook") baseAvatarUrl = user.facebookAvatar;
  if (user.avatarType === "uploaded") baseAvatarUrl = user.avatar;

  return baseAvatarUrl || DEFAULT_AVATAR_URL;
}

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useUser();

  const avatarUrl = user ? getDisplayAvatarUrl(user) : null;

  return (
    <>
      <nav className="w-full flex justify-between items-center px-4 py-2">
        <div className="hidden md:flex items-center gap-6">
          <ThemeToggle />

          {/* Profile */}
          {user && (
            <Link
              href={`/${user.username}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Image
                src={avatarUrl}
                alt="User Avatar"
                width={28}
                height={28}
                className="rounded-full border object-cover"
                sizes="28px"
              />
              <span className="font-medium">Profile</span>
            </Link>
          )}

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
                href="/faq"
                className="hover:underline"
              >
                FAQ
              </Link>
              <Link
                href="/contact"
                className="hover:underline"
              >
                Contact Us
              </Link>

              {/* Logout — toned down */}
              <LogoutButton className="hover:underline" />
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
                href="/faq"
                className="hover:underline"
              >
                FAQ
              </Link>
              <Link
                href="/contact"
                className="hover:underline"
              >
                Contact Us
              </Link>
              <Link
                href="/login"
                className="font-semibold text-white bg-ms-red px-4 py-2 rounded hover:opacity-90 transition"
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

        {/* Mobile menu */}
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
