// app/register/page.jsx
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
            onChange={handleChange}
            required
          />
          <Input
            name="lastName"
            placeholder="Last Name"
            onChange={handleChange}
            required
          />
          <Input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
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
