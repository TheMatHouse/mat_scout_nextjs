import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomePage from "./home/page";

export default async function Home() {
  const cookieStore = await cookies(); // Use cookies() for consistency
  const token = cookieStore.get("token");

  if (token) {
    redirect("/dashboard/settings"); // ✅ Go straight to final destination
  }

  return <HomePage />;
}
