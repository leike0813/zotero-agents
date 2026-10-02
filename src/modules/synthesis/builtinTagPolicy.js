export const BUILTIN_STATUS_FACET = "status";
export const BUILTIN_STATUS_POLICY = [
    {
        key: "need-metadata-curation",
        tag: "status:need-metadata-curation",
        note: "Metadata requires curation or verification.",
    },
    {
        key: "need-fulltext",
        tag: "status:need-fulltext",
        note: "A usable full-text PDF is still required.",
    },
    {
        key: "need-markdown",
        tag: "status:need-markdown",
        note: "Markdown extraction is still required.",
    },
    {
        key: "need-analysis",
        tag: "status:need-analysis",
        note: "The formal literature analysis artifact is still required.",
    },
    {
        key: "need-deep-reading",
        tag: "status:need-deep-reading",
        note: "The deep-reading HTML artifact is still required.",
    },
];
export const BUILTIN_TAG_IMMUTABLE_FIELDS = [
    "tag",
    "facet",
    "source",
    "deprecated",
    "replacement",
];
export const BUILTIN_TAG_EDITABLE_FIELDS = ["note", "aliases"];
const policyByTag = new Map(BUILTIN_STATUS_POLICY.map((entry) => [entry.tag, entry]));
const policyByKey = new Map(BUILTIN_STATUS_POLICY.map((entry) => [entry.key, entry]));
export function isBuiltinStatusTag(tag) {
    return policyByTag.has(String(tag || "").trim());
}
export function isBuiltinStatusKey(key) {
    return policyByKey.has(String(key || "").trim());
}
export function getBuiltinStatusTag(key) {
    return policyByKey.get(key).tag;
}
export function getBuiltinStatusPolicy() {
    return Object.freeze(Object.fromEntries(BUILTIN_STATUS_POLICY.map(({ key, tag }) => [key, tag])));
}
export function createBuiltinStatusVocabularyEntry(key) {
    const definition = policyByKey.get(key);
    return {
        tag: definition.tag,
        facet: BUILTIN_STATUS_FACET,
        note: definition.note,
        source: "builtin",
        deprecated: false,
        replacement: undefined,
        aliases: [],
    };
}
export function protectBuiltinTagVocabularyEntries(entries, existingEntries = []) {
    const byTag = new Map(entries.map((entry) => [String(entry.tag || "").trim(), entry]));
    const existingByTag = new Map(existingEntries.map((entry) => [String(entry.tag || "").trim(), entry]));
    const protectedEntries = entries
        .filter((entry) => !isBuiltinStatusTag(entry.tag))
        .map((entry) => ({ ...entry }));
    for (const definition of BUILTIN_STATUS_POLICY) {
        const existing = byTag.get(definition.tag) || existingByTag.get(definition.tag);
        protectedEntries.push({
            ...(existing || {}),
            tag: definition.tag,
            facet: BUILTIN_STATUS_FACET,
            note: existing ? existing.note : definition.note,
            aliases: existing?.aliases ? [...existing.aliases] : [],
            source: "builtin",
            deprecated: false,
            replacement: undefined,
        });
    }
    return protectedEntries;
}
export function protectBuiltinStatusProtocol(protocol) {
    const facets = Array.from(new Set([
        ...(Array.isArray(protocol.facets) ? protocol.facets : []),
        BUILTIN_STATUS_FACET,
    ]));
    return { ...protocol, facets };
}
export function hasInitializedBuiltinTagPolicy(args) {
    if (!args.protocol.facets.includes(BUILTIN_STATUS_FACET)) {
        return false;
    }
    const byTag = new Map(args.entries.map((entry) => [entry.tag, entry]));
    return BUILTIN_STATUS_POLICY.every((definition) => {
        const entry = byTag.get(definition.tag);
        return (entry?.facet === BUILTIN_STATUS_FACET &&
            entry.source === "builtin" &&
            entry.deprecated !== true &&
            !entry.replacement);
    });
}
