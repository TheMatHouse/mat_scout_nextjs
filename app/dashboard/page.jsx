import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.firstName}!</h1>
      <p className="text-lg">
        This is your dashboard. You can add settings, stats, or links here.
      </p>
    </main>
  );
}
