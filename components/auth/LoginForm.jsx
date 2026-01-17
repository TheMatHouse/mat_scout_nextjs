"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import FacebookIcon from "@/components/icons/FacebookIcon";
import GoogleIcon from "@/components/icons/GoogleIcon";
import PasswordInput from "../shared/PasswordInput";

export default function LoginForm({ redirect = "/dashboard" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get("next");
  const { refreshUser } = useUser();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Login failed.");

      await refreshUser();
      router.replace(nextUrl || redirect);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stash redirect for OAuth callbacks to read
  const setRedirectCookie = () => {
    document.cookie = `post_auth_redirect=${encodeURIComponent(
      redirect
    )}; Path=/; Max-Age=600; SameSite=Lax`;
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-[var(--ms-blue)] dark:text-[var(--ms-light-gray)]">
          Log In
        </h1>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              rules={{ required: "Password is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold shadow-md text-white bg-[var(--ms-blue)] hover:bg-[var(--ms-blue-gray)] transition disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>

            <div className="text-right mt-2">
              <Link
                href="/forgot-password"
                className="ms-link text-sm"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </Form>

        <div className="my-6 text-center space-y-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            or continue with
          </div>
          <div className="flex justify-center gap-4">
            {/* <a
              href="/api/auth/facebook"
              onClick={setRedirectCookie}
              className="flex items-center gap-2 px-4 py-2 border rounded bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FacebookIcon className="w-4 h-4" />
              Facebook
            </a> */}
            <a
              href="/api/auth/google"
              onClick={setRedirectCookie}
              className="flex items-center gap-2 px-4 py-2 border rounded bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <GoogleIcon className="w-4 h-4" />
              Google
            </a>
          </div>
        </div>

        <div className="text-sm text-center mt-6 text-gray-600 dark:text-[var(--ms-light-gray)]">
          Don’t have an account?
          <Link
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="ml-2 ms-link"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
