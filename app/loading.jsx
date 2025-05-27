// app/layout.jsx
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  title: "MatScout",
  description: "Track, scout, and manage grappling athletes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-roboto bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <UserProvider>
            <ToastContainer
              position="top-right"
              autoClose={5000}
            />
            <Header />
            {children}
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
