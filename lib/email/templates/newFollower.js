// lib/email/templates/newFollower.js
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export function buildNewFollowerEmail({
  actorUsername,
  actorName,
  profileUrl,
}) {
  const name = actorName || actorUsername || "A MatScout user";
  const message = `
    <p><strong>${name}</strong> (@${actorUsername}) just started following you.</p>
    <p>
      <a href="${profileUrl}"
         style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
        View profile
      </a>
    </p>
  `;
  return baseEmailTemplate({
    title: "You have a new follower",
    message,
    ctaUrl: profileUrl,
    ctaText: "View profile",
  });
}

export const newFollowerSubject = "You have a new follower on MatScout";
