// lib/normalizeStyles.js
export function normalizeStyles(source) {
  const raw = Array.isArray(source) ? source : [];
  return raw
    .map((s) =>
      typeof s === "string"
        ? { styleName: s }
        : s && typeof s === "object"
        ? { styleName: s.styleName || s.name || s.title || "" }
        : null
    )
    .filter((s) => s && s.styleName);
}
