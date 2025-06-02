// app/dashboard/page.jsx
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("User is null, redirecting.");
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome, {user.firstName || user.username}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
