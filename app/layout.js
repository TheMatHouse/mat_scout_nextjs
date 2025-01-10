import "./globals.css";
import { ThemeProvider } from "next-themes";
import { customMetaDataGenerator } from "@/lib/CustomMetaDataGenerator";
import Header from "@/components/shared/Header";

export const metadata = customMetaDataGenerator({
  title: "MatScout.com - Premier Grappling Site for Athlete Scouting",
});

export default function RootLayout({ children }) {
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
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
