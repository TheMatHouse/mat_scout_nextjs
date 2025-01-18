import ThemeToggle from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import HomePage from "./home/page";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect("/dashboard");
  return <HomePage />;
}
