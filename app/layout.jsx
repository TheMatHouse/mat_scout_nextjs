import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserProvider } from "@/context/UserContext";
import LayoutClient from "@/components/layout/LayoutClient";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="font-sans flex flex-col min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ToastContainer
            position="top-right"
            autoClose={5000}
          />
          <UserProvider>
            {/* ✅ Client wrapper handles pathname & params */}
            <LayoutClient>{children}</LayoutClient>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
