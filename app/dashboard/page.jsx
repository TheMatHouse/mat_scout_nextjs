import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
export default async function DashboardPage() {
  const cookieStore = cookies(); // ✅ ok here
  const token = cookieStore.get("token")?.value;

  if (!token) redirect("/login");

  const decoded = jwt.decode(token);
  const username = decoded?.username || "User";
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome, {firstName}!</h1>
      <p className="text-lg">
        This is your dashboard. You can add settings, stats, or links here.
      </p>
    </main>
  );
}
