"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return <LoginForm />;
}
