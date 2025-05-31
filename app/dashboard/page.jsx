import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardIndex() {
  const cookieStore = await cookies(); // ✅ Await cookies()
  const token = cookieStore.get("token");

  if (!token) {
    redirect("/");
  }

  redirect("/dashboard/settings");
}
