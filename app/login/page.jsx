"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import LoginForm from "@/components/auth/LoginForm";
import { toast } from "react-toastify";

export default function LoginPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If redirected from a protected page, show a toast
    if (searchParams.get("from")) {
      toast.info("You must be logged in to view that page.");
    }

    // Redirect if already logged in
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router, searchParams]);

  return <LoginForm />;
}
