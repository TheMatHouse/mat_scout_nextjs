// /lib/reports/normalizeScoutingReport.js

/**
 * Normalizes a scouting report form payload to what the API/model expects.
 * - Accepts division as object or id or label
 * - Accepts weight as category object/id or a label like "73kg"
 * - Passes through crypto (if present) untouched
 *
 * Params:
 *  form: {
 *    matchType, style, athleteFirstName, athleteLastName, athleteNationalRank,
 *    athleteWorldRank, athleteClub, athleteCountry, athleteGrip,
 *    athleteAttacks, athleteAttackNotes, videos, accessList, reportFor,
 *    division,             // id | object | label
 *    weightCategory,       // id | object | label (often "73kg")
 *    weightLabel,          // optional explicit label
 *    weightUnit,           // optional ("kg" | "lb")
 *    crypto                // optional block if encrypting
 *  }
 *
 *  divisionObj?: { _id, name, gender, ... }   // if you already have a loaded object
 *  weightCategoryObj?: { _id, unit, items:[{_id,label}], ... }
 *
 * Return: normalized plain object for POST/PATCH
 */
export function normalizeScoutingReport(
  form,
  { divisionObj, weightCategoryObj } = {}
) {
  const pickId = (x) => {
    if (!x) return null;
    if (typeof x === "string") return x.trim();
    if (typeof x === "object")
      return String(x._id || x.id || "").trim() || null;
    return null;
  };

  const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  const out = {
    // WHO/ACCESS
    reportFor: toArray(form?.reportFor),
    accessList: toArray(form?.accessList),

    // CONTEXT
    matchType: (form?.matchType || "").trim(),
    style: pickId(form?.style),

    // ATHLETE
    athleteFirstName: (form?.athleteFirstName || "").trim(),
    athleteLastName: (form?.athleteLastName || "").trim(),
    athleteNationalRank: (form?.athleteNationalRank || "").trim(),
    athleteWorldRank: (form?.athleteWorldRank || "").trim(),
    athleteClub: (form?.athleteClub || "").trim(),
    athleteCountry: (form?.athleteCountry || "").trim(),
    athleteGrip: (form?.athleteGrip || "").trim(),
    athleteAttacks: Array.isArray(form?.athleteAttacks)
      ? form.athleteAttacks
      : [],
    athleteAttackNotes: (form?.athleteAttackNotes || "").trim(),

    // RELATIONS
    videos: Array.isArray(form?.videos) ? form.videos : [],

    // CRYPTO (optional)
    crypto: form?.crypto || null,
  };

  // ----- Division -----
  // Prefer an explicit object if you have it; else an id string; else leave null (route will coerce label)
  out.division =
    pickId(divisionObj) ||
    pickId(form?.division) ||
    (typeof form?.division === "string" ? form.division.trim() : null);

  // ----- Weight -----
  // If weightCategoryObj given, trust it for unit and allow label override
  if (weightCategoryObj && typeof weightCategoryObj === "object") {
    out.weightCategory = pickId(weightCategoryObj);
    out.weightUnit =
      (weightCategoryObj.unit || form?.weightUnit || "").trim() || null;
    out.weightLabel = (form?.weightLabel || "").trim() || null;
  } else {
    // Otherwise: allow either id/object OR free-text label
    const wcId = pickId(form?.weightCategory);
    out.weightCategory =
      wcId ||
      (typeof form?.weightCategory === "string"
        ? form.weightCategory.trim()
        : null);
    out.weightLabel = (form?.weightLabel || "").trim() || null;
    out.weightUnit = (form?.weightUnit || "").trim() || null;
  }

  return out;
}
