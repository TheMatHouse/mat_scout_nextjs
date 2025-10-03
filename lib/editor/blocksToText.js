// lib/editor/blocksToText.js
export function blocksToText(data) {
  try {
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    const lines = [];

    for (const b of blocks) {
      if (!b || !b.type) continue;
      if (b.type === "paragraph") {
        const t = (b.data?.text || "")
          .replace(/<[^>]+>/g, "") // strip any inline tags
          .trim();
        if (t) lines.push(t);
      } else if (b.type === "list") {
        const items = Array.isArray(b.data?.items) ? b.data.items : [];
        for (const it of items) {
          const t = String(it || "")
            .replace(/<[^>]+>/g, "")
            .trim();
          if (t) lines.push(t);
        }
      }
    }
    return lines.join("\n").trim();
  } catch {
    return "";
  }
}
