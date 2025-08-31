// app/head.tsx
export default function Head() {
  return (
    <>
      {/* Force this to exist on EVERY page, unconditionally */}
      <meta
        property="fb:app_id"
        content="2514100652275209"
      />
    </>
  );
}
