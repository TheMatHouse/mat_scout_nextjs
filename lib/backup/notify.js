// lib/backup/notify.js
import { sendEmail } from "@/lib/email/email";

/** Format bytes nicely */
function fmtBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "-";
  if (n < 1024) return n + " B";
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(1)} ${u[i]}`;
}

function envName() {
  return (
    process.env.BACKUP_ENV_NAME ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    (process.env.NODE_ENV === "production" ? "Production" : "Staging")
  );
}

/** Render details object into HTML rows */
function detailsToHtml(details = {}) {
  const rows = Object.entries(details).map(([k, v]) => {
    const value =
      typeof v === "number"
        ? v
        : typeof v === "boolean"
        ? v
          ? "true"
          : "false"
        : v ?? "-";
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;"><b>${k}</b></td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${value}</td></tr>`;
  });
  return `<table cellspacing="0" cellpadding="0" style="border:1px solid #eee;border-radius:6px;width:100%;max-width:680px">${rows.join(
    ""
  )}</table>`;
}

/** Render details object into plaintext lines */
function detailsToText(details = {}) {
  return Object.entries(details)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

/**
 * Send a backup notification via Email (Resend) and/or Slack (incoming webhook).
 * Named export (no default).
 */
export async function sendBackupNotification({ event, ok, details = {} }) {
  const env = envName();
  const channel = ok ? "OK" : "FAILED";
  const eventLabel = (event || "").toUpperCase(); // SAVE/PRUNE/RESTORE

  const decorated = { ...details };
  if (typeof decorated.bytes === "number") {
    decorated["bytes (pretty)"] = fmtBytes(decorated.bytes);
  }
  if (typeof decorated.freedBytes === "number") {
    decorated["freedBytes (pretty)"] = fmtBytes(decorated.freedBytes);
  }

  const subject = `[${env}] BACKUP ${eventLabel} ${channel}`;
  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 8px 0;">${subject}</h2>
      ${detailsToHtml(decorated)}
      <p style="color:#999;margin-top:12px;">MatScout backup notifier</p>
    </div>`;
  const text = `${subject}\n\n${detailsToText(
    decorated
  )}\n\nMatScout backup notifier`;

  // EMAIL (optional)
  const recipients = (process.env.BACKUP_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (recipients.length) {
    try {
      await sendEmail({ to: recipients, subject, html, text });
    } catch (e) {
      console.error("backup notify email error:", e?.message || e);
    }
  }

  // SLACK (optional)
  const slackUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (slackUrl) {
    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${subject}*\n${detailsToText(decorated)}`,
        }),
      });
    } catch (e) {
      console.error("backup notify slack error:", e?.message || e);
    }
  }

  if (!recipients.length && !slackUrl) {
    console.log(
      "backup notify: no BACKUP_NOTIFY_EMAILS or SLACK_WEBHOOK_URL configured"
    );
  }
}
