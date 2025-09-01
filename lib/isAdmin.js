// lib/isAdmin.js
export function isAdminUser(u) {
  if (!u) return false;

  // strict boolean
  if (u.isAdmin === true) return true;

  // tolerate strings/ints
  if (typeof u.isAdmin === "string") {
    const s = u.isAdmin.toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
  }
  if (typeof u.isAdmin === "number") {
    if (u.isAdmin === 1) return true;
  }

  // single role
  if (
    typeof u.role === "string" &&
    ["admin", "superadmin"].includes(u.role.toLowerCase())
  ) {
    return true;
  }

  const toStr = (x) => String(x || "").toLowerCase();

  // roles[]
  if (
    Array.isArray(u.roles) &&
    u.roles.some((r) => ["admin", "superadmin"].includes(toStr(r)))
  ) {
    return true;
  }

  // permissions[] / scopes[]
  if (
    Array.isArray(u.permissions) &&
    u.permissions.some((p) => ["admin", "site:admin"].includes(toStr(p)))
  ) {
    return true;
  }
  if (
    Array.isArray(u.scopes) &&
    u.scopes.some((s) => ["admin", "site:admin"].includes(toStr(s)))
  ) {
    return true;
  }

  // teamMemberships[] (if you elevate via team role/owner)
  if (Array.isArray(u.teamMemberships)) {
    if (
      u.teamMemberships.some(
        (m) =>
          m?.isAdmin === true ||
          toStr(m?.role) === "admin" ||
          toStr(m?.role) === "owner"
      )
    ) {
      return true;
    }
  }

  return false;
}
