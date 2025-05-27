import { redirect } from "next/navigation";
import { verifyTokenFromCookie } from "@/lib/verifyTokenFromCookie";
import HomePage from "./home/page";

export default async function Home() {
  const user = await verifyTokenFromCookie();

  if (user) {
    redirect("/dashboard");
  }

  return <HomePage />;
}
