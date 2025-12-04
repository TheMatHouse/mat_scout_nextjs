"use client";

import {
  decryptTeamEncryptedPayload,
  encryptTeamEncryptedPayload,
} from "@/lib/crypto/teamLock";

/**
 * STEP 5: CLIENT-SIDE REPORT + VIDEO DECRYPTOR
 *
 * Returns:
 *  {
 *    decryptedReport,   // merged decrypted fields
 *    decryptedVideos,   // { videoId: "plaintext notes" }
 *    reencryptBundle    // data needed to re-encrypt on save
 *  }
 */
export async function decryptReport(report, teamUnlockKey) {
  if (!report || !report.crypto) {
    // No encryption on this report
    return {
      decryptedReport: { ...report },
      decryptedVideos: {},
      reencryptBundle: null,
    };
  }

  // 1. Decrypt the report's main crypto block
  const decrypted = await decryptTeamEncryptedPayload(
    teamUnlockKey,
    report.crypto
  );

  // 2. Rebuild decrypted version of the report
  const decryptedReport = {
    ...report,
    ...decrypted,
    crypto: null,
  };

  // 3. Decrypt video.notes for each linked video
  const decryptedVideos = {};
  const reencryptBundle = {
    reportId: report._id,
    videos: {},
  };

  for (const v of report.videos || []) {
    if (v.crypto) {
      const plain = await decryptTeamEncryptedPayload(teamUnlockKey, v.crypto);
      decryptedVideos[v._id] = plain.notes || "";

      // Keep track for re-encryption on save
      reencryptBundle.videos[v._id] = plain.notes || "";
    } else {
      decryptedVideos[v._id] = v.notes || "";
      reencryptBundle.videos[v._id] = v.notes || "";
    }
  }

  // Also store decrypted report data for re-encryption
  reencryptBundle.report = { ...decryptedReport };

  return {
    decryptedReport,
    decryptedVideos,
    reencryptBundle,
  };
}

/**
 * STEP 5: CLIENT-SIDE RE-ENCRYPTION
 *
 * Arguments:
 *   decryptedReport        — full decrypted report object
 *   decryptedVideos        — { videoId: "plaintext notes" }
 *   teamUnlockKey          — raw key the user typed
 *   teamKeyVersion         — team.security.teamKeyVersion
 *
 * Returns:
 *   {
 *     crypto,       // for report
 *     videosCrypto, // { videoId: cryptoBlock }
 *   }
 */
export async function encryptReportForSave(
  decryptedReport,
  decryptedVideos,
  teamUnlockKey,
  teamKeyVersion
) {
  // Extract sensitive fields for report
  const sensitivePayload = {
    athleteFirstName: decryptedReport.athleteFirstName || "",
    athleteLastName: decryptedReport.athleteLastName || "",
    athleteNationalRank: decryptedReport.athleteNationalRank || "",
    athleteWorldRank: decryptedReport.athleteWorldRank || "",
    athleteClub: decryptedReport.athleteClub || "",
    athleteCountry: decryptedReport.athleteCountry || "",
    athleteGrip: decryptedReport.athleteGrip || "",
    athleteAttacks: Array.isArray(decryptedReport.athleteAttacks)
      ? decryptedReport.athleteAttacks
      : [],
    athleteAttackNotes: decryptedReport.athleteAttackNotes || "",
  };

  // Encrypt report block
  const reportEnc = await encryptTeamEncryptedPayload(
    teamUnlockKey,
    sensitivePayload,
    teamKeyVersion
  );

  const videosCrypto = {};

  // Encrypt each video's notes
  for (const [videoId, plaintextNotes] of Object.entries(decryptedVideos)) {
    const payload = { notes: plaintextNotes || "" };
    const enc = await encryptTeamEncryptedPayload(
      teamUnlockKey,
      payload,
      teamKeyVersion
    );
    videosCrypto[videoId] = enc;
  }

  return {
    crypto: reportEnc,
    videosCrypto,
  };
}
