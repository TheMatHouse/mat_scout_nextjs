"use client";
import { useEffect } from "react";

export default function AdminAreaTag() {
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      // Mark this user as internal while they’re in the admin area
      window.gtag("set", "user_properties", { internal: "1" });
    }
  }, []);
  return null;
}
