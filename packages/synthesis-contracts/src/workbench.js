import { SynthesisClientError, toSynthesisJsonObject, } from "./common.js";
import { rebuildSynthesisProtocolDto, SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID, } from "./protocolSchema.js";
export const SYNTHESIS_WORKBENCH_SURFACES = [
    "home",
    "topics",
    "index",
    "review",
    "graph",
    "tags",
    "concepts",
    "reader",
];
export function rebuildSynthesisWorkbenchReadState(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "WorkbenchState",
        value,
        direction: "request",
    });
}
export const SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS = [
    {
        cacheKey: "reference-sidecar:library",
        cacheKind: "reference-sidecar",
    },
    {
        cacheKey: "citation-graph:library",
        cacheKind: "citation_graph",
    },
];
export const SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT = 50;
export const SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT = 20;
const SYNTHESIS_WORKBENCH_SURFACE_RESULT_DEFINITIONS = {
    home: "HomeSurfaceProjection",
    topics: "TopicsSurfaceProjection",
    index: "IndexSurfaceProjection",
    graph: "GraphSurfaceProjection",
    tags: "TagsSurfaceProjection",
    concepts: "ConceptsSurfaceProjection",
    reader: "ReaderSurfaceProjection",
};
export function rebuildSynthesisWorkbenchSurfaceResult(request, value) {
    const definition = request.surface === "review"
        ? request.state.reviews.activeTab === "concepts"
            ? "ConceptReviewSurfaceProjection"
            : request.state.reviews.activeTab === "topic_graph"
                ? "TopicGraphReviewSurfaceProjection"
                : "ReferenceReviewSurfaceProjection"
        : SYNTHESIS_WORKBENCH_SURFACE_RESULT_DEFINITIONS[request.surface];
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition,
        value,
        direction: "result",
    });
}
export function rebuildSynthesisWorkbenchTopicDetailResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ReadTopicDetailResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisWorkbenchPaperDigestReadRequest(value) {
    const object = strictObject(value, "synthesisWorkbenchPaperDigestReadRequest", ["paperRef", "includeRepresentativeImage"], ["topicId", "digestRef"]);
    if (typeof object.includeRepresentativeImage !== "boolean") {
        invalid("synthesisWorkbenchPaperDigestReadRequest.includeRepresentativeImage");
    }
    const paperRef = boundedString(object.paperRef, "synthesisWorkbenchPaperDigestReadRequest.paperRef");
    const topicId = optionalString(object.topicId, "synthesisWorkbenchPaperDigestReadRequest.topicId");
    let digestRef;
    if (object.digestRef !== undefined) {
        const ref = strictObject(object.digestRef, "synthesisWorkbenchPaperDigestReadRequest.digestRef", ["paperRef", "payloadHash"], ["locator", "libraryId", "noteKey"]);
        if (ref.paperRef !== paperRef) {
            invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.paperRef");
        }
        const libraryId = ref.libraryId === undefined
            ? undefined
            : nonNegativeInteger(ref.libraryId, "synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId", Number.MAX_SAFE_INTEGER);
        if (libraryId === 0) {
            invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId");
        }
        const locator = optionalString(ref.locator, "synthesisWorkbenchPaperDigestReadRequest.digestRef.locator");
        const noteKey = optionalString(ref.noteKey, "synthesisWorkbenchPaperDigestReadRequest.digestRef.noteKey");
        digestRef = {
            paperRef,
            payloadHash: boundedString(ref.payloadHash, "synthesisWorkbenchPaperDigestReadRequest.digestRef.payloadHash"),
            ...(locator ? { locator } : {}),
            ...(libraryId === undefined ? {} : { libraryId }),
            ...(noteKey ? { noteKey } : {}),
        };
    }
    return {
        ...(topicId ? { topicId } : {}),
        paperRef,
        ...(digestRef ? { digestRef } : {}),
        includeRepresentativeImage: object.includeRepresentativeImage,
    };
}
function rebuildRepresentativeImage(value) {
    const location = "synthesisWorkbenchPaperDigestResult.representative_image";
    const object = strictObject(value, location, ["status", "diagnostics"], [
        "attachment_key",
        "alt",
        "caption",
        "mime_type",
        "data_url",
        "width",
        "height",
        "compressed_bytes",
        "source_kind",
        "strategy",
    ]);
    if (object.status !== "available" &&
        object.status !== "unavailable" &&
        object.status !== "absent") {
        invalid(`${location}.status`);
    }
    if (!Array.isArray(object.diagnostics) ||
        object.diagnostics.some((entry) => typeof entry !== "string")) {
        invalid(`${location}.diagnostics`);
    }
    const optionalInteger = (field) => object[field] === undefined
        ? undefined
        : nonNegativeInteger(object[field], `${location}.${field}`, Number.MAX_SAFE_INTEGER);
    return {
        status: object.status,
        ...Object.fromEntries([
            "attachment_key",
            "alt",
            "caption",
            "mime_type",
            "data_url",
            "source_kind",
            "strategy",
        ]
            .map((field) => [
            field,
            optionalString(object[field], `${location}.${field}`),
        ])
            .filter((entry) => Boolean(entry[1]))),
        ...Object.fromEntries(["width", "height", "compressed_bytes"]
            .map((field) => [field, optionalInteger(field)])
            .filter((entry) => entry[1] !== undefined)),
        diagnostics: [...object.diagnostics],
    };
}
export function rebuildSynthesisWorkbenchPaperDigestResult(value) {
    const location = "synthesisWorkbenchPaperDigestResult";
    const object = strictObject(value, location, [
        "ok",
        "status",
        "paper_ref",
        "digest_markdown",
        "recorded_hash",
        "current_hash",
        "source_changed",
        "diagnostics",
    ], ["note_key", "note_title", "representative_image"]);
    if (typeof object.ok !== "boolean" ||
        (object.status !== "available" && object.status !== "unavailable") ||
        typeof object.source_changed !== "boolean" ||
        !Array.isArray(object.diagnostics) ||
        object.diagnostics.some((entry) => typeof entry !== "string")) {
        invalid(location);
    }
    const noteKey = optionalString(object.note_key, `${location}.note_key`);
    const noteTitle = optionalString(object.note_title, `${location}.note_title`);
    return {
        ok: object.ok,
        status: object.status,
        paper_ref: boundedString(object.paper_ref, `${location}.paper_ref`),
        digest_markdown: boundedString(object.digest_markdown, `${location}.digest_markdown`, true),
        recorded_hash: boundedString(object.recorded_hash, `${location}.recorded_hash`, true),
        current_hash: boundedString(object.current_hash, `${location}.current_hash`, true),
        source_changed: object.source_changed,
        diagnostics: [...object.diagnostics],
        ...(noteKey ? { note_key: noteKey } : {}),
        ...(noteTitle ? { note_title: noteTitle } : {}),
        ...(object.representative_image === undefined
            ? {}
            : {
                representative_image: rebuildRepresentativeImage(object.representative_image),
            }),
    };
}
function invalid(location) {
    throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
        location,
    });
}
function strictObject(value, location, required, optional = []) {
    const object = toSynthesisJsonObject(value, location);
    const keys = Object.keys(object).sort();
    const allowed = [...required, ...optional].sort();
    if (required.some((key) => !Object.hasOwn(object, key)) ||
        keys.some((key) => !allowed.includes(key))) {
        invalid(location);
    }
    return object;
}
function boundedString(value, location, allowEmpty = false) {
    if (typeof value !== "string" ||
        (!allowEmpty && value.length === 0) ||
        value.length > 4096) {
        invalid(location);
    }
    return value;
}
function optionalString(value, location) {
    return value === undefined
        ? undefined
        : boundedString(value, location, true) || undefined;
}
function nonNegativeInteger(value, location, max) {
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > max) {
        invalid(location);
    }
    return value;
}
export function rebuildSynthesisWorkbenchChromeReadRequest(value) {
    const object = strictObject(value, "synthesisWorkbenchChromeReadRequest", [
        "state",
    ]);
    return {
        state: rebuildSynthesisWorkbenchReadState(object.state),
    };
}
export function rebuildSynthesisWorkbenchOperationalChromeReadRequest(value) {
    strictObject(value, "synthesisWorkbenchOperationalChromeReadRequest", []);
    return {};
}
function rebuildCacheReadiness(value, index) {
    const location = `synthesisWorkbenchOperationalChromeResult.maintenance.cacheReadiness[${index}]`;
    const object = strictObject(value, location, ["cacheKey", "cacheKind", "status"], ["refreshedAt", "updatedAt", "staleReason"]);
    const descriptor = SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS[index];
    if (!descriptor ||
        object.cacheKey !== descriptor.cacheKey ||
        object.cacheKind !== descriptor.cacheKind ||
        (object.status !== "missing" &&
            object.status !== "ready" &&
            object.status !== "stale" &&
            object.status !== "refreshing" &&
            object.status !== "failed")) {
        invalid(location);
    }
    const refreshedAt = optionalString(object.refreshedAt, `${location}.refreshedAt`);
    const updatedAt = optionalString(object.updatedAt, `${location}.updatedAt`);
    const staleReason = optionalString(object.staleReason, `${location}.staleReason`);
    return {
        cacheKey: descriptor.cacheKey,
        cacheKind: descriptor.cacheKind,
        status: object.status,
        ...(refreshedAt ? { refreshedAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
        ...(staleReason ? { staleReason } : {}),
    };
}
function rebuildProgress(value, location) {
    const object = toSynthesisJsonObject(value, location);
    if (object.mode === "indeterminate") {
        strictObject(value, location, ["mode"], ["label"]);
        const label = optionalString(object.label, `${location}.label`);
        return {
            mode: "indeterminate",
            ...(label ? { label } : {}),
        };
    }
    if (object.mode !== "determinate")
        invalid(location);
    strictObject(value, location, ["mode", "percent"], ["current", "total", "label"]);
    const current = object.current === undefined
        ? undefined
        : nonNegativeInteger(object.current, `${location}.current`, Number.MAX_SAFE_INTEGER);
    const total = object.total === undefined
        ? undefined
        : nonNegativeInteger(object.total, `${location}.total`, Number.MAX_SAFE_INTEGER);
    const label = optionalString(object.label, `${location}.label`);
    return {
        mode: "determinate",
        percent: nonNegativeInteger(object.percent, `${location}.percent`, 100),
        ...(current === undefined ? {} : { current }),
        ...(total === undefined ? {} : { total }),
        ...(label ? { label } : {}),
    };
}
function rebuildBackgroundJob(value, index) {
    const location = `synthesisWorkbenchOperationalChromeResult.maintenance.backgroundJobs[${index}]`;
    const object = strictObject(value, location, ["job_id", "source", "status", "label", "progress"], ["detail", "updated_at"]);
    const sources = [
        "workbench",
        "operation",
        "reference_sidecar_refresh",
        "citation_graph_cache_rebuild",
        "citation_graph_layout",
        "webdav_sync",
        "canonical_maintenance",
    ];
    const statuses = [
        "submitted",
        "queued",
        "running",
        "waiting",
        "failed",
    ];
    if (typeof object.source !== "string" ||
        !sources.includes(object.source) ||
        typeof object.status !== "string" ||
        !statuses.includes(object.status)) {
        invalid(location);
    }
    const detail = optionalString(object.detail, `${location}.detail`);
    const updatedAt = optionalString(object.updated_at, `${location}.updated_at`);
    return {
        job_id: boundedString(object.job_id, `${location}.job_id`),
        source: object.source,
        status: object.status,
        label: boundedString(object.label, `${location}.label`),
        ...(detail ? { detail } : {}),
        ...(updatedAt ? { updated_at: updatedAt } : {}),
        progress: rebuildProgress(object.progress, `${location}.progress`),
    };
}
export function rebuildSynthesisWorkbenchOperationalChromeResult(value) {
    const root = strictObject(value, "synthesisWorkbenchOperationalChromeResult", ["maintenance"]);
    const maintenance = strictObject(root.maintenance, "synthesisWorkbenchOperationalChromeResult.maintenance", ["cacheReadiness", "backgroundJobs"]);
    if (!Array.isArray(maintenance.cacheReadiness) ||
        maintenance.cacheReadiness.length !==
            SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.length ||
        !Array.isArray(maintenance.backgroundJobs) ||
        maintenance.backgroundJobs.length >
            SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT +
                SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT) {
        invalid("synthesisWorkbenchOperationalChromeResult.maintenance");
    }
    return {
        maintenance: {
            cacheReadiness: maintenance.cacheReadiness.map(rebuildCacheReadiness),
            backgroundJobs: maintenance.backgroundJobs.map(rebuildBackgroundJob),
        },
    };
}
