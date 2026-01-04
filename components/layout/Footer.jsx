// components/layout/Footer.jsx
import Link from "next/link";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

const Footer = () => {
  // Show FAQ everywhere except production
  const isProd =
    process.env.NEXT_PUBLIC_APP_ENV === "production" ||
    process.env.NODE_ENV === "production";

  return (
    <footer className="mt-auto bg-ms-blue dark:bg-[hsl(222.2_47.4%_11.2%)] text-gray-900 dark:text-gray-100">
      {/* subtle top divider */}
      <div className="h-px w-full bg-black/10 dark:bg-white/10" />

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* 3-zone layout on md+, stacked on mobile */}
        <div className="grid gap-6 md:grid-cols-3 items-center">
          {/* Left: Brand / Copyright */}
          <div className="text-sm text-center md:text-left">
            <div className="font-semibold tracking-tight">MatScout</div>
            <div className="opacity-70">
              &copy; {new Date().getFullYear()} All rights reserved.
            </div>
          </div>

          {/* Center: Legal / Utility links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/privacy"
              className="hover:underline underline-offset-4"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:underline underline-offset-4"
            >
              Terms
            </Link>
            <Link
              href="/data-deletion"
              className="hover:underline underline-offset-4"
            >
              Data Deletion
            </Link>
            {!isProd && (
              <Link
                href="/faq"
                className="hover:underline underline-offset-4"
              >
                FAQ
              </Link>
            )}
            <Link
              href="/contact"
              className="hover:underline underline-offset-4"
            >
              Contact
            </Link>
          </nav>

          {/* Right: Social icons */}
          <div className="flex items-center justify-center md:justify-end gap-3">
            <Link
              href="https://www.facebook.com/TheMatScout/"
              target="_blank"
              aria-label="MatScout on Facebook"
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15
                         text-gray-800 dark:text-gray-200
                         hover:text-white hover:bg-ms-light-red
                         transition-all duration-200"
            >
              <FaFacebookF className="text-sm group-hover:scale-110 transition-transform" />
            </Link>

            <Link
              href="https://x.com/TheMatScout"
              target="_blank"
              aria-label="MatScout on X"
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15
                         text-gray-800 dark:text-gray-200
                         hover:text-white hover:bg-ms-light-red
                         transition-all duration-200"
            >
              <FaTwitter className="text-sm group-hover:scale-110 transition-transform" />
            </Link>

            <Link
              href="https://www.instagram.com/thematscout/"
              target="_blank"
              aria-label="MatScout on Instagram"
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15
                         text-gray-800 dark:text-gray-200
                         hover:text-white hover:bg-ms-light-red
                         transition-all duration-200"
            >
              <FaInstagram className="text-sm group-hover:scale-110 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
