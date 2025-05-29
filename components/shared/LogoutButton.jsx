"use client";

export default function LogoutButton({ className }) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "GET" });

      // ✅ Just reload the current page — this will:
      // - clear the token cookie
      // - trigger full reload from /
      // - fix the hydration mismatch
      window.location.href = "/";
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
