export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth-server";

/** ====== CONFIG ====== */
const COLLECTION = process.env.MEMBER_COLLECTION || "familyMembers";

/** ====== ADMIN GATE ====== */
function hasAdminAccess(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.role && ["admin", "owner", "superadmin"].includes(user.role))
    return true;
  if (Array.isArray(user.roles) && user.roles.includes("admin")) return true;
  if (
    Array.isArray(user.permissions) &&
    user.permissions.includes("manageUsers")
  )
    return true;
  return false;
}

/** ====== DB SINGLETON ====== */
let _client;
async function getDb() {
  if (_client?.topology?.isConnected())
    return _client.db(process.env.MONGODB_DB);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  _client = new MongoClient(uri, { maxPoolSize: 5 });
  await _client.connect();
  const dbName = process.env.MONGODB_DB || _client.db().databaseName;
  return _client.db(dbName);
}

/** ====== HELPERS ====== */
function parseListParams(sp) {
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(5, parseInt(sp.get("pageSize") || "20", 10))
  );
  const q = (sp.get("q") || "").trim();
  const sortParam = (sp.get("sort") || "-createdAt").trim(); // e.g. "-createdAt", "firstName"
  let sort = {};
  if (sortParam.startsWith("-")) sort[sortParam.slice(1)] = -1;
  else sort[sortParam] = 1;
  return { page, pageSize, q, sort };
}

function buildFilter(q) {
  if (!q) return {};
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return {
    $or: [
      { firstName: rx },
      { lastName: rx },
      { email: rx },
      { phone: rx },
      { relation: rx },
    ],
  };
}

function pickFields(doc) {
  // Convert to a safe, flat object for the table
  return {
    id: String(doc._id),
    firstName: doc.firstName || "",
    lastName: doc.lastName || "",
    email: doc.email || "",
    phone: doc.phone || "",
    relation: doc.relation || "",
    userId: doc.userId ? String(doc.userId) : "",
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

/** ====== LIST ====== */
export async function GET(req) {
  try {
    const me = await getCurrentUser();
    if (!hasAdminAccess(me)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = new URL(req.url).searchParams;
    const { page, pageSize, q, sort } = parseListParams(sp);
    const filter = buildFilter(q);

    const db = await getDb();
    const col = db.collection(COLLECTION);

    const [total, items] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter, {
          projection: {
            /* narrow if you like */
          },
        })
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
    ]);

    const rows = items.map(pickFields);
    const pages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      ok: true,
      meta: { page, pageSize, pages, total, q, sort },
      rows,
    });
  } catch (err) {
    console.error("Family members list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
