// lib/email/templates/followedProfileUpdate.js
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const followedProfileUpdateSubject = (actorName = "A user") =>
  `${actorName} updated their profile on MatScout`;

export function buildFollowedProfileUpdateEmail({
  actorName = "A user",
  actorUsername = "",
  changedFields = [],
  link,
} = {}) {
  const site =
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://matscout.com";

  const profileUrl =
    link || `${site}/${encodeURIComponent(actorUsername || "")}`;

  const fields =
    Array.isArray(changedFields) && changedFields.length
      ? `<ul style="margin:8px 0 0 16px;padding:0;">
           ${changedFields
             .map(
               (f) =>
                 `<li style="margin:4px 0;color:#374151;">${String(f)}</li>`
             )
             .join("")}
         </ul>`
      : "";

  const message = `
    <p><strong>${actorName}</strong> updated their profile.</p>
    ${
      fields
        ? `<p style="margin:8px 0 0 0;color:#6b7280;">Changes:</p>${fields}`
        : ""
    }
    <p style="margin-top:16px;">Tap below to view their profile.</p>
  `;

  return baseEmailTemplate({
    title: "Profile updated",
    message,
    ctaUrl: profileUrl,
    ctaText: "View Profile",
  });
}
