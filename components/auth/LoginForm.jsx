"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import FacebookIcon from "@/components/icons/FacebookIcon";
import GoogleIcon from "@/components/icons/GoogleIcon";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (res.ok) {
          await refreshUser();
          router.push("/dashboard");
        } else {
          setError(data.error || "Login failed.");
        }
      } catch (err) {
        setError("Login failed. Please try again.");
      }
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });

      if (res.error) {
        setError(res.error);
      } else {
        await refreshUser();
        setTimeout(() => router.push("/dashboard"), 500);
      }
    } catch {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-[var(--ms-blue)] dark:text-[var(--ms-light-gray)]">
          Log In
        </h1>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-[var(--ms-light-gray)] dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--ms-blue)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-[var(--ms-light-gray)] dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--ms-blue)]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg font-semibold shadow-md text-white bg-[var(--ms-blue)] hover:bg-[var(--ms-blue-gray)] transition"
          >
            Log In
          </button>

          <div className="text-right mt-2">
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--ms-blue)] hover:underline dark:text-[var(--ms-light-gray)]"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="my-6 text-center space-y-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            or continue with
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="/api/auth/facebook"
              className="flex items-center gap-2 px-4 py-2 border rounded bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FacebookIcon className="w-4 h-4" />
              Facebook
            </a>
            <a
              href="/api/auth/google"
              className="flex items-center gap-2 px-4 py-2 border rounded bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <GoogleIcon className="w-4 h-4" />
              Google
            </a>
          </div>
        </div>

        <div className="text-sm text-center mt-6 text-gray-600 dark:text-[var(--ms-light-gray)]">
          Don’t have an account?{" "}
          <Link
            href="/register"
            className="text-sm text-[var(--ms-blue)] hover:underline dark:text-[var(--ms-light-gray)]"
          >
            <u>Create one</u>
          </Link>
        </div>
      </div>
    </div>
  );
}
