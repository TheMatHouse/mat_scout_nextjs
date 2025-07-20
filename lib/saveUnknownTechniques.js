import Technique from "@/models/techniquesModel";

/**
 * Save unknown techniques to the DB.
 * @param {Array<string>} techniques - Array of technique names.
 * @returns {Promise<void>}
 */
export async function saveUnknownTechniques(techniques = []) {
  if (!Array.isArray(techniques)) return;

  for (const name of techniques) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const exists = await Technique.findOne({ name: trimmed });
    if (!exists) {
      await Technique.create({ name: trimmed, approved: false });
    }
  }
}
