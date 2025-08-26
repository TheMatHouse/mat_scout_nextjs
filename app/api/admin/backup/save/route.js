export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { dumpAll } from "@/lib/backup/dump";
import zlib from "zlib";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { sha256Hex, encryptAesGcm } from "@/lib/backup/integrity";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const includeSensitive =
      url.searchParams.get("includeSensitive") === "true";

    const dir = process.env.BACKUP_DIR || "";
    if (!dir) return ok({ error: "BACKUP_DIR is not set on the server." }, 400);

    await fsp.mkdir(dir, { recursive: true });
    await fsp.access(dir, fs.constants.W_OK);

    // 1) Build gzipped JSON snapshot
    const data = await dumpAll({ includeSensitive });
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(data), "utf8"));

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `matscout-backup-${ts}${
      includeSensitive ? "-full" : ""
    }.json.gz`;

    const pass = process.env.BACKUP_ENCRYPTION_PASSPHRASE?.trim();
    if (pass) {
      // 2a) ENCRYPTED write: .enc + .meta.json + .sha256
      const { ciphertext, salt, iv, tag } = encryptAesGcm(gz, pass);

      const fileEnc = path.join(dir, `${base}.enc`);
      const fileMeta = `${fileEnc}.meta.json`;
      const fileSha = `${fileEnc}.sha256`;

      await fsp.writeFile(fileEnc, ciphertext);
      await fsp.writeFile(
        fileMeta,
        JSON.stringify(
          {
            alg: "AES-256-GCM",
            kdf: "scrypt",
            salt_b64: salt.toString("base64"),
            iv_b64: iv.toString("base64"),
            tag_b64: tag.toString("base64"),
            original: base,
          },
          null,
          2
        )
      );
      const sha = sha256Hex(ciphertext);
      await fsp.writeFile(
        fileSha,
        `${sha}  ${path.basename(fileEnc)}\n`,
        "utf8"
      );

      return ok({
        ok: true,
        encrypted: true,
        includeSensitive,
        path: fileEnc,
        pathMeta: fileMeta,
        bytes: ciphertext.length,
        sha256: sha,
      });
    }

    // 2b) PLAINTEXT write: .json.gz + .sha256
    const file = path.join(dir, base);
    const fileSha = `${file}.sha256`;

    await fsp.writeFile(file, gz);
    const sha = sha256Hex(gz);
    await fsp.writeFile(fileSha, `${sha}  ${path.basename(file)}\n`, "utf8");

    return ok({
      ok: true,
      encrypted: false,
      includeSensitive,
      path: file,
      bytes: gz.length,
      sha256: sha,
    });
  } catch (err) {
    console.error("Save backup error:", err);
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
