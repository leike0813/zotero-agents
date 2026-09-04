export type SupportedZoteroMajor = 7 | 9 | 10 | "unknown";

const SUPPORTED_ZOTERO_MAJORS = new Set<number>([7, 9, 10]);

export function parseSupportedZoteroMajor(
  version: unknown,
): SupportedZoteroMajor {
  const match = /^(\d+)(?:\.|$)/.exec(String(version || "").trim());
  if (!match) {
    return "unknown";
  }
  const major = Number(match[1]);
  return SUPPORTED_ZOTERO_MAJORS.has(major)
    ? (major as Exclude<SupportedZoteroMajor, "unknown">)
    : "unknown";
}
