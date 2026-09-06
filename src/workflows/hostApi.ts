import { createWorkflowEditorOwner } from "../modules/workflowEditorHost";
import { createWorkflowLoggingOwner } from "../modules/runtimeLogManager";
import { createWorkflowNotificationOwner } from "../modules/workflowExecution/feedbackSeam";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import { createWorkflowArchiveApi } from "./archive";
import { createWorkflowBibliographyOwner } from "./bibliography";
import { createWorkflowClipboardOwner } from "./clipboard";
import { createWorkflowFileApi } from "./file";
import { createWorkflowInputMaterializer } from "./workflowInputMaterialization";
import {
  createWorkflowAddonOwner,
  createWorkflowHostCapabilityBroker,
  createWorkflowEnvironmentOwner,
  createWorkflowHostLiveReadAdapters,
  createWorkflowLibraryItemSnapshotApi,
  type WorkflowHostLeafScope,
} from "./workflowHostOwners";
import {
  assertWorkflowCallNotCanceled,
  createWorkflowHostError,
  type WorkflowInteractionMember,
} from "./workflowHostErrorContract";
import { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
import type { WorkflowCallControl, WorkflowHostApiV12 } from "./types";

export * from "./workflowHostOwners";
export { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";

function unavailable(kind: "resource" | "prepared_image") {
  return createWorkflowHostError(
    "unavailable",
    "Workflow Host owner is unavailable",
    { reason: "runtime", kind },
  );
}

function interactionRequired(member: WorkflowInteractionMember) {
  return createWorkflowHostError(
    "interaction_required",
    `${member} requires an interactive Workflow Host`,
    { member },
  );
}

function createUnavailableResources(): WorkflowHostApiV12["resources"] {
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

export function createWorkflowHostApi(
  args: {
    interactionMode?: "interactive" | "non_interactive";
    ownerId?: string;
    owners?: Partial<WorkflowHostLeafScope["owners"]>;
    preparedImages?: WorkflowHostLeafScope["preparedImages"];
    resources?: WorkflowHostApiV12["resources"];
    researchBundles?: WorkflowHostApiV12["researchBundles"];
    synthesis?: WorkflowHostApiV12["synthesis"];
    inputScope?: { workflowId: string; runId: string };
    defaultControl?: WorkflowCallControl;
  } = {},
): WorkflowHostApiV12 {
  const interactionMode = args.interactionMode || "interactive";
  const ownerId =
    args.ownerId ||
    `workflow-host:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  const callerScope = args.preparedImages
    ? { ownerId, preparedImages: args.preparedImages }
    : { ownerId };
  // Ordinary members fall back to the runtime-provided execution control when
  // the caller omits it; an explicit control (including `{}`) is respected.
  const defaultControl = args.defaultControl;
  const withDefaultControl = (control?: WorkflowCallControl) =>
    control || defaultControl;
  const resources = args.resources || createUnavailableResources();
  const broker = createWorkflowHostCapabilityBroker(resources);
  const liveReads = createWorkflowHostLiveReadAdapters({
    interactionMode,
    broker,
  });
  const workflowFile = createWorkflowFileApi();
  const archive = createWorkflowArchiveApi();
  const interactive = interactionMode === "interactive";
  const addon = args.owners?.addon || createWorkflowAddonOwner();
  const environment =
    args.owners?.environment || createWorkflowEnvironmentOwner();
  const images = args.owners?.images || {
    prepareForNoteEmbedding: () =>
      Promise.reject(unavailable("prepared_image")),
  };
  const bibliography =
    args.owners?.bibliography || createWorkflowBibliographyOwner();
  const clipboard =
    args.owners?.clipboard || createWorkflowClipboardOwner({ interactionMode });
  const editor =
    args.owners?.editor ||
    createWorkflowEditorOwner({ interactionMode, callerScope });
  const notifications =
    args.owners?.notifications ||
    createWorkflowNotificationOwner({ interactionMode, callerScope });
  const logging =
    args.owners?.logging ||
    createWorkflowLoggingOwner({ workflowId: "unknown", packageId: "unknown" });
  const researchBundles = args.researchBundles || {
    materializePapers: () => Promise.reject(unavailable("resource")),
    importPapers: () => Promise.reject(unavailable("resource")),
  };
  const synthesis = args.synthesis || createWorkflowSynthesisHostApi();
  const denyPicker = (member: WorkflowInteractionMember) => async () => {
    throw interactionRequired(member);
  };

  return {
    version: WORKFLOW_HOST_API_VERSION,
    interactionMode,
    addon: { getConfig: addon.getConfig },
    environment: { getInfo: environment.getInfo },
    context: {
      getCurrentView: liveReads.context.getCurrentView,
      getSelectedItems: (request, control) =>
        liveReads.context.getSelectedItems(
          request,
          withDefaultControl(control),
        ),
    },
    navigation: {
      openItem: liveReads.navigation.openItem,
      openNote: liveReads.navigation.openNote,
      openCollection: liveReads.navigation.openCollection,
      openSelection: liveReads.navigation.openSelection,
    },
    library: {
      listItems: (input, control) =>
        liveReads.library.listItems(input, withDefaultControl(control)),
      traverseItems: (input, control, onBatch) =>
        liveReads.library.traverseItems(
          input,
          withDefaultControl(control) || {},
          onBatch,
        ),
      withItemSnapshot: createWorkflowLibraryItemSnapshotApi(broker),
      listCollections: (input, control) =>
        liveReads.library.listCollections(input, withDefaultControl(control)),
      listSavedSearches: (input, control) =>
        liveReads.library.listSavedSearches(input, withDefaultControl(control)),
      getItemDetail: (ref, control) =>
        liveReads.library.getItemDetail(ref, withDefaultControl(control)),
      getItemNotes: (ref, page, control) =>
        liveReads.library.getItemNotes(ref, page, withDefaultControl(control)),
      getNoteDetail: (ref, options, control) =>
        liveReads.library.getNoteDetail(
          ref,
          options,
          withDefaultControl(control),
        ),
      listNotePayloads: (ref, page, control) =>
        liveReads.library.listNotePayloads(
          ref,
          page,
          withDefaultControl(control),
        ),
      getNotePayload: (ref, options, control) =>
        liveReads.library.getNotePayload(
          ref,
          options,
          withDefaultControl(control),
        ),
      getItemAttachments: (ref, page, control) =>
        liveReads.library.getItemAttachments(
          ref,
          page,
          withDefaultControl(control),
        ),
      listAnnotations: (ref, page, control) =>
        liveReads.library.listAnnotations(
          ref,
          page,
          withDefaultControl(control),
        ),
      exportPortableItems: (refs, control) =>
        liveReads.library.exportPortableItems(
          refs,
          withDefaultControl(control),
        ),
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
      preview: ((input) =>
        broker.mutations.preview(
          input,
          callerScope,
        )) as WorkflowHostApiV12["mutations"]["preview"],
      execute: ((input, control?: WorkflowCallControl) =>
        broker.mutations.execute(
          input,
          callerScope,
          control,
        )) as WorkflowHostApiV12["mutations"]["execute"],
    },
    notes: {
      create: (input, control) =>
        broker.notes.create(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["notes"]["create"]
        >,
      updateContent: (input, control) =>
        broker.notes.updateContent(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["notes"]["updateContent"]
        >,
      remove: (input, control) =>
        broker.notes.remove(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["notes"]["remove"]
        >,
      upsertPayload: (input, control) =>
        broker.notes.upsertPayload(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["notes"]["upsertPayload"]
        >,
    },
    images: {
      prepareForNoteEmbedding: images.prepareForNoteEmbedding,
    },
    attachments: {
      create: (input, control) =>
        broker.attachments.create(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["attachments"]["create"]
        >,
      updateMetadata: (input, control) =>
        broker.attachments.updateMetadata(
          input,
          callerScope,
          control,
        ) as ReturnType<WorkflowHostApiV12["attachments"]["updateMetadata"]>,
      replaceFile: (input, control) =>
        broker.attachments.replaceFile(
          input,
          callerScope,
          control,
        ) as ReturnType<WorkflowHostApiV12["attachments"]["replaceFile"]>,
      move: (input, control) =>
        broker.attachments.move(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["attachments"]["move"]
        >,
      remove: (input, control) =>
        broker.attachments.remove(input, callerScope, control) as ReturnType<
          WorkflowHostApiV12["attachments"]["remove"]
        >,
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
      transition: (input, control) =>
        broker.statusTags.transition(input, callerScope, control),
    },
    file: {
      readText: (path, control) =>
        workflowFile.readText(path, withDefaultControl(control)),
      writeText: (path, content, control) =>
        workflowFile.writeText(path, content, withDefaultControl(control)),
      readBytes: (path, control) =>
        workflowFile.readBytes(path, withDefaultControl(control)),
      writeBytes: (path, bytes, control) =>
        workflowFile.writeBytes(path, bytes, withDefaultControl(control)),
      copy: (input, control) =>
        workflowFile.copy(input, withDefaultControl(control)),
      exists: (path, control) =>
        workflowFile.exists(path, withDefaultControl(control)),
      makeDirectory: (input, control) =>
        workflowFile.makeDirectory(input, withDefaultControl(control)),
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
      stat: (path, control) =>
        workflowFile.stat(path, withDefaultControl(control)),
      list: (input, control) =>
        workflowFile.list(input, withDefaultControl(control)),
      move: (input, control) =>
        workflowFile.move(input, withDefaultControl(control)),
      remove: (input, control) =>
        workflowFile.remove(input, withDefaultControl(control)),
    },
    archive: {
      measureEntries: (input, control) =>
        archive.measureEntries(input, withDefaultControl(control)),
      writeZipAtomic: (input, control) =>
        archive.writeZipAtomic(input, withDefaultControl(control)),
      withExtractedZip: (input, control, callback) =>
        archive.withExtractedZip(input, control, callback),
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
      openSession:
        editor.openSession as WorkflowHostApiV12["editor"]["openSession"],
    },
    notifications: { toast: notifications.toast },
    logging: { appendRuntimeLog: logging.appendRuntimeLog },
    synthesis: {
      workflowApply: {
        applyLiteratureDigest: synthesis.workflowApply.applyLiteratureDigest,
        applyTopicPlan: synthesis.workflowApply.applyTopicPlan,
        applyTopicSynthesisResult:
          synthesis.workflowApply.applyTopicSynthesisResult,
      },
      topics: { getReport: synthesis.topics.getReport },
      artifacts: { readPaperArtifacts: synthesis.artifacts.readPaperArtifacts },
      tags: {
        loadVocabulary: synthesis.tags.loadVocabulary,
        saveVocabulary: synthesis.tags.saveVocabulary,
        exportVocabularyForRegulator:
          synthesis.tags.exportVocabularyForRegulator,
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

export function resetWorkflowHostApiForTests() {}
