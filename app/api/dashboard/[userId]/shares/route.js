export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import crypto from "crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import PrivateShare from "@/models/privateShareModel";
import PendingPrivateShareInvite from "@/models/pendingPrivateShareInviteModel";

import { createNotification } from "@/lib/createNotification";
import { sendEmail } from "@/lib/email/email";
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

function json(status, payload) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    "https://matscout.com"
  ).replace(/\/$/, "");
}

/**
 * One-time (best-effort) index reconciliation:
 * - Drops stale unique index referencing sharedWithUserId
 * - Replaces wrong combined unique index with 2 partial unique indexes:
 *   - scope=one unique includes documentId
 *   - scope=all unique excludes documentId
 */
async function ensurePrivateShareIndexes() {
  if (globalThis.__ms_privateShareIndexesReady) return;
  globalThis.__ms_privateShareIndexesReady = true;

  const collection =
    PrivateShare?.collection || mongoose.connection.collection("privateshares");

  const indexes = await collection.indexes().catch(() => []);

  // 1️⃣ Drop stale index with sharedWithUserId
  const staleName = "documentType_1_documentId_1_sharedWithUserId_1_scope_1";
  if (indexes.some((ix) => ix.name === staleName)) {
    await collection.dropIndex(staleName).catch(() => {});
  }

  // 2️⃣ Drop incorrect combined index if present
  const wrongName = "documentType_1_documentId_1_sharedWith_1_scope_1";
  if (indexes.some((ix) => ix.name === wrongName)) {
    await collection.dropIndex(wrongName).catch(() => {});
  }

  // 3️⃣ UNIQUE for scope === "one"
  await collection.createIndex(
    {
      documentType: 1,
      documentId: 1,
      "sharedWith.athleteType": 1,
      "sharedWith.athleteId": 1,
    },
    {
      unique: true,
      name: "privateShare_scope_one_unique",
      partialFilterExpression: { scope: "one" },
      background: true,
    }
  );

  // 4️⃣ UNIQUE for scope === "all" (NO documentId)
  await collection.createIndex(
    {
      documentType: 1,
      "sharedWith.athleteType": 1,
      "sharedWith.athleteId": 1,
    },
    {
      unique: true,
      name: "privateShare_scope_all_unique",
      partialFilterExpression: { scope: "all" },
      background: true,
    }
  );
}

async function safeSideEffect(fn, label, meta = {}) {
  try {
    await fn();
    return null;
  } catch (err) {
    // Don't fail the request after the DB write succeeds.
    // Log server-side so you can inspect in Vercel logs.
    console.error(`[PrivateShare] ${label} failed`, {
      ...meta,
      error: String(err?.message || err),
    });
    return String(err?.message || err);
  }
}

/* ============================================================
   GET — list shares + invites
   ============================================================ */
