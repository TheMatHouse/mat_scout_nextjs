export default function VerifySuccessPage() {
  return (
    <div className="p-6 text-center max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎉 Email Verified!</h1>
      <p className="text-lg">
        You're now ready to use your account. If you are not already logged in,
        go ahead and{" "}
        <a
          href="/login"
          className="text-blue-600 underline"
        >
          log in
        </a>
        .
      </p>
    </div>
  );
}
