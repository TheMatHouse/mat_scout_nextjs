export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth-server";

const COLLECTION = process.env.MEMBER_COLLECTION || "familyMembers";

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

function pickDetail(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    userId: doc.userId ? String(doc.userId) : "",
    firstName: doc.firstName || "",
    lastName: doc.lastName || "",
    email: doc.email || "",
    phone: doc.phone || "",
    relation: doc.relation || "",
    notes: doc.notes || "",
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    // include any other fields you keep:
    status: doc.status || "",
    birthdate: doc.birthdate || null,
    address: doc.address || "",
  };
}

export async function GET(req, { params }) {
  try {
    const me = await getCurrentUser();
    if (!hasAdminAccess(me)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = await getDb();
    const doc = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, member: pickDetail(doc) });
  } catch (err) {
    console.error("Family member detail error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family member" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const me = await getCurrentUser();
    if (!hasAdminAccess(me)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = await getDb();
    const res = await db
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount !== 1) {
      return NextResponse.json(
        { error: "Delete failed or not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Family member delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete family member" },
      { status: 500 }
    );
  }
}
