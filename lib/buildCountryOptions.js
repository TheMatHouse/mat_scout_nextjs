// lib/buildCountryOptions.js
import Countries from "@/assets/countries.json";

// default “pinned” list (USA first, rest A→Z by code)
const DEFAULT_PINNED = ["USA", "BRA", "GER", "GBR", "ESP", "FRA", "JPN", "RUS"];

/**
 * Build options for FormSelect with pinned countries at the top, a divider,
 * then the full list sorted by code3.
 *
 * returns: [{ key, value, label, disabled? }]
 */
export function buildCountryOptions(pin = DEFAULT_PINNED) {
  const rows = (Countries || []).map((c) => ({
    code3: c.code3 ?? c.cca3 ?? c.code ?? c.name,
    name: c.name,
  }));

  const byCode3 = new Map(rows.map((r) => [r.code3, r]));

  const usa = byCode3.get("USA");

  const others = pin
    .filter((c3) => c3 !== "USA")
    .map((c3) => byCode3.get(c3))
    .filter(Boolean)
    .sort((a, b) => a.code3.localeCompare(b.code3));

  const pinned = [...(usa ? [usa] : []), ...others];

  // FULL list sorted by code3 (IOC-style)
  const full = [...rows].sort((a, b) => a.code3.localeCompare(b.code3));

  const toPinned = (r) => ({
    key: `top-${r.code3}`,
    value: r.code3,
    label: `${r.code3} — ${r.name}`,
  });

  const toFull = (r) => ({
    key: `all-${r.code3}`,
    value: r.code3,
    label: `${r.code3} — ${r.name}`,
  });

  return [
    ...pinned.map(toPinned),
    {
      key: "divider",
      value: "__divider__",
      label: "──────────",
      disabled: true,
    },
    ...full.map(toFull),
  ];
}
