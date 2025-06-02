// lib/apiClient.js

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    credentials: "include", // ✅ Include cookies (needed for auth)
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body || null,
  });

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.error) message = errorData.error;
    } catch (_) {
      // fallback
    }
    throw new Error(message);
  }

  // Return JSON response
  return await res.json();
}
