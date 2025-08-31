// app/head.jsx
export default function Head() {
  const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
  return (
    <>
      {FB_APP_ID ? (
        <meta
          property="fb:app_id"
          content={FB_APP_ID}
        />
      ) : null}
      <meta
        property="og:type"
        content="website"
      />
    </>
  );
}
