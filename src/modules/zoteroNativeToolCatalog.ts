import {
  ZoteroHostCapabilityError,
  getZoteroHostCanonicalMutationControl,
  type ZoteroHostCapabilityBroker,
  type ZoteroHostCanonicalMutationControl,
  type ZoteroHostManagedAuthoringOperation,
  type ZoteroHostLibraryReadinessAuditArgs,
  type ZoteroNavigationCallControl,
} from "./zoteroHostCapabilityBroker";
import {
  MUTATION_EXECUTE_INPUT_SCHEMA,
  MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION,
  ZOTERO_NATIVE_MUTATION_LIST_LIMIT,
} from "../schemas/zoteroHostMutationSchemas";
import type {
  PiGatewayEffect,
  PiGatewayExecution,
  PiGatewayPreflight,
  PiGatewayToolDefinition,
} from "./piToolGateway";
import type {
  createPiTrustedNativeExecution,
  PiPreparedStoredAttachment,
} from "./piTrustedNativeExecution";
import type { ZoteroHostMutationCallerScope } from "./zoteroHostMutationAuthority";
import type {
  JsonObject,
  JsonValue,
  LibraryListSavedSearchesRequestDto,
  LibraryListItemsRequestDto,
  LibraryTraversalRequestDto,
  MutationExecutionResult,
  MutationOperation,
  MutationRequestByOperation,
  NavigationLibraryViewRef,
  NavigationSelectionInputDto,
  PortableCollectionRef,
  PortableItemRef,
  PortableSavedSearchRef,
  ReaderLocation,
  WorkflowCallControl,
} from "../workflows/types";

import citationAnalysisArtifactSchema from "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json";
import sourceReferenceArtifactSchema from "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json";

type Workspace = Pick<
  Awaited<ReturnType<typeof createPiTrustedNativeExecution>>,
  "materializeOrReuseMany" | "beginGeneratedTextOutput"
> & {
  prepareStoredAttachment?(
    path: string,
    signal: AbortSignal,
  ): Promise<PiPreparedStoredAttachment>;
};

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
const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
});
const refInput = (args: JsonObject) => args.ref as PortableItemRef;
const pageInput = (args: JsonObject) => ({
  ...(args.limit === undefined ? {} : { limit: args.limit as number }),
  ...(args.cursor === undefined ? {} : { cursor: args.cursor as string }),
});
const control = (signal: AbortSignal): WorkflowCallControl => ({ signal });

class CatalogFailure extends Error {
  constructor(
    readonly code: string,
    readonly details?: JsonValue,
    readonly effectCertainty:
      | "confirmed_none"
      | "confirmed_complete" = "confirmed_none",
  ) {
    super(code);
  }
}

