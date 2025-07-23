"use client";

import { useEffect } from "react";

export default function MetaMaskErrorFilter() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("MetaMask")) {
        return; // Ignore MetaMask-related errors
      }
      originalError(...args);
    };

    const originalLog = console.log;
    console.log = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("MetaMask")) {
        return; // Ignore MetaMask-related logs
      }
      originalLog(...args);
    };

    return () => {
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  return null;
}
