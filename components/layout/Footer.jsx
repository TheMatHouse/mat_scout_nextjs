// components/layout/Footer.jsx
import Link from "next/link";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-ms-blue text-ms-nav-text dark:bg-[hsl(222.2_47.4%_11.2%)] dark:text-white py-6 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <div className="text-sm">
          &copy; {new Date().getFullYear()} MatScout. All rights reserved.
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/privacy"
            className="hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/data-deletion"
            className="hover:underline"
          >
            Data Deletion
          </Link>
        </div>

        {/* Socials */}
        <div className="flex gap-4 text-lg">
          <Link
            href="#"
            className="hover:text-white opacity-80"
          >
            <FaFacebookF />
          </Link>
          <Link
            href="#"
            className="hover:text-white opacity-80"
          >
            <FaTwitter />
          </Link>
          <Link
            href="#"
            className="hover:text-white opacity-80"
          >
            <FaInstagram />
          </Link>
        </div>
      </div>
    </footer>
  );
}
