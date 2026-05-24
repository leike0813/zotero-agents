import { getHostBridgeApprovalRequirement } from "./hostBridgePermissionManager";
import { registerHostBridgeFileHandle } from "./hostBridgeFileRegistry";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeCapabilityCategory,
  HostBridgeCapabilityManifestEntry,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import {
  createZoteroHostCapabilityBrokerApis,
  type ZoteroHostItemRefInput,
  type ZoteroHostLibraryListArgs,
  type ZoteroHostMutationRequest,
  type ZoteroHostNoteDetailArgs,
  type ZoteroHostNotePayloadDetailArgs,
  type ZoteroHostAttachmentDto,
} from "./zoteroHostCapabilityBroker";
import { getDefaultSynthesisService } from "./synthesis/service";
import type {
  SynthesisMcpService,
  SynthesisMcpServiceMethod,
} from "./synthesis/mcpService";

export type HostBridgeCapabilityContext = {
  getStatus: () => HostBridgeStatusSnapshot;
};

export type HostBridgeCapabilityHandler = (
  input: unknown,
  context: HostBridgeCapabilityContext,
) => unknown | Promise<unknown>;

export type HostBridgeCapabilityDefinition =
  HostBridgeCapabilityManifestEntry & {
    handler: HostBridgeCapabilityHandler;
  };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function asObject(input: unknown): Record<string, unknown> {
  return isPlainObject(input) ? input : {};
}

function itemRefFromInput(input: unknown): ZoteroHostItemRefInput {
  const object = asObject(input);
  if (Object.prototype.hasOwnProperty.call(object, "ref")) {
    return object.ref as ZoteroHostItemRefInput;
  }
  return input as ZoteroHostItemRefInput;
}

function normalizeJsonSafeValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

async function toBridgeAttachmentDescriptor(
  attachment: ZoteroHostAttachmentDto,
) {
  const path = String(attachment.path || "").trim();
  const { path: _path, ...safeAttachment } = attachment;
  if (!path || attachment.errors?.length) {
    return {
      ...safeAttachment,
      access: {
        mode: "unavailable",
        file: null,
      },
    };
  }
  const file = await registerHostBridgeFileHandle({
    localPath: path,
    sourceKind: "zotero-attachment",
    displayName: attachment.filename || attachment.title,
    contentType: attachment.contentType,
    owner: {
      capability: "library.get_item_attachments",
      itemKey: attachment.parent?.key || attachment.key,
      libraryId: attachment.libraryId,
    },
  });
  return {
    ...safeAttachment,
    access: {
      mode: "bridge-download",
      file,
    },
  };
}

async function toBridgeAttachmentDescriptors(input: unknown) {
  const attachments =
    await createZoteroHostCapabilityBrokerApis().library.getItemAttachments(
      itemRefFromInput(input),
    );
  return Promise.all(attachments.map(toBridgeAttachmentDescriptor));
}

function capability(
  name: string,
  category: HostBridgeCapabilityCategory,
  summary: string,
  input: HostBridgeCapabilityManifestEntry["input"],
  handler: HostBridgeCapabilityHandler,
): HostBridgeCapabilityDefinition {
  const approval = getHostBridgeApprovalRequirement(name);
  return {
    name,
    category,
    summary,
    approval,
    input,
    handler: async (rawInput, context) =>
      normalizeJsonSafeValue(await handler(rawInput, context)),
  };
}

function synthesisCapability(
  name: string,
  summary: string,
  methodName: SynthesisMcpServiceMethod,
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    "synthesis",
    summary,
    { type: "object", required: false },
    async (input) => {
      const service =
        getDefaultSynthesisService() as unknown as SynthesisMcpService;
      const method = service?.[methodName];
      if (typeof method !== "function") {
        throw new Error(
          `Synthesis service method is unavailable: ${String(methodName)}`,
        );
      }
      return method(asObject(input));
    },
  );
}

