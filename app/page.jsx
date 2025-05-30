import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HomePage from "./home/page";
import { parse } from "cookie";

export default async function Home() {
  const headerList = await headers();
  const cookie = headerList.get("cookie") || "";
  const parsedCookies = parse(cookie);
  const token = parsedCookies.token;

  if (token) {
    redirect("/dashboard");
  }

  return <HomePage />;
}
