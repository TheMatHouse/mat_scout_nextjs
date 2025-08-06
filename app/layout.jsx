// app/layout.jsx
import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import { UserProvider } from "@/context/UserContext";
import LayoutClient from "@/components/layout/LayoutClient"; // ✅ NEW component

export const metadata = {
  title: "MatScout",
  description: "Your grappling analytics platform.",
};

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
            <Header />
            <LayoutClient>{children}</LayoutClient>
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