export async function GET(req, ctx) {
  try {
    const { userId } = await ctx.params;
    const url = new URL(req.url);

    const documentType = url.searchParams.get("documentType");
    const documentId = url.searchParams.get("documentId");

    if (!documentType) {
      return json(400, { message: "Missing documentType" });
    }

    await connectDB();
    await ensurePrivateShareIndexes();

    const query = { ownerId: userId, documentType };
    if (documentId) {
      query.$or = [{ scope: "one", documentId }, { scope: "all" }];
    }

    const sharesRaw = await PrivateShare.find(query).lean();

    const userIds = [];
    const familyIds = [];

    for (const s of sharesRaw) {
      if (s.sharedWith?.athleteType === "user") {
        userIds.push(s.sharedWith.athleteId);
      } else if (s.sharedWith?.athleteType === "family") {
        familyIds.push(s.sharedWith.athleteId);
      }
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select("username name email")
      .lean();

    const families = await FamilyMember.find({ _id: { $in: familyIds } })
      .select("username firstName lastName userId")
      .lean();

    const userMap = {};
    users.forEach((u) => (userMap[String(u._id)] = u));

    const familyMap = {};
    families.forEach((f) => (familyMap[String(f._id)] = f));

    const shares = sharesRaw.map((s) => {
      if (s.sharedWith?.athleteType === "user") {
        return { ...s, user: userMap[String(s.sharedWith.athleteId)] || null };
      }
      if (s.sharedWith?.athleteType === "family") {
        return {
          ...s,
          family: familyMap[String(s.sharedWith.athleteId)] || null,
        };
      }
      return s;
    });

    const invites = await PendingPrivateShareInvite.find({
      ownerId: userId,
      documentType,
      ...(documentId ? { documentId } : {}),
      acceptedAt: null,
    }).lean();

    return json(200, { shares, invites });
  } catch (err) {
    return json(500, {
      message: "Failed to load shares",
      details: String(err?.message || err),
    });
  }
}

/* ============================================================
   POST — create share or invite (HARDENED + IDEMPOTENT)
   ============================================================ */
export async function POST(req, ctx) {
  const warnings = [];

  try {
    const { userId } = await ctx.params;

    await connectDB();
    await ensurePrivateShareIndexes();

    const body = await req.json().catch(() => ({}));
    const { documentType, documentId, scope } = body;

    if (!documentType || !scope || (scope === "one" && !documentId)) {
      return json(400, { message: "Missing fields" });
    }

    const reportLabel =
      documentType === "match-report" ? "match report" : "scouting report";

    const reportsLabel =
      documentType === "match-report" ? "match reports" : "scouting reports";

    const sender = await User.findById(userId).select("firstName lastName");
    const senderName = `${sender?.firstName || ""} ${
      sender?.lastName || ""
    }`.trim();

    if (!senderName) {
      return json(500, { message: "Sender name missing" });
    }

    /* ---------- Share to existing user / family ---------- */
    if (body.targetType && body.targetId) {
      let athlete = null;
      let notifyUser = null;
      let notifyLabel = "";

      if (body.targetType === "user") {
        athlete = await User.findById(body.targetId);
        notifyUser = athlete;
        notifyLabel = "you";
      } else if (body.targetType === "family") {
        athlete = await FamilyMember.findById(body.targetId);
        if (athlete?.userId) {
          notifyUser = await User.findById(athlete.userId);
          notifyLabel = `${athlete.firstName} ${athlete.lastName}`.trim();
        }
      }

      if (!athlete || !notifyUser) {
        return json(400, { message: "Target not found" });
      }

      const shareQuery = {
        ownerId: userId,
        documentType,
        scope,
        ...(scope === "one" ? { documentId } : {}),
        "sharedWith.athleteType": body.targetType,
        "sharedWith.athleteId": body.targetId,
      };

      const now = new Date();

      let result;
      try {
        result = await PrivateShare.findOneAndUpdate(
          shareQuery,
          {
            $setOnInsert: {
              ownerId: userId,
              documentType,
              ...(scope === "one" ? { documentId } : {}),
              scope,
              sharedWith: {
                athleteType: body.targetType,
                athleteId: body.targetId,
              },
              createdAt: now,
            },
            $set: {
              updatedAt: now,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            rawResult: true,
          }
        );
      } catch (err) {
        // If unique conflict happens, treat as idempotent success by fetching existing doc
        if (err?.code === 11000) {
          const existing = await PrivateShare.findOne(shareQuery).lean();
          if (existing) {
            return json(200, { type: "share", share: existing, deduped: true });
          }
        }
        throw err;
      }

      // rawResult can be shaped differently depending on mongoose version;
      // always normalize by fetching if needed.
      let share = result?.value || null;
      if (!share) {
        share = await PrivateShare.findOne(shareQuery).lean();
      }

      if (!share) {
        return json(500, { message: "Failed to create share" });
      }

      const wasInserted = result?.lastErrorObject
        ? !result.lastErrorObject.updatedExisting
        : false;

      // If it already existed, we're done (idempotent + no duplicate notifications/emails).
      if (!wasInserted) {
        return json(200, { type: "share", share });
      }

      /* ---------- Notification (non-fatal) ---------- */
      const notifErr = await safeSideEffect(
        async () => {
          await createNotification({
            userId: notifyUser._id,
            type: "Report Shared",
            body:
              scope === "all"
                ? `${senderName} shared all ${reportsLabel} with ${notifyLabel}.`
                : `${senderName} shared a ${reportLabel} with ${notifyLabel}.`,
            link: "/dashboard/matches?view=shared",
          });
        },
        "createNotification",
        {
          userId,
          notifyUserId: String(notifyUser._id),
          shareId: String(share._id),
        }
      );
      if (notifErr) warnings.push({ type: "notification", message: notifErr });

      /* ---------- Email (non-fatal) ---------- */
      const dashboardUrl = `${getBaseUrl()}/dashboard/matches?view=shared`;

      const subject =
        scope === "all"
          ? `New ${reportsLabel} shared with you`
          : `A ${reportLabel} was shared with you`;

      const html = baseEmailTemplate({
        title: "Report Shared",
        message: `
          <p>Hi ${notifyUser.firstName},</p>

          <p>
            <strong>${senderName}</strong> has shared ${
          scope === "all" ? `all of their ${reportsLabel}` : `a ${reportLabel}`
        } with ${notifyLabel}.
          </p>

          <p>
            <strong>Dashboard → Matches → Shared With Me</strong>
          </p>
        `,
        ctaUrl: dashboardUrl,
        ctaText: "View Shared Reports",
      });

      const emailErr = await safeSideEffect(
        async () => {
          await Mail.sendEmail({
            type: Mail.kinds.SCOUTING_REPORT,
            toUser: notifyUser,
            subject,
            html,
            relatedUserId: notifyUser._id.toString(),
          });
        },
        "sendEmail",
        {
          userId,
          notifyUserId: String(notifyUser._id),
          shareId: String(share._id),
        }
      );
      if (emailErr) warnings.push({ type: "email", message: emailErr });

      return json(200, {
        type: "share",
        share,
        ...(warnings.length ? { warnings } : {}),
      });
    }

    /* ---------- Email invite ---------- */
    if (body.email) {
      const email = String(body.email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(400, { message: "Invalid email" });
      }

      const invite = await PendingPrivateShareInvite.create({
        ownerId: userId,
        documentType,
        scope,
        ...(scope === "one" ? { documentId } : {}),
        email,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // ✅ IMPORTANT: Invite emails must go to /share/<token>, NOT /dashboard.
      const inviteUrl = `${getBaseUrl()}/share/${invite.token}`;

      const subject =
        scope === "all"
          ? `You've been invited to view ${reportsLabel} on MatScout`
          : `You've been invited to view a ${reportLabel} on MatScout`;

      const html = baseEmailTemplate({
        title: "You've been invited",
        message: `
          <p>Hi,</p>

          <p>
            <strong>${senderName}</strong> has invited you to view ${
          scope === "all" ? reportsLabel : `a ${reportLabel}`
        } on MatScout.
          </p>

          <p>
            If you don’t have an account yet, you’ll be able to create one after clicking the button below.
          </p>
        `,
        ctaUrl: inviteUrl,
        ctaText: "View Invite",
      });

      const inviteEmailErr = await safeSideEffect(
        async () => {
          // NOTE: Only email functionality changed here:
          // For non-users, use the raw-email helper (sendEmail) which accepts { to, subject, html }.
          await sendEmail({
            to: email,
            subject,
            html,
          });
        },
        "sendInviteEmail",
        {
          userId,
          email,
          inviteId: String(invite._id),
        }
      );
      if (inviteEmailErr)
        warnings.push({ type: "email", message: inviteEmailErr });

      return json(200, {
        type: "invite",
        email,
        inviteId: invite._id,
        inviteUrl,
        ...(warnings.length ? { warnings } : {}),
      });
    }

    return json(400, { message: "Missing target" });
  } catch (err) {
    // If anything throws, we still want clean JSON back.
    return json(500, {
      message: "Failed to create share",
      details: String(err?.message || err),
    });
  }
}
