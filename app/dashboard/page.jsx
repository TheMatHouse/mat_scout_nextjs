import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function DashboardIndex() {
  const token = cookies().get("token");

  if (!token) {
    redirect("/");
  }

  redirect("/dashboard/settings");
}
