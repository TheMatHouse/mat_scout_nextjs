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
          <ClerkLoading>
            <Loader />
          </ClerkLoading>
          <ClerkLoaded>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ToastContainer />
              <Header />
              <main className="flex h-1vh w[100%]">
                {user && <SidebarMenuBar />}
                {children}
              </main>
            </ThemeProvider>
          </ClerkLoaded>
        </body>
      </html>
    </ClerkProvider>
  );
}
