"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "GET" });

      if (res.ok) {
        // Delay a moment to ensure cookie clears
        setTimeout(() => {
          router.push("/");
          router.refresh(); // ensures all server components revalidate
        }, 100);
      } else {
        console.error("Logout failed: ", await res.json());
      }
    } catch (err) {
      console.error("Logout error:", err);
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
