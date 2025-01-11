import "./globals.css";
import { ThemeProvider } from "next-themes";
import { customMetaDataGenerator } from "@/lib/CustomMetaDataGenerator";
import Header from "@/components/shared/Header";
import "react-toastify/ReactToastify.css";
import { ToastContainer } from "react-toastify";

import { auth } from "@/auth";
import SidebarMenuBar from "@/components/shared/sidebar/SidebarMenuBar";

export const metadata = customMetaDataGenerator({
  title: "MatScout.com - Premier Grappling Site for Athlete Scouting",
});

export default async function RootLayout({ children }) {
  const session = await auth();
  return (
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
          <ToastContainer />
          <Header />
          <main className="flex h-1vh w[100$">
            {session?.user && <SidebarMenuBar />}
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
