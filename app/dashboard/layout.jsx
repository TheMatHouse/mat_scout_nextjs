import Sidebar from "@/components/layout/AuthenticatedSidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
