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
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (searchParams.get("from")) {
      toast.info("You must be logged in to view that page.");
    }
    if (user) {
      router.replace(redirect); // ← go to redirect if already logged in
    }
  }, [user, router, searchParams, redirect]);

  return <LoginForm redirect={redirect} />; // ← pass it down
}
