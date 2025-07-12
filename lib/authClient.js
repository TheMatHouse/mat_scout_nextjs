// lib/authClient.js

export async function getCurrentUser() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // make sure cookies are sent
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || null;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
}
