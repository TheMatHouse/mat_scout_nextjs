// lib/saveUnknownTechniques.js
import Technique from "@/models/techniquesModel";

/**
 * Save unknown techniques to the DB as pending.
 * @param {Array<string>} techniques
 */
export async function saveUnknownTechniques(techniques = []) {
  if (!Array.isArray(techniques) || techniques.length === 0) return;

  for (const raw of techniques) {
    const name = String(raw || "").trim();
    if (!name) continue;

    const nameLower = name.toLowerCase();

    const exists = await Technique.findOne({ nameLower }).lean();
    if (exists) continue;

    await Technique.create({
      name,
      nameLower,
      approved: false,
    });
  }
}
