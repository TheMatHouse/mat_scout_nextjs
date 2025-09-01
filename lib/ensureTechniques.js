// lib/ensureTechniques.js
import Technique from "@/models/techniquesModel";

/**
 * Ensure the given technique names exist in the DB (case-insensitive).
 * - Creates only missing docs (approved: false).
 * - No duplicate if an unapproved doc already exists.
 * - Safe to call on every report save.
 */
export async function ensureTechniques(names = []) {
  const unique = [
    ...new Set(
      (names || []).map((n) => String(n || "").trim()).filter(Boolean)
    ),
  ];
  if (unique.length === 0) return;

  const lowers = unique.map((n) => n.toLowerCase());
  const existing = await Technique.find(
    { nameLower: { $in: lowers } },
    { nameLower: 1 }
  ).lean();

  const have = new Set(existing.map((x) => x.nameLower));
  const toCreate = unique.filter((n, i) => !have.has(lowers[i]));
  if (toCreate.length === 0) return;

  await Technique.insertMany(
    toCreate.map((n) => ({ name: n, approved: false })),
    { ordered: false }
  );
}

// optional aliases so either import works
export const saveUnknownTechniques = ensureTechniques;
export default ensureTechniques;
