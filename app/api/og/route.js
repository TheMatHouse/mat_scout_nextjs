// app/api/og/route.js
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 0; // don't cache this route's HTML result
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(req) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const type = params.get("type") || "team";
  const name = params.get("name") || "MatScout";
  const avatar = params.get("avatar");

  // Same fallback the homepage uses
  const defaultOG = new URL("/default-og.png", url.origin).toString();

  // Try to use the provided avatar; if it's not a valid image, use default
  let avatarSrc = defaultOG;

  if (avatar) {
    try {
      const head = await fetch(avatar, {
        method: "HEAD",
        cache: "no-store",
        headers: { "User-Agent": "facebookexternalhit/1.1" }, // emulate FB
      });
      const ct = head.headers.get("content-type") || "";
      if (head.ok && ct.startsWith("image/")) {
        avatarSrc = avatar;
      }
    } catch {
      // keep default
    }
  }

  const element = (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b2545",
        color: "#fff",
        position: "relative",
      }}
    >
      {/* background image */}
      <img
        src={avatarSrc}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.25,
        }}
      />
      {/* overlay text */}
      <div
        style={{
          padding: "32px 48px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>
          {name}
        </div>
        <div style={{ fontSize: 28, opacity: 0.9 }}>
          {type === "team" ? "Team • MatScout" : "MatScout"}
        </div>
      </div>
    </div>
  );

  const res = new ImageResponse(element, { width: WIDTH, height: HEIGHT });
  // Cache the *image* aggressively; bust with a query param when you update
  res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return res;
}
