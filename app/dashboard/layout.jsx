// app/dashboard/layout.jsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
// import { UserProvider } from "@/context/UserContext";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata = {
  title: "Dashboard",
  description: "Your personalized MatScout dashboard.",
};

export default async function DashboardLayout({ children }) {
  const headersList = await headers(); // ✅ FIX: Await the headers
  const cookieHeader = headersList.get("cookie");

  const token = cookieHeader
    ?.split(";")
    .find((cookie) => cookie.trim().startsWith("token="))
    ?.split("=")[1];

  if (!token) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
