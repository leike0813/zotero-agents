const SUPPORTED_ZOTERO_MAJORS = new Set([7, 9, 10]);
export function parseSupportedZoteroMajor(version) {
    const match = /^(\d+)(?:\.|$)/.exec(String(version || "").trim());
    if (!match) {
        return "unknown";
    }
    const major = Number(match[1]);
    return SUPPORTED_ZOTERO_MAJORS.has(major)
        ? major
        : "unknown";
}
