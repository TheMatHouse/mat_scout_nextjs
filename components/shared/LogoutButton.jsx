"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/context/UserContext";

export default function LogoutButton({ className }) {
  const router = useRouter();
  const { refreshUser, user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("❌ Logout failed");
        return;
      }

      console.log("✅ Logout succeeded, user before refresh:", user);

      await refreshUser();

      console.log("✅ After refreshUser, user is now:", user);

      // Wait briefly for state to update before reload
      await refreshUser();
      setTimeout(() => {
        router.push("/");
        window.location.reload();
      }, 200);
    } catch (err) {
      console.error("❌ Logout error:", err);
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
