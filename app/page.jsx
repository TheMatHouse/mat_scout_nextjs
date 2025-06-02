// app/page.jsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import HomePage from "./home/page";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return <HomePage />;
}
