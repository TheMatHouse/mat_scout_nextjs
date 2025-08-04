import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect("/"); // Secure check
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin sidebar */}
      <aside className="w-64 bg-[hsl(222_47%_11%)] text-white p-6">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav className="space-y-2">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block px-3 py-2 rounded hover:bg-[hsl(222_47%_20%)]",
                // Active state
                typeof window !== "undefined" &&
                  window.location.pathname === link.href &&
                  "bg-[hsl(222_47%_25%)] text-ms-light-red font-semibold"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 bg-gray-50 dark:bg-[hsl(222_47%_8%)]">
        {children}
      </main>
    </div>
  );
}
