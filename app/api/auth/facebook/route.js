import passport from "@/lib/passport";

export async function GET(req) {
  return Response.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`,
    307
  );
}
