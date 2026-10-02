import { ZoteroHostCapabilityError, getZoteroHostCanonicalMutationControl, } from "./zoteroHostCapabilityBroker";
import { MUTATION_EXECUTE_INPUT_SCHEMA, MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION, ZOTERO_NATIVE_MUTATION_LIST_LIMIT, } from "../schemas/zoteroHostMutationSchemas";
import citationAnalysisArtifactSchema from "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json";
import sourceReferenceArtifactSchema from "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json";
const BYTE_LIMIT = 50 * 1024;
const refSchema = {
    type: "object",
    properties: {
        libraryId: { type: "integer", minimum: 1 },
        key: { type: "string", minLength: 1 },
    },
    required: ["libraryId", "key"],
    additionalProperties: false,
};
const pageProperties = {
    limit: { type: "integer", minimum: 1, maximum: 100 },
    cursor: { type: "string", minLength: 1 },
};
const listProperties = {
    libraryId: { type: "integer", minimum: 1 },
    collectionRef: refSchema,
    tag: { type: "string" },
    itemType: { type: "string" },
    query: { type: "string" },
};
const objectSchema = (properties, required = []) => ({
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
});
const refInput = (args) => args.ref;
const pageInput = (args) => ({
    ...(args.limit === undefined ? {} : { limit: args.limit }),
    ...(args.cursor === undefined ? {} : { cursor: args.cursor }),
});
const control = (signal) => ({ signal });
class CatalogFailure extends Error {
    code;
    details;
    effectCertainty;
    constructor(code, details, effectCertainty = "confirmed_none") {
        super(code);
        this.code = code;
        this.details = details;
        this.effectCertainty = effectCertainty;
    }
}
function readDefinition(capabilityId, name, schema, read, effects = ["bounded-read"]) {
    const writes = effects.includes("workspace-mutation");
    return {
        capabilityId,
        name,
        description: `Read Zotero ${capabilityId.replaceAll("_", " ")}`,
        schema,
        minimumEffects: effects,
        maxResultBytes: BYTE_LIMIT,
        classify: () => ({
            effects,
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
        }),
        execute: async (value, { signal }) => {
            try {
                const result = await read(value, signal);
                return {
                    status: "completed",
                    effectCertainty: writes ? "confirmed_complete" : "not_applicable",
                    value: result,
                };
            }
            catch (error) {
                if (error instanceof ZoteroHostCapabilityError) {
                    return {
                        status: "failed",
                        effectCertainty: "confirmed_none",
                        code: error.code,
                        retryable: error.retryable,
                        details: error.details,
                    };
                }
                if (error instanceof CatalogFailure) {
                    return {
                        status: error.code === "canceled" ? "canceled" : "failed",
                        effectCertainty: error.effectCertainty,
                        code: error.code,
                        details: error.details,
                    };
                }
                const message = String(error);
                if (message.includes("pi_managed_cleanup_pending")) {
                    return {
                        status: "failed",
                        effectCertainty: "unknown",
                        code: "cleanup_pending",
                    };
                }
                if (/pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit)/.test(message)) {
                    return {
                        status: "failed",
                        effectCertainty: "confirmed_none",
                        code: "resource_limited",
                    };
                }
                return {
                    status: "failed",
                    effectCertainty: writes ? "unknown" : "confirmed_none",
                    code: "internal_error",
                };
            }
        },
    };
}
// ---------------------------------------------------------------------------
// Reviewed foreground navigation tools (C15)
// ---------------------------------------------------------------------------
const NAVIGATION_KEY_PATTERN = "^[A-Z0-9]{8}$";
const navigationRefSchema = {
    type: "object",
    properties: {
        libraryId: { type: "integer", minimum: 1 },
        key: { type: "string", pattern: NAVIGATION_KEY_PATTERN },
    },
    required: ["libraryId", "key"],
    additionalProperties: false,
};
const readerLocationSchema = {
    type: "object",
    anyOf: [
        objectSchema({
            kind: { const: "page" },
            attachment: navigationRefSchema,
            pageIndex: { type: "integer", minimum: 0 },
        }, ["kind", "attachment", "pageIndex"]),
        objectSchema({
            kind: { const: "annotation" },
            annotation: navigationRefSchema,
        }, ["kind", "annotation"]),
        objectSchema({
            kind: { const: "epub" },
            attachment: navigationRefSchema,
            cfi: { type: "string", minLength: 1, maxLength: 4096 },
        }, ["kind", "attachment", "cfi"]),
    ],
};
const NAVIGATION_LIBRARY_VIEWS = [
    "library",
    "trash",
    "duplicates",
    "unfiled",
    "retracted",
    "publications",
];
function defineNavigationTool(args) {
    return {
        capabilityId: args.capabilityId,
        name: args.name,
        description: args.description,
        schema: args.schema,
        minimumEffects: ["host-control"],
        maxResultBytes: BYTE_LIMIT,
        batchMode: "single-per-batch",
        requiresForegroundConversation: true,
        classify: () => ({
            effects: ["host-control"],
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
        }),
        execute: async (value, { signal }) => {
            let effectStarted = false;
            try {
                const result = await args.invoke(value, {
                    signal,
                    target: args.target,
                    onEffectStarted: () => {
                        effectStarted = true;
                    },
                });
                return {
                    status: "completed",
                    effectCertainty: "confirmed_complete",
                    value: result,
                };
            }
            catch (error) {
                if (error instanceof ZoteroHostCapabilityError) {
                    return {
                        status: "failed",
                        effectCertainty: effectStarted ? "unknown" : "confirmed_none",
                        code: error.code,
                        retryable: error.retryable,
                        details: error.details,
                    };
                }
                return {
                    status: "failed",
                    effectCertainty: "unknown",
                    code: "internal_error",
                };
            }
        },
    };
}
function createZoteroNativeNavigationDefinitions(args) {
    const { broker, target } = args;
    return [
        defineNavigationTool({
            capabilityId: "navigation.focus_zotero",
            name: "zotero_focus_zotero",
            description: "Bring the user's foreground Zotero main window forward.",
            schema: objectSchema({}),
            target,
            invoke: (_input, control) => broker.navigation.focusZotero(control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.select_library_view",
            name: "zotero_select_library_view",
            description: "Select one of the six Zotero library views in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
            schema: objectSchema({
                libraryId: { type: "integer", minimum: 1 },
                view: { type: "string", enum: NAVIGATION_LIBRARY_VIEWS },
            }, ["libraryId", "view"]),
            target,
            invoke: (input, control) => broker.navigation.selectLibraryView(input, control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.select_collection",
            name: "zotero_select_collection",
            description: "Select a Zotero collection in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
            schema: navigationRefSchema,
            target,
            invoke: (input, control) => broker.navigation.selectCollection(input, control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.select_saved_search",
            name: "zotero_select_saved_search",
            description: "Select a Saved Search returned by zotero_library_list_saved_searches in the submitting foreground Zotero window; no separate focus call is needed.",
            schema: navigationRefSchema,
            target,
            invoke: (input, control) => broker.navigation.selectSavedSearch(input, control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.reveal_items",
            name: "zotero_reveal_items",
            description: "Reveal 1 to 100 distinct items in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
            schema: objectSchema({
                items: {
                    type: "array",
                    items: navigationRefSchema,
                    minItems: 1,
                    maxItems: 100,
                    uniqueItems: true,
                },
            }, ["items"]),
            target,
            invoke: (input, control) => broker.navigation.revealItems(input, control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.open_item",
            name: "zotero_open_item",
            description: "Open an item in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
            schema: navigationRefSchema,
            target,
            invoke: (input, control) => broker.navigation.openItem(input, control),
        }),
        defineNavigationTool({
            capabilityId: "navigation.open_reader_location",
            name: "zotero_open_reader_location",
            description: "Open a PDF page, annotation or EPUB location in the submitting foreground Zotero window's Reader and bring it forward; no separate focus call is needed.",
            schema: readerLocationSchema,
            target,
            invoke: (input, control) => broker.navigation.openReaderLocation(input, control),
        }),
    ];
}
export function createZoteroNativeToolDefinitions(args) {
    const { broker, workspace, mutations, navigationTarget } = args || {};
    if (typeof broker?.context?.getCurrentView !== "function")
        throw new Error("pi_zotero_broker_incomplete");
    if (typeof workspace?.materializeOrReuseMany !== "function" ||
        typeof workspace?.beginGeneratedTextOutput !== "function")
        throw new Error("pi_zotero_workspace_incomplete");
    const ref = { ref: refSchema };
    const refPage = { ...ref, ...pageProperties };
    const fileEffects = ["bounded-read", "workspace-mutation"];
    const reads = [
        readDefinition("context.get_current_view", "zotero_context_get_current_view", objectSchema({}), () => broker.context.getCurrentView()),
        readDefinition("context.get_selected_items", "zotero_context_get_selected_items", objectSchema(pageProperties), (input, signal) => broker.context.getSelectedItems(pageInput(input), control(signal))),
        readDefinition("library.list_items", "zotero_library_list_items", objectSchema({ ...listProperties, ...pageProperties }), (input, signal) => broker.library.listItems(input, control(signal))),
        readDefinition("library.list_collections", "zotero_library_list_collections", objectSchema({ libraryId: listProperties.libraryId, ...pageProperties }), (input, signal) => broker.library.listCollections(input, control(signal))),
        readDefinition("library.list_saved_searches", "zotero_library_list_saved_searches", objectSchema({ libraryId: listProperties.libraryId, ...pageProperties }, [
            "libraryId",
        ]), (input, signal) => broker.library.listSavedSearches(input, control(signal))),
        readDefinition("library.get_item_detail", "zotero_library_get_item_detail", objectSchema(ref, ["ref"]), async (input, signal) => {
            const detail = await broker.library.getItemDetail(refInput(input), control(signal));
            if (detail.kind !== "attachment" ||
                detail.item.file.state !== "available")
                return detail;
            const { path: _sourcePath, ...file } = detail.item.file;
            return { ...detail, item: { ...detail.item, file } };
        }),
        readDefinition("library.get_item_notes", "zotero_library_get_item_notes", objectSchema(refPage, ["ref"]), (input, signal) => broker.library.getItemNotes(refInput(input), pageInput(input), control(signal))),
        readDefinition("library.get_note_detail", "zotero_library_get_note_detail", objectSchema({ ...ref, format: { type: "string", enum: ["html", "text"] } }, ["ref", "format"]), async (input, signal) => {
            const detail = await broker.library.getNoteDetail(refInput(input), { format: input.format }, control(signal));
            if (detail.kind === "managed") {
                const observed = new TextEncoder().encode(JSON.stringify(detail)).byteLength;
                if (observed > BYTE_LIMIT)
                    throw new CatalogFailure("resource_limited", {
                        managedType: detail.noteKind,
                        limitBytes: BYTE_LIMIT,
                        observedBytes: observed,
                        recovery: "inspect_note_in_zotero",
                    });
            }
            return detail;
        }),
        readDefinition("library.get_item_attachments", "zotero_library_get_item_attachments", objectSchema(refPage, ["ref"]), async (input, signal) => {
            const page = await broker.library.getItemAttachments(refInput(input), pageInput(input), control(signal));
            if (signal.aborted)
                throw new CatalogFailure("canceled");
            const available = page.attachments.filter((item) => item.file.state === "available");
            const copies = available.length
                ? await workspace.materializeOrReuseMany(available.map((item) => ({
                    sourcePath: item.file.path,
                    sourceId: `${item.ref.libraryId}:${item.ref.key}`,
                    revision: item.revision,
                })))
                : [];
            if (signal.aborted)
                throw new CatalogFailure("canceled", undefined, available.length ? "confirmed_complete" : "confirmed_none");
            let index = 0;
            return {
                ...page,
                attachments: page.attachments.map((item) => item.file.state === "available"
                    ? { ...item, file: { ...item.file, path: copies[index++].path } }
                    : item),
            };
        }, fileEffects),
        readDefinition("library.list_annotations", "zotero_library_list_annotations", objectSchema(refPage, ["ref"]), (input, signal) => broker.library.listAnnotations(refInput(input), pageInput(input), control(signal))),
        readDefinition("library.export_annotations", "zotero_library_export_annotations", objectSchema({ ...ref, format: { type: "string", enum: ["markdown", "json"] } }, ["ref"]), async (input, signal) => {
            const format = input.format || "markdown";
            const output = await workspace.beginGeneratedTextOutput(format === "json" ? ".json" : ".md");
            try {
                const exportResult = await broker.library.exportAnnotations(refInput(input), { format }, control(signal));
                if (signal.aborted)
                    throw new CatalogFailure("canceled");
                await output.append(format === "json"
                    ? JSON.stringify(exportResult.annotations)
                    : exportResult.markdown || "");
                return { format, artifact: await output.commit() };
            }
            catch (error) {
                await output.discard();
                throw error;
            }
        }, fileEffects),
        readDefinition("metadata.translate_identifier", "zotero_metadata_translate_identifier", objectSchema({
            type: { type: "string", enum: ["DOI", "ISBN", "arXiv", "PMID"] },
            value: { type: "string", minLength: 1 },
        }, ["type", "value"]), (input, signal) => broker.metadata.translateIdentifier(input, control(signal)), ["bounded-read", "external-egress"]),
        readDefinition("library.readiness_audit", "zotero_library_readiness_audit", objectSchema({
            ...listProperties,
            ...pageProperties,
            checks: {
                type: "array",
                items: { type: "string", enum: ["pdf", "markdown", "analysis"] },
            },
            missingOnly: { type: "boolean" },
        }), (input, signal) => {
            const { collectionRef, ...rest } = input;
            return broker.library.readinessAudit({
                ...rest,
                ...(collectionRef ? { collection: collectionRef } : {}),
            }, control(signal));
        }),
        readDefinition("library.get_item_audit_state", "zotero_library_get_item_audit_state", objectSchema(ref, ["ref"]), (input, signal) => broker.library.getItemAuditState(refInput(input), control(signal))),
        readDefinition("library.traverse_items", "zotero_library_traverse_items", objectSchema({
            ...listProperties,
            scope: { type: "string", enum: ["top-level-regular"] },
            resumeCursor: { type: "string", minLength: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
            maxItems: { type: "integer", minimum: 1 },
            maxPages: { type: "integer", minimum: 1 },
            maxDurationMs: { type: "integer", minimum: 1 },
        }, ["scope"]), async (input, signal) => {
            const output = await workspace.beginGeneratedTextOutput(".ndjson");
            let rowCount = 0;
            try {
                const result = await broker.library.traverseItems(input, control(signal), async (batch) => {
                    for (const item of batch.items) {
                        await output.append(`${JSON.stringify(item)}\n`);
                        rowCount += 1;
                    }
                });
                if (signal.aborted || result.outcome === "canceled")
                    throw new CatalogFailure("canceled");
                if (result.visitedItems !== rowCount)
                    throw new CatalogFailure("internal_error");
                const artifact = await output.commit();
                return {
                    ...result,
                    artifact: {
                        ...artifact,
                        rowCount,
                        complete: result.outcome === "completed",
                    },
                };
            }
            catch (error) {
                await output.discard();
                throw error;
            }
        }, fileEffects),
    ];
    const navigation = navigationTarget
        ? createZoteroNativeNavigationDefinitions({
            broker,
            target: navigationTarget,
        })
        : [];
    if (!mutations)
        return [...reads, ...navigation];
    return [
        ...reads,
        ...navigation,
        ...createZoteroNativeMutationDefinitions({ broker, workspace, mutations }),
    ];
}
const ENHANCED_AUTHORIZATION_KEY = "zotero-mutation:enhanced";
const MUTATION_DOCUMENT_SCHEMA = "https://json-schema.org/draft/2020-12/schema";
const LOGICAL_LIST_REFS = new Set([
    "#/$defs/itemRefArray",
    "#/$defs/collectionRefArray",
    "#/$defs/stringArray",
]);
const NESTED_ARTIFACT_KEYS = new Set([
    "references",
    "citationAnalysis",
    "score",
    "paper",
]);
const NOTE_CONTENT_SCHEMA = {
    type: "object",
    properties: {
        format: { enum: ["html", "text"] },
        value: { type: "string" },
    },
    required: ["format", "value"],
    additionalProperties: false,
};
function sameSourceIds(left, right) {
    return (left.length === right.length &&
        left.every((value, index) => value === right[index]));
}
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function boundLogicalLists(value) {
    if (Array.isArray(value)) {
        for (const entry of value)
            boundLogicalLists(entry);
        return;
    }
    if (!value || typeof value !== "object")
        return;
    const node = value;
    const reference = node.$ref;
    if (typeof reference === "string" && LOGICAL_LIST_REFS.has(reference)) {
        node.maxItems = ZOTERO_NATIVE_MUTATION_LIST_LIMIT;
    }
    const items = node.items;
    if (items?.$ref === "#/$defs/creator") {
        node.maxItems = ZOTERO_NATIVE_MUTATION_LIST_LIMIT;
    }
    for (const key of Object.keys(node)) {
        if (key === "$defs" || NESTED_ARTIFACT_KEYS.has(key))
            continue;
        boundLogicalLists(node[key]);
    }
}
/**
 * Clones the canonical public projection: the caller-supplied operation identity
 * is removed, the shared Broker list bound is applied to logical request lists,
 * and nested artifact payloads keep their canonical domain bounds.
 */
function boundedMutationSchema(operation) {
    const schema = cloneJson(MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION[operation]);
    delete schema.properties.operationId;
    schema.$schema = MUTATION_DOCUMENT_SCHEMA;
    schema.$defs = MUTATION_EXECUTE_INPUT_SCHEMA.$defs;
    boundLogicalLists(schema);
    return pruneSchemaDefs(schema);
}
function projectContractArtifact(schema, boundedTopLevel = []) {
    const projected = cloneJson(schema);
    const properties = (projected.properties || {});
    delete properties.schema;
    const meta = properties.meta;
    if (meta?.properties)
        delete meta.properties.referencesBasis;
    if (Array.isArray(meta?.required)) {
        meta.required = meta.required.filter((key) => key !== "referencesBasis");
    }
    projected.required = (projected.required || []).filter((key) => key !== "schema");
    projected.additionalProperties = false;
    // The contract schema keeps its own resource identity. Embedding it must not
    // rebase its fragment references onto that identity.
    stripSchemaResourceKeys(projected);
    const defs = (projected.$defs || {});
    for (const definition of Object.values(defs)) {
        stripSchemaResourceKeys(definition);
    }
    // Q90: model-visible logical top-level lists share the Broker list bound;
    // nested artifact arrays keep the canonical contract bounds.
    for (const name of boundedTopLevel) {
        const node = properties[name];
        if (node && node.type === "array") {
            node.maxItems = ZOTERO_NATIVE_MUTATION_LIST_LIMIT;
        }
    }
    delete projected.$defs;
    return { property: projected, defs };
}
/**
 * Keeps only the definitions the schema actually reaches. The Gateway sends the
 * whole catalog to the model, so each tool must not carry the union of every
 * canonical mutation definition.
 */
function pruneSchemaDefs(schema) {
    const defs = (schema.$defs || {});
    const names = new Set();
    const collectRefs = (value) => {
        if (Array.isArray(value)) {
            for (const entry of value)
                collectRefs(entry);
            return;
        }
        if (!value || typeof value !== "object")
            return;
        const node = value;
        const reference = node.$ref;
        if (typeof reference === "string" && reference.startsWith("#/$defs/")) {
            names.add(reference.slice("#/$defs/".length));
        }
        for (const key of Object.keys(node)) {
            if (key === "$defs")
                continue;
            collectRefs(node[key]);
        }
    };
    collectRefs(schema);
    const kept = {};
    // Set iteration visits names added while iterating, giving the transitive closure.
    for (const name of names) {
        if (!(name in defs))
            continue;
        kept[name] = defs[name];
        collectRefs(defs[name]);
    }
    schema.$defs = kept;
    return schema;
}
function stripSchemaResourceKeys(value) {
    if (Array.isArray(value)) {
        for (const entry of value)
            stripSchemaResourceKeys(entry);
        return;
    }
    if (!value || typeof value !== "object")
        return;
    const node = value;
    delete node.$id;
    delete node.$schema;
    for (const key of Object.keys(node))
        stripSchemaResourceKeys(node[key]);
}
const SOURCE_REFERENCE_ARTIFACT = projectContractArtifact(sourceReferenceArtifactSchema, ["references"]);
// New Source References receive Broker-generated opaque IDs, so the model may
// omit the identity and the Broker allocates it once per logical call.
const SOURCE_REFERENCE_DEF = SOURCE_REFERENCE_ARTIFACT.defs.SourceReference;
if (Array.isArray(SOURCE_REFERENCE_DEF?.required)) {
    SOURCE_REFERENCE_DEF.required = SOURCE_REFERENCE_DEF.required.filter((key) => key !== "sourceReferenceId");
}
const CITATION_ANALYSIS_ARTIFACT = projectContractArtifact(citationAnalysisArtifactSchema, ["items", "unresolved"]);
const SCORE_ARTIFACT = projectContractArtifact(MUTATION_EXECUTE_INPUT_SCHEMA.$defs.literatureScoreArtifact);
function artifactSchema(operation, artifact, projected) {
    const schema = boundedMutationSchema(operation);
    schema.properties[artifact.key] = {
        $ref: "#/$defs/" + artifact.def,
    };
    schema.$defs = {
        ...MUTATION_EXECUTE_INPUT_SCHEMA.$defs,
        ...projected.defs,
        [artifact.def]: projected.property,
    };
    return pruneSchemaDefs(schema);
}
function librariesOf(args) {
    const found = new Set();
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const entry of value)
                visit(entry);
            return;
        }
        if (!value || typeof value !== "object")
            return;
        const node = value;
        if (Number.isSafeInteger(node.libraryId) &&
            node.libraryId > 0) {
            found.add(node.libraryId);
        }
        for (const key of Object.keys(node))
            visit(node[key]);
    };
    visit(args);
    return [...found].sort((left, right) => left - right);
}
function logicalListOverflow(keys) {
    return (args) => {
        const seen = new Set();
        for (const key of keys) {
            const list = args[key];
            if (list === undefined)
                continue;
            if (!Array.isArray(list))
                return { reason: "invalid_schema" };
            for (const entry of list) {
                seen.add(entry && typeof entry === "object"
                    ? JSON.stringify(entry)
                    : String(entry));
            }
        }
        if (seen.size <= ZOTERO_NATIVE_MUTATION_LIST_LIMIT)
            return undefined;
        return {
            reason: "logical_list_limit",
            limit: ZOTERO_NATIVE_MUTATION_LIST_LIMIT,
            observed: seen.size,
        };
    };
}
function semanticArgs(args) {
    const { dryRun: _dryRun, ...rest } = args;
    return rest;
}
function sourcesFromStage(stage, targetFilename) {
    if (!stage)
        return undefined;
    // The staged snapshot carries bare SHA-256 digests, while the canonical
    // attachment-content manifest is the Broker-owned wire shape.
    const file = (entry) => ({
        relativePath: entry.relativePath,
        sizeBytes: entry.sizeBytes,
        sha256: /^sha256:/.test(entry.sha256)
            ? entry.sha256
            : "sha256:" + entry.sha256,
    });
    const manifest = stage.manifest;
    return {
        kind: "stored_file",
        content: {
            schema: "zotero-agents.attachment-content.v1",
            identity: manifest.identity,
            main: file(manifest.main),
            companions: manifest.companions.map(file),
        },
        ...(typeof targetFilename === "string" ? { targetFilename } : {}),
    };
}
function createMutationSpecs() {
    const importSchema = boundedMutationSchema("attachments.create");
    {
        const properties = importSchema.properties;
        delete properties.source;
        properties.path = { type: "string", minLength: 1 };
        properties.targetFilename = { type: "string", minLength: 1 };
        importSchema.required = ["placement", "path"];
    }
    const replaceSchema = boundedMutationSchema("attachments.replaceFile");
    {
        const properties = replaceSchema.properties;
        delete properties.source;
        properties.path = { type: "string", minLength: 1 };
        properties.targetFilename = { type: "string", minLength: 1 };
        replaceSchema.required = ["attachmentRef", "path"];
    }
    const managedNoteSchema = () => {
        const schema = {
            $schema: MUTATION_DOCUMENT_SCHEMA,
            type: "object",
            properties: {
                target: {
                    oneOf: [
                        {
                            type: "object",
                            properties: {
                                kind: { const: "create" },
                                parentRef: { $ref: "#/$defs/itemRef" },
                            },
                            required: ["kind", "parentRef"],
                            additionalProperties: false,
                        },
                        {
                            type: "object",
                            properties: {
                                kind: { const: "update" },
                                noteRef: { $ref: "#/$defs/itemRef" },
                            },
                            required: ["kind", "noteRef"],
                            additionalProperties: false,
                        },
                    ],
                },
                title: { type: "string", minLength: 1 },
                markdown: { type: "string", minLength: 1 },
                dryRun: { type: "boolean" },
            },
            required: ["target", "title", "markdown"],
            additionalProperties: false,
        };
        schema.$defs = MUTATION_EXECUTE_INPUT_SCHEMA.$defs;
        return pruneSchemaDefs(schema);
    };
    const trashSchema = () => {
        const schema = boundedMutationSchema("trash.setItemsState");
        delete schema.properties.state;
        schema.required = ["itemRefs"];
        return schema;
    };
    const passthrough = (capabilityId, operation, name, projectResult, options = {}) => {
        const base = options.schema || boundedMutationSchema(operation);
        return {
            capabilityId,
            operation,
            name,
            projectResult,
            enhanced: options.enhanced === true,
            files: options.files === true,
            schema: options.close ? options.close(base) : base,
            libraries: librariesOf,
            ...(options.overflow ? { overflow: options.overflow } : {}),
            input: (args, identity) => ({
                operation,
                operationId: identity.operationId,
                ...semanticArgs(args),
            }),
        };
    };
    const managedNoteSpec = (capabilityId, operation, name) => ({
        capabilityId,
        operation,
        name,
        enhanced: true,
        files: false,
        projectResult: projectManagedNoteResult,
        schema: managedNoteSchema(),
        libraries: librariesOf,
        input: (args, identity) => {
            const rest = semanticArgs(args);
            return {
                operation,
                operationId: identity.operationId,
                target: rest.target,
                content: { title: rest.title, markdown: rest.markdown },
            };
        },
    });
    const artifactSpec = (capabilityId, operation, name, artifact, projected) => ({
        capabilityId,
        operation,
        name,
        enhanced: true,
        files: false,
        projectResult: projectLiteratureArtifact,
        schema: artifactSchema(operation, artifact, projected),
        artifact,
        libraries: librariesOf,
        input: () => ({}),
    });
    const trashSpec = (capabilityId, name, state) => ({
        capabilityId,
        operation: "trash.setItemsState",
        name,
        enhanced: true,
        files: false,
        projectResult: projectTrashResult,
        state,
        schema: trashSchema(),
        libraries: librariesOf,
        input: (args, identity) => ({
            operation: "trash.setItemsState",
            operationId: identity.operationId,
            itemRefs: semanticArgs(args).itemRefs,
            state,
        }),
    });
    return [
        passthrough("item.create", "item.create", "zotero_item_create", projectItemResult),
        passthrough("item.update_metadata", "item.updateMetadata", "zotero_item_update_metadata", projectItemResult),
        passthrough("item.update_tags", "item.updateTags", "zotero_item_update_tags", projectItemResult, {
            overflow: logicalListOverflow(["add", "remove"]),
        }),
        passthrough("item.add_related_items", "item.addRelated", "zotero_item_add_related_items", projectRelatedMutation),
        passthrough("item.remove_related_items", "item.removeRelated", "zotero_item_remove_related_items", projectRelatedMutation),
        passthrough("note.create", "notes.create", "zotero_note_create", projectNoteSummaryResult, {
            close: (schema) => {
                schema.properties.content = NOTE_CONTENT_SCHEMA;
                return schema;
            },
        }),
        passthrough("note.update_content", "notes.updateContent", "zotero_note_update_content", projectNoteSummaryResult, {
            close: (schema) => {
                schema.properties.content = NOTE_CONTENT_SCHEMA;
                return schema;
            },
        }),
        passthrough("collection.create", "collection.create", "zotero_collection_create", projectCollectionResult),
        passthrough("collection.update", "collection.update", "zotero_collection_update", projectCollectionResult),
        passthrough("collection.update_membership", "collection.updateMembership", "zotero_collection_update_membership", projectMembershipResult, { overflow: logicalListOverflow(["add", "remove"]) }),
        passthrough("attachment.update_metadata", "attachments.updateMetadata", "zotero_attachment_update_metadata", projectAttachmentResult),
        passthrough("item.change_type", "item.changeType", "zotero_item_change_type", projectItemResult, { enhanced: true }),
        {
            capabilityId: "attachment.import",
            operation: "attachments.create",
            name: "zotero_attachment_import",
            enhanced: true,
            files: true,
            projectResult: projectAttachmentResult,
            schema: importSchema,
            libraries: librariesOf,
            input: (args, identity, source) => {
                const rest = semanticArgs(args);
                delete rest.path;
                delete rest.targetFilename;
                return {
                    operation: "attachments.create",
                    operationId: identity.operationId,
                    placement: rest.placement,
                    source: source,
                    ...(rest.metadata === undefined ? {} : { metadata: rest.metadata }),
                };
            },
        },
        {
            capabilityId: "attachment.replace_file",
            operation: "attachments.replaceFile",
            name: "zotero_attachment_replace_file",
            enhanced: true,
            files: true,
            projectResult: projectAttachmentOutcomeResult,
            schema: replaceSchema,
            libraries: librariesOf,
            input: (args, identity, source) => ({
                operation: "attachments.replaceFile",
                operationId: identity.operationId,
                attachmentRef: args.attachmentRef,
                source: source,
            }),
        },
        passthrough("attachment.move", "attachments.move", "zotero_attachment_move", projectAttachmentOutcomeResult, { enhanced: true }),
        trashSpec("trash.move_items", "zotero_trash_move_items", "trashed"),
        trashSpec("trash.restore_items", "zotero_trash_restore_items", "active"),
        managedNoteSpec("managed_note.write_custom", "managed_note.write_custom", "zotero_custom_note_write"),
        managedNoteSpec("managed_note.write_conversation", "managed_note.write_conversation", "zotero_conversation_note_write"),
        passthrough("literature_artifact.upsert_digest", "literature_artifact.upsert_digest", "zotero_literature_digest_upsert", projectLiteratureArtifact, { enhanced: true }),
        artifactSpec("literature_artifact.upsert_references", "literature_artifact.upsert_references", "zotero_literature_references_upsert", { key: "references", def: "sourceReferenceArtifact" }, SOURCE_REFERENCE_ARTIFACT),
        artifactSpec("literature_artifact.upsert_citation_analysis", "literature_artifact.upsert_citation_analysis", "zotero_literature_citation_analysis_upsert", { key: "citationAnalysis", def: "citationAnalysisArtifact" }, CITATION_ANALYSIS_ARTIFACT),
        artifactSpec("literature_artifact.upsert_score", "literature_artifact.upsert_score", "zotero_literature_score_upsert", { key: "score", def: "literatureScoreArtifact" }, SCORE_ARTIFACT),
    ];
}
const ITEM_RESULT_FIELDS = ["ref", "revision"];
const COLLECTION_RESULT_FIELDS = ["ref", "revision"];
// Lengths are counts; titles and excerpts are free text the model already knows.
const NOTE_SUMMARY_FIELDS = [
    "ref",
    "parentRef",
    "revision",
    "textLength",
    "htmlLength",
];
// The canonical managed-note detail carries the full semantic payload. It is
// never forwarded: the model already holds what it wrote, and the bounded facts
// below are all the Agent needs to continue.
const MANAGED_NOTE_FIELDS = [
    "kind",
    "noteKind",
    "ref",
    "parentRef",
    "revision",
];
const ATTACHMENT_RESULT_FIELDS = [
    "ref",
    "parentRef",
    "revision",
    "linkMode",
    "role",
];
// Local storage paths never enter a model-visible result.
const ATTACHMENT_FILE_FIELDS = ["state", "sizeBytes"];
function pickFields(source, fields) {
    const node = (source || {});
    const picked = {};
    for (const field of fields) {
        if (node[field] !== undefined)
            picked[field] = node[field];
    }
    return picked;
}
function pickPortableRef(value) {
    return pickFields(value, ["libraryId", "key"]);
}
function pickPortableRefs(value) {
    return (Array.isArray(value) ? value : []).map(pickPortableRef);
}
function pickAttachment(value) {
    const attachment = pickFields(value, ATTACHMENT_RESULT_FIELDS);
    const file = value?.file;
    if (file && typeof file === "object") {
        attachment.file = pickFields(file, ATTACHMENT_FILE_FIELDS);
    }
    return attachment;
}
const projectItemResult = (result) => ({
    item: pickFields(result.item, ITEM_RESULT_FIELDS),
});
const projectCollectionResult = (result) => ({
    collection: pickFields(result.collection, COLLECTION_RESULT_FIELDS),
});
const projectNoteSummaryResult = (result) => ({
    note: pickFields(result.note, NOTE_SUMMARY_FIELDS),
});
const projectAttachmentResult = (result) => ({
    attachment: pickAttachment(result.attachment),
});
const projectAttachmentOutcomeResult = (result) => ({
    attachment: pickAttachment(result.attachment),
    outcome: result.outcome ?? null,
});
const projectMembershipResult = (result) => ({
    collection: pickFields(result.collection, COLLECTION_RESULT_FIELDS),
    addedRefs: pickPortableRefs(result.addedRefs),
    removedRefs: pickPortableRefs(result.removedRefs),
});
const projectManagedNoteResult = (result) => ({
    note: pickFields(result.note, MANAGED_NOTE_FIELDS),
});
const projectTrashResult = (result) => ({
    state: result.state ?? null,
    explicitRefs: pickPortableRefs(result.explicitRefs),
    expandedRefs: pickPortableRefs(result.expandedRefs),
});
const projectRelatedMutation = (result) => {
    const relations = Array.isArray(result.relations) ? result.relations : [];
    return {
        sourceRef: pickPortableRef(result.sourceRef),
        relatedRefs: pickPortableRefs(result.relatedRefs),
        relations: relations.map((relation) => ({
            relatedRef: pickPortableRef(relation.relatedRef),
            outcome: relation.outcome ?? null,
        })),
        sourceRevision: result.sourceRevision ?? null,
    };
};
const projectLiteratureArtifact = (result) => ({
    note: pickFields(result.note, MANAGED_NOTE_FIELDS),
    dependentStale: result.dependentStale ?? null,
});
const NATIVE_MUTATION_SPECS = createMutationSpecs();
function mutationFailure(error) {
    if (error instanceof CatalogFailure) {
        return { status: "failed", code: error.code, details: error.details };
    }
    if (error instanceof ZoteroHostCapabilityError) {
        return {
            status: "failed",
            code: error.code,
            retryable: error.retryable,
            details: error.details,
        };
    }
    // Only project-owned staging messages are mapped; a native exception code is
    // never forwarded to the model.
    const message = String(error);
    if (message.includes("pi_managed_cleanup_pending")) {
        return { status: "failed", code: "cleanup_pending" };
    }
    if (/pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit)/.test(message)) {
        return { status: "failed", code: "resource_limited" };
    }
    return { status: "failed", code: "internal_error" };
}
function terminalExecution(result, domainReceiptRef) {
    if (!("attempt" in result)) {
        return {
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "internal_error",
        };
    }
    const attempt = result.attempt;
    const receipt = domainReceiptRef ? { domainReceiptRef } : {};
    if (result.outcome === "canceled") {
        return {
            status: "canceled",
            effectCertainty: "confirmed_none",
            code: attempt.error.code,
            ...receipt,
        };
    }
    if (result.outcome === "repair_required") {
        return {
            status: "failed",
            effectCertainty: "confirmed_partial",
            code: "repair_required",
            details: {
                attemptId: attempt.attemptId,
                recovery: attempt.error.recovery,
                residualRefs: attempt.residualRefs,
            },
            ...receipt,
        };
    }
    if (result.outcome === "unknown") {
        return {
            status: "failed",
            effectCertainty: "unknown",
            code: "effect_unknown",
            details: {
                attemptId: attempt.attemptId,
                recovery: "reconcile",
                residualRefs: attempt.residualRefs,
            },
            ...receipt,
        };
    }
    return {
        status: "failed",
        effectCertainty: "confirmed_none",
        code: attempt.error.code,
        retryable: attempt.error.recovery === "retry_same_operation",
        details: {
            attemptId: attempt.attemptId,
            recovery: attempt.error.recovery,
        },
        ...receipt,
    };
}
/**
 * The durable domain record is written for every terminal outcome, and success
 * is published only after it is durable. Model-visible results stay bounded.
 */
async function finalizeMutation(result, project, context, dependencies) {
    const settled = "receipt" in result;
    let domainReceiptRef;
    try {
        domainReceiptRef = await dependencies.recordDomainResult(context, result);
    }
    catch {
        domainReceiptRef = undefined;
    }
    if (!settled) {
        const failure = terminalExecution(result, domainReceiptRef);
        if (domainReceiptRef !== undefined)
            return failure;
        // Keep the authoritative terminal facts and only flag that the durable
        // record could not be written.
        return {
            ...failure,
            details: {
                ...(failure.details || {}),
                domainReceiptUnavailable: true,
            },
        };
    }
    if (domainReceiptRef === undefined) {
        return {
            status: "failed",
            effectCertainty: "unknown",
            code: "effect_unknown",
            details: { recovery: "reconcile" },
        };
    }
    const value = {
        outcome: result.outcome,
        receiptId: result.receipt.receiptId,
        result: project(result.result),
    };
    return {
        status: "completed",
        effectCertainty: "confirmed_complete",
        value,
        domainReceiptRef,
    };
}
function admissionFacts(spec, identity, args, plan) {
    const libraries = spec.libraries(args);
    return {
        capabilityId: spec.capabilityId,
        operation: spec.operation,
        tool: spec.name,
        enhanced: spec.enhanced,
        libraries,
        resourceKeys: libraries.map((libraryId) => "library:" + String(libraryId)),
        generatedSourceReferenceIds: identity.generatedSourceReferenceIds,
        plan: plan === undefined ? null : plan,
    };
}
async function canonicalMutationInput(spec, args, identity, control, stage, signal) {
    if (spec.artifact) {
        const parentRef = args.parentRef;
        const normalized = await control.normalizeManagedAuthoring({
            operation: spec.operation,
            parentRef: parentRef,
            value: args[spec.artifact.key],
            generatedSourceReferenceIds: identity.generatedSourceReferenceIds,
            control: { signal },
        });
        return {
            input: {
                operation: spec.operation,
                operationId: identity.operationId,
                parentRef,
                [spec.artifact.key]: normalized.value,
            },
            registeredSourceIds: [...normalized.generatedSourceReferenceIds],
        };
    }
    return {
        input: spec.input(args, identity, sourcesFromStage(stage, args.targetFilename)),
        registeredSourceIds: [],
    };
}
async function runMutationPreflight(spec, broker, workspace, dependencies, args, context) {
    const dryRun = args.dryRun === true;
    const mutationContext = {
        owner: context.owner,
        sourceTurnId: context.sourceTurnId,
        callId: context.callId,
    };
    let stage;
    let cleanupPending = false;
    const cleanupPendingFailure = () => ({
        status: "failed",
        code: "cleanup_pending",
        retryable: true,
        details: { recovery: "reconcile" },
    });
    const discardStage = async () => {
        if (!stage)
            return;
        try {
            await stage.dispose();
        }
        catch {
            cleanupPending = true;
        }
    };
    try {
        const overflow = spec.overflow?.(args);
        if (overflow !== undefined) {
            return { status: "failed", code: "resource_limited", details: overflow };
        }
        if (spec.files) {
            if (typeof workspace.prepareStoredAttachment !== "function") {
                return {
                    status: "failed",
                    code: "unavailable",
                    details: { reason: "stored_attachment_staging" },
                };
            }
            stage = await workspace.prepareStoredAttachment(String(args.path || ""), context.signal);
        }
        const identity = await dependencies.identity(mutationContext);
        if (identity.generatedSourceReferenceIds.length) {
            await dependencies.recordSourceIds(mutationContext, identity.generatedSourceReferenceIds);
        }
        const control = getZoteroHostCanonicalMutationControl(broker);
        const { input, registeredSourceIds } = await canonicalMutationInput(spec, args, identity, control, stage, context.signal);
        if (registeredSourceIds.length &&
            !sameSourceIds(registeredSourceIds, identity.generatedSourceReferenceIds)) {
            await dependencies.recordSourceIds(mutationContext, registeredSourceIds);
        }
        // Owner identity is trusted composition: Conversation and Skill Run owners
        // share an ownerId space, so the scope namespaces them explicitly.
        const scope = {
            ownerId: "pi:" + context.owner.kind + ":" + context.owner.ownerId,
        };
        // The Broker binding is trusted composition from the private identity, so
        // the Gateway can commit it with the started fact and reconcile against
        // authoritative Broker evidence without reissuing the effect. Model
        // arguments never reach it, and the mutation input keeps its own
        // operationId unchanged.
        const domainOperation = {
            scope: { ownerId: scope.ownerId },
            operationId: identity.operationId,
        };
        const prepared = await control.prepare({
            input: input,
            scope,
            ...(stage
                ? {
                    resources: {
                        deferredStoredAttachment: {
                            prepare: async () => stage.prepared,
                        },
                        preparedFiles: stage.preparedFiles,
                    },
                }
                : {}),
            control: { signal: context.signal },
        });
        const dispose = async () => {
            await stage?.dispose();
        };
        if (prepared.state === "settled") {
            await discardStage();
            if (cleanupPending)
                return cleanupPendingFailure();
            return {
                status: "prepared",
                domainPlanDigest: "receipt" in prepared.result
                    ? prepared.result.receipt.effectDigest
                    : "settled",
                admissionFacts: admissionFacts(spec, identity, args, undefined),
                domainOperation,
                execute: async () => finalizeMutation(prepared.result, spec.projectResult, mutationContext, dependencies),
                dispose: async () => undefined,
            };
        }
        const preview = prepared.preview;
        const facts = admissionFacts(spec, identity, args, preview.plan);
        if (dryRun) {
            await discardStage();
            if (cleanupPending)
                return cleanupPendingFailure();
            return {
                status: "prepared",
                domainPlanDigest: preview.domainPlanDigest,
                admissionFacts: facts,
                domainOperation,
                execute: async () => ({
                    status: "completed",
                    effectCertainty: "not_applicable",
                    value: {
                        outcome: preview.outcome,
                        domainPlanDigest: preview.domainPlanDigest,
                        plan: preview.plan,
                    },
                }),
                dispose: async () => undefined,
            };
        }
        return {
            status: "prepared",
            domainPlanDigest: preview.domainPlanDigest,
            admissionFacts: facts,
            domainOperation,
            execute: async (executeContext) => finalizeMutation(await control.execute({
                input: input,
                scope,
                prepared: prepared.prepared,
                control: { signal: executeContext.signal },
            }), spec.projectResult, mutationContext, dependencies),
            dispose,
        };
    }
    catch (error) {
        await discardStage();
        const failure = mutationFailure(error);
        if (!cleanupPending || failure.status !== "failed")
            return failure;
        return {
            ...failure,
            details: { cleanupPending: true, cause: failure.details ?? null },
        };
    }
}
function mutationDefinition(broker, workspace, dependencies, spec) {
    const effects = ["bounded-read", "zotero-mutation"];
    const resourceKeys = (value) => spec.libraries(value).map((id) => "library:" + String(id));
    return {
        capabilityId: spec.capabilityId,
        name: spec.name,
        description: "Mutate Zotero " + spec.capabilityId.replaceAll("_", " "),
        schema: spec.schema,
        minimumEffects: ["bounded-read"],
        maxResultBytes: BYTE_LIMIT,
        // A stored-attachment mutation copies and imports a file, so it keeps the
        // long bound; the remaining Zotero mutations stay ordinary.
        deadlineCategory: spec.files ? "long-traversal" : "ordinary",
        classify: (value) => {
            const dryRun = value?.dryRun === true;
            return {
                effects: dryRun ? ["bounded-read"] : effects,
                authorizationKeys: dryRun || !spec.enhanced ? [] : [ENHANCED_AUTHORIZATION_KEY],
                resourceKeys: dryRun ? [] : resourceKeys(value),
                cost: 1,
            };
        },
        execute: async () => ({
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "preflight_required",
        }),
        preflight: async (value, context) => runMutationPreflight(spec, broker, workspace, dependencies, (value || {}), context),
    };
}
export function createZoteroNativeMutationDefinitions(args) {
    const { broker, workspace, mutations } = args || {};
    if (!mutations)
        throw new Error("pi_zotero_mutation_dependencies_missing");
    return NATIVE_MUTATION_SPECS.map((spec) => mutationDefinition(broker, workspace, mutations, spec));
}
