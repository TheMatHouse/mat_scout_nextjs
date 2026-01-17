// lib/permissions/privateShares.js
import PrivateShare from "@/models/privateShareModel";

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function hasPrivateShareAccess({
  documentType,
  documentId,
  viewerId,
}) {
  if (!viewerId) return false;

  const share = await PrivateShare.findOne({
    documentType,
    documentId,
    sharedWithUserId: viewerId,
    revokedAt: null,
  })
    .select("expiresAt revokedAt")
    .lean();

  if (!share) return false;
  if (isExpired(share.expiresAt)) return false;

  return true;
}
