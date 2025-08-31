// app/api/og/route.js
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const W = 1200;
const H = 630;

// ArrayBuffer -> base64 (Edge-safe)
function abToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// Fetch a URL and return a data: URL (or null on failure)
async function toDataUrl(url) {
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MatScoutOG/1.0)" },
    });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").split(";")[0];
    if (!ct.startsWith("image/")) return null;
    const b64 = abToBase64(await r.arrayBuffer());
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const name = searchParams.get("name") || "MatScout";
  const avatar = searchParams.get("avatar") || "";

  // Default OG is *always* the background
  const defaultOgHttp = new URL("/default-og.png", origin).toString();
  const defaultBg = (await toDataUrl(defaultOgHttp)) || defaultOgHttp;

  // Optional team logo to overlay; if it fails, we just don't show it
  const avatarDataUrl = avatar ? await toDataUrl(avatar) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        {/* Always show default OG as the background */}
        <img
          src={defaultBg}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Optional, tasteful overlay of team logo */}
        {avatarDataUrl ? (
          <div
            style={{
              position: "absolute",
              right: 48,
              bottom: 48,
              width: 160,
              height: 160,
              borderRadius: 9999,
              overflow: "hidden",
              background: "rgba(0,0,0,.25)",
              boxShadow: "0 6px 18px rgba(0,0,0,.35)",
              padding: 8,
            }}
          >
            <img
              src={avatarDataUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 9999,
              }}
            />
          </div>
        ) : null}

        {/* Subtle text badge (kept minimal) */}
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 48,
            padding: "10px 14px",
            fontSize: 22,
            fontWeight: 700,
            background: "rgba(0,0,0,.35)",
            borderRadius: 10,
          }}
        >
          {name}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