const CAPABILITIES: HostBridgeCapabilityDefinition[] = [
  capability(
    "context.get_current_view",
    "context",
    "Return the active Zotero target, library id, selection state, and current item metadata.",
    { type: "none", required: false },
    () => createZoteroHostCapabilityBrokerApis().context.getCurrentView(),
  ),
  capability(
    "context.get_selected_items",
    "context",
    "Return JSON-safe summaries for the currently selected Zotero items.",
    { type: "none", required: false },
    () => createZoteroHostCapabilityBrokerApis().context.getSelectedItems(),
  ),
  capability(
    "library.search_items",
    "library",
    "Search regular Zotero library items by bounded text query.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.searchItems(
        asObject(input) as {
          query: string;
          limit?: number | string;
          libraryId?: number | string;
        },
      ),
  ),
  capability(
    "library.list_items",
    "library",
    "List compact parent Zotero library item summaries with bounded pagination and filters.",
    { type: "object", required: false },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.listItems(
        asObject(input) as ZoteroHostLibraryListArgs,
      ),
  ),
  capability(
    "library.get_item_detail",
    "library",
    "Return detailed JSON-safe metadata for one Zotero item.",
    { type: "item-ref", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getItemDetail(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_item_notes",
    "library",
    "Return bounded child note summaries for one Zotero item.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getItemNotes(
        itemRefFromInput(input),
        asObject(input),
      ),
  ),
  capability(
    "library.get_note_detail",
    "library",
    "Read one Zotero note body in bounded chunks.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getNoteDetail(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNoteDetailArgs,
      ),
  ),
  capability(
    "library.list_note_payloads",
    "library",
    "List hidden workflow payload blocks in one Zotero note.",
    { type: "item-ref", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.listNotePayloads(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_note_payload",
    "library",
    "Decode one hidden workflow payload from one Zotero note.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getNotePayload(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNotePayloadDetailArgs,
      ),
  ),
  capability(
    "library.get_item_attachments",
    "library",
    "Return child attachment metadata with broker-issued download handles when available.",
    { type: "item-ref", required: true },
    (input) => toBridgeAttachmentDescriptors(input),
  ),
  capability(
    "mutation.preview",
    "mutation",
    "Preview a supported Zotero mutation without executing it.",
    { type: "mutation-preview", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().mutations.preview(
        asObject(input) as ZoteroHostMutationRequest,
      ),
  ),
  capability(
    "mutation.execute",
    "mutation",
    "Execute a supported Zotero mutation after Zotero-side approval.",
    { type: "mutation-preview", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().mutations.execute(
        asObject(input) as ZoteroHostMutationRequest,
      ),
  ),
  capability(
    "diagnostic.get_status",
    "diagnostic",
    "Return a redacted Host Bridge service status snapshot.",
    { type: "none", required: false },
    (_input, context) => context.getStatus(),
  ),
  synthesisCapability(
    "synthesis.list_topics",
    "List Zotero Synthesis Layer topics for duplicate checks and topic selection.",
    "listTopics",
  ),
  synthesisCapability(
    "synthesis.get_topic_context",
    "Return one topic context, optionally including current artifact and manifest data.",
    "getTopicContext",
  ),
  synthesisCapability(
    "synthesis.get_schemas",
    "Return Synthesis Layer schema metadata for diagnostic and validation workflows.",
    "getSchemas",
  ),
  synthesisCapability(
    "synthesis.get_library_index",
    "Return paginated compact library index pages for Synthesis workflows.",
    "getLibraryIndex",
  ),
  synthesisCapability(
    "synthesis.resolve_resolver",
    "Resolve a topic resolver into a deterministic paper workset and diagnostics.",
    "resolveResolver",
  ),
  synthesisCapability(
    "synthesis.get_paper_registry",
    "Return Synthesis paper registry metadata for selected paper references.",
    "getPaperRegistry",
  ),
  synthesisCapability(
    "synthesis.query_citation_graph",
    "Query the Synthesis citation graph projection.",
    "queryCitationGraph",
  ),
  synthesisCapability(
    "synthesis.get_citation_graph_slice",
    "Return a bounded citation graph slice for selected paper references.",
    "getCitationGraphSlice",
  ),
  synthesisCapability(
    "synthesis.get_citation_graph_metrics",
    "Return citation graph metrics for selected paper references.",
    "getCitationGraphMetrics",
  ),
  synthesisCapability(
    "synthesis.get_paper_artifact_manifest",
    "Return available Synthesis paper artifact descriptors for selected paper references.",
    "getPaperArtifactManifest",
  ),
  synthesisCapability(
    "synthesis.read_paper_artifacts",
    "Read bounded Synthesis paper artifacts for selected paper references.",
    "readPaperArtifacts",
  ),
  synthesisCapability(
    "synthesis.export_filtered_paper_artifacts",
    "Export bounded filtered paper artifacts into the ACP run workspace.",
    "exportFilteredPaperArtifacts",
  ),
  synthesisCapability(
    "synthesis.resolve_topic_paper_digest",
    "Resolve one topic paper digest artifact for reading or diagnostics.",
    "resolveTopicPaperDigest",
  ),
  synthesisCapability(
    "synthesis.get_review_input",
    "Return structured Synthesis review workflow input.",
    "getReviewInput",
  ),
];

const CAPABILITY_BY_NAME = new Map(
  CAPABILITIES.map((entry) => [entry.name, entry]),
);

export function listHostBridgeCapabilities(): HostBridgeCapabilityManifestEntry[] {
  return CAPABILITIES.map(({ handler: _handler, ...entry }) => ({
    ...entry,
  }));
}

export function getHostBridgeCapability(
  name: string,
): HostBridgeCapabilityDefinition | null {
  return CAPABILITY_BY_NAME.get(name) || null;
}

export function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement {
  return getHostBridgeCapability(name)?.approval || "zotero-ui-required";
}
