// lib/email/templates/followedAvatarChange.js
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export function followedAvatarChangeSubject(actorName = "Someone you follow") {
  return `${actorName} updated their profile photo`;
}

export function buildFollowedAvatarChangeEmail({
  actorName = "Someone you follow",
  actorUsername,
  avatarUrl,
  link,
} = {}) {
  const safeLink =
    link ||
    `${
      process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || ""
    }/${encodeURIComponent(actorUsername)}`;

  const previewImg = avatarUrl
    ? `<p style="margin:14px 0;"><img src="${avatarUrl}" alt="New avatar" style="max-width:120px;border-radius:9999px;border:1px solid #e5e7eb"/></p>`
    : "";

  const message = `
    <p>${actorName} (@${actorUsername}) just updated their profile photo.</p>
    ${previewImg}
    <p>
      <a href="${safeLink}"
         style="display:inline-block;background:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
        View profile
      </a>
    </p>
  `;

  return baseEmailTemplate({
    title: followedAvatarChangeSubject(actorName),
    message,
    ctaUrl: safeLink,
    ctaText: "Open MatScout",
  });
}
