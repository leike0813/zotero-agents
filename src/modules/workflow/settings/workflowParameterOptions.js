import { getDefaultSynthesisClient } from "../../synthesisClient/defaultClient";
import { createZoteroHostCapabilityBroker, } from "../../zoteroHostCapabilityBroker";
function normalizeString(value) {
    return String(value ?? "").trim();
}
function normalizeLibraryId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}
function collectionRefValue(args) {
    return `${args.libraryId}:${args.key}`;
}
function compactKeySuffix(key) {
    const value = normalizeString(key);
    return value.length > 6 ? value.slice(-6) : value;
}
async function resolveSynthesisTopicOptions(source, client) {
    const result = await client.topics.listWorkflowOptions({
        filter: source.filter === "updatable" ? "updatable" : "all",
    });
    return {
        options: result.options,
        diagnostics: result.diagnostics,
    };
}
export async function resolveWorkflowParameterOptionsSource(source, deps) {
    if (!source || typeof source !== "object") {
        return { options: [], diagnostics: [] };
    }
    if (source.kind === "synthesis.topics") {
        try {
            return await resolveSynthesisTopicOptions(source, deps?.synthesisClient || (await getDefaultSynthesisClient()));
        }
        catch (error) {
            return {
                options: [],
                diagnostics: [
                    {
                        code: "synthesis_topics_options_failed",
                        message: error instanceof Error ? error.message : String(error),
                    },
                ],
            };
        }
    }
    if (source.kind !== "zotero.collections") {
        return {
            options: [],
            diagnostics: [
                {
                    code: "unsupported_options_source",
                    message: `Unsupported workflow parameter options source: ${normalizeString(source.kind)}`,
                },
            ],
        };
    }
    try {
        const requestedLibrary = source.library === "current" ||
            source.library === "user" ||
            source.library == null
            ? undefined
            : normalizeLibraryId(source.library);
        const library = deps?.library || createZoteroHostCapabilityBroker().library;
        const collections = [];
        let cursor;
        while (true) {
            const request = {
                libraryId: requestedLibrary || undefined,
                limit: 100,
                ...(cursor ? { cursor } : {}),
            };
            const page = await library.listCollections(request);
            collections.push(...page.collections);
            if (!page.hasMore)
                break;
            const nextCursor = page.nextCursor?.trim();
            if (!nextCursor || nextCursor === cursor) {
                throw new Error("Workflow collection options pagination is invalid");
            }
            cursor = nextCursor;
        }
        const options = [];
        if (source.includeEmpty === true) {
            options.push({
                value: "",
                label: "Default library",
                description: "Do not target a specific Zotero collection",
                meta: {
                    kind: "zotero.collection.empty",
                },
            });
        }
        for (const collection of collections) {
            const key = normalizeString(collection.ref.key);
            const libraryId = normalizeLibraryId(collection.ref.libraryId);
            if (!key || !libraryId) {
                continue;
            }
            const path = Array.isArray(collection.path) && collection.path.length > 0
                ? collection.path.map(normalizeString).filter(Boolean)
                : [normalizeString(collection.name) || key];
            const label = path.join(" / ");
            options.push({
                value: collectionRefValue({ libraryId, key }),
                label,
                description: `Library ${libraryId} · key ${compactKeySuffix(key)}`,
                meta: {
                    kind: "zotero.collection",
                    libraryId,
                    collectionKey: key,
                    name: normalizeString(collection.name),
                    path,
                },
            });
        }
        return { options, diagnostics: [] };
    }
    catch (error) {
        return {
            options: [],
            diagnostics: [
                {
                    code: "options_source_failed",
                    message: error instanceof Error ? error.message : String(error),
                },
            ],
        };
    }
}
