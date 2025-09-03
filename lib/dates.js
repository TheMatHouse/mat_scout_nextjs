// lib/dates.js

// Build "YYYY-MM" or "YYYY-MM-DD" while capping numeric input length.
export function maskISODate(value, { digitsLimit = 8 } = {}) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, digitsLimit);
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);

  let out = y;
  if (m) out += "-" + m;
  if (d) out += "-" + d;
  return out;
}

// Ensure a complete ISO date; if day is missing (digitsLimit=6), default to 01.
export function finalizeISODate(value, { digitsLimit = 8 } = {}) {
  const masked = maskISODate(value, { digitsLimit });
  if (!masked) return "";

  const [y = "", m = "", d = ""] = masked.split("-");
  if (y.length !== 4) return "";

  const yy = Math.min(Math.max(parseInt(y, 10) || 1900, 1900), 2100);
  let mm = Math.min(Math.max(parseInt(m || "1", 10), 1), 12);
  let dd = d ? parseInt(d, 10) : 1;

  const daysInMonth = new Date(yy, mm, 0).getDate();
  dd = Math.min(Math.max(dd || 1, 1), daysInMonth);

  return `${String(yy).padStart(4, "0")}-${String(mm).padStart(
    2,
    "0"
  )}-${String(dd).padStart(2, "0")}`;
}
