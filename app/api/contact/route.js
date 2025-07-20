// app/api/contact/route.js
import { sendContactEmail } from "@/lib/email/sendContactEmail";

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, firstName, lastName, email, phone, comments } = body;

    const result = await sendContactEmail({
      type,
      firstName,
      lastName,
      email,
      phone,
      comments,
    });

    if (!result) {
      return new Response(JSON.stringify({ error: "Email failed to send." }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Contact route error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
