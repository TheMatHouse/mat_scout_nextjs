import "./globals.css";
import { ThemeProvider } from "next-themes";
import { customMetaDataGenerator } from "@/lib/CustomMetaDataGenerator";
import Header from "@/components/shared/Header";
import "react-toastify/ReactToastify.css";
import { ToastContainer } from "react-toastify";

//import { auth } from "@/auth";
import SidebarMenuBar from "@/components/shared/sidebar/SidebarMenuBar";
import { ClerkProvider, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import Loader from "@/components/shared/Loader";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export const metadata = customMetaDataGenerator({
  title: "MatScout.com - Premier Grappling Site for Athlete Scouting",
});

export default async function RootLayout({ children }) {
  const user = await currentUser();

  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
      >
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <Header />
            <main className="flex h-screen w-full">
              {/* Sidebar - Hidden on small screens, shown on md+ */}
              {user && (
                <div className="hidden md:block">
                  <SidebarMenuBar />
                </div>
              )}

              {/* Main content */}
              <div className="flex-1">{children}</div>
            </main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
