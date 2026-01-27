"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { apiFetch } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { sanitizeUsername, isUsernameFormatValid } from "@/lib/identifiers";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import GoogleIcon from "@/components/icons/GoogleIcon";
import PasswordInput from "@/components/shared/PasswordInput";

const RegisterForm = ({ redirect = "/dashboard" }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get("next");
  const { refreshUser } = useUser();

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Track whether reCAPTCHA is actually ready
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  // Load reCAPTCHA script + wait for readiness
  useEffect(() => {
    if (!siteKey) {
      console.error("Missing reCAPTCHA site key");
      return;
    }

    // Already loaded?
    if (window.grecaptcha && window.grecaptcha.execute) {
      setRecaptchaReady(true);
      return;
    }

    // Add script if not present
    const existing = document.querySelector("#recaptcha-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "recaptcha-script";
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.body.appendChild(script);
    }

    // Poll until grecaptcha is really available AND initialized
    const interval = setInterval(() => {
      if (
        window.grecaptcha &&
        typeof window.grecaptcha.ready === "function" &&
        typeof window.grecaptcha.execute === "function"
      ) {
        window.grecaptcha.ready(() => {
          setRecaptchaReady(true);
          console.log("reCAPTCHA fully ready");
        });
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [siteKey]);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameCode, setUsernameCode] = useState(null);
  const [usernameDebug, setUsernameDebug] = useState(null);

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCode, setEmailCode] = useState(null);

  const username = form.watch("username");
  const email = form.watch("email");

  const usernameInvalid = !!username && !isUsernameFormatValid(username);

  // Username availability check
  useEffect(() => {
    const u = (username || "").trim();
    if (!u) {
      setUsernameAvailable(null);
      setUsernameCode(null);
      setUsernameDebug(null);
      return;
    }
    if (!isUsernameFormatValid(u)) {
      setUsernameAvailable(null);
      setUsernameCode("invalid_format");
      setUsernameDebug(null);
      return;
    }

    const t = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(u)}&debug=1`,
          { cache: "no-store", headers: { "cache-control": "no-cache" } }
        );
        const data = await res.json().catch(() => null);
        setUsernameDebug(data?.debug ?? null);

        if (!res.ok || !data?.ok) {
          setUsernameAvailable(null);
          setUsernameCode("server_error");
        } else {
          setUsernameAvailable(!!data.available);
          setUsernameCode(data.code || null);
        }
      } catch {
        setUsernameAvailable(null);
        setUsernameCode("server_error");
        setUsernameDebug(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [username]);

  // Email availability check
  useEffect(() => {
    const e = (email || "").trim();
    if (!e) {
      setEmailAvailable(null);
      setEmailCode(null);
      return;
    }

    const t = setTimeout(async () => {
      setCheckingEmail(true);

      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(e)}`,
          { cache: "no-store", headers: { "cache-control": "no-cache" } }
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          setEmailAvailable(null);
          setEmailCode("error");
        } else {
          setEmailAvailable(!!data.available);
          setEmailCode(data.available ? "available" : "taken");
        }
      } catch {
        setEmailAvailable(null);
        setEmailCode("error");
      } finally {
        setCheckingEmail(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [email]);

  // Submit handler (with reCAPTCHA)
  const onSubmit = async (values) => {
    setError("");

    if (!recaptchaReady) {
      setError("Please wait… security checks are still loading.");
      return;
    }

    if (
      usernameInvalid ||
      usernameCode === "invalid_format" ||
      usernameCode === "reserved"
    ) {
      setError("Username must be 3–30 chars (a–z, 0–9), not reserved.");
      return;
    }
    if (usernameCode === "taken" || usernameAvailable === false) {
      setError("That username is already taken. Please choose another.");
      return;
    }
    if (emailAvailable === false || emailCode === "taken") {
      setError("That email is already in use. Please use a different email.");
      return;
    }

    setLoading(true);

    try {
      // 🛑 NEW SAFETY: Ensure grecaptcha exists to prevent infinite loading
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        setError(
          "Security checks failed to initialize. Please refresh the page."
        );
        setLoading(false);
        return;
      }

      // ⭐ FIX: Fully reliable reCAPTCHA execution
      const recaptchaToken = await new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(siteKey, { action: "register" })
            .then(resolve)
            .catch((err) => {
              console.error("reCAPTCHA execute error:", err);
              reject(err);
            });
        });
      });

      const cleanUsername = sanitizeUsername(values.username);

      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          username: cleanUsername,
          recaptchaToken,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res?.error) {
        setError(res.error);
      } else {
        await refreshUser();
        router.replace(nextUrl || redirect);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled =
    loading ||
    !recaptchaReady || // ← block until reCAPTCHA ready
    checkingUsername ||
    checkingEmail ||
    usernameInvalid ||
    usernameCode === "invalid_format" ||
    usernameCode === "reserved" ||
    usernameCode === "taken" ||
    emailAvailable === false;

  const preventBadUsernameInput = (e) => {
    if (!e.data) return;
    if (!/^[a-zA-Z0-9]$/.test(e.data)) e.preventDefault();
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-[var(--ms-blue)] dark:text-[var(--ms-light-gray)]">
          Create Account
        </h1>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* FIRST NAME */}
            <FormField
              control={form.control}
              name="firstName"
              rules={{ required: "First name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Jane"
                      autoComplete="given-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LAST NAME */}
            <FormField
              control={form.control}
              name="lastName"
              rules={{ required: "Last name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* USERNAME */}
            <FormField
              control={form.control}
              name="username"
              rules={{
                required: "Username is required",
                pattern: {
                  value: /^[a-z0-9]{3,30}$/,
                  message: "Use 3–30 lowercase letters or numbers (a–z, 0–9)",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="janedoe"
                      autoComplete="username"
                      onBeforeInput={preventBadUsernameInput}
                      onChange={(e) =>
                        field.onChange(sanitizeUsername(e.target.value))
                      }
                    />
                  </FormControl>

                  <div className="mt-1 text-sm">
                    {field.value ? (
                      usernameInvalid || usernameCode === "invalid_format" ? (
                        <span className="text-red-600">
                          Use 3–30 lowercase letters or numbers (a–z, 0–9)
                        </span>
                      ) : usernameCode === "reserved" ? (
                        <span className="text-red-600">
                          This username is reserved. Please choose another.
                        </span>
                      ) : checkingUsername ? (
                        <span className="text-gray-500">Checking…</span>
                      ) : usernameCode === "server_error" ? (
                        <span className="text-amber-600">
                          Couldn’t check right now. Try again.
                        </span>
                      ) : usernameAvailable === null ? (
                        <span className="text-gray-500">—</span>
                      ) : usernameCode === "taken" ? (
                        <span className="text-red-600">✕ Taken</span>
                      ) : usernameCode === "available" && usernameAvailable ? (
                        <span className="text-green-600">✓ Available</span>
                      ) : null
                    ) : null}
                  </div>

                  {usernameDebug && (
                    <div className="mt-1 text-xs text-gray-500">
                      server: {usernameCode} — normalized:
                      <code className="ml-1">
                        {usernameDebug.normalized ?? "n/a"}
                      </code>
                      {typeof usernameDebug.exists !== "undefined" && (
                        <>
                          , exists: <code>{String(usernameDebug.exists)}</code>
                        </>
                      )}
                      {usernameDebug.hit && (
                        <>
                          , hit: <code>{usernameDebug.hit}</code>
                        </>
                      )}
                      {usernameDebug.probe && (
                        <>
                          , probe: <code>true</code>
                        </>
                      )}
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* EMAIL */}
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
                      placeholder="jane@example.com"
                      autoComplete="email"
                    />
                  </FormControl>

                  <div className="mt-1 text-sm">
                    {field.value ? (
                      checkingEmail ? (
                        <span className="text-gray-500">Checking…</span>
                      ) : emailAvailable === null ? (
                        <span className="text-gray-500">—</span>
                      ) : emailCode === "error" ? (
                        <span className="text-amber-600">
                          Couldn’t check right now. Try again.
                        </span>
                      ) : emailAvailable ? (
                        <span className="text-green-600">✓ Available</span>
                      ) : (
                        <span className="text-red-600">✕ Already in use</span>
                      )
                    ) : null}
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PASSWORD */}
            <FormField
              control={form.control}
              name="password"
              rules={{
                required: "Password is required",
                minLength: { value: 6, message: "At least 6 characters" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SUBMIT */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-semibold shadow-md text-white bg-[var(--ms-blue)] hover:bg-[var(--ms-blue-gray)] transition disabled:opacity-60"
              disabled={submitDisabled}
            >
              {loading
                ? "Registering…"
                : recaptchaReady
                ? "Sign Up"
                : "Loading…"}
            </button>
          </form>
        </Form>

        <div className="my-6 text-center space-y-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            or continue with
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="/api/auth/google"
              onClick={() => {
                document.cookie = `post_auth_redirect=${encodeURIComponent(
                  redirect
                )}; Path=/; Max-Age=600; SameSite=Lax`;
              }}
              className="flex items-center gap-2 px-4 py-2 border rounded bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <GoogleIcon className="w-4 h-4" />
              Google
            </a>
          </div>
        </div>

        <div className="text-sm text-center mt-6 text-gray-600 dark:text-gray-400">
          Already have an account?
          <Link
            href={`/login?redirect=${encodeURIComponent(redirect)}`}
            className="ml-2 ms-link"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
