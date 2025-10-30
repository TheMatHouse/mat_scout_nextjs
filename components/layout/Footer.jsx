// components/layout/Footer.jsx
import Link from "next/link";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

const Footer = () => {
  // Show FAQ everywhere except production, using either env var you might set
  const isProd =
    process.env.NEXT_PUBLIC_APP_ENV === "production" ||
    process.env.NODE_ENV === "production";

  return (
    <footer className="bg-ms-blue text-ms-nav-text dark:bg-[hsl(222.2_47.4%_11.2%)] dark:text-white py-6 px-8">
      {/* 3-zone layout on md+; stacks nicely on mobile */}
      <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-3 items-center">
        {/* Left: Copyright */}
        <div className="text-sm justify-self-start text-gray-900 dark:text-gray-100">
          &copy; {new Date().getFullYear()} MatScout. All rights reserved.
        </div>

        {/* Center: Links (truly centered with grid) */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
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
          {!isProd && (
            <Link
              href="/faq"
              className="hover:underline"
            >
              FAQ
            </Link>
          )}
          <Link
            href="/contact"
            className="hover:underline"
          >
            Contact Us
          </Link>
        </nav>

        {/* Right: Socials */}
        <div className="flex items-center gap-4 text-lg justify-self-end">
          <Link
            href="https://www.facebook.com/TheMatScout/"
            target="_blank"
            aria-label="MatScout on Facebook"
            className="hover:text-white opacity-80 transition-opacity"
          >
            <FaFacebookF />
          </Link>

          {/* Future icons — leave commented or add when ready */}
          {/*
          <Link
            href="https://x.com/your_handle"
            target="_blank"
            aria-label="MatScout on X"
            className="hover:text-white opacity-80 transition-opacity"
          >
            <FaTwitter />
          </Link>
          <Link
            href="https://instagram.com/your_handle"
            target="_blank"
            aria-label="MatScout on Instagram"
            className="hover:text-white opacity-80 transition-opacity"
          >
            <FaInstagram />
          </Link>
          */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
