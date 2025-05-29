"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ className }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "GET" });

      // ✅ Use Next.js router instead of full page reload
      router.push("/");
      router.refresh(); // Important to update server components like NavBar
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className}
    >
      Logout
    </button>
  );
}
