"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input"; // shadcn input

export default function PasswordInput({
  className = "",
  autoComplete = "new-password",
  ...props
}) {
  const [show, setShow] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <Input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 px-3 flex items-center focus:outline-none"
        tabIndex={0}
      >
        {show ? (
          <EyeOff className="h-4 w-4 opacity-70" />
        ) : (
          <Eye className="h-4 w-4 opacity-70" />
        )}
      </button>
    </div>
  );
}
