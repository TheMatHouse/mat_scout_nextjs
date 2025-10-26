export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="relative w-full no-x-overflow">
      <div className="mx-auto max-w-7xl px-0 sm:px-4 lg:px-8 py-0 lg:py-6">
        <div className="flex gap-6">
          <main className="flex-1 min-w-0 px-4 sm:px-0 lg:px-0 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
