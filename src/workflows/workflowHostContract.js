export function defineWorkflowHostCandidateManifest(manifest) {
    return manifest;
}
export const WORKFLOW_HOST_API_MANIFEST = defineWorkflowHostCandidateManifest({
    version: ["value", 12],
    interactionMode: ["oneOf", "interactive", "non_interactive"],
    addon: { getConfig: "function" },
    environment: { getInfo: "function" },
    context: {
        getCurrentView: "function",
        getSelectedItems: "function",
    },
    library: {
        listItems: "function",
        traverseItems: "function",
        withItemSnapshot: "function",
        listCollections: "function",
        listSavedSearches: "function",
        getItemDetail: "function",
        getItemNotes: "function",
        getNoteDetail: "function",
        listNotePayloads: "function",
        getNotePayload: "function",
        getItemAttachments: "function",
        listAnnotations: "function",
        exportPortableItems: "function",
    },
    metadata: { translateIdentifier: "function" },
    mutations: { preview: "function", execute: "function", getOperation: "function" },
    managedNotes: {
        writeCustom: "function",
        writeConversation: "function",
    },
    literatureArtifacts: {
        applyAnalysis: "function",
        upsertDigest: "function",
        upsertReferences: "function",
        upsertCitationAnalysis: "function",
        upsertScore: "function",
    },
    notes: {
        create: "function",
        updateContent: "function",
        remove: "function",
        upsertPayload: "function",
    },
    images: { prepareForNoteEmbedding: "function" },
    attachments: {
        create: "function",
        updateMetadata: "function",
        replaceFile: "function",
        move: "function",
        remove: "function",
    },
    bibliography: { listFormats: "function", render: "function" },
    researchBundles: {
        materializePapers: "function",
        importPapers: "function",
    },
    statusTags: { getPolicy: "function", transition: "function" },
    file: {
        readText: "function",
        writeText: "function",
        readBytes: "function",
        writeBytes: "function",
        copy: "function",
        exists: "function",
        makeDirectory: "function",
        materializeWorkflowInputFile: "function",
        getTempDirectoryPath: "function",
        pickDirectory: "function",
        pickFile: "function",
        pickSaveFile: "function",
        pickFiles: "function",
        stat: "function",
        list: "function",
        move: "function",
        remove: "function",
    },
    archive: {
        measureEntries: "function",
        writeZipAtomic: "function",
        withExtractedZip: "function",
    },
    resources: {
        getInput: "function",
        getInputs: "function",
        get: "function",
        materializeFile: "function",
        allocateOutput: "function",
        publishOutput: "function",
        listOutputs: "function",
    },
    clipboard: {
        readText: "function",
        writeText: "function",
        hasText: "function",
        clear: "function",
    },
    editor: { openSession: "function" },
    notifications: { toast: "function" },
    logging: { appendRuntimeLog: "function" },
    synthesis: {
        workflowApply: {
            applyLiteratureDigest: "function",
            applyTopicPlan: "function",
            applyTopicSynthesisResult: "function",
        },
        topics: { getReport: "function" },
        artifacts: { readPaperArtifacts: "function" },
        tags: {
            loadVocabulary: "function",
            saveVocabulary: "function",
            exportVocabularyForRegulator: "function",
            listStagedSuggestions: "function",
            stageSuggestions: "function",
            promoteStagedSuggestions: "function",
            discardStagedSuggestions: "function",
            withAuditRun: "function",
            acknowledgeRegulation: "function",
        },
    },
});
export const WORKFLOW_HOST_API_VERSION = WORKFLOW_HOST_API_MANIFEST.version[1];
function isManifestValueEntry(entry) {
    return Array.isArray(entry);
}
function manifestValueMatches(value, entry) {
    return entry[0] === "value"
        ? Object.is(value, entry[1])
        : entry.slice(1).some((candidate) => Object.is(value, candidate));
}
function isContractObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function memberPath(prefix, member) {
    return prefix ? `${prefix}.${member}` : member;
}
function collectManifestLeafPaths(manifest, prefix) {
    const paths = [];
    for (const [member, entry] of Object.entries(manifest)) {
        const path = memberPath(prefix, member);
        if (entry === "function" || entry === "value" || isManifestValueEntry(entry)) {
            paths.push(path);
        }
        else {
            paths.push(...collectManifestLeafPaths(entry, path));
        }
    }
    return paths;
}
export function inspectWorkflowHostCandidate(candidate, manifest) {
    const missingPaths = [];
    const unexpectedPaths = [];
    const nonFunctionPaths = [];
    const nonObjectPaths = [];
    const invalidValuePaths = [];
    const visit = (value, expected, prefix) => {
        if (!isContractObject(value)) {
            if (prefix)
                nonObjectPaths.push(prefix);
            else
                missingPaths.push(...collectManifestLeafPaths(expected, prefix));
            return;
        }
        const actualKeys = new Set(Object.keys(value));
        for (const [member, entry] of Object.entries(expected)) {
            const path = memberPath(prefix, member);
            if (!actualKeys.has(member)) {
                missingPaths.push(...(entry === "function" || entry === "value" || isManifestValueEntry(entry)
                    ? [path]
                    : collectManifestLeafPaths(entry, path)));
                continue;
            }
            actualKeys.delete(member);
            const memberValue = value[member];
            if (entry === "function") {
                if (typeof memberValue !== "function")
                    nonFunctionPaths.push(path);
            }
            else if (isManifestValueEntry(entry)) {
                if (!manifestValueMatches(memberValue, entry))
                    invalidValuePaths.push(path);
            }
            else if (entry !== "value") {
                if (!isContractObject(memberValue))
                    nonObjectPaths.push(path);
                else
                    visit(memberValue, entry, path);
            }
        }
        for (const member of actualKeys) {
            unexpectedPaths.push(memberPath(prefix, member));
        }
    };
    visit(candidate, manifest, "");
    missingPaths.sort();
    unexpectedPaths.sort();
    nonFunctionPaths.sort();
    nonObjectPaths.sort();
    invalidValuePaths.sort();
    return {
        ok: missingPaths.length === 0 &&
            unexpectedPaths.length === 0 &&
            nonFunctionPaths.length === 0 &&
            nonObjectPaths.length === 0 &&
            invalidValuePaths.length === 0,
        missingPaths,
        unexpectedPaths,
        nonFunctionPaths,
        nonObjectPaths,
        invalidValuePaths,
    };
}
function collectCandidateShape(candidate, prefix = "", output = new Map()) {
    if (!isContractObject(candidate)) {
        if (prefix)
            output.set(prefix, candidate === null ? "null" : typeof candidate);
        return output;
    }
    for (const [member, value] of Object.entries(candidate)) {
        const path = memberPath(prefix, member);
        if (isContractObject(value))
            collectCandidateShape(value, path, output);
        else
            output.set(path, typeof value === "function" ? "function" : "value");
    }
    return output;
}
export function inspectWorkflowHostContractVariants(manifest, variants) {
    const inspections = {
        interactive: inspectWorkflowHostCandidate(variants.interactive, manifest),
        "non-interactive": inspectWorkflowHostCandidate(variants["non-interactive"], manifest),
    };
    const interactiveShape = collectCandidateShape(variants.interactive);
    const nonInteractiveShape = collectCandidateShape(variants["non-interactive"]);
    const paths = new Set([
        ...interactiveShape.keys(),
        ...nonInteractiveShape.keys(),
    ]);
    const variantShapeMismatchPaths = [...paths]
        .filter((path) => interactiveShape.get(path) !== nonInteractiveShape.get(path))
        .sort();
    return {
        ok: inspections.interactive.ok &&
            inspections["non-interactive"].ok &&
            variantShapeMismatchPaths.length === 0,
        variants: inspections,
        variantShapeMismatchPaths,
    };
}
export function resolveWorkflowHostContractVersion(args) {
    if (typeof args.explicitVersion === "number" &&
        Number.isFinite(args.explicitVersion)) {
        return args.explicitVersion;
    }
    if (typeof args.hostApi?.version === "number" &&
        Number.isFinite(args.hostApi.version)) {
        return args.hostApi.version;
    }
    return args.currentProjection ? WORKFLOW_HOST_API_VERSION : 0;
}
export function summarizeWorkflowHostApiCapabilities(hostApi) {
    const hostRecord = (hostApi || {});
    const summary = {};
    for (const capability of Object.keys(WORKFLOW_HOST_API_MANIFEST)) {
        if (capability === "version" || capability === "interactionMode")
            continue;
        summary[capability] = Boolean(hostRecord[capability]);
    }
    return {
        ...summary,
        saveFile: typeof hostApi?.file?.pickSaveFile === "function",
    };
}
export function inspectWorkflowHostContract(hostApi, _variant) {
    const summary = summarizeWorkflowHostApiCapabilities(hostApi);
    const inspection = inspectWorkflowHostCandidate(hostApi, WORKFLOW_HOST_API_MANIFEST);
    const missingCapabilities = [
        ...new Set(inspection.missingPaths
            .map((path) => path.split(".")[0])
            .filter((capability) => capability !== "version" && capability !== "interactionMode")),
    ].sort();
    const unexpectedCapabilities = [
        ...new Set(inspection.unexpectedPaths.map((path) => path.split(".")[0])),
    ].sort();
    const actualVersion = typeof hostApi.version === "number" && Number.isFinite(hostApi.version)
        ? hostApi.version
        : 0;
    const versionMismatch = actualVersion === WORKFLOW_HOST_API_VERSION
        ? null
        : {
            expected: WORKFLOW_HOST_API_VERSION,
            actual: actualVersion,
        };
    return {
        summary,
        conformance: {
            ok: inspection.ok &&
                versionMismatch === null,
            missingCapabilities,
            unexpectedCapabilities,
            versionMismatch,
        },
    };
}
