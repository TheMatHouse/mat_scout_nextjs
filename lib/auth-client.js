// lib/auth-client.js
export async function logout() {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Logout failed");
    }

    return true; // ✅ Success
  } catch (err) {
    console.error("Logout error:", err.message);
    throw err;
  }
}
