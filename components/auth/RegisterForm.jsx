"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import FacebookIcon from "@/components/icons/FacebookIcon";

export default function RegisterForm({ redirect = "/dashboard" }) {
  const router = useRouter();
  const { refreshUser } = useUser();

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

  // Username / Email availability
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // true | false | null
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null); // true | false | null

  const username = form.watch("username");
  const email = form.watch("email");

  const usernameInvalid = !!username && !isUsernameFormatValid(username);

  // Debounced username check (only when valid)
  useEffect(() => {
    const u = (username || "").trim();
    if (!u) {
      setUsernameAvailable(null);
      return;
    }
    if (!isUsernameFormatValid(u)) {
      setUsernameAvailable(null);
      return;
    }

    const t = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await apiFetch(
          `/api/auth/check-username?username=${encodeURIComponent(u)}`
        );
        setUsernameAvailable(!!res?.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [username]);

  // Debounced email check
  useEffect(() => {
    const e = (email || "").trim();
    if (!e) {
      setEmailAvailable(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await apiFetch(
          `/api/auth/check-email?email=${encodeURIComponent(e)}`
        );
        setEmailAvailable(!!res?.available);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [email]);

  const onSubmit = async (values) => {
    setError("");

    // prevent submit if we *know* one is taken or invalid
    if (usernameInvalid) {
      setError("Username must be 3–30 chars (a–z, 0–9, - or _), not reserved.");
      return;
    }
    if (usernameAvailable === false) {
      setError("That username is already taken. Please choose another.");
      return;
    }
    if (emailAvailable === false) {
      setError("That email is already in use. Please use a different email.");
      return;
    }

    const cleanUsername = sanitizeUsername(values.username);

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...values, username: cleanUsername }),
        headers: { "Content-Type": "application/json" },
      });

      if (res?.error) {
        setError(res.error);
      } else {
        await refreshUser();
        router.replace(redirect);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // For OAuth: stash redirect for the callback to read
  const setRedirectCookie = () => {
    document.cookie = `post_auth_redirect=${encodeURIComponent(
      redirect
    )}; Path=/; Max-Age=600; SameSite=Lax`;
  };

  const submitDisabled =
    loading ||
    checkingUsername ||
    checkingEmail ||
    usernameInvalid ||
    usernameAvailable === false ||
    emailAvailable === false;

  // Prevent invalid keystrokes in username (still allows backspace/arrows/delete)
  const preventBadUsernameInput = (e) => {
    if (!e.data) return;
    if (!/^[a-zA-Z0-9_-]$/.test(e.data)) e.preventDefault();
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
            {/* First Name */}
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

            {/* Last Name */}
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

            {/* Username + availability (URL-safe only) */}
            <FormField
              control={form.control}
              name="username"
              rules={{
                required: "Username is required",
                minLength: { value: 3, message: "At least 3 characters" },
                pattern: {
                  value: /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/,
                  message: "Use a–z, 0–9, hyphen or underscore",
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
                      usernameInvalid ? (
                        <span className="text-red-600">
                          Use 3–30 chars: a–z, 0–9, - or _
                        </span>
                      ) : checkingUsername ? (
                        <span className="text-gray-500">Checking…</span>
                      ) : usernameAvailable === null ? (
                        <span className="text-gray-500">—</span>
                      ) : usernameAvailable ? (
                        <span className="text-green-600">✓ Available</span>
                      ) : (
                        <span className="text-red-600">✕ Taken</span>
                      )
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email + availability */}
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

            {/* Password */}
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

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-semibold shadow-md text-white bg-[var(--ms-blue)] hover:bg-[var(--ms-blue-gray)] transition disabled:opacity-60"
              disabled={submitDisabled}
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>
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
}
