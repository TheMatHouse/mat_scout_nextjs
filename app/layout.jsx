// app/layout.jsx
import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
// import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";

export const metadata = {
  title: "MatScout",
  description:
    "Track, scout, and manage grappling athletes across judo, BJJ, and wrestling.",
};

export default async function RootLayout({ children }) {
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
          <ToastContainer
            position="top-right"
            autoClose={5000}
          />
          {/* <Header /> */}

          <div className="flex min-h-screen w-full">
            {/* <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground border-r border-border">
              <AuthenticatedSidebar />
            </aside> */}

            {/* Main Content */}
            <main className="flex-1 px-4 py-6 md:px-8 md:py-10 bg-background text-foreground">
              {children}
            </main>
          </div>

          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