function readDefinition(
  capabilityId: string,
  name: string,
  schema: Record<string, unknown>,
  read: (
    args: JsonObject,
    signal: AbortSignal,
  ) => Promise<JsonValue> | JsonValue,
  effects: PiGatewayEffect[] = ["bounded-read"],
): PiGatewayToolDefinition {
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
        const result = await read(value as JsonObject, signal);
        return {
          status: "completed",
          effectCertainty: writes ? "confirmed_complete" : "not_applicable",
          value: result,
        };
      } catch (error) {
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
        if (
          /pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit)/.test(
            message,
          )
        ) {
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
    objectSchema(
      {
        kind: { const: "page" },
        attachment: navigationRefSchema,
        pageIndex: { type: "integer", minimum: 0 },
      },
      ["kind", "attachment", "pageIndex"],
    ),
    objectSchema(
      {
        kind: { const: "annotation" },
        annotation: navigationRefSchema,
      },
      ["kind", "annotation"],
    ),
    objectSchema(
      {
        kind: { const: "epub" },
        attachment: navigationRefSchema,
        cfi: { type: "string", minLength: 1, maxLength: 4096 },
      },
      ["kind", "attachment", "cfi"],
    ),
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

function defineNavigationTool(args: {
  capabilityId: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  target: NonNullable<WorkflowCallControl["target"]>;
  invoke(
    input: JsonObject,
    control: ZoteroNavigationCallControl,
  ): Promise<JsonValue>;
}): PiGatewayToolDefinition {
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
        const result = await args.invoke(value as JsonObject, {
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
      } catch (error) {
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

function createZoteroNativeNavigationDefinitions(args: {
  broker: ZoteroHostCapabilityBroker;
  target: NonNullable<WorkflowCallControl["target"]>;
}): readonly PiGatewayToolDefinition[] {
  const { broker, target } = args;
  return [
    defineNavigationTool({
      capabilityId: "navigation.focus_zotero",
      name: "zotero_focus_zotero",
      description: "Bring the user's foreground Zotero main window forward.",
      schema: objectSchema({}),
      target,
      invoke: (_input, control) =>
        broker.navigation.focusZotero(control) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.select_library_view",
      name: "zotero_select_library_view",
      description:
        "Select one of the six Zotero library views in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
      schema: objectSchema(
        {
          libraryId: { type: "integer", minimum: 1 },
          view: { type: "string", enum: NAVIGATION_LIBRARY_VIEWS },
        },
        ["libraryId", "view"],
      ),
      target,
      invoke: (input, control) =>
        broker.navigation.selectLibraryView(
          input as unknown as NavigationLibraryViewRef,
          control,
        ) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.select_collection",
      name: "zotero_select_collection",
      description:
        "Select a Zotero collection in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
      schema: navigationRefSchema,
      target,
      invoke: (input, control) =>
        broker.navigation.selectCollection(
          input as unknown as PortableCollectionRef,
          control,
        ) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.select_saved_search",
      name: "zotero_select_saved_search",
      description:
        "Select a Saved Search returned by zotero_library_list_saved_searches in the submitting foreground Zotero window; no separate focus call is needed.",
      schema: navigationRefSchema,
      target,
      invoke: (input, control) =>
        broker.navigation.selectSavedSearch(
          input as unknown as PortableSavedSearchRef,
          control,
        ) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.reveal_items",
      name: "zotero_reveal_items",
      description:
        "Reveal 1 to 100 distinct items in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
      schema: objectSchema(
        {
          items: {
            type: "array",
            items: navigationRefSchema,
            minItems: 1,
            maxItems: 100,
            uniqueItems: true,
          },
        },
        ["items"],
      ),
      target,
      invoke: (input, control) =>
        broker.navigation.revealItems(
          input as unknown as NavigationSelectionInputDto,
          control,
        ) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.open_item",
      name: "zotero_open_item",
      description:
        "Open an item in the submitting foreground Zotero window and bring it forward; no separate focus call is needed.",
      schema: navigationRefSchema,
      target,
      invoke: (input, control) =>
        broker.navigation.openItem(
          input as unknown as PortableItemRef,
          control,
        ) as Promise<JsonValue>,
    }),
    defineNavigationTool({
      capabilityId: "navigation.open_reader_location",
      name: "zotero_open_reader_location",
      description:
        "Open a PDF page, annotation or EPUB location in the submitting foreground Zotero window's Reader and bring it forward; no separate focus call is needed.",
      schema: readerLocationSchema,
      target,
      invoke: (input, control) =>
        broker.navigation.openReaderLocation(
          input as unknown as ReaderLocation,
          control,
        ) as Promise<JsonValue>,
    }),
  ];
}

export function createZoteroNativeToolDefinitions(args: {
  broker: ZoteroHostCapabilityBroker;
  workspace: Workspace;
  mutations?: PiZoteroMutationDependencies;
  navigationTarget?: WorkflowCallControl["target"];
}): readonly PiGatewayToolDefinition[] {
  const { broker, workspace, mutations, navigationTarget } = args || {};
  if (typeof broker?.context?.getCurrentView !== "function")
    throw new Error("pi_zotero_broker_incomplete");
  if (
    typeof workspace?.materializeOrReuseMany !== "function" ||
    typeof workspace?.beginGeneratedTextOutput !== "function"
  )
    throw new Error("pi_zotero_workspace_incomplete");

  const ref = { ref: refSchema };
  const refPage = { ...ref, ...pageProperties };
  const fileEffects: PiGatewayEffect[] = ["bounded-read", "workspace-mutation"];
  const reads: PiGatewayToolDefinition[] = [
    readDefinition(
      "context.get_current_view",
      "zotero_context_get_current_view",
      objectSchema({}),
      () => broker.context.getCurrentView() as JsonValue,
    ),
    readDefinition(
      "context.get_selected_items",
      "zotero_context_get_selected_items",
      objectSchema(pageProperties),
      (input, signal) =>
        broker.context.getSelectedItems(
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.list_items",
      "zotero_library_list_items",
      objectSchema({ ...listProperties, ...pageProperties }),
      (input, signal) =>
        broker.library.listItems(
          input as LibraryListItemsRequestDto,
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.list_collections",
      "zotero_library_list_collections",
      objectSchema({ libraryId: listProperties.libraryId, ...pageProperties }),
      (input, signal) =>
        broker.library.listCollections(
          input,
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.list_saved_searches",
      "zotero_library_list_saved_searches",
      objectSchema({ libraryId: listProperties.libraryId, ...pageProperties }, [
        "libraryId",
      ]),
      (input, signal) =>
        broker.library.listSavedSearches(
          input as LibraryListSavedSearchesRequestDto,
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.get_item_detail",
      "zotero_library_get_item_detail",
      objectSchema(ref, ["ref"]),
      async (input, signal) => {
        const detail = await broker.library.getItemDetail(
          refInput(input),
          control(signal),
        );
        if (
          detail.kind !== "attachment" ||
          detail.item.file.state !== "available"
        )
          return detail as JsonValue;
        const { path: _sourcePath, ...file } = detail.item.file;
        return { ...detail, item: { ...detail.item, file } } as JsonValue;
      },
    ),
    readDefinition(
      "library.get_item_notes",
      "zotero_library_get_item_notes",
      objectSchema(refPage, ["ref"]),
      (input, signal) =>
        broker.library.getItemNotes(
          refInput(input),
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.get_note_detail",
      "zotero_library_get_note_detail",
      objectSchema(
        { ...ref, format: { type: "string", enum: ["html", "text"] } },
        ["ref", "format"],
      ),
      async (input, signal) => {
        const detail = await broker.library.getNoteDetail(
          refInput(input),
          { format: input.format as "html" | "text" },
          control(signal),
        );
        if (detail.kind === "managed") {
          const observed = new TextEncoder().encode(
            JSON.stringify(detail),
          ).byteLength;
          if (observed > BYTE_LIMIT)
            throw new CatalogFailure("resource_limited", {
              managedType: detail.noteKind,
              limitBytes: BYTE_LIMIT,
              observedBytes: observed,
              recovery: "inspect_note_in_zotero",
            });
        }
        return detail as JsonValue;
      },
    ),
    readDefinition(
      "library.get_item_attachments",
      "zotero_library_get_item_attachments",
      objectSchema(refPage, ["ref"]),
      async (input, signal) => {
        const page = await broker.library.getItemAttachments(
          refInput(input),
          pageInput(input),
          control(signal),
        );
        if (signal.aborted) throw new CatalogFailure("canceled");
        const available = page.attachments.filter(
          (item) => item.file.state === "available",
        );
        const copies = available.length
          ? await workspace.materializeOrReuseMany(
              available.map((item) => ({
                sourcePath: (item.file as { path: string }).path,
                sourceId: `${item.ref.libraryId}:${item.ref.key}`,
                revision: item.revision,
              })),
            )
          : [];
        if (signal.aborted)
          throw new CatalogFailure(
            "canceled",
            undefined,
            available.length ? "confirmed_complete" : "confirmed_none",
          );
        let index = 0;
        return {
          ...page,
          attachments: page.attachments.map((item) =>
            item.file.state === "available"
              ? { ...item, file: { ...item.file, path: copies[index++].path } }
              : item,
          ),
        } as JsonValue;
      },
      fileEffects,
    ),
    readDefinition(
      "library.list_annotations",
      "zotero_library_list_annotations",
      objectSchema(refPage, ["ref"]),
      (input, signal) =>
        broker.library.listAnnotations(
          refInput(input),
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.export_annotations",
      "zotero_library_export_annotations",
      objectSchema(
        { ...ref, format: { type: "string", enum: ["markdown", "json"] } },
        ["ref"],
      ),
      async (input, signal) => {
        const format =
          (input.format as "markdown" | "json" | undefined) || "markdown";
        const output = await workspace.beginGeneratedTextOutput(
          format === "json" ? ".json" : ".md",
        );
        try {
          const exportResult = await broker.library.exportAnnotations(
            refInput(input),
            { format },
            control(signal),
          );
          if (signal.aborted) throw new CatalogFailure("canceled");
          await output.append(
            format === "json"
              ? JSON.stringify(exportResult.annotations)
              : exportResult.markdown || "",
          );
          return { format, artifact: await output.commit() };
        } catch (error) {
          await output.discard();
          throw error;
        }
      },
      fileEffects,
    ),
    readDefinition(
      "metadata.translate_identifier",
      "zotero_metadata_translate_identifier",
      objectSchema(
        {
          type: { type: "string", enum: ["DOI", "ISBN", "arXiv", "PMID"] },
          value: { type: "string", minLength: 1 },
        },
        ["type", "value"],
      ),
      (input, signal) =>
        broker.metadata.translateIdentifier(
          input as { type: "DOI"; value: string },
          control(signal),
        ) as Promise<JsonValue>,
      ["bounded-read", "external-egress"],
    ),
    readDefinition(
      "library.readiness_audit",
      "zotero_library_readiness_audit",
      objectSchema({
        ...listProperties,
        ...pageProperties,
        checks: {
          type: "array",
          items: { type: "string", enum: ["pdf", "markdown", "analysis"] },
        },
        missingOnly: { type: "boolean" },
      }),
      (input, signal) => {
        const { collectionRef, ...rest } = input;
        return broker.library.readinessAudit(
          {
            ...rest,
            ...(collectionRef ? { collection: collectionRef } : {}),
          } as ZoteroHostLibraryReadinessAuditArgs,
          control(signal),
        ) as Promise<JsonValue>;
      },
    ),
    readDefinition(
      "library.get_item_audit_state",
      "zotero_library_get_item_audit_state",
      objectSchema(ref, ["ref"]),
      (input, signal) =>
        broker.library.getItemAuditState(
          refInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.traverse_items",
      "zotero_library_traverse_items",
      objectSchema(
        {
          ...listProperties,
          scope: { type: "string", enum: ["top-level-regular"] },
          resumeCursor: { type: "string", minLength: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          maxItems: { type: "integer", minimum: 1 },
          maxPages: { type: "integer", minimum: 1 },
          maxDurationMs: { type: "integer", minimum: 1 },
        },
        ["scope"],
      ),
      async (input, signal) => {
        const output = await workspace.beginGeneratedTextOutput(".ndjson");
        let rowCount = 0;
        try {
          const result = await broker.library.traverseItems(
            input as LibraryTraversalRequestDto,
            control(signal),
            async (batch) => {
              for (const item of batch.items) {
                await output.append(`${JSON.stringify(item)}\n`);
                rowCount += 1;
              }
            },
          );
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
        } catch (error) {
          await output.discard();
          throw error;
        }
      },
      fileEffects,
    ),
  ];
  const navigation = navigationTarget
    ? createZoteroNativeNavigationDefinitions({
        broker,
        target: navigationTarget,
      })
    : [];
  if (!mutations) return [...reads, ...navigation];
  return [
    ...reads,
    ...navigation,
    ...createZoteroNativeMutationDefinitions({ broker, workspace, mutations }),
  ];
}

// ---------------------------------------------------------------------------
// Reviewed business mutation tools (C14)
// ---------------------------------------------------------------------------

export type PiZoteroMutationOwner = {
  kind: "conversation" | "skill_run";
  ownerId: string;
};

export type PiZoteroMutationContext = {
  owner: PiZoteroMutationOwner;
  sourceTurnId: string;
  callId: string;
};

export type PiZoteroMutationIdentity = {
  operationId: string;
  generatedSourceReferenceIds: string[];
};

export type PiZoteroMutationDependencies = {
  identity(context: PiZoteroMutationContext): Promise<PiZoteroMutationIdentity>;
  recordSourceIds(
    context: PiZoteroMutationContext,
    ids: string[],
  ): Promise<void>;
  recordDomainResult(
    context: PiZoteroMutationContext,
    result: MutationExecutionResult<JsonObject>,
  ): Promise<string>;
};

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

type SchemaObject = Record<string, unknown>;

/** Caller-facing context of a definition preflight, derived from the Gateway contract. */
type PiGatewayPreflightCaller = Parameters<
  NonNullable<PiGatewayToolDefinition["preflight"]>
>[1];

type NativeMutationSpec = {
  capabilityId: string;
  operation: MutationOperation;
  name: string;
  enhanced: boolean;
  files: boolean;
  schema: SchemaObject;
  state?: "trashed" | "active";
  artifact?: {
    key: "references" | "citationAnalysis" | "score";
    def: string;
  };
  libraries(args: JsonObject): number[];
  overflow?(args: JsonObject): JsonValue | undefined;
  projectResult: MutationResultProjection;
  input(
    args: JsonObject,
    identity: PiZoteroMutationIdentity,
    source: JsonObject | undefined,
  ): JsonObject;
};

function sameSourceIds(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function boundLogicalLists(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) boundLogicalLists(entry);
    return;
  }
  if (!value || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  const reference = node.$ref;
  if (typeof reference === "string" && LOGICAL_LIST_REFS.has(reference)) {
    node.maxItems = ZOTERO_NATIVE_MUTATION_LIST_LIMIT;
  }
  const items = node.items as Record<string, unknown> | undefined;
  if (items?.$ref === "#/$defs/creator") {
    node.maxItems = ZOTERO_NATIVE_MUTATION_LIST_LIMIT;
  }
  for (const key of Object.keys(node)) {
    if (key === "$defs" || NESTED_ARTIFACT_KEYS.has(key)) continue;
    boundLogicalLists(node[key]);
  }
}

/**
 * Clones the canonical public projection: the caller-supplied operation identity
 * is removed, the shared Broker list bound is applied to logical request lists,
 * and nested artifact payloads keep their canonical domain bounds.
 */
function boundedMutationSchema(operation: MutationOperation): SchemaObject {
  const schema = cloneJson(
    MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION[operation],
  ) as SchemaObject;
  delete (schema.properties as SchemaObject).operationId;
  schema.$schema = MUTATION_DOCUMENT_SCHEMA;
  schema.$defs = MUTATION_EXECUTE_INPUT_SCHEMA.$defs;
  boundLogicalLists(schema);
  return pruneSchemaDefs(schema);
}

function projectContractArtifact(
  schema: Record<string, unknown>,
  boundedTopLevel: string[] = [],
): { property: SchemaObject; defs: Record<string, unknown> } {
  const projected = cloneJson(schema);
  const properties = (projected.properties || {}) as SchemaObject;
  delete properties.schema;
  const meta = properties.meta as SchemaObject | undefined;
  if (meta?.properties)
    delete (meta.properties as SchemaObject).referencesBasis;
  if (Array.isArray(meta?.required)) {
    meta.required = (meta.required as string[]).filter(
      (key) => key !== "referencesBasis",
    );
  }
  projected.required = ((projected.required || []) as string[]).filter(
    (key) => key !== "schema",
  );
  projected.additionalProperties = false;
  // The contract schema keeps its own resource identity. Embedding it must not
  // rebase its fragment references onto that identity.
  stripSchemaResourceKeys(projected);
  const defs = (projected.$defs || {}) as Record<string, unknown>;
  for (const definition of Object.values(defs)) {
    stripSchemaResourceKeys(definition);
  }
  // Q90: model-visible logical top-level lists share the Broker list bound;
  // nested artifact arrays keep the canonical contract bounds.
  for (const name of boundedTopLevel) {
    const node = properties[name] as SchemaObject | undefined;
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
function pruneSchemaDefs(schema: SchemaObject): SchemaObject {
  const defs = (schema.$defs || {}) as Record<string, unknown>;
  const names = new Set<string>();
  const collectRefs = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) collectRefs(entry);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    const reference = node.$ref;
    if (typeof reference === "string" && reference.startsWith("#/$defs/")) {
      names.add(reference.slice("#/$defs/".length));
    }
    for (const key of Object.keys(node)) {
      if (key === "$defs") continue;
      collectRefs(node[key]);
    }
  };
  collectRefs(schema);
  const kept: Record<string, unknown> = {};
  // Set iteration visits names added while iterating, giving the transitive closure.
  for (const name of names) {
    if (!(name in defs)) continue;
    kept[name] = defs[name];
    collectRefs(defs[name]);
  }
  schema.$defs = kept;
  return schema;
}

function stripSchemaResourceKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) stripSchemaResourceKeys(entry);
    return;
  }
  if (!value || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  delete node.$id;
  delete node.$schema;
  for (const key of Object.keys(node)) stripSchemaResourceKeys(node[key]);
}

const SOURCE_REFERENCE_ARTIFACT = projectContractArtifact(
  sourceReferenceArtifactSchema as Record<string, unknown>,
  ["references"],
);
// New Source References receive Broker-generated opaque IDs, so the model may
// omit the identity and the Broker allocates it once per logical call.
const SOURCE_REFERENCE_DEF = SOURCE_REFERENCE_ARTIFACT.defs.SourceReference as
  | SchemaObject
  | undefined;
if (Array.isArray(SOURCE_REFERENCE_DEF?.required)) {
  SOURCE_REFERENCE_DEF.required = (
    SOURCE_REFERENCE_DEF.required as string[]
  ).filter((key) => key !== "sourceReferenceId");
}
const CITATION_ANALYSIS_ARTIFACT = projectContractArtifact(
  citationAnalysisArtifactSchema as Record<string, unknown>,
  ["items", "unresolved"],
);
const SCORE_ARTIFACT = projectContractArtifact(
  MUTATION_EXECUTE_INPUT_SCHEMA.$defs.literatureScoreArtifact as Record<
    string,
    unknown
  >,
);

function artifactSchema(
  operation: MutationOperation,
  artifact: { key: "references" | "citationAnalysis" | "score"; def: string },
  projected: { property: SchemaObject; defs: Record<string, unknown> },
): SchemaObject {
  const schema = boundedMutationSchema(operation);
  (schema.properties as SchemaObject)[artifact.key] = {
    $ref: "#/$defs/" + artifact.def,
  };
  schema.$defs = {
    ...MUTATION_EXECUTE_INPUT_SCHEMA.$defs,
    ...projected.defs,
    [artifact.def]: projected.property,
  };
  return pruneSchemaDefs(schema);
}

function librariesOf(args: JsonObject | undefined): number[] {
  const found = new Set<number>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (
      Number.isSafeInteger(node.libraryId) &&
      (node.libraryId as number) > 0
    ) {
      found.add(node.libraryId as number);
    }
    for (const key of Object.keys(node)) visit(node[key]);
  };
  visit(args);
  return [...found].sort((left, right) => left - right);
}

function logicalListOverflow(keys: string[]) {
  return (args: JsonObject): JsonValue | undefined => {
    const seen = new Set<string>();
    for (const key of keys) {
      const list = args[key];
      if (list === undefined) continue;
      if (!Array.isArray(list)) return { reason: "invalid_schema" };
      for (const entry of list) {
        seen.add(
          entry && typeof entry === "object"
            ? JSON.stringify(entry)
            : String(entry),
        );
      }
    }
    if (seen.size <= ZOTERO_NATIVE_MUTATION_LIST_LIMIT) return undefined;
    return {
      reason: "logical_list_limit",
      limit: ZOTERO_NATIVE_MUTATION_LIST_LIMIT,
      observed: seen.size,
    };
  };
}

function semanticArgs(args: JsonObject): JsonObject {
  const { dryRun: _dryRun, ...rest } = args;
  return rest;
}

function sourcesFromStage(
  stage: PiPreparedStoredAttachment | undefined,
  targetFilename: unknown,
): JsonObject | undefined {
  if (!stage) return undefined;
  // The staged snapshot carries bare SHA-256 digests, while the canonical
  // attachment-content manifest is the Broker-owned wire shape.
  const file = (entry: {
    relativePath: string;
    sizeBytes: number;
    sha256: string;
  }) => ({
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
    } as unknown as JsonValue,
    ...(typeof targetFilename === "string" ? { targetFilename } : {}),
  };
}

function createMutationSpecs(): NativeMutationSpec[] {
  const importSchema = boundedMutationSchema("attachments.create");
  {
    const properties = importSchema.properties as SchemaObject;
    delete properties.source;
    properties.path = { type: "string", minLength: 1 };
    properties.targetFilename = { type: "string", minLength: 1 };
    importSchema.required = ["placement", "path"];
  }
  const replaceSchema = boundedMutationSchema("attachments.replaceFile");
  {
    const properties = replaceSchema.properties as SchemaObject;
    delete properties.source;
    properties.path = { type: "string", minLength: 1 };
    properties.targetFilename = { type: "string", minLength: 1 };
    replaceSchema.required = ["attachmentRef", "path"];
  }
  const managedNoteSchema = (): SchemaObject => {
    const schema: SchemaObject = {
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
  const trashSchema = (): SchemaObject => {
    const schema = boundedMutationSchema("trash.setItemsState");
    delete (schema.properties as SchemaObject).state;
    schema.required = ["itemRefs"];
    return schema;
  };
  const passthrough = (
    capabilityId: string,
    operation: MutationOperation,
    name: string,
    projectResult: MutationResultProjection,
    options: {
      enhanced?: boolean;
      files?: boolean;
      schema?: SchemaObject;
      overflow?: (args: JsonObject) => JsonValue | undefined;
      close?: (schema: SchemaObject) => SchemaObject;
    } = {},
  ): NativeMutationSpec => {
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
  const managedNoteSpec = (
    capabilityId: string,
    operation: MutationOperation,
    name: string,
  ): NativeMutationSpec => ({
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
  const artifactSpec = (
    capabilityId: string,
    operation: MutationOperation,
    name: string,
    artifact: { key: "references" | "citationAnalysis" | "score"; def: string },
    projected: { property: SchemaObject; defs: Record<string, unknown> },
  ): NativeMutationSpec => ({
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
  const trashSpec = (
    capabilityId: string,
    name: string,
    state: "trashed" | "active",
  ): NativeMutationSpec => ({
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
    passthrough(
      "item.create",
      "item.create",
      "zotero_item_create",
      projectItemResult,
    ),
    passthrough(
      "item.update_metadata",
      "item.updateMetadata",
      "zotero_item_update_metadata",
      projectItemResult,
    ),
    passthrough(
      "item.update_tags",
      "item.updateTags",
      "zotero_item_update_tags",
      projectItemResult,
      {
        overflow: logicalListOverflow(["add", "remove"]),
      },
    ),
    passthrough(
      "item.add_related_items",
      "item.addRelated",
      "zotero_item_add_related_items",
      projectRelatedMutation,
    ),
    passthrough(
      "item.remove_related_items",
      "item.removeRelated",
      "zotero_item_remove_related_items",
      projectRelatedMutation,
    ),
    passthrough(
      "note.create",
      "notes.create",
      "zotero_note_create",
      projectNoteSummaryResult,
      {
        close: (schema) => {
          (schema.properties as SchemaObject).content = NOTE_CONTENT_SCHEMA;
          return schema;
        },
      },
    ),
    passthrough(
      "note.update_content",
      "notes.updateContent",
      "zotero_note_update_content",
      projectNoteSummaryResult,
      {
        close: (schema) => {
          (schema.properties as SchemaObject).content = NOTE_CONTENT_SCHEMA;
          return schema;
        },
      },
    ),
    passthrough(
      "collection.create",
      "collection.create",
      "zotero_collection_create",
      projectCollectionResult,
    ),
    passthrough(
      "collection.update",
      "collection.update",
      "zotero_collection_update",
      projectCollectionResult,
    ),
    passthrough(
      "collection.update_membership",
      "collection.updateMembership",
      "zotero_collection_update_membership",
      projectMembershipResult,
      { overflow: logicalListOverflow(["add", "remove"]) },
    ),
    passthrough(
      "attachment.update_metadata",
      "attachments.updateMetadata",
      "zotero_attachment_update_metadata",
      projectAttachmentResult,
    ),
    passthrough(
      "item.change_type",
      "item.changeType",
      "zotero_item_change_type",
      projectItemResult,
      { enhanced: true },
    ),
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
          source: source as JsonValue,
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
        source: source as JsonValue,
      }),
    },
    passthrough(
      "attachment.move",
      "attachments.move",
      "zotero_attachment_move",
      projectAttachmentOutcomeResult,
      { enhanced: true },
    ),
    trashSpec("trash.move_items", "zotero_trash_move_items", "trashed"),
    trashSpec("trash.restore_items", "zotero_trash_restore_items", "active"),
    managedNoteSpec(
      "managed_note.write_custom",
      "managed_note.write_custom",
      "zotero_custom_note_write",
    ),
    managedNoteSpec(
      "managed_note.write_conversation",
      "managed_note.write_conversation",
      "zotero_conversation_note_write",
    ),
    passthrough(
      "literature_artifact.upsert_digest",
      "literature_artifact.upsert_digest",
      "zotero_literature_digest_upsert",
      projectLiteratureArtifact,
      { enhanced: true },
    ),
    artifactSpec(
      "literature_artifact.upsert_references",
      "literature_artifact.upsert_references",
      "zotero_literature_references_upsert",
      { key: "references", def: "sourceReferenceArtifact" },
      SOURCE_REFERENCE_ARTIFACT,
    ),
    artifactSpec(
      "literature_artifact.upsert_citation_analysis",
      "literature_artifact.upsert_citation_analysis",
      "zotero_literature_citation_analysis_upsert",
      { key: "citationAnalysis", def: "citationAnalysisArtifact" },
      CITATION_ANALYSIS_ARTIFACT,
    ),
    artifactSpec(
      "literature_artifact.upsert_score",
      "literature_artifact.upsert_score",
      "zotero_literature_score_upsert",
      { key: "score", def: "literatureScoreArtifact" },
      SCORE_ARTIFACT,
    ),
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

function pickFields(source: unknown, fields: string[]): JsonObject {
  const node = (source || {}) as Record<string, JsonValue>;
  const picked: Record<string, JsonValue> = {};
  for (const field of fields) {
    if (node[field] !== undefined) picked[field] = node[field];
  }
  return picked as JsonObject;
}

function pickPortableRef(value: unknown): JsonValue {
  return pickFields(value, ["libraryId", "key"]);
}

function pickPortableRefs(value: unknown): JsonValue {
  return (Array.isArray(value) ? value : []).map(pickPortableRef) as JsonValue;
}

function pickAttachment(value: unknown): JsonObject {
  const attachment = pickFields(value, ATTACHMENT_RESULT_FIELDS);
  const file = (value as { file?: unknown } | undefined)?.file;
  if (file && typeof file === "object") {
    attachment.file = pickFields(file, ATTACHMENT_FILE_FIELDS);
  }
  return attachment;
}

/**
 * Q93: each reviewed tool declares its own model-visible projection. Only
 * already bounded refs, revisions, counts and outcomes are forwarded, so the
 * result is bounded by construction; nothing is truncated, free-form metadata
 * is not echoed back, and an effect that committed is never re-labelled as
 * resource limited afterwards.
 */
type MutationResultProjection = (result: JsonObject) => JsonValue;

const projectItemResult: MutationResultProjection = (result) => ({
  item: pickFields(result.item, ITEM_RESULT_FIELDS),
});

const projectCollectionResult: MutationResultProjection = (result) => ({
  collection: pickFields(result.collection, COLLECTION_RESULT_FIELDS),
});

const projectNoteSummaryResult: MutationResultProjection = (result) => ({
  note: pickFields(result.note, NOTE_SUMMARY_FIELDS),
});

const projectAttachmentResult: MutationResultProjection = (result) => ({
  attachment: pickAttachment(result.attachment),
});

const projectAttachmentOutcomeResult: MutationResultProjection = (result) => ({
  attachment: pickAttachment(result.attachment),
  outcome: result.outcome ?? null,
});

const projectMembershipResult: MutationResultProjection = (result) => ({
  collection: pickFields(result.collection, COLLECTION_RESULT_FIELDS),
  addedRefs: pickPortableRefs(result.addedRefs),
  removedRefs: pickPortableRefs(result.removedRefs),
});

const projectManagedNoteResult: MutationResultProjection = (result) => ({
  note: pickFields(result.note, MANAGED_NOTE_FIELDS),
});

const projectTrashResult: MutationResultProjection = (result) => ({
  state: result.state ?? null,
  explicitRefs: pickPortableRefs(result.explicitRefs),
  expandedRefs: pickPortableRefs(result.expandedRefs),
});

const projectRelatedMutation: MutationResultProjection = (result) => {
  const relations = Array.isArray(result.relations) ? result.relations : [];
  return {
    sourceRef: pickPortableRef(result.sourceRef),
    relatedRefs: pickPortableRefs(result.relatedRefs),
    relations: relations.map((relation) => ({
      relatedRef: pickPortableRef((relation as JsonObject).relatedRef),
      outcome: (relation as JsonObject).outcome ?? null,
    })) as JsonValue,
    sourceRevision: result.sourceRevision ?? null,
  };
};

const projectLiteratureArtifact: MutationResultProjection = (result) => ({
  note: pickFields(result.note, MANAGED_NOTE_FIELDS),
  dependentStale: result.dependentStale ?? null,
});

const NATIVE_MUTATION_SPECS = createMutationSpecs();

function mutationFailure(error: unknown): PiGatewayPreflight {
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
  if (
    /pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit)/.test(
      message,
    )
  ) {
    return { status: "failed", code: "resource_limited" };
  }
  return { status: "failed", code: "internal_error" };
}

function terminalExecution(
  result: MutationExecutionResult<JsonObject>,
  domainReceiptRef?: string,
): PiGatewayExecution {
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
        residualRefs: attempt.residualRefs as unknown as JsonValue,
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
        residualRefs: attempt.residualRefs as unknown as JsonValue,
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
async function finalizeMutation(
  result: MutationExecutionResult<JsonObject>,
  project: (result: JsonObject) => JsonValue,
  context: PiZoteroMutationContext,
  dependencies: PiZoteroMutationDependencies,
): Promise<PiGatewayExecution> {
  const settled = "receipt" in result;
  let domainReceiptRef: string | undefined;
  try {
    domainReceiptRef = await dependencies.recordDomainResult(context, result);
  } catch {
    domainReceiptRef = undefined;
  }
  if (!settled) {
    const failure = terminalExecution(result, domainReceiptRef);
    if (domainReceiptRef !== undefined) return failure;
    // Keep the authoritative terminal facts and only flag that the durable
    // record could not be written.
    return {
      ...failure,
      details: {
        ...((failure.details as Record<string, JsonValue>) || {}),
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
    result: project(result.result as JsonObject),
  } as JsonValue;
  return {
    status: "completed",
    effectCertainty: "confirmed_complete",
    value,
    domainReceiptRef,
  };
}

function admissionFacts(
  spec: NativeMutationSpec,
  identity: PiZoteroMutationIdentity,
  args: JsonObject,
  plan: JsonValue | undefined,
): JsonValue {
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

async function canonicalMutationInput(
  spec: NativeMutationSpec,
  args: JsonObject,
  identity: PiZoteroMutationIdentity,
  control: ZoteroHostCanonicalMutationControl,
  stage: PiPreparedStoredAttachment | undefined,
  signal: AbortSignal,
): Promise<{ input: JsonObject; registeredSourceIds: string[] }> {
  if (spec.artifact) {
    const parentRef = args.parentRef as JsonValue;
    const normalized = await control.normalizeManagedAuthoring({
      operation: spec.operation as ZoteroHostManagedAuthoringOperation,
      parentRef: parentRef as PortableItemRef,
      value: args[spec.artifact.key] as JsonValue,
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
    input: spec.input(
      args,
      identity,
      sourcesFromStage(stage, args.targetFilename),
    ),
    registeredSourceIds: [],
  };
}

async function runMutationPreflight(
  spec: NativeMutationSpec,
  broker: ZoteroHostCapabilityBroker,
  workspace: Workspace,
  dependencies: PiZoteroMutationDependencies,
  args: JsonObject,
  context: PiGatewayPreflightCaller,
): Promise<PiGatewayPreflight> {
  const dryRun = args.dryRun === true;
  const mutationContext: PiZoteroMutationContext = {
    owner: context.owner,
    sourceTurnId: context.sourceTurnId,
    callId: context.callId,
  };
  let stage: PiPreparedStoredAttachment | undefined;
  let cleanupPending = false;
  const cleanupPendingFailure = (): PiGatewayPreflight => ({
    status: "failed",
    code: "cleanup_pending",
    retryable: true,
    details: { recovery: "reconcile" },
  });
  const discardStage = async () => {
    if (!stage) return;
    try {
      await stage.dispose();
    } catch {
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
      stage = await workspace.prepareStoredAttachment(
        String(args.path || ""),
        context.signal,
      );
    }
    const identity = await dependencies.identity(mutationContext);
    if (identity.generatedSourceReferenceIds.length) {
      await dependencies.recordSourceIds(
        mutationContext,
        identity.generatedSourceReferenceIds,
      );
    }
    const control = getZoteroHostCanonicalMutationControl(broker);
    const { input, registeredSourceIds } = await canonicalMutationInput(
      spec,
      args,
      identity,
      control,
      stage,
      context.signal,
    );
    if (
      registeredSourceIds.length &&
      !sameSourceIds(registeredSourceIds, identity.generatedSourceReferenceIds)
    ) {
      await dependencies.recordSourceIds(mutationContext, registeredSourceIds);
    }
    // Owner identity is trusted composition: Conversation and Skill Run owners
    // share an ownerId space, so the scope namespaces them explicitly.
    const scope: ZoteroHostMutationCallerScope = {
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
      input: input as MutationRequestByOperation[MutationOperation],
      scope,
      ...(stage
        ? {
            resources: {
              deferredStoredAttachment: {
                prepare: async () =>
                  (stage as PiPreparedStoredAttachment).prepared,
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
      if (cleanupPending) return cleanupPendingFailure();
      return {
        status: "prepared",
        domainPlanDigest:
          "receipt" in prepared.result
            ? prepared.result.receipt.effectDigest
            : "settled",
        admissionFacts: admissionFacts(spec, identity, args, undefined),
        domainOperation,
        execute: async () =>
          finalizeMutation(
            prepared.result,
            spec.projectResult,
            mutationContext,
            dependencies,
          ),
        dispose: async () => undefined,
      };
    }
    const preview = prepared.preview;
    const facts = admissionFacts(
      spec,
      identity,
      args,
      preview.plan as JsonValue,
    );
    if (dryRun) {
      await discardStage();
      if (cleanupPending) return cleanupPendingFailure();
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
            plan: preview.plan as JsonValue,
          } as JsonValue,
        }),
        dispose: async () => undefined,
      };
    }
    return {
      status: "prepared",
      domainPlanDigest: preview.domainPlanDigest,
      admissionFacts: facts,
      domainOperation,
      execute: async (executeContext) =>
        finalizeMutation(
          await control.execute({
            input: input as MutationRequestByOperation[MutationOperation],
            scope,
            prepared: prepared.prepared,
            control: { signal: executeContext.signal },
          }),
          spec.projectResult,
          mutationContext,
          dependencies,
        ),
      dispose,
    };
  } catch (error) {
    await discardStage();
    const failure = mutationFailure(error);
    if (!cleanupPending || failure.status !== "failed") return failure;
    return {
      ...failure,
      details: { cleanupPending: true, cause: failure.details ?? null },
    };
  }
}

function mutationDefinition(
  broker: ZoteroHostCapabilityBroker,
  workspace: Workspace,
  dependencies: PiZoteroMutationDependencies,
  spec: NativeMutationSpec,
): PiGatewayToolDefinition {
  const effects: PiGatewayEffect[] = ["bounded-read", "zotero-mutation"];
  const resourceKeys = (value: JsonValue) =>
    spec.libraries(value as JsonObject).map((id) => "library:" + String(id));
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
      const dryRun = (value as JsonObject | undefined)?.dryRun === true;
      return {
        effects: dryRun ? ["bounded-read"] : effects,
        authorizationKeys:
          dryRun || !spec.enhanced ? [] : [ENHANCED_AUTHORIZATION_KEY],
        resourceKeys: dryRun ? [] : resourceKeys(value),
        cost: 1,
      };
    },
    execute: async () => ({
      status: "failed",
      effectCertainty: "confirmed_none",
      code: "preflight_required",
    }),
    preflight: async (value, context) =>
      runMutationPreflight(
        spec,
        broker,
        workspace,
        dependencies,
        (value || {}) as JsonObject,
        context,
      ),
  };
}

export function createZoteroNativeMutationDefinitions(args: {
  broker: ZoteroHostCapabilityBroker;
  workspace: Workspace;
  mutations: PiZoteroMutationDependencies;
}): readonly PiGatewayToolDefinition[] {
  const { broker, workspace, mutations } = args || {};
  if (!mutations) throw new Error("pi_zotero_mutation_dependencies_missing");
  return NATIVE_MUTATION_SPECS.map((spec) =>
    mutationDefinition(broker, workspace, mutations, spec),
  );
}
