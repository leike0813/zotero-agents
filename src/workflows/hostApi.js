import { createWorkflowEditorOwner } from "../modules/workflow/ui/workflowEditorHost";
import { createWorkflowLoggingOwner } from "./workflowLoggingOwner";
import { createWorkflowNotificationOwner } from "../modules/workflowExecution/feedbackSeam";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import { createWorkflowArchiveApi } from "./archive";
import { createWorkflowBibliographyOwner } from "./bibliography";
import { createWorkflowClipboardOwner } from "./clipboard";
import { createWorkflowFileApi } from "./file";
import { createWorkflowInputMaterializer } from "./workflowInputMaterialization";
import { getZoteroHostCanonicalMutationControl } from "../modules/zoteroHostCapabilityBroker";
import { assertLiteratureArtifactApplyAnalysisRequest, getZoteroManagedNoteLocalControl, ManagedNoteOwnerError, } from "../modules/zoteroHost/zoteroManagedNotes";
import { createWorkflowAddonOwner, createWorkflowHostCapabilityBroker, createWorkflowPreparedStoredFiles, createCanonicalStoredAttachmentSource, createStoredAttachmentCompleteSemanticInput, isAttachmentCreateMutationResult, lookupWorkflowStoredAttachmentMutation, createWorkflowEnvironmentOwner, createWorkflowHostLiveReadAdapters, createWorkflowLibraryItemSnapshotApi, } from "./workflowHostOwners";
import { assertWorkflowCallNotCanceled, createWorkflowHostError, } from "./workflowHostErrorContract";
import { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
export * from "./workflowHostOwners";
export { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
function unavailable(kind) {
    return createWorkflowHostError("unavailable", "Workflow Host owner is unavailable", { reason: "runtime", kind });
}
function interactionRequired(member) {
    return createWorkflowHostError("interaction_required", `${member} requires an interactive Workflow Host`, { member });
}
function requireAttachmentCreateResult(result) {
    if (!("result" in result)) {
        return { outcome: result.outcome, attempt: result.attempt };
    }
    if (!isAttachmentCreateMutationResult(result.result)) {
        throw new Error("Attachment create returned an unexpected result");
    }
    return {
        outcome: result.outcome,
        receipt: result.receipt,
        result: result.result,
    };
}
function createUnavailableResources() {
    const reject = () => Promise.reject(unavailable("resource"));
    return {
        getInput: () => null,
        getInputs: () => [],
        get: reject,
        materializeFile: reject,
        allocateOutput: reject,
        publishOutput: reject,
        listOutputs: () => [],
    };
}
export function createWorkflowHostApi(args = {}) {
    const interactionMode = args.interactionMode || "interactive";
    const ownerId = args.ownerId ||
        `workflow-host:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
    const callerScope = args.preparedImages
        ? { ownerId, preparedImages: args.preparedImages }
        : { ownerId };
    // Ordinary members fall back to the runtime-provided execution control when
    // the caller omits it; an explicit control (including `{}`) is respected.
    const defaultControl = args.defaultControl;
    const withDefaultControl = (control) => control || defaultControl;
    const resources = args.resources || createUnavailableResources();
    const broker = createWorkflowHostCapabilityBroker(resources);
    const toPreparedSource = (source) => source.kind === "local_path"
        ? { kind: "local_path", path: source.path }
        : { kind: "resource", resourceRef: source.resourceRef };
    const toPreparedRequest = (source) => ({
        main: {
            source: toPreparedSource(source.main.source),
            ...(source.main.targetFilename
                ? { targetFilename: source.main.targetFilename }
                : {}),
        },
        companions: (source.companions || []).map((companion) => ({
            source: toPreparedSource(companion.source),
            targetRelativePath: companion.targetRelativePath,
        })),
    });
    const executePreparedAttachmentCreate = async (input, source, control) => {
        const existing = await lookupWorkflowStoredAttachmentMutation({
            scope: callerScope,
            input,
            source,
        });
        if (existing.state !== "missing")
            return existing.result;
        const files = createWorkflowPreparedStoredFiles(resources);
        const trusted = getZoteroHostCanonicalMutationControl(broker);
        const effectiveControl = withDefaultControl(control);
        try {
            const preparedFile = await files.prepareStoredAttachment(source);
            const canonicalSource = createCanonicalStoredAttachmentSource(source, preparedFile.snapshot);
            const canonicalInput = {
                ...input,
                source: canonicalSource,
            };
            const replay = await lookupWorkflowStoredAttachmentMutation({
                scope: callerScope,
                input,
                source,
                completeSemanticInput: createStoredAttachmentCompleteSemanticInput(input, canonicalSource),
            });
            if (replay.state !== "missing")
                return replay.result;
            const prepared = await trusted.prepare({
                input: canonicalInput,
                scope: callerScope,
                control: effectiveControl,
                resources: {
                    deferredStoredAttachment: {
                        prepare: async () => preparedFile,
                    },
                    preparedFiles: files.preparedFiles,
                },
            });
            if (prepared.state === "settled")
                return prepared.result;
            return await trusted.execute({
                input: canonicalInput,
                scope: callerScope,
                prepared: prepared.prepared,
                control: effectiveControl,
            });
        }
        finally {
            await files.preparedFiles.dispose();
        }
    };
    const executePreparedAttachmentReplace = async (input, source, control) => {
        const existing = await lookupWorkflowStoredAttachmentMutation({
            scope: callerScope,
            input,
            source,
        });
        if (existing.state !== "missing")
            return existing.result;
        const files = createWorkflowPreparedStoredFiles(resources);
        const trusted = getZoteroHostCanonicalMutationControl(broker);
        const effectiveControl = withDefaultControl(control);
        try {
            const preparedFile = await files.prepareStoredAttachment(source);
            const canonicalSource = createCanonicalStoredAttachmentSource(source, preparedFile.snapshot);
            const canonicalInput = {
                ...input,
                source: canonicalSource,
            };
            const replay = await lookupWorkflowStoredAttachmentMutation({
                scope: callerScope,
                input,
                source,
                completeSemanticInput: createStoredAttachmentCompleteSemanticInput(input, canonicalSource),
            });
            if (replay.state !== "missing")
                return replay.result;
            const prepared = await trusted.prepare({
                input: canonicalInput,
                scope: callerScope,
                control: effectiveControl,
                resources: {
                    deferredStoredAttachment: {
                        prepare: async () => preparedFile,
                    },
                    preparedFiles: files.preparedFiles,
                },
            });
            if (prepared.state === "settled")
                return prepared.result;
            return await trusted.execute({
                input: canonicalInput,
                scope: callerScope,
                prepared: prepared.prepared,
                control: effectiveControl,
            });
        }
        finally {
            await files.preparedFiles.dispose();
        }
    };
    const liveReads = createWorkflowHostLiveReadAdapters({
        interactionMode,
        broker,
    });
    const workflowFile = createWorkflowFileApi();
    const archive = createWorkflowArchiveApi();
    const interactive = interactionMode === "interactive";
    const addon = args.owners?.addon || createWorkflowAddonOwner();
    const environment = args.owners?.environment || createWorkflowEnvironmentOwner();
    const images = args.owners?.images || {
        prepareForNoteEmbedding: () => Promise.reject(unavailable("prepared_image")),
    };
    const bibliography = args.owners?.bibliography || createWorkflowBibliographyOwner();
    const clipboard = args.owners?.clipboard || createWorkflowClipboardOwner({ interactionMode });
    const editor = args.owners?.editor ||
        createWorkflowEditorOwner({ interactionMode, callerScope });
    const notifications = args.owners?.notifications ||
        createWorkflowNotificationOwner({ interactionMode, callerScope });
    const logging = args.owners?.logging ||
        createWorkflowLoggingOwner({ workflowId: "unknown", packageId: "unknown" });
    const researchBundles = args.researchBundles || {
        materializePapers: () => Promise.reject(unavailable("resource")),
        importPapers: () => Promise.reject(unavailable("resource")),
    };
    const synthesis = args.synthesis || createWorkflowSynthesisHostApi();
    const denyPicker = (member) => async () => {
        throw interactionRequired(member);
    };
    return {
        version: WORKFLOW_HOST_API_VERSION,
        interactionMode,
        addon: { getConfig: addon.getConfig },
        environment: { getInfo: environment.getInfo },
        context: {
            getCurrentView: liveReads.context.getCurrentView,
            getSelectedItems: (request, control) => liveReads.context.getSelectedItems(request, withDefaultControl(control)),
        },
        library: {
            listItems: (input, control) => liveReads.library.listItems(input, withDefaultControl(control)),
            traverseItems: (input, control, onBatch) => liveReads.library.traverseItems(input, withDefaultControl(control) || {}, onBatch),
            withItemSnapshot: createWorkflowLibraryItemSnapshotApi(broker),
            listCollections: (input, control) => liveReads.library.listCollections(input, withDefaultControl(control)),
            listSavedSearches: (input, control) => liveReads.library.listSavedSearches(input, withDefaultControl(control)),
            getItemDetail: (ref, control) => liveReads.library.getItemDetail(ref, withDefaultControl(control)),
            getItemNotes: (ref, page, control) => liveReads.library.getItemNotes(ref, page, withDefaultControl(control)),
            getNoteDetail: (ref, options, control) => liveReads.library.getNoteDetail(ref, options, withDefaultControl(control)),
            listNotePayloads: (ref, page, control) => liveReads.library.listNotePayloads(ref, page, withDefaultControl(control)),
            getNotePayload: (ref, options, control) => liveReads.library.getNotePayload(ref, options, withDefaultControl(control)),
            getItemAttachments: (ref, page, control) => liveReads.library.getItemAttachments(ref, page, withDefaultControl(control)),
            listAnnotations: (ref, page, control) => liveReads.library.listAnnotations(ref, page, withDefaultControl(control)),
            exportPortableItems: (refs, control) => liveReads.library.exportPortableItems(refs, withDefaultControl(control)),
        },
        metadata: {
            translateIdentifier: async (input, control) => {
                const effectiveControl = withDefaultControl(control);
                assertWorkflowCallNotCanceled(effectiveControl);
                const result = await broker.metadata.translateIdentifier(input);
                assertWorkflowCallNotCanceled(effectiveControl);
                return result;
            },
        },
        mutations: {
            getOperation: (input) => broker.mutations.getOperation(input, callerScope),
            preview: ((input) => broker.mutations.preview(input, callerScope)),
            execute: ((input, control) => broker.mutations.execute(input, callerScope, control)),
        },
        managedNotes: {
            writeCustom: (request, control) => broker.managedNotes.writeCustom(request, callerScope, withDefaultControl(control)),
            writeConversation: (request, control) => broker.managedNotes.writeConversation(request, callerScope, withDefaultControl(control)),
        },
        literatureArtifacts: {
            applyAnalysis: (request, control) => {
                try {
                    // Validate the complete caller DTO before projecting it into the
                    // private parent-set shape.  Projection must not silently discard
                    // unknown top-level or nested fields.
                    assertLiteratureArtifactApplyAnalysisRequest(request);
                }
                catch (error) {
                    if (error instanceof ManagedNoteOwnerError) {
                        throw createWorkflowHostError("invalid_request", error.message, (error.details || {
                            reason: "invalid_schema",
                            field: "literatureArtifacts.applyAnalysis",
                        }), { retryable: error.retryable });
                    }
                    throw error;
                }
                const entries = [];
                if (request.digest)
                    entries.push({
                        noteKind: "digest",
                        title: "Digest",
                        payload: { markdown: request.digest.markdown },
                    });
                if (request.score)
                    entries.push({
                        noteKind: "literature-score",
                        title: "Literature Score",
                        payload: request.score,
                    });
                return getZoteroManagedNoteLocalControl(broker).applyParentSet({
                    operationId: request.operationId,
                    parentRef: request.parentRef,
                    entries,
                    ...(request.digest?.sourceRef
                        ? { sourceRef: request.digest.sourceRef }
                        : {}),
                    ...(request.digest?.representativeImage
                        ? {
                            preparedImage: request.digest.representativeImage.preparedImage,
                            imageAltText: request.digest.representativeImage.altText ||
                                "Representative image",
                        }
                        : {}),
                    ...(request.references ? { references: request.references } : {}),
                    ...(request.citationAnalysis
                        ? { citationAnalysis: request.citationAnalysis }
                        : {}),
                    ...(request.compactCitationSnippets
                        ? { compactCitationSnippets: true }
                        : {}),
                    ...(request.matchingMetadata
                        ? { matchingMetadata: request.matchingMetadata }
                        : {}),
                }, callerScope, withDefaultControl(control));
            },
            upsertDigest: (request, control) => broker.literatureArtifacts.upsertDigest(request, callerScope, withDefaultControl(control)),
            upsertReferences: (request, control) => broker.literatureArtifacts.upsertReferences(request, callerScope, withDefaultControl(control)),
            upsertCitationAnalysis: (request, control) => broker.literatureArtifacts.upsertCitationAnalysis(request, callerScope, withDefaultControl(control)),
            upsertScore: (request, control) => broker.literatureArtifacts.upsertScore(request, callerScope, withDefaultControl(control)),
        },
        notes: {
            create: (input, control) => broker.notes.create(input, callerScope, control),
            updateContent: (input, control) => broker.notes.updateContent(input, callerScope, control),
            remove: (input, control) => broker.notes.remove(input, callerScope, control),
            upsertPayload: (input, control) => broker.notes.upsertPayload(input, callerScope, control),
        },
        images: {
            prepareForNoteEmbedding: images.prepareForNoteEmbedding,
        },
        attachments: {
            create: async (input, control) => {
                if (input.source.kind === "stored_file") {
                    const { source, ...inputWithoutSource } = input;
                    return executePreparedAttachmentCreate({ ...inputWithoutSource, operation: "attachments.create" }, toPreparedRequest(source), control);
                }
                return requireAttachmentCreateResult(await broker.attachments.create({
                    ...input,
                    source: input.source.kind === "linked_url"
                        ? { kind: "linked_url", url: input.source.url }
                        : { kind: "stored_url", url: input.source.url },
                }, callerScope, withDefaultControl(control)));
            },
            updateMetadata: (input, control) => broker.attachments.updateMetadata(input, callerScope, control),
            replaceFile: (input, control) => {
                const { source, ...inputWithoutSource } = input;
                return executePreparedAttachmentReplace({ ...inputWithoutSource, operation: "attachments.replaceFile" }, toPreparedRequest(source), control);
            },
            move: (input, control) => broker.attachments.move(input, callerScope, control),
            remove: (input, control) => broker.attachments.remove(input, callerScope, control),
        },
        bibliography: {
            listFormats: bibliography.listFormats,
            render: bibliography.render,
        },
        researchBundles: {
            materializePapers: researchBundles.materializePapers,
            importPapers: researchBundles.importPapers,
        },
        statusTags: {
            getPolicy: broker.statusTags.getPolicy,
            transition: (input, control) => broker.statusTags.transition(input, callerScope, control),
        },
        file: {
            readText: (path, control) => workflowFile.readText(path, withDefaultControl(control)),
            writeText: (path, content, control) => workflowFile.writeText(path, content, withDefaultControl(control)),
            readBytes: (path, control) => workflowFile.readBytes(path, withDefaultControl(control)),
            writeBytes: (path, bytes, control) => workflowFile.writeBytes(path, bytes, withDefaultControl(control)),
            copy: (input, control) => workflowFile.copy(input, withDefaultControl(control)),
            exists: (path, control) => workflowFile.exists(path, withDefaultControl(control)),
            makeDirectory: (input, control) => workflowFile.makeDirectory(input, withDefaultControl(control)),
            materializeWorkflowInputFile: createWorkflowInputMaterializer({
                workflowId: args.inputScope?.workflowId || "workflow",
                runId: args.inputScope?.runId || ownerId,
            }),
            getTempDirectoryPath: workflowFile.getTempDirectoryPath,
            pickDirectory: interactive
                ? workflowFile.pickDirectory
                : denyPicker("file.pickDirectory"),
            pickFile: interactive
                ? workflowFile.pickFile
                : denyPicker("file.pickFile"),
            pickSaveFile: interactive
                ? workflowFile.pickSaveFile
                : denyPicker("file.pickSaveFile"),
            pickFiles: interactive
                ? workflowFile.pickFiles
                : denyPicker("file.pickFiles"),
            stat: (path, control) => workflowFile.stat(path, withDefaultControl(control)),
            list: (input, control) => workflowFile.list(input, withDefaultControl(control)),
            move: (input, control) => workflowFile.move(input, withDefaultControl(control)),
            remove: (input, control) => workflowFile.remove(input, withDefaultControl(control)),
        },
        archive: {
            measureEntries: (input, control) => archive.measureEntries(input, withDefaultControl(control)),
            writeZipAtomic: (input, control) => archive.writeZipAtomic(input, withDefaultControl(control)),
            withExtractedZip: (input, control, callback) => archive.withExtractedZip(input, control, callback),
        },
        resources: {
            getInput: resources.getInput,
            getInputs: resources.getInputs,
            get: resources.get,
            materializeFile: resources.materializeFile,
            allocateOutput: resources.allocateOutput,
            publishOutput: resources.publishOutput,
            listOutputs: resources.listOutputs,
        },
        clipboard: {
            readText: clipboard.readText,
            writeText: clipboard.writeText,
            hasText: clipboard.hasText,
            clear: clipboard.clear,
        },
        editor: {
            openSession: editor.openSession,
        },
        notifications: { toast: notifications.toast },
        logging: { appendRuntimeLog: logging.appendRuntimeLog },
        synthesis: {
            workflowApply: {
                applyLiteratureDigest: synthesis.workflowApply.applyLiteratureDigest,
                applyTopicPlan: synthesis.workflowApply.applyTopicPlan,
                applyTopicSynthesisResult: synthesis.workflowApply.applyTopicSynthesisResult,
            },
            topics: { getReport: synthesis.topics.getReport },
            artifacts: { readPaperArtifacts: synthesis.artifacts.readPaperArtifacts },
            tags: {
                loadVocabulary: synthesis.tags.loadVocabulary,
                saveVocabulary: synthesis.tags.saveVocabulary,
                exportVocabularyForRegulator: synthesis.tags.exportVocabularyForRegulator,
                listStagedSuggestions: synthesis.tags.listStagedSuggestions,
                stageSuggestions: synthesis.tags.stageSuggestions,
                promoteStagedSuggestions: synthesis.tags.promoteStagedSuggestions,
                discardStagedSuggestions: synthesis.tags.discardStagedSuggestions,
                withAuditRun: synthesis.tags.withAuditRun,
                acknowledgeRegulation: synthesis.tags.acknowledgeRegulation,
            },
        },
    };
}
export function resetWorkflowHostApiForTests() { }
