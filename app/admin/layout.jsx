export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import AdminAreaTag from "@/components/analytics/AdminAreaTag";
import AdminSidebarNav from "@/components/admin/layout/AdminSidebarNav";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  return (
    <div className="flex min-h-screen">
      {/* Desktop-only sidebar */}
      <aside className="hidden md:block w-64 bg-[hsl(222_47%_11%)] text-white p-6">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <AdminSidebarNav links={adminLinks} />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-[hsl(222_47%_8%)]">
        <AdminAreaTag /> {/* sets internal=1 for admin sessions */}
        {children}
      </main>
    </div>
  );
}
