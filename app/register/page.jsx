"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import FacebookIcon from "@/components/icons/FacebookIcon";
import GoogleIcon from "@/components/icons/GoogleIcon";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [usernameTimer, setUsernameTimer] = useState(null);

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }
    try {
      const res = await fetch(`/api/check-username?username=${username}`);
      const data = await res.json();
      setIsUsernameAvailable(data.available);
    } catch (err) {
      console.error("❌ Username check failed", err);
      setIsUsernameAvailable(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "username") {
      setIsUsernameAvailable(null);
      if (usernameTimer) clearTimeout(usernameTimer);
      const timer = setTimeout(() => checkUsernameAvailability(value), 500);
      setUsernameTimer(timer);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { email, password, firstName, lastName, username } = form;

    if (!email || !password || !firstName || !lastName || !username) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    if (isUsernameAvailable === false) {
      setError("Username is not available. Please choose another.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // ✅ If redirected, follow it manually
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setError(data.error || "Registration failed");
        } else {
          setError("Registration failed with unknown error");
        }
        return;
      }

      // ✅ Success: navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError("Something went wrong. Please try again.");
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Create Account</h2>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            name="firstName"
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <Input
            name="lastName"
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
            required
          />
          <Input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />
          {form.username.length > 2 && (
            <p className="text-sm mt-1">
              {isUsernameAvailable === null ? (
                <span className="text-gray-500">Checking...</span>
              ) : isUsernameAvailable ? (
                <span className="text-green-600">✅ Available</span>
              ) : (
                <span className="text-red-600">❌ Not available</span>
              )}
            </p>
          )}
          <Input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
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
              "Register"
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
            Sign up with Facebook
          </Button>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => (window.location.href = googleURL)}
          >
            <GoogleIcon className="h-5 w-5" />
            Sign up with Google
          </Button>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
