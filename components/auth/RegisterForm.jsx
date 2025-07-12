"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import GoogleIcon from "@/components/icons/GoogleIcon";
import FacebookIcon from "@/components/icons/FacebookIcon";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const { refreshUser } = useUser();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    username: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const checkUsername = async () => {
      if (!form.username) return setUsernameAvailable(null);
      setCheckingUsername(true);
      try {
        const res = await apiFetch(
          `/api/auth/check-username?username=${form.username}`
        );
        setUsernameAvailable(res.available);
      } catch {
        setUsernameAvailable(null);
      }
      setCheckingUsername(false);
    };
    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [form.username]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });

      if (res.error) {
        setError(res.error);
      } else {
        await new Promise((res) => setTimeout(res, 300));
        await refreshUser();
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-[var(--ms-blue)] dark:text-[var(--ms-light-gray)]">
          Create Account
        </h1>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <InputField
            label="First Name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
          />
          <InputField
            label="Last Name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
          />
          <InputField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
          />
          {form.username && (
            <p className="text-sm mt-1">
              {checkingUsername ? (
                <span className="text-gray-500">Checking...</span>
              ) : usernameAvailable ? (
                <span className="text-green-500">✓ Available</span>
              ) : (
                <span className="text-red-500">✕ Taken</span>
              )}
            </p>
          )}
          <InputField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg font-semibold shadow-md text-white bg-[var(--ms-blue)] hover:bg-[var(--ms-blue-gray)] transition"
            disabled={loading}
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
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

        <div className="text-sm text-center mt-6 text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--ms-blue)] hover:underline"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-[var(--ms-light-gray)] dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--ms-blue)]"
      />
    </div>
  );
}
