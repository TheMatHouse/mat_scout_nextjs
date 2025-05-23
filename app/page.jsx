import ThemeToggle from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import HomePage from "./home/page";
import { redirect } from "next/navigation";

export default async function Home() {
  return <HomePage />;
}
