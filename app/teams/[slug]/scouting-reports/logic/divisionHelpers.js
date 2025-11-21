// app/teams/[slug]/scouting-reports/logic/divisionHelpers.js
"use client";

/* ---------------------------------------------------------
   Gender → Label
--------------------------------------------------------- */
export const genderLabel = (g) => {
  const s = String(g ?? "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};

/* ---------------------------------------------------------
   Division object → Display label
--------------------------------------------------------- */
export const computeDivisionDisplay = (division) => {
  if (!division) return "—";
  if (typeof division === "string") return division;

  if (typeof division === "object") {
    const name = division?.name || "";
    const g = genderLabel(division?.gender);

    return name ? (g ? `${name} — ${g}` : name) : "—";
  }
  return "—";
};

/* ---------------------------------------------------------
   Extract division ID from possible shapes
--------------------------------------------------------- */
export const getDivisionId = (div) => {
  if (!div) return "";
  if (typeof div === "string") return div;
  if (typeof div === "object") {
    if (div._id) return String(div._id);
    if (div.id) return String(div.id);
  }
  return "";
};

/* ---------------------------------------------------------
   Ensure weight label has units
--------------------------------------------------------- */
export function ensureWeightDisplay(label, unit) {
  if (!label) return "";
  const low = String(label).toLowerCase();

  if (low.includes("kg") || low.includes("lb")) return label;

  return unit ? `${label} ${unit}` : label;
}

/* ---------------------------------------------------------
   Fetch weight categories for a division
--------------------------------------------------------- */
export async function fetchDivisionWeights(divisionId) {
  const id = encodeURIComponent(String(divisionId));
  const url = `/api/divisions/${id}/weights`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));

    // API shape normalization
    const wc =
      data?.weightCategory ||
      data?.weights ||
      data?.weight ||
      data?.data ||
      data?.category ||
      data;

    if (!wc) return null;

    const unit = wc.unit || wc.weightUnit || "";
    const items = Array.isArray(wc.items) ? wc.items : [];

    const normalizedItems = items
      .map((it) => ({
        _id: String(it._id ?? it.id ?? it.value ?? it.label ?? "").trim(),
        label: String(it.label ?? it.value ?? "").trim(),
      }))
      .filter((x) => x._id && x.label);

    if (!normalizedItems.length) return null;

    return { unit, items: normalizedItems };
  } catch (err) {
    console.warn("[SCOUTING] fetchDivisionWeights failed", err);
    return null;
  }
}
