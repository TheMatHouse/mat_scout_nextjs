const isDev = process.env.NODE_ENV === "development";

// Basic logger with timestamps and environment check
const logger = {
  info: (...args) => {
    if (isDev) {
      console.log("ℹ️", new Date().toISOString(), ...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn("⚠️", new Date().toISOString(), ...args);
    }
  },
  error: (...args) => {
    // Always log errors, even in production
    console.error("❌", new Date().toISOString(), ...args);
  },
};

export default logger;
