"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) throw new Error("Verification failed");

        setStatus("success");

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/verify/success");
        }, 2000);
      } catch (err) {
        setStatus("error");

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/verify/error");
        }, 2000);
      }
    };

    if (token) {
      verify();
    } else {
      // No token, redirect to error immediately
      router.push("/verify/error");
    }
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {status === "verifying" && (
        <p className="text-lg">🔄 Verifying your email...</p>
      )}
      {status === "success" && (
        <p className="text-green-600 text-lg">
          ✅ Email verified! Redirecting…
        </p>
      )}
      {status === "error" && (
        <p className="text-red-600 text-lg">
          ❌ Verification failed. Redirecting…
        </p>
      )}
    </div>
  );
}
