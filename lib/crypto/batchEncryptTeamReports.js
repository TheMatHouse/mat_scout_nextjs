// lib/crypto/batchEncryptTeamReports.js
import { deriveKeyFromPassword, encryptJson } from "@/lib/crypto/locker";

/**
 * Encrypt legacy (plaintext) scouting reports for a team.
 * Assumes you already have the teamPassword in memory (unlocked session)
 * and team.security.kdf { saltB64, iterations } available from the API.
 *
 * @param {Object} opts
 * @param {string} opts.slug
 * @param {string} opts.teamPassword
 * @param {{saltB64:string, iterations:number}} opts.kdf
 * @param {string} [opts.encVersion="v1"]
 * @param {(msg:string)=>void} [opts.onProgress]
 */
export async function batchEncryptTeamReports({
  slug,
  teamPassword,
  kdf,
  encVersion = "v1",
  onProgress = () => {},
}) {
  if (!slug || !teamPassword || !kdf?.saltB64 || !kdf?.iterations) {
    throw new Error("Missing inputs for batch encryption.");
  }

  const key = await deriveKeyFromPassword(
    teamPassword,
    kdf.saltB64,
    kdf.iterations
  ); // CryptoKey

  // 1) Fetch all team scouting reports (adjust your API if you paginate)
  const listRes = await fetch(
    `/api/teams/${encodeURIComponent(slug)}/scouting-reports?all=1`,
    {
      credentials: "include",
      headers: { accept: "application/json" },
    }
  );
  const listJson = await listRes.json().catch(() => ({}));
  const reports = Array.isArray(listJson.scoutingReports)
    ? listJson.scoutingReports
    : [];
  if (!reports.length) return { total: 0, updated: 0 };

  let updated = 0;

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];

    // If it already has ciphertext marker (example: r.ciphertext), skip.
    if (r?.ciphertextB64) continue;

    // Build the clear payload you consider “sensitive”.
    const sensitive = {
      athleteFirstName: r.athleteFirstName || "",
      athleteLastName: r.athleteLastName || "",
      athleteNationalRank: r.athleteNationalRank || "",
      athleteWorldRank: r.athleteWorldRank || "",
      athleteClub: r.athleteClub || "",
      athleteCountry: r.athleteCountry || "",
      athleteGrip: r.athleteGrip || "",
      athleteAttacks: Array.isArray(r.athleteAttacks) ? r.athleteAttacks : [],
      athleteAttackNotes: r.athleteAttackNotes || "",
      division: r.division || "",
      weightCategory: r.weightCategory || "",
      weightLabel: r.weightLabel || "",
      weightUnit: r.weightUnit || "",
      videos: Array.isArray(r.videos) ? r.videos : [],
    };

    // Encrypt sensitive JSON
    const { ivB64, ciphertextB64 } = await encryptJson(
      key,
      sensitive,
      encVersion
    );

    // Patch the report with ciphertext (server will store it and drop plaintext fields)
    const patchRes = await fetch(
      `/api/teams/${encodeURIComponent(
        slug
      )}/scouting-reports/${encodeURIComponent(r._id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          // marker fields; your route should recognize this and store ciphertext
          encVersion,
          ivB64,
          ciphertextB64,
          // optional: also set a tiny summary that remains plaintext (e.g., matchType, createdByName)
        }),
      }
    );

    if (patchRes.ok) {
      updated++;
      onProgress?.(`Encrypted ${updated}/${reports.length}`);
    } else {
      // Non-fatal; continue
      const errJson = await patchRes.json().catch(() => ({}));
      onProgress?.(
        `Failed ${i + 1}/${reports.length}: ${
          errJson?.message || patchRes.status
        }`
      );
    }
  }

  return { total: reports.length, updated };
}
