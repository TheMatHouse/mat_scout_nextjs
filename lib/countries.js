// lib/countries.js
import countries from "@/assets/countries.json";

/**
 * Build select options with pinned countries at the top.
 * - USA is forced to be first in the pinned list, the rest of the pinned list is alphabetical.
 * - A divider is inserted between pinned and the full list.
 * - Full list is alphabetical and still includes the pinned countries again (per request).
 *
 * @param {Object} opts
 * @param {string[]} opts.pin - alpha-3 codes to pin (e.g., ["USA","GBR","FRA","BRA","RUS","JPN"])
 * @param {boolean} opts.includeDivider - include a disabled divider row
 * @returns {{ value: string, label: string, disabled?: boolean }[]}
 */
export function buildCountryOptions({
  pin = ["USA", "GBR", "FRA", "BRA", "RUS", "JPN"],
  includeDivider = true,
} = {}) {
  // Normalize data to {code3, name}
  const rows = countries.map((c) => ({
    code3: c.code3,
    name: c.name,
  }));

  // Map for quick lookup
  const byCode3 = new Map(rows.map((r) => [r.code3, r]));

  // Pinned: keep USA first, then the rest A→Z
  const pinSet = new Set(pin);
  const usa = byCode3.get("USA");
  const othersPinned = [...pinSet]
    .filter((c3) => c3 !== "USA")
    .map((c3) => byCode3.get(c3))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const pinned = [...(usa ? [usa] : []), ...othersPinned];

  // Full list A→Z (still includes pinned ones again)
  const fullSorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));

  // Convert to your FormSelect’s { value, label } shape
  const toOption = (r) => ({
    value: r.code3, // use the 3-letter code as the value
    label: `${r.code3} — ${r.name}`, // nice readable label
  });

  const options = [
    ...pinned.map(toOption),
    ...(includeDivider
      ? [{ value: "__divider__", label: "──────────", disabled: true }]
      : []),
    ...fullSorted.map(toOption),
  ];

  return options;
}
