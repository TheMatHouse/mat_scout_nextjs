export default function VerifyErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        ❌ Verification Failed
      </h1>
      <p className="text-lg">
        The verification link may have expired or is invalid. Please{" "}
        <a
          href="/login"
          className="text-blue-600 underline hover:text-blue-800"
        >
          log in
        </a>{" "}
        and request a new verification email.
      </p>
    </div>
  );
}
