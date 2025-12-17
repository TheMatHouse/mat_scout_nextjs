export async function GET() {
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
    envs: {
      NEXT_PUBLIC_DOMAIN: !!process.env.NEXT_PUBLIC_DOMAIN,
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      CLOUDINARY: !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
    },
  });
}
