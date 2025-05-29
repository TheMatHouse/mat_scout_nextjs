// app/login/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import FacebookIcon from "@/components/icons/FacebookIcon";
import GoogleIcon from "@/components/icons/GoogleIcon";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const googleURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  }&redirect_uri=${
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://matscout.com"
  }/api/auth/google/callback&response_type=code&scope=openid%20email%20profile&access_type=online`;

  const facebookURL = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI}&state=login&scope=email,public_profile`;

  console.log("Facebook URL:", facebookURL);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Log In</h2>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <form
          onSubmit={handleEmailLogin}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <div className="border-t pt-4 text-center space-y-2">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => (window.location.href = facebookURL)}
          >
            <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
            Continue with Facebook
          </Button>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => (window.location.href = googleURL)}
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </Button>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-4">
          Don’t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:underline"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
