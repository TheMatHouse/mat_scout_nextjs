// lib/backup/restore.js
import { connectDB } from "@/lib/mongo";

/**
 * We try to import models softly so missing ones won't crash restores.
 * Adjust the list/paths to match your project. Only those present in the backup will be used.
 */
async function softImport(path) {
  try {
    const mod = await import(path);
    return mod.default || mod;
  } catch {
    return null;
  }
}

// Order matters if you ever switch to "merge without wipe".
// For "wipe-and-seed", we delete all and then insert; ordering is less critical but we keep a sane order.
const COLLECTIONS = [
  { key: "users", modelPath: "@/models/userModel" },
  { key: "familyMembers", modelPath: "@/models/familyMemberModel" },
  { key: "teams", modelPath: "@/models/teamModel" },
  { key: "userStyles", modelPath: "@/models/userStyleModel" },
  { key: "matchReports", modelPath: "@/models/matchReportModel" },
  { key: "scoutingReports", modelPath: "@/models/scoutingReportModel" },

  // Messaging / contact
  { key: "contactThreads", modelPath: "@/models/contactThreadModel" },
  { key: "contactMessages", modelPath: "@/models/contactMessageModel" },

  // Optional (only if you have them)
  { key: "teamInvites", modelPath: "@/models/teamInviteModel" },
  { key: "notifications", modelPath: "@/models/notificationModel" },
  { key: "teamUpdates", modelPath: "@/models/teamUpdateModel" },
  { key: "techniques", modelPath: "@/models/techniqueModel" },
  { key: "videos", modelPath: "@/models/videoModel" },
];

function toArray(x) {
  return Array.isArray(x) ? x : [];
}

function summarize(incoming, current) {
  const out = [];
  for (const row of incoming) {
    const cur = current.find((c) => c.key === row.key);
    out.push({
      key: row.key,
      incoming: row.count,
      current: cur ? cur.count : 0,
      action: "wipe-and-seed", // current strategy
    });
  }
  return out;
}

/** Build a minimal "shape" out of the uploaded JSON */
export function parseBackupJSON(json) {
  // Expect an object with arrays keyed by collection names.
  // If backup uses a wrapper like { data: {...} }, unwrap it.
  const root = json?.data && typeof json.data === "object" ? json.data : json;
  const out = {};
  for (const { key } of COLLECTIONS) {
    if (root[key] && Array.isArray(root[key])) out[key] = root[key];
  }
  return out;
}

/** Preview counts without writing anything. */
export async function previewRestore(data) {
  await connectDB();

  // incoming counts
  const incoming = [];
  for (const { key } of COLLECTIONS) {
    if (!data[key]) continue;
    incoming.push({ key, count: toArray(data[key]).length });
  }

  // current counts
  const current = [];
  for (const { key, modelPath } of COLLECTIONS) {
    const Model = await softImport(modelPath);
    if (!Model) continue;
    const count = await Model.countDocuments();
    current.push({ key, count });
  }

  return {
    ok: true,
    plan: summarize(incoming, current),
  };
}

/**
 * Apply the restore.
 * Strategy: wipe-and-seed — delete all docs in a collection, then insert the incoming ones (keeping _id where present).
 * Only touches collections present in the uploaded backup.
 */
export async function applyRestore(data) {
  await connectDB();

  const results = [];
  for (const { key, modelPath } of COLLECTIONS) {
    const docs = data[key];
    if (!docs || !docs.length) continue;

    const Model = await softImport(modelPath);
    if (!Model) {
      results.push({
        key,
        skipped: true,
        reason: `Model not found for ${key}`,
      });
      continue;
    }

    // wipe
    await Model.deleteMany({});

    // seed
    let inserted = 0;
    if (docs.length) {
      // We pass raw docs; if some fields don't match strict schema, you can relax or map here if needed.
      const res = await Model.insertMany(docs, { ordered: false });
      inserted = Array.isArray(res)
        ? res.length
        : res?.insertedCount || docs.length;
    }

    results.push({ key, inserted });
  }

  return { ok: true, results };
}
