"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard"; // ← preserve it

  useEffect(() => {
    if (user) {
      router.replace(redirect); // ← go to intended place if already logged in
    }
  }, [user, router, redirect]);

  return <RegisterForm redirect={redirect} />; // ← pass it to the form
}
