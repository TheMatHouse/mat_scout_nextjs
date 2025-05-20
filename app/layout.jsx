import "./globals.css";
// import { ThemeProvider } from "next-themes";
import "./globals.css";
import Providers from "@/components/shared/Providers";
import { customMetaDataGenerator } from "@/lib/CustomMetaDataGenerator";
import Header from "@/components/shared/Header";
import "react-toastify/ReactToastify.css";
import { ToastContainer } from "react-toastify";

//import { auth } from "@/auth";
// import SidebarMenuBar from "@/components/shared/sidebar/SidebarMenuBar";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import { ClerkProvider, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import Loader from "@/components/shared/Loader";
import { redirect } from "next/navigation";

export const metadata = customMetaDataGenerator({
  title: "MatScout.com - Premier Grappling Site for Athlete Scouting",
});

export default async function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
      >
        <body>
          <Providers>
            <ToastContainer
              position="top-right"
              autoClose={5000}
            />
            <Header />

            <div className="flex min-h-screen w-full">
              {/* Sidebar (always rendered, but shows conditionally inside itself) */}
              <div className="hidden md:block">
                <AuthenticatedSidebar />
              </div>

              <div className="flex-1">{children}</div>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
