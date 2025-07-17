"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error"
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus("success");
      setMessage("✅ A password reset link has been sent to your email.");
    } else {
      setStatus("error");
      setMessage(data.message || "❌ Something went wrong.");
    }
  };

  const handleTryAgain = () => {
    setStatus(null);
    setMessage("");
    setEmail("");
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-4 border rounded shadow bg-white dark:bg-zinc-900">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>

      {status === "success" ? (
        <p className="text-green-600 dark:text-green-400 font-medium">
          {message}
        </p>
      ) : status === "error" ? (
        <div className="space-y-4">
          <p className="text-red-600 dark:text-red-400">{message}</p>
          <Button onClick={handleTryAgain}>Try Again</Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      )}
    </div>
  );
}
