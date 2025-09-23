// lib/email/templates/followedMatchReport.js
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export function followedMatchReportSubject(actorName = "Someone you follow") {
  return `${actorName} posted a new match report`;
}

export function buildFollowedMatchReportEmail({
  actorName = "Someone you follow",
  actorUsername,
  matchType,
  eventName,
  matchDate,
  link,
} = {}) {
  const dateText = matchDate
    ? new Date(matchDate).toLocaleDateString()
    : undefined;

  const rows = [];
  if (matchType) rows.push(`<p><strong>Style:</strong> ${matchType}</p>`);
  if (eventName) rows.push(`<p><strong>Event:</strong> ${eventName}</p>`);
  if (dateText) rows.push(`<p><strong>Date:</strong> ${dateText}</p>`);

  const message = `
    <p>${actorName} (@${actorUsername}) just posted a new match report.</p>
    ${rows.join("\n")}
    <p>
      <a href="${link}"
         style="display:inline-block;background:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
        View match report
      </a>
    </p>
  `;

  return baseEmailTemplate({
    title: followedMatchReportSubject(actorName),
    message,
    ctaUrl: link || process.env.NEXT_PUBLIC_BASE_URL || "",
    ctaText: "Open MatScout",
  });
}
