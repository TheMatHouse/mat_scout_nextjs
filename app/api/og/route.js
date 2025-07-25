import { ImageResponse } from "next/og";

// Set runtime to edge for better performance
export const runtime = "edge";

export async function GET() {
  try {
    // Example text for OG image
    const title = "MatScout";
    const description = "Track, Scout, and Manage Grappling Athletes";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "#1c1c27",
            color: "#ffffff",
            padding: "50px",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1 style={{ fontSize: 64, marginBottom: 20 }}>{title}</h1>
          <p style={{ fontSize: 32 }}>{description}</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("OG Image Generation Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
