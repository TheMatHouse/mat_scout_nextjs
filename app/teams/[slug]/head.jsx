// app/teams/[slug]/head.jsx
export default function Head() {
  const FB_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID ||
    "";

  return (
    <>
      {/* Facebook wants these literally in <head> for this route */}
      <meta
        property="og:type"
        content="website"
      />
      {FB_APP_ID ? (
        <meta
          property="fb:app_id"
          content={FB_APP_ID}
        />
      ) : null}
    </>
  );
}
