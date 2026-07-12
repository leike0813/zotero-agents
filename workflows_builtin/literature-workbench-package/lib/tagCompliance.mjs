function normalizeTagList(values) {
  const seen = new Set();
  const normalized = [];
  for (const value of Array.isArray(values) ? values : []) {
    const tag = String(value || "").trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
  }
  return normalized;
}

export function evaluateTagCompliance({ tags, controlledTags } = {}) {
  const itemTags = normalizeTagList(tags);
  const allowed = new Set(normalizeTagList(controlledTags));
  const nonCompliantTags = itemTags.filter((tag) => !allowed.has(tag));
  return {
    compliant: nonCompliantTags.length === 0,
    nonCompliantTags,
  };
}
