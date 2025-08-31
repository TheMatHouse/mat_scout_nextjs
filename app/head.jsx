export default function Head() {
  const FB_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FB_APP_ID ||
    process.env.FB_APP_ID ||
    "2514100652275209"; // keep your real id here

  return (
    <>
      {/* fb-head-sentinel */}
      <meta
        property="fb:app_id"
        content={FB_APP_ID}
      />
    </>
  );
}
