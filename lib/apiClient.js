// lib/apiClient.js
export async function apiFetch(url, options = {}, requireAuth = false) {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // important for cookies!
  });

  if (!res.ok) {
    const message = `API error: ${res.status} ${res.statusText}`;
    let body = await res.json().catch(() => ({}));

    // 👇 Only throw if authentication is required
    if (requireAuth) {
      throw new Error(body?.error || message);
    }

    return null; // return null for optional fetches
  }

  return res.json();
}
