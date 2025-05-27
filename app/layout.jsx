// app/layout.jsx
import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import { UserProvider } from "@/context/UserContext"; // ✅ Must be this

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "MatScout",
  description:
    "Track, scout, and manage grappling athletes across judo, BJJ, and wrestling.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="font-roboto bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <UserProvider>
            {" "}
            {/* ✅ <--- this wraps EVERYTHING */}
            <ToastContainer />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
