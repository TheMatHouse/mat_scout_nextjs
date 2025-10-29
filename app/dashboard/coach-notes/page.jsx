export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import DashboardCoachNotes from "@/components/dashboard/coach-notes/DashboardCoachNotes";

async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userId = String(user._id || user.id);

  return (
    <main className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Coach&apos;s Notes
          </h1>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100/80">
            Match notes written by your coaches, grouped by team and event.
          </p>
        </header>

        <DashboardCoachNotes userId={userId} />
      </div>
    </main>
  );
}

export default Page;
