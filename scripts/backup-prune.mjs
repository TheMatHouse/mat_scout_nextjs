// scripts/backup-prune.mjs
// Deletes old backup files (*.json.gz) in BACKUP_DIR with safety guards.
// Usage examples:
//   node scripts/backup-prune.mjs --dry-run
//   node scripts/backup-prune.mjs --days=30 --min-keep=5 --max-delete=200
//   node scripts/backup-prune.mjs --dir=/home/deploy/backups/matscout/production
// Env fallbacks (in .env.production / .env.staging / .env):
//   BACKUP_DIR=/home/deploy/backups/matscout/production
//   BACKUP_RETENTION_DAYS=30
//   BACKUP_MIN_KEEP=5
//   BACKUP_MAX_DELETE=1000

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// --- Load env (.env.production / .env.staging / .env), if present ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envCandidates = [
  path.join(repoRoot, ".env.production"),
  path.join(repoRoot, ".env.staging"),
  path.join(repoRoot, ".env"),
];
const dotenvPath = envCandidates.find((p) => fs.existsSync(p));
if (dotenvPath) {
  const { config } = await import("dotenv");
  config({ path: dotenvPath });
  console.log(`[env] Loaded ${path.basename(dotenvPath)}`);
} else {
  console.log(
    "[env] No .env file found next to the repo; relying on process env"
  );
}

// --- helpers ---
function toNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((a) => {
      const m = a.match(/^--([^=]+)=(.*)$/);
      return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
    })
  );
}
function usage() {
  console.log(`
backup-prune.mjs

Deletes old backups in BACKUP_DIR with retention and safety guards.

Options:
  --days=N         Retention days (default BACKUP_RETENTION_DAYS or 30)
  --dir=PATH       Override BACKUP_DIR
  --min-keep=N     Always keep newest N files (default BACKUP_MIN_KEEP or 5)
  --max-delete=N   Max files to delete per run (default BACKUP_MAX_DELETE or 1000)
  --dry-run        Show what would be deleted, don't delete
  --help           Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const dir = args.dir || process.env.BACKUP_DIR;
  if (!dir) throw new Error("BACKUP_DIR not set and no --dir given.");

  const days = toNumber(
    args.days,
    toNumber(process.env.BACKUP_RETENTION_DAYS, 30)
  );
  const minKeep = toNumber(
    args["min-keep"],
    toNumber(process.env.BACKUP_MIN_KEEP, 5)
  );
  const maxDelete = toNumber(
    args["max-delete"],
    toNumber(process.env.BACKUP_MAX_DELETE, 1000)
  );
  const dryRun = !!args["dry-run"];

  // Check directory accessibility
  await fsp.mkdir(dir, { recursive: true });
  await fsp.access(dir, fs.constants.R_OK | fs.constants.W_OK);

  // List *.json.gz with mtime
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".json.gz")) continue;
    const full = path.join(dir, ent.name);
    const st = await fsp.stat(full);
    files.push({
      file: full,
      name: ent.name,
      mtimeMs: st.mtimeMs,
      size: st.size,
    });
  }

  if (!files.length) {
    console.log(`[prune] No *.json.gz backups found in ${dir}`);
    return;
  }

  // Sort newest -> oldest
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const now = Date.now();
  const cutoffMs = now - days * 86400000;

  let deleted = 0;
  let freedBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    // Always keep the newest N files regardless of age
    if (i < minKeep) {
      // console.log(`[keep:newest] ${f.name}`);
      continue;
    }

    // Keep if within retention window
    if (f.mtimeMs >= cutoffMs) {
      // console.log(`[keep:recent] ${f.name}`);
      continue;
    }

    // Respect max-delete cap
    if (deleted >= maxDelete) {
      console.log(`[skip:max-delete] ${f.name}`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY DEL] ${f.name}`);
    } else {
      try {
        await fsp.unlink(f.file);
        // Try to delete sidecar checksum if present
        const sha = f.file.replace(/\.json\.gz$/, ".json.gz.sha256");
        try {
          await fsp.unlink(sha);
        } catch {}
        console.log(`[DEL] ${f.name}`);
      } catch (e) {
        console.error(`[ERR] Failed to delete ${f.name}: ${e?.message || e}`);
        continue;
      }
    }
    deleted++;
    freedBytes += f.size;
  }

  const fmtBytes = (n) => {
    if (n < 1024) return `${n} B`;
    const u = ["KB", "MB", "GB", "TB"];
    let i = -1;
    do {
      n /= 1024;
      i++;
    } while (n >= 1024 && i < u.length - 1);
    return `${n.toFixed(1)} ${u[i]}`;
  };

  console.log(
    `${
      dryRun ? "Would delete" : "Deleted"
    } ${deleted} file(s), freed ${fmtBytes(freedBytes)} ` +
      `| dir=${dir}, days=${days}, minKeep=${minKeep}, maxDelete=${maxDelete}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
