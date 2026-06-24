import { createWorkflowHostApi } from "../workflows/hostApi";
import { buildMarkdownBackedNoteContent } from "./notePayloadCodec";
import {
  getHostBridgeCapability,
  listHostBridgeCapabilities,
  type HostBridgeCapabilityDefinition,
  type ZoteroHostCapabilityBrokerApis,
} from "./hostBridgeCapabilityRegistry";
import type {
  SynthesisMcpService,
  SynthesisMcpServiceMethod,
} from "./synthesis/mcpService";
import { getDefaultSynthesisService } from "./synthesis/service";
import {
  ZoteroCollectionNotFoundError,
  ZoteroItemNotFoundError,
  ZoteroNoteNotFoundError,
} from "./zoteroHostCapabilityBroker";
import type { WorkflowHostApi } from "../workflows/types";
import type { AcpHostContext } from "./acpTypes";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import type {
  ZoteroHostAttachmentDto,
  ZoteroHostCollectionRefInput,
  ZoteroHostItemDetailDto,
  ZoteroHostItemRefInput,
  ZoteroHostItemSummaryDto,
  ZoteroHostLibraryItemSummaryDto,
  ZoteroHostLibraryListArgs,
  ZoteroHostLibraryListResponse,
  ZoteroHostMutationExecuteResponse,
  ZoteroHostMutationPreviewResponse,
  ZoteroHostMutationRequest,
  ZoteroHostNoteDetailArgs,
  ZoteroHostNoteDetailChunkDto,
  ZoteroHostNoteDto,
  ZoteroHostNotePayloadDetailDto,
  ZoteroHostNotePayloadSummaryDto,
} from "./zoteroHostCapabilityBroker";

export const ZOTERO_MCP_PROTOCOL_VERSION = "2025-06-18";
export const ZOTERO_MCP_TOOL_GET_CURRENT_VIEW = "get_current_view";
export const ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS = "get_selected_items";
export const ZOTERO_MCP_TOOL_SEARCH_ITEMS = "search_items";
export const ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS = "list_library_items";
export const ZOTERO_MCP_TOOL_GET_ITEM_DETAIL = "get_item_detail";
export const ZOTERO_MCP_TOOL_GET_ITEM_NOTES = "get_item_notes";
export const ZOTERO_MCP_TOOL_GET_NOTE_DETAIL = "get_note_detail";
export const ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS = "list_note_payloads";
export const ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD = "get_note_payload";
export const ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS = "get_item_attachments";
export const ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT =
  "prepare_paper_reading_context";
export const ZOTERO_MCP_TOOL_GET_MCP_STATUS = "get_mcp_status";
export const ZOTERO_MCP_TOOL_PREVIEW_MUTATION = "preview_mutation";
export const ZOTERO_MCP_TOOL_UPDATE_ITEM_FIELDS = "update_item_fields";
export const ZOTERO_MCP_TOOL_ADD_ITEM_TAGS = "add_item_tags";
export const ZOTERO_MCP_TOOL_REMOVE_ITEM_TAGS = "remove_item_tags";
export const ZOTERO_MCP_TOOL_CREATE_CHILD_NOTE = "create_child_note";
export const ZOTERO_MCP_TOOL_UPDATE_NOTE = "update_note";
export const ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE = "create_markdown_note";
export const ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE = "update_markdown_note";
export const ZOTERO_MCP_TOOL_INGEST_PAPER = "ingest_paper";
export const ZOTERO_MCP_TOOL_ADD_ITEMS_TO_COLLECTION =
  "add_items_to_collection";
export const ZOTERO_MCP_TOOL_REMOVE_ITEMS_FROM_COLLECTION =
  "remove_items_from_collection";
export const ZOTERO_MCP_TOOL_TOPICS_LIST = "topics.list";
export const ZOTERO_MCP_TOOL_TOPICS_FIND_BY_PAPER_REF =
  "topics.find_by_paper_ref";
export const ZOTERO_MCP_TOOL_TOPICS_GET_CONTEXT = "topics.get_context";
export const ZOTERO_MCP_TOOL_TOPICS_GET_REVIEW_INPUT =
  "topics.get_review_input";
export const ZOTERO_MCP_TOOL_SCHEMAS_GET = "schemas.get";
export const ZOTERO_MCP_TOOL_CONCEPTS_QUERY = "concepts.query";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_QUERY_CLUSTER =
  "citation_graph.query_cluster";
export const ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET = "library_index.get";
export const ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE = "resolvers.resolve";
export const ZOTERO_MCP_TOOL_REFERENCE_INDEX_GET = "reference_index.get";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_OVERVIEW =
  "citation_graph.get_overview";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_SLICE =
  "citation_graph.get_slice";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_LAYOUT =
  "citation_graph.get_layout";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_METRICS =
  "citation_graph.get_metrics";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_RANK_EXTERNAL_REFERENCES =
  "citation_graph.rank_external_references";
export const ZOTERO_MCP_TOOL_CITATION_GRAPH_RANK_LIBRARY_PAPERS =
  "citation_graph.rank_library_papers";
export const ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_GET_MANIFEST =
  "paper_artifacts.get_manifest";
export const ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_READ = "paper_artifacts.read";
export const ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED =
  "paper_artifacts.export_filtered";
export const ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_RESOLVE_TOPIC_DIGEST =
  "paper_artifacts.resolve_topic_digest";
export const ZOTERO_MCP_TOOL_INSIGHTS_GET_ATTENTION_QUEUE =
  "insights.get_attention_queue";

export type ZoteroMcpJsonRpcId = string | number | null;

export type ZoteroMcpJsonRpcRequest = {
  jsonrpc: "2.0";
  id?: ZoteroMcpJsonRpcId;
  method: string;
  params?: unknown;
};

export type ZoteroMcpJsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: ZoteroMcpJsonRpcId;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: ZoteroMcpJsonRpcId;
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    };
export type ZoteroMcpJsonRpcResult =
  | ZoteroMcpJsonRpcResponse
  | ZoteroMcpJsonRpcResponse[]
  | null;

export type ZoteroMcpToolCallEvent = {
  toolName: string;
  arguments: Record<string, unknown>;
  hostContext?: AcpHostContext;
  result?: unknown;
  error?: {
    name: string;
    message: string;
  };
};

export type ZoteroMcpToolPermissionDecision =
  | boolean
  | {
      outcome: "approved" | "denied" | "unavailable";
      reason?: string;
    };

export type ZoteroMcpToolPermissionRequest = {
  toolName: string;
  mutation: ZoteroHostMutationRequest;
  preview: ZoteroHostMutationPreviewResponse;
  summary: string;
  requestedAt: string;
};

export type ZoteroMcpHandlerOptions = {
  resolveHostContext?: () => AcpHostContext;
  resolveHostApi?: () => WorkflowHostApi;
  resolveHostBridgeApis?: () => ZoteroHostCapabilityBrokerApis;
  resolveSynthesisService?: () => SynthesisMcpService;
  resolveMcpStatus?: () => Record<string, unknown>;
  resolveHostBridgeStatus?: () => HostBridgeStatusSnapshot;
  requestToolPermission?: (
    request: ZoteroMcpToolPermissionRequest,
  ) =>
    | Promise<ZoteroMcpToolPermissionDecision>
    | ZoteroMcpToolPermissionDecision;
  onToolCall?: (event: ZoteroMcpToolCallEvent) => void | Promise<void>;
};

type JsonObjectSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: boolean;
};

type ToolContext = {
  options: ZoteroMcpHandlerOptions;
  hostApi: WorkflowHostApi;
};

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObjectSchema;
  handler: (
    args: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ZoteroMcpToolResult> | ZoteroMcpToolResult;
};

type ZoteroMcpToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};

class ZoteroMcpToolInputError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ZoteroMcpToolInputError";
  }
}

function jsonRpcError(
  id: ZoteroMcpJsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): ZoteroMcpJsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

function normalizeRequest(value: unknown): ZoteroMcpJsonRpcRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const request = value as Partial<ZoteroMcpJsonRpcRequest>;
  if (request.jsonrpc !== "2.0" || !String(request.method || "").trim()) {
    return null;
  }
  const normalized: ZoteroMcpJsonRpcRequest = {
    jsonrpc: "2.0",
    method: String(request.method || "").trim(),
    params: request.params,
  };
  if ("id" in request) {
    normalized.id = request.id as ZoteroMcpJsonRpcId;
  }
  return normalized;
}

function isNotification(request: ZoteroMcpJsonRpcRequest) {
  return !("id" in request);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObjectString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) {
    return value;
  }
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function normalizeRefInput<T>(value: T): T {
  return parseJsonObjectString(value) as T;
}

function objectSchema(
  properties: Record<string, unknown> = {},
  required: string[] = [],
): JsonObjectSchema {
  const schema: JsonObjectSchema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

function validateJsonRpcId(id: unknown) {
  return typeof id === "string" || typeof id === "number";
}

const itemRefProperties = {
  ref: {
    description:
      'Item reference. Prefer {"key":"ABCD1234","libraryId":1} or {"id":123}.',
  },
  id: {
    type: ["number", "string"],
    description: "Zotero item id. Use either id or key/libraryId.",
  },
  key: {
    type: "string",
    description: "Zotero item key, usually with libraryId.",
  },
  libraryId: {
    type: ["number", "string"],
    description: "Zotero library id for key-based refs.",
  },
};

const MCP_LIBRARY_LIST_LIMIT_DEFAULT = 25;
const MCP_LIBRARY_LIST_LIMIT_MAX = 50;

function resolveHostApi(options: ZoteroMcpHandlerOptions) {
  return options.resolveHostApi?.() || createWorkflowHostApi();
}

function resolveHostBridgeApis(
  options: ZoteroMcpHandlerOptions,
  hostApi: WorkflowHostApi,
): ZoteroHostCapabilityBrokerApis {
  if (options.resolveHostBridgeApis) {
    return options.resolveHostBridgeApis();
  }
  const contextApi = (hostApi as { context?: Record<string, unknown> }).context;
  const libraryApi = (hostApi as { library?: Record<string, unknown> }).library;
  const mutationsApi = (hostApi as { mutations?: Record<string, unknown> })
    .mutations;
  return {
    context: {
      getCurrentView: () => {
        if (options.resolveHostContext) {
          const hostContext = options.resolveHostContext();
          const getSelectedItems = contextApi?.getSelectedItems;
          const selectedItems =
            typeof getSelectedItems === "function" ? getSelectedItems() : [];
          return {
            ...hostContext,
            selectedItems,
          };
        }
        const getCurrentView = contextApi?.getCurrentView;
        if (typeof getCurrentView === "function") {
          return getCurrentView();
        }
        const hostContext = {
          target: "library",
          selectionEmpty: true,
        };
        const getSelectedItems = contextApi?.getSelectedItems;
        const selectedItems =
          typeof getSelectedItems === "function" ? getSelectedItems() : [];
        return {
          ...hostContext,
          selectedItems,
        };
      },
      getSelectedItems: () => {
        const getSelectedItems = contextApi?.getSelectedItems;
        return typeof getSelectedItems === "function" ? getSelectedItems() : [];
      },
    },
    library: libraryApi || {},
    mutations: mutationsApi || {},
  } as unknown as ZoteroHostCapabilityBrokerApis;
}

function summarizeCurrentView(context: AcpHostContext) {
  const parts = [
    `target=${context.target}`,
    context.libraryId ? `libraryId=${context.libraryId}` : "",
    context.selectionEmpty ? "selection=empty" : "selection=present",
    context.currentItem?.key ? `itemKey=${context.currentItem.key}` : "",
    context.currentItem?.title ? `title=${context.currentItem.title}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

function buildToolResult(args: {
  tool: string;
  summary: string;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}) {
  return {
    content: [
      {
        type: "text" as const,
        text: args.summary || "No Zotero data is available.",
      },
    ],
    structuredContent: {
      tool: args.tool,
      summary: args.summary,
      ...args.structuredContent,
    },
    ...(args.isError ? { isError: true } : {}),
  };
}

function buildToolErrorResult(args: {
  tool: string;
  message: string;
  errorCode: string;
  retryable?: boolean;
  retryAfterMs?: number;
  details?: unknown;
}) {
  return buildToolResult({
    tool: args.tool,
    summary: args.message,
    isError: true,
    structuredContent: {
      error_code: args.errorCode,
      retryable: Boolean(args.retryable),
      retry_after_ms:
        Number.isFinite(Number(args.retryAfterMs)) &&
        Number(args.retryAfterMs) > 0
          ? Math.floor(Number(args.retryAfterMs))
          : 0,
      details: args.details,
    },
  });
}

function assertKnownArgs(
  toolName: string,
  args: Record<string, unknown>,
  allowed: string[],
) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(args || {}).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new ZoteroMcpToolInputError(
      `Unknown argument(s) for ${toolName}: ${unknown.join(", ")}`,
      { unknown },
    );
  }
}

function describeSchemaPath(path: string, message: string) {
  return path ? `${path}: ${message}` : message;
}

function schemaTypes(schema: Record<string, unknown>) {
  return Array.isArray(schema.type)
    ? schema.type.map((entry) => String(entry))
    : schema.type
      ? [String(schema.type)]
      : [];
}

function valueMatchesSchemaType(value: unknown, type: string) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}

function validateAgainstSchema(
  value: unknown,
  schema: unknown,
  path: string,
  errors: string[],
) {
  if (!isPlainObject(schema)) {
    return;
  }
  const types = schemaTypes(schema);
  if (
    types.length > 0 &&
    !types.some((type) => valueMatchesSchemaType(value, type))
  ) {
    errors.push(
      describeSchemaPath(
        path,
        `expected ${types.join("|")}, got ${Array.isArray(value) ? "array" : typeof value}`,
      ),
    );
    return;
  }
  if (schema.enum !== undefined && Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      errors.push(
        describeSchemaPath(path, `must be one of ${schema.enum.join(", ")}`),
      );
    }
  }
  if (typeof value === "string") {
    const minLength = Number(schema.minLength);
    const maxLength = Number(schema.maxLength);
    if (Number.isFinite(minLength) && value.length < minLength) {
      errors.push(
        describeSchemaPath(path, `must be at least ${minLength} chars`),
      );
    }
    if (Number.isFinite(maxLength) && value.length > maxLength) {
      errors.push(
        describeSchemaPath(path, `must be at most ${maxLength} chars`),
      );
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(String(schema.pattern)).test(value)) {
          errors.push(
            describeSchemaPath(path, "does not match required pattern"),
          );
        }
      } catch {
        // Ignore malformed local schema patterns instead of breaking tools/list.
      }
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const minimum = Number(schema.minimum);
    const maximum = Number(schema.maximum);
    if (Number.isFinite(minimum) && value < minimum) {
      errors.push(describeSchemaPath(path, `must be >= ${minimum}`));
    }
    if (Number.isFinite(maximum) && value > maximum) {
      errors.push(describeSchemaPath(path, `must be <= ${maximum}`));
    }
  }
  if (Array.isArray(value)) {
    const minItems = Number(schema.minItems);
    const maxItems = Number(schema.maxItems);
    if (Number.isFinite(minItems) && value.length < minItems) {
      errors.push(
        describeSchemaPath(path, `must contain at least ${minItems} item(s)`),
      );
    }
    if (Number.isFinite(maxItems) && value.length > maxItems) {
      errors.push(
        describeSchemaPath(path, `must contain at most ${maxItems} item(s)`),
      );
    }
    if (schema.items) {
      value.forEach((entry, index) =>
        validateAgainstSchema(entry, schema.items, `${path}[${index}]`, errors),
      );
    }
  }
  if (isPlainObject(value)) {
    const properties = isPlainObject(schema.properties)
      ? schema.properties
      : {};
    const required = Array.isArray(schema.required)
      ? schema.required.map((entry) => String(entry))
      : [];
    for (const key of required) {
      if (!(key in value)) {
        errors.push(
          describeSchemaPath(path ? `${path}.${key}` : key, "is required"),
        );
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(
            describeSchemaPath(
              path ? `${path}.${key}` : key,
              "unknown argument",
            ),
          );
        }
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value) {
        validateAgainstSchema(
          value[key],
          childSchema,
          path ? `${path}.${key}` : key,
          errors,
        );
      }
    }
  }
}

function validateToolArguments(
  tool: ToolDefinition,
  args: Record<string, unknown>,
) {
  const errors: string[] = [];
  validateAgainstSchema(args, tool.inputSchema, "", errors);
  if (errors.length > 0) {
    throw new ZoteroMcpToolInputError(
      `Invalid arguments for ${tool.name}: ${errors.join("; ")}`,
      { errors },
    );
  }
}

function summarizeSynthesisResult(toolName: string, result: unknown) {
  const payload = isPlainObject(result) ? result : {};
  const parts = [`${toolName} synthesis result.`];
  if (Array.isArray(payload.rows)) {
    parts.push(`rows=${payload.rows.length}`);
  }
  if (Array.isArray(payload.papers)) {
    parts.push(`papers=${payload.papers.length}`);
  }
  if (Array.isArray(payload.nodes)) {
    parts.push(`nodes=${payload.nodes.length}`);
  }
  if (Array.isArray(payload.edges)) {
    parts.push(`edges=${payload.edges.length}`);
  }
  if (Array.isArray(payload.artifacts)) {
    parts.push(`artifacts=${payload.artifacts.length}`);
  }
  if (payload.nextCursor || payload.next_cursor) {
    parts.push(
      `nextCursor=${compactText(payload.nextCursor || payload.next_cursor)}`,
    );
  }
  if (payload.has_more !== undefined) {
    parts.push(`hasMore=${Boolean(payload.has_more)}`);
  }
  if (payload.returned !== undefined) {
    parts.push(`returned=${compactText(payload.returned)}`);
  }
  if (payload.total_papers !== undefined) {
    parts.push(`totalPapers=${compactText(payload.total_papers)}`);
  }
  if (payload.topic_id) {
    parts.push(`topic=${compactText(payload.topic_id)}`);
  }
  if (payload.paper_ref) {
    parts.push(`paper=${compactText(payload.paper_ref)}`);
  }
  if (payload.total !== undefined) {
    parts.push(`total=${compactText(payload.total)}`);
  }
  return parts.join(" ");
}

async function callSynthesisService(args: {
  toolName: string;
  method: SynthesisMcpServiceMethod;
  toolArgs: Record<string, unknown>;
  context: ToolContext;
}) {
  const service =
    args.context.options.resolveSynthesisService?.() ||
    (getDefaultSynthesisService() as unknown as SynthesisMcpService);
  const method = service?.[args.method];
  if (typeof method !== "function") {
    throw new ZoteroMcpToolInputError(
      `Synthesis service method is unavailable: ${String(args.method)}`,
    );
  }
  const result = await method(args.toolArgs);
  return buildToolResult({
    tool: args.toolName,
    summary: summarizeSynthesisResult(args.toolName, result),
    structuredContent: {
      result: isPlainObject(result) ? result : { value: result },
    },
  });
}

function synthesisTool(args: {
  name: string;
  title: string;
  description: string;
  method: SynthesisMcpServiceMethod;
  properties?: Record<string, unknown>;
  allowed?: string[];
  required?: string[];
}): ToolDefinition {
  const allowed = args.allowed || Object.keys(args.properties || {});
  return {
    name: args.name,
    title: args.title,
    description: args.description,
    inputSchema: objectSchema(args.properties || {}, args.required || []),
    async handler(toolArgs, context) {
      assertKnownArgs(args.name, toolArgs, allowed);
      return callSynthesisService({
        toolName: args.name,
        method: args.method,
        toolArgs,
        context,
      });
    },
  };
}

function compactText(value: unknown, limit = 160) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }
  return text.length > limit
    ? `${text.slice(0, Math.max(0, limit - 1))}…`
    : text;
}

function formatItemRef(
  value:
    | Partial<ZoteroHostItemSummaryDto>
    | Partial<ZoteroHostItemRefInput & { libraryID?: number | string }>
    | null
    | undefined,
) {
  if (!value || typeof value !== "object") {
    return "ref=unavailable";
  }
  const key = compactText((value as { key?: unknown }).key);
  const libraryId =
    (value as { libraryId?: unknown }).libraryId ??
    (value as { libraryID?: unknown }).libraryID;
  const id = (value as { id?: unknown }).id;
  return (
    [
      key ? `key=${key}` : "",
      libraryId !== undefined && libraryId !== null && libraryId !== ""
        ? `libraryId=${libraryId}`
        : "",
      id !== undefined && id !== null && id !== "" ? `id=${id}` : "",
    ]
      .filter(Boolean)
      .join(" ") || "ref=unavailable"
  );
}

function formatItemLine(item: Partial<ZoteroHostItemSummaryDto>) {
  const fields = [
    formatItemRef(item),
    item.itemType ? `type=${compactText(item.itemType)}` : "",
    item.title ? `title="${compactText(item.title, 120)}"` : "",
    item.year ? `year=${compactText(item.year)}` : "",
    item.creators?.length
      ? `creators="${compactText(item.creators.join(", "), 120)}"`
      : "",
    "noteCount" in item && item.noteCount !== undefined
      ? `notes=${item.noteCount}`
      : "",
    "attachmentCount" in item && item.attachmentCount !== undefined
      ? `attachments=${item.attachmentCount}`
      : "",
  ].filter(Boolean);
  return `- ${fields.join(" ")}`;
}

function formatNoteLine(note: Partial<ZoteroHostNoteDto>) {
  const parent = note.parent ? ` parent=${formatItemRef(note.parent)}` : "";
  const excerpt = note.textExcerpt
    ? ` excerpt="${compactText(note.textExcerpt, 180)}"`
    : "";
  const lengths = [
    note.textLength !== undefined ? `textLength=${note.textLength}` : "",
    note.htmlLength !== undefined ? `htmlLength=${note.htmlLength}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `- ${formatItemRef(note)}`,
    note.title ? `title="${compactText(note.title, 100)}"` : "",
    lengths,
    parent.trim(),
    excerpt.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function formatAttachmentLine(
  attachment: Partial<ZoteroHostAttachmentDto> & {
    access?: Record<string, unknown>;
    contentRole?: unknown;
    readability?: unknown;
    recommendedForReading?: unknown;
    recommendationReason?: unknown;
    rank?: unknown;
  },
) {
  const access = attachment.access || {};
  const path = compactText(access.path || attachment.path, 260);
  const fields = [
    formatItemRef(attachment),
    attachment.filename || attachment.title
      ? `filename="${compactText(attachment.filename || attachment.title, 120)}"`
      : "",
    attachment.contentType
      ? `contentType=${compactText(attachment.contentType)}`
      : "",
    attachment.contentRole
      ? `contentRole=${compactText(attachment.contentRole)}`
      : "",
    attachment.readability
      ? `readability=${compactText(attachment.readability)}`
      : "",
    attachment.recommendedForReading ? "recommendedForReading=true" : "",
    attachment.rank !== undefined ? `rank=${attachment.rank}` : "",
    access.mode ? `access.mode=${compactText(access.mode)}` : "",
    access.locality ? `locality=${compactText(access.locality)}` : "",
    path ? `path="${path}"` : "path=unavailable",
    attachment.recommendationReason
      ? `reason="${compactText(attachment.recommendationReason, 160)}"`
      : "",
  ].filter(Boolean);
  return `- ${fields.join(" ")}`;
}

function formatJsonCall(tool: string, args?: Record<string, unknown>) {
  return args ? `${tool} ${JSON.stringify(args)}` : tool;
}

function formatNextCalls(
  calls: Array<{ tool: string; args?: Record<string, unknown> }>,
) {
  if (calls.length === 0) {
    return "";
  }
  return [
    "",
    "Next:",
    ...calls.map((call) => `- ${formatJsonCall(call.tool, call.args)}`),
  ].join("\n");
}

function firstItemRefArgs(
  value: Partial<ZoteroHostItemSummaryDto> | undefined | null,
) {
  if (!value) {
    return undefined;
  }
  if (value.key) {
    return {
      key: value.key,
      libraryId: value.libraryId,
    };
  }
  if (value.id !== undefined) {
    return {
      id: value.id,
    };
  }
  return undefined;
}

function buildReadToolSummary(args: {
  title: string;
  lines?: string[];
  nextCalls?: Array<{ tool: string; args?: Record<string, unknown> }>;
}) {
  return [
    args.title,
    ...(args.lines && args.lines.length > 0 ? ["", ...args.lines] : []),
    formatNextCalls(args.nextCalls || []),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSelectedItemsSummary(items: ZoteroHostItemSummaryDto[]) {
  const firstRef = firstItemRefArgs(items[0]);
  return buildReadToolSummary({
    title: `Selected Zotero items: ${items.length}.`,
    lines: items.map(formatItemLine),
    nextCalls: firstRef
      ? [
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL, args: firstRef },
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS, args: firstRef },
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_NOTES, args: firstRef },
        ]
      : [],
  });
}

function buildSearchItemsSummary(
  query: string,
  items: ZoteroHostItemSummaryDto[],
) {
  const firstRef = firstItemRefArgs(items[0]);
  return buildReadToolSummary({
    title: `Found ${items.length} Zotero item(s) for query="${compactText(query)}".`,
    lines: items.map(formatItemLine),
    nextCalls: firstRef
      ? [
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL, args: firstRef },
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS, args: firstRef },
        ]
      : [],
  });
}

function buildLibraryItemsSummary(result: ZoteroHostLibraryListResponse) {
  const firstRef = firstItemRefArgs(result.items[0]);
  const filters = Object.entries(result.filters || {})
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) =>
      typeof value === "object"
        ? `${key}=${JSON.stringify(value)}`
        : `${key}=${value}`,
    )
    .join(" ");
  return buildReadToolSummary({
    title: [
      `Listed ${result.returned} Zotero parent item index entrie(s).`,
      filters ? `filters: ${filters}` : "",
      `hasMore=${Boolean(result.hasMore)}`,
      result.nextCursor ? `nextCursor=${result.nextCursor}` : "",
      `totalScanned=${result.totalScanned}`,
      "Use get_item_detail for full metadata.",
    ]
      .filter(Boolean)
      .join(" "),
    lines: result.items.map(formatItemLine),
    nextCalls: [
      ...(firstRef
        ? [{ tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL, args: firstRef }]
        : []),
      ...(result.hasMore && result.nextCursor
        ? [
            {
              tool: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
              args: { cursor: result.nextCursor },
            },
          ]
        : []),
    ],
  });
}

function toLibraryIndexItem(item: ZoteroHostLibraryItemSummaryDto) {
  return {
    id: item.id,
    key: item.key,
    libraryId: item.libraryId,
    itemType: item.itemType,
    title: item.title,
    year: item.year,
    noteCount: item.noteCount,
    attachmentCount: item.attachmentCount,
  };
}

function compactLibraryListResult(result: ZoteroHostLibraryListResponse) {
  return {
    ...result,
    items: result.items.map(toLibraryIndexItem),
    compact: true,
    itemShape:
      "index-only: id,key,libraryId,itemType,title,year,noteCount,attachmentCount",
  };
}

function buildItemDetailSummary(
  ref: ZoteroHostItemRefInput,
  item: ZoteroHostItemDetailDto | null,
) {
  if (!item) {
    return buildReadToolSummary({
      title: `Item not found for ${JSON.stringify(ref)}.`,
    });
  }
  const itemRef = firstItemRefArgs(item);
  const core = [
    formatItemLine(item),
    item.fields?.DOI ? `- DOI=${compactText(item.fields.DOI)}` : "",
    item.fields?.url ? `- url=${compactText(item.fields.url, 200)}` : "",
    item.fields?.abstractNote
      ? `- abstract="${compactText(item.fields.abstractNote, 240)}"`
      : "",
    item.tags?.length
      ? `- tags=${item.tags.map((tag) => `"${compactText(tag)}"`).join(", ")}`
      : "",
  ].filter(Boolean);
  return buildReadToolSummary({
    title: `Item detail: ${formatItemRef(item)} title="${compactText(item.title, 120)}".`,
    lines: core,
    nextCalls: itemRef
      ? [
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_NOTES, args: itemRef },
          { tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS, args: itemRef },
        ]
      : [],
  });
}

function buildItemNotesSummary(
  ref: ZoteroHostItemRefInput,
  notes: ZoteroHostNoteDto[],
) {
  const firstRef = firstItemRefArgs(notes[0]);
  return buildReadToolSummary({
    title: `Found ${notes.length} Zotero note summary item(s) for ${JSON.stringify(ref)}.`,
    lines: notes.map(formatNoteLine),
    nextCalls: firstRef
      ? [{ tool: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL, args: firstRef }]
      : [],
  });
}

function buildNoteDetailSummary(note: ZoteroHostNoteDetailChunkDto) {
  return buildReadToolSummary({
    title: [
      `Read Zotero note chunk ${note.offset}-${note.nextOffset} of ${note.totalChars}.`,
      `offset=${note.offset}`,
      `nextOffset=${note.nextOffset}`,
      `totalChars=${note.totalChars}`,
      `hasMore=${Boolean(note.hasMore)}`,
      `format=${note.format}`,
      `note=${formatItemRef(note)}`,
    ].join(" "),
    lines: [
      note.title ? `- title="${compactText(note.title, 120)}"` : "",
      note.content
        ? `- contentExcerpt="${compactText(note.content, 220)}"`
        : "",
    ].filter(Boolean),
    nextCalls: note.hasMore
      ? [
          {
            tool: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
            args: {
              key: note.key,
              libraryId: note.libraryId,
              offset: note.nextOffset,
            },
          },
        ]
      : [],
  });
}

function formatPayloadLine(payload: Partial<ZoteroHostNotePayloadSummaryDto>) {
  const fields = [
    payload.payloadType
      ? `payloadType=${compactText(payload.payloadType)}`
      : "",
    payload.noteKind ? `noteKind=${compactText(payload.noteKind)}` : "",
    payload.format ? `format=${compactText(payload.format)}` : "",
    payload.encoding ? `encoding=${compactText(payload.encoding)}` : "",
    payload.version ? `version=${compactText(payload.version)}` : "",
    payload.estimatedSize !== undefined
      ? `estimatedSize=${payload.estimatedSize}`
      : "",
    payload.errors?.length
      ? `errors="${compactText(payload.errors.join("; "), 160)}"`
      : "",
  ].filter(Boolean);
  return `- ${fields.join(" ")}`;
}

function buildNotePayloadsSummary(
  ref: ZoteroHostItemRefInput,
  payloads: ZoteroHostNotePayloadSummaryDto[],
) {
  const firstPayload = payloads.find((entry) => !entry.errors?.length);
  const refArgs = isPlainObject(ref)
    ? (ref as Record<string, unknown>)
    : { ref };
  return buildReadToolSummary({
    title: `Found ${payloads.length} Zotero note payload block(s) for ${JSON.stringify(ref)}.`,
    lines: payloads.map(formatPayloadLine),
    nextCalls: firstPayload
      ? [
          {
            tool: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
            args: {
              ...refArgs,
              payloadType: firstPayload.payloadType,
            },
          },
        ]
      : [],
  });
}

function buildNotePayloadDetailSummary(
  ref: ZoteroHostItemRefInput,
  detail: ZoteroHostNotePayloadDetailDto,
) {
  return buildReadToolSummary({
    title: [
      `Read Zotero note payload ${detail.payloadType}.`,
      `note=${JSON.stringify(ref)}`,
      `noteKind=${detail.noteKind || "unknown"}`,
      `format=${detail.format}`,
      `offset=${detail.offset}`,
      `nextOffset=${detail.nextOffset}`,
      `totalChars=${detail.totalChars}`,
      `hasMore=${Boolean(detail.hasMore)}`,
    ].join(" "),
    lines: [
      formatPayloadLine(detail),
      detail.content
        ? `- contentExcerpt="${compactText(detail.content, 240)}"`
        : "",
    ].filter(Boolean),
    nextCalls: detail.hasMore
      ? [
          {
            tool: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
            args: {
              ...(isPlainObject(ref)
                ? (ref as Record<string, unknown>)
                : { ref }),
              payloadType: detail.payloadType,
              offset: detail.nextOffset,
            },
          },
        ]
      : [],
  });
}

function buildAttachmentsSummary(
  ref: ZoteroHostItemRefInput,
  attachments: Array<
    Partial<ZoteroHostAttachmentDto> & {
      access?: Record<string, unknown>;
      recommendedForReading?: boolean;
      recommendationReason?: string;
    }
  >,
) {
  const recommended = attachments.find(
    (attachment) => attachment.recommendedForReading,
  );
  return buildReadToolSummary({
    title: [
      `Found ${attachments.length} Zotero attachment(s) for ${JSON.stringify(ref)}.`,
      "File content is not returned by this tool.",
      recommended
        ? `Recommended for reading: ${formatItemRef(recommended)} ${
            recommended.filename || recommended.title
              ? `filename="${compactText(recommended.filename || recommended.title, 120)}"`
              : ""
          } ${recommended.recommendationReason || ""}`.trim()
        : "No readable attachment recommendation is available.",
    ].join(" "),
    lines: attachments.map(formatAttachmentLine),
  });
}

type AttachmentAccessManifest = ReturnType<typeof buildAttachmentAccess>;

type ReadingAttachmentMetadata = {
  access: AttachmentAccessManifest;
  contentRole: string;
  readability: string;
  recommendedForReading: boolean;
  recommendationReason: string;
  rank: number;
};

type AttachmentWithReadingMetadata = ZoteroHostAttachmentDto &
  ReadingAttachmentMetadata;

const READABLE_MARKDOWN_PAYLOAD_TYPES = new Set([
  "custom-markdown",
  "conversation-note-markdown",
  "digest-markdown",
]);

function parseBoundedPositiveInteger(
  value: unknown,
  fallback: number,
  max: number,
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(1, Math.floor(numeric)));
}

function classifyAttachmentForReading(
  attachment: ZoteroHostAttachmentDto,
  access: AttachmentAccessManifest,
) {
  const filename = String(
    attachment.filename || attachment.title || access.filename || "",
  );
  const contentType = String(
    attachment.contentType || access.contentType || "",
  ).toLowerCase();
  const path = String(access.path || attachment.path || "").toLowerCase();
  const haystack = `${filename} ${path} ${contentType}`.toLowerCase();
  const hasLocalPath = access.mode === "local-path" && !!access.path;
  const isSupplement =
    /\b(supplement|supplementary|appendix|dataset|figure|image|table)\b/.test(
      haystack,
    );
  const hasMainSignal =
    /\b(full|fulltext|paper|main|article|manuscript)\b/.test(haystack);
  const isMarkdown =
    contentType.includes("markdown") ||
    /\.(md|markdown|mdown)(?:$|[?#])/.test(path);
  const isText =
    contentType.startsWith("text/plain") || /\.(txt|text)(?:$|[?#])/.test(path);
  const isPdf =
    contentType.includes("pdf") ||
    /\.pdf(?:$|[?#])/.test(path) ||
    /\.pdf$/i.test(filename);
  const isWeb =
    contentType.includes("html") ||
    /^https?:\/\//i.test(String(attachment.path || ""));

  let contentRole = "unknown";
  let readability = hasLocalPath ? "local-file" : "unavailable";
  let rank = hasLocalPath ? 40 : 0;
  if (isMarkdown) {
    contentRole = "markdown-fulltext";
    readability = hasLocalPath ? "direct-text" : "unavailable";
    rank = 500;
  } else if (isText) {
    contentRole = "text-fulltext";
    readability = hasLocalPath ? "direct-text" : "unavailable";
    rank = 450;
  } else if (isPdf) {
    contentRole = "pdf";
    readability = hasLocalPath ? "local-pdf" : "unavailable";
    rank = 300;
  } else if (isWeb) {
    contentRole = "web-link";
    readability = "web-link";
    rank = 150;
  }

  if (isSupplement) {
    contentRole = contentRole === "unknown" ? "supplementary" : contentRole;
    rank -= 160;
  }
  if (hasMainSignal) {
    rank += 35;
  }
  if (!hasLocalPath && readability !== "web-link") {
    rank -= 120;
  }
  rank = Math.max(0, rank);
  const reasonParts = [
    contentRole,
    readability,
    hasMainSignal ? "main-document filename signal" : "",
    isSupplement ? "supplementary filename signal" : "",
    hasLocalPath ? "local path available" : "local path unavailable",
  ].filter(Boolean);
  return {
    contentRole,
    readability,
    rank,
    recommendationReason: reasonParts.join("; "),
  };
}

function enrichAttachmentsForReading(
  attachments: ZoteroHostAttachmentDto[],
): AttachmentWithReadingMetadata[] {
  const enriched = attachments.map((attachment) => {
    const access = buildAttachmentAccess(attachment);
    const reading = classifyAttachmentForReading(attachment, access);
    return {
      ...attachment,
      access,
      contentRole: reading.contentRole,
      readability: reading.readability,
      recommendedForReading: false,
      recommendationReason: reading.recommendationReason,
      rank: reading.rank,
    };
  });
  const best = enriched
    .filter((attachment) => attachment.rank > 0)
    .sort((left, right) => right.rank - left.rank)[0];
  if (best) {
    best.recommendedForReading = true;
    best.recommendationReason = `Best available reading attachment: ${best.recommendationReason}`;
  }
  return enriched;
}

function buildMcpStatusSummary(status: Record<string, unknown>) {
  const safeStatus = status || {};
  const queue = isPlainObject(safeStatus.queue) ? safeStatus.queue : {};
  const guard = isPlainObject(safeStatus.guard) ? safeStatus.guard : {};
  const recent = Array.isArray(safeStatus.recentRequests)
    ? safeStatus.recentRequests.length
    : undefined;
  return buildReadToolSummary({
    title: "Zotero MCP status snapshot.",
    lines: [
      safeStatus.state ? `- state=${compactText(safeStatus.state)}` : "",
      safeStatus.transport
        ? `- transport=${compactText(safeStatus.transport)}`
        : "",
      Object.keys(queue).length
        ? `- queue=${compactText(JSON.stringify(queue), 240)}`
        : "",
      Object.keys(guard).length
        ? `- guard=${compactText(JSON.stringify(guard), 240)}`
        : "",
      recent !== undefined ? `- recentRequests=${recent}` : "",
    ].filter(Boolean),
  });
}

function summarizeMutationTargetRefs(
  refs: ZoteroHostMutationPreviewResponse["targetRefs"] | undefined,
) {
  const values = refs || [];
  return values.length > 0
    ? values.map(formatItemLine)
    : ["- targets=not available"];
}

function buildWriteToolSummary(args: {
  toolName: string;
  mutation: ZoteroHostMutationRequest;
  preview: ZoteroHostMutationPreviewResponse;
  executed: boolean;
  permission?: { outcome?: string; reason?: string };
  execution?: ZoteroHostMutationExecuteResponse;
  verificationHint?: string;
}) {
  const permission = args.permission?.outcome || "not_requested";
  const executionOk = args.execution ? String(args.execution.ok) : "not_run";
  const previewOk = String(args.preview.ok);
  const operation =
    args.preview.operation || args.mutation.operation || args.toolName;
  return [
    `Zotero mutation ${operation}: preview.ok=${previewOk}; permission=${permission}; executed=${args.executed}; execution.ok=${executionOk}.`,
    args.permission?.reason
      ? `Permission reason: ${args.permission.reason}.`
      : "",
    args.preview.summary ? `Preview: ${args.preview.summary}` : "",
    args.execution?.summary ? `Execution: ${args.execution.summary}` : "",
    "",
    "Targets:",
    ...summarizeMutationTargetRefs(args.preview.targetRefs),
    args.executed
      ? "Zotero write may have changed data. Verify before retrying if transport status is ambiguous."
      : "No Zotero write was executed.",
    args.verificationHint ? `Verify: ${args.verificationHint}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function resolveToolName(params: unknown) {
  if (!params || typeof params !== "object") {
    return "";
  }
  return String((params as { name?: unknown }).name || "").trim();
}

function resolveToolArguments(params: unknown) {
  if (!params || typeof params !== "object") {
    return {};
  }
  const args = (params as { arguments?: unknown }).arguments;
  return isPlainObject(args) ? args : {};
}

function resolveProtocolVersion(params: unknown) {
  if (!params || typeof params !== "object") {
    return ZOTERO_MCP_PROTOCOL_VERSION;
  }
  const requestedVersion = String(
    (params as { protocolVersion?: unknown }).protocolVersion || "",
  ).trim();
  return requestedVersion || ZOTERO_MCP_PROTOCOL_VERSION;
}

function resolveCurrentViewContext(context: ToolContext) {
  return (
    context.options.resolveHostContext?.() ||
    (context.hostApi.context.getCurrentView() as AcpHostContext)
  );
}

function resolveItemRef(args: Record<string, unknown>): ZoteroHostItemRefInput {
  if (args.ref !== undefined && args.ref !== null) {
    return normalizeRefInput(args.ref) as ZoteroHostItemRefInput;
  }
  const item = normalizeRefInput(args.item);
  if (isPlainObject(item)) {
    return item as ZoteroHostItemRefInput;
  }
  const target = normalizeRefInput(args.target);
  if (isPlainObject(target)) {
    return target as ZoteroHostItemRefInput;
  }
  const ref: Record<string, unknown> = {};
  for (const key of ["id", "key", "libraryId", "libraryID"]) {
    if (args[key] !== undefined && args[key] !== null && args[key] !== "") {
      ref[key] = args[key];
    }
  }
  if (Object.keys(ref).length > 0) {
    return ref as ZoteroHostItemRefInput;
  }
  throw new ZoteroMcpToolInputError("item reference is required");
}

function resolveItemRefs(
  args: Record<string, unknown>,
): ZoteroHostItemRefInput[] {
  const raw = normalizeRefInput(
    args.items || args.targets || args.target || args.item || args.ref,
  );
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (values.length > 0) {
    return values.map((value) =>
      normalizeRefInput(value),
    ) as ZoteroHostItemRefInput[];
  }
  return [resolveItemRef(args)];
}

function resolveCollectionRef(
  args: Record<string, unknown>,
): ZoteroHostCollectionRefInput {
  if (args.collection !== undefined) {
    return normalizeRefInput(args.collection) as ZoteroHostCollectionRefInput;
  }
  const ref: Record<string, unknown> = {};
  if (args.collectionId !== undefined) {
    ref.id = args.collectionId;
  }
  if (args.collectionKey !== undefined) {
    ref.key = args.collectionKey;
  }
  if (args.collectionLibraryId !== undefined) {
    ref.libraryId = args.collectionLibraryId;
  }
  if (Object.keys(ref).length > 0) {
    return ref as ZoteroHostCollectionRefInput;
  }
  throw new ZoteroMcpToolInputError("collection reference is required");
}

function buildLibraryListArgs(
  args: Record<string, unknown>,
): ZoteroHostLibraryListArgs {
  return {
    libraryId: args.libraryId as number | string | undefined,
    collection: args.collection as ZoteroHostCollectionRefInput | undefined,
    collectionId: args.collectionId as number | string | undefined,
    collectionKey: args.collectionKey as string | undefined,
    collectionLibraryId: args.collectionLibraryId as
      | number
      | string
      | undefined,
    tag: args.tag as string | undefined,
    itemType: args.itemType as string | undefined,
    query: args.query as string | undefined,
    limit: parseBoundedPositiveInteger(
      args.limit,
      MCP_LIBRARY_LIST_LIMIT_DEFAULT,
      MCP_LIBRARY_LIST_LIMIT_MAX,
    ),
    cursor: args.cursor as number | string | undefined,
  };
}

function buildNoteDetailArgs(
  args: Record<string, unknown>,
): ZoteroHostNoteDetailArgs {
  return {
    format: args.format as string | undefined,
    offset: args.offset as number | string | undefined,
    maxChars: args.maxChars as number | string | undefined,
  };
}

function buildNotePayloadArgs(args: Record<string, unknown>) {
  return {
    payloadType: args.payloadType as string | undefined,
    offset: args.offset as number | string | undefined,
    maxChars: args.maxChars as number | string | undefined,
  };
}

function buildWriteVerificationHint(toolName: string) {
  return [
    "If the client reports fetch failed after this write, the Zotero server may still have executed it.",
    `Verify with ${ZOTERO_MCP_TOOL_GET_ITEM_DETAIL} for item refs or ${ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS} for library/collection summaries before retrying ${toolName}.`,
  ].join(" ");
}

function hasExplicitItemRef(args: Record<string, unknown>) {
  return ["ref", "item", "target", "id", "key", "libraryId", "libraryID"].some(
    (key) => args[key] !== undefined && args[key] !== null && args[key] !== "",
  );
}

function resolveReadingContextRef(
  args: Record<string, unknown>,
  context: ToolContext,
) {
  if (hasExplicitItemRef(args)) {
    return {
      ref: resolveItemRef(args),
      source: "arguments",
      candidates: [] as ZoteroHostItemSummaryDto[],
    };
  }
  const currentView = context.hostApi.context.getCurrentView();
  if (currentView.currentItem?.key || currentView.currentItem?.id) {
    return {
      ref: firstItemRefArgs(currentView.currentItem) || currentView.currentItem,
      source: "current-view",
      candidates: [] as ZoteroHostItemSummaryDto[],
    };
  }
  const selected =
    currentView.selectedItems || context.hostApi.context.getSelectedItems();
  if (selected.length === 1) {
    return {
      ref: firstItemRefArgs(selected[0]) || selected[0],
      source: "single-selection",
      candidates: [] as ZoteroHostItemSummaryDto[],
    };
  }
  if (selected.length > 1) {
    throw new ZoteroMcpToolInputError(
      "multiple selected Zotero items; pass an explicit item ref",
      {
        candidates: selected.map((item) => ({
          ref: firstItemRefArgs(item),
          item,
        })),
      },
    );
  }
  throw new ZoteroMcpToolInputError(
    "item reference is required when there is no current item or single selection",
  );
}

function summarizePayloadForReading(payload: ZoteroHostNotePayloadSummaryDto) {
  return {
    ...payload,
    readableAsMarkdown: READABLE_MARKDOWN_PAYLOAD_TYPES.has(
      payload.payloadType,
    ),
    recommendedNextCall: payload.errors?.length
      ? undefined
      : {
          tool: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
          payloadType: payload.payloadType,
        },
  };
}

function buildPaperReadingContextSummary(args: {
  ref: ZoteroHostItemRefInput;
  source: string;
  item: ZoteroHostItemDetailDto | null;
  notes: ZoteroHostNoteDto[];
  notePayloads: Array<{
    note: ZoteroHostNoteDto;
    payloads: ReturnType<typeof summarizePayloadForReading>[];
  }>;
  attachments: AttachmentWithReadingMetadata[];
  recommendedAttachment?: AttachmentWithReadingMetadata;
  limitations: string[];
}) {
  const itemRef = args.item ? firstItemRefArgs(args.item) : undefined;
  const nextCalls: Array<{ tool: string; args?: Record<string, unknown> }> = [
    ...(itemRef
      ? [{ tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL, args: itemRef }]
      : []),
    ...(itemRef
      ? [{ tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS, args: itemRef }]
      : []),
    ...(args.notes[0]
      ? [
          {
            tool: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
            args: firstItemRefArgs(args.notes[0]),
          },
        ]
      : []),
    ...(args.notePayloads[0]?.payloads[0]
      ? [
          {
            tool: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
            args: {
              ...firstItemRefArgs(args.notePayloads[0].note),
              payloadType: args.notePayloads[0].payloads[0].payloadType,
            },
          },
        ]
      : []),
  ];
  return buildReadToolSummary({
    title: [
      `Prepared Zotero paper reading context from ${args.source}.`,
      args.item
        ? `item=${formatItemRef(args.item)} title="${compactText(args.item.title, 140)}"`
        : `item not found for ${JSON.stringify(args.ref)}`,
      `notes=${args.notes.length}`,
      `notePayloadBlocks=${args.notePayloads.reduce(
        (sum, entry) => sum + entry.payloads.length,
        0,
      )}`,
      `attachments=${args.attachments.length}`,
    ].join(" "),
    lines: [
      args.recommendedAttachment
        ? `- recommendedAttachment ${formatAttachmentLine(args.recommendedAttachment).slice(2)}`
        : "- recommendedAttachment=unavailable",
      ...args.notes.map((note) => formatNoteLine(note)),
      ...args.notePayloads.flatMap((entry) =>
        entry.payloads.map(
          (payload) =>
            `- notePayload note=${formatItemRef(entry.note)} ${formatPayloadLine(
              payload,
            ).slice(2)} readableAsMarkdown=${payload.readableAsMarkdown}`,
        ),
      ),
      ...args.attachments.map(formatAttachmentLine),
      ...args.limitations.map((limitation) => `- limitation=${limitation}`),
    ],
    nextCalls,
  });
}

function requirePlainObject(value: unknown, label: string) {
  if (!isPlainObject(value)) {
    throw new ZoteroMcpToolInputError(`${label} must be an object`);
  }
  return value;
}

function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ZoteroMcpToolInputError(`${label} must be a non-empty array`);
  }
  return value;
}

function buildAttachmentAccess(attachment: ZoteroHostAttachmentDto) {
  const path = String(attachment.path || "").trim();
  const filename =
    String(attachment.filename || "").trim() ||
    path.split(/[\\/]/).filter(Boolean).pop() ||
    "";
  return {
    mode: path ? "local-path" : "unavailable",
    path: path || undefined,
    url: undefined,
    filename,
    contentType: attachment.contentType || "",
    size: undefined,
    sha256: undefined,
    locality: path ? "same-host" : "remote",
  };
}

function buildMutationRequest(
  toolName: string,
  args: Record<string, unknown>,
): ZoteroHostMutationRequest {
  if (toolName === ZOTERO_MCP_TOOL_PREVIEW_MUTATION) {
    if (isPlainObject(args.request)) {
      return args.request as ZoteroHostMutationRequest;
    }
    return args as ZoteroHostMutationRequest;
  }
  switch (toolName) {
    case ZOTERO_MCP_TOOL_UPDATE_ITEM_FIELDS:
      return {
        operation: "item.updateFields",
        target: resolveItemRef(args),
        fields: requirePlainObject(args.fields, "fields") as Record<
          string,
          string | number | boolean | null
        >,
      };
    case ZOTERO_MCP_TOOL_ADD_ITEM_TAGS:
      return {
        operation: "item.addTags",
        targets: resolveItemRefs(args),
        tags: requireArray(args.tags, "tags").map((entry) => String(entry)),
      };
    case ZOTERO_MCP_TOOL_REMOVE_ITEM_TAGS:
      return {
        operation: "item.removeTags",
        targets: resolveItemRefs(args),
        tags: requireArray(args.tags, "tags").map((entry) => String(entry)),
      };
    case ZOTERO_MCP_TOOL_CREATE_CHILD_NOTE:
      return {
        operation: "note.createChild",
        parent: args.parent || args.target || resolveItemRef(args),
        content: String(args.content || ""),
      };
    case ZOTERO_MCP_TOOL_UPDATE_NOTE:
      return {
        operation: "note.update",
        note: args.note || args.target || resolveItemRef(args),
        content: String(args.content || ""),
      };
    case ZOTERO_MCP_TOOL_INGEST_PAPER:
      return {
        operation: "literature.ingest",
        paper: requirePlainObject(args.paper, "paper") as any,
        collection: args.collection ? resolveCollectionRef(args) : undefined,
      };
    case ZOTERO_MCP_TOOL_ADD_ITEMS_TO_COLLECTION:
      return {
        operation: "collection.addItems",
        items: resolveItemRefs(args),
        collection: resolveCollectionRef(args),
      };
    case ZOTERO_MCP_TOOL_REMOVE_ITEMS_FROM_COLLECTION:
      return {
        operation: "collection.removeItems",
        items: resolveItemRefs(args),
        collection: resolveCollectionRef(args),
      };
    default:
      throw new ZoteroMcpToolInputError(
        `Unsupported mutation tool: ${toolName}`,
      );
  }
}

function normalizePermissionDecision(
  value: ZoteroMcpToolPermissionDecision | undefined,
) {
  if (value === true) {
    return {
      outcome: "approved" as const,
      reason: "",
    };
  }
  if (value === false || !value) {
    return {
      outcome: "denied" as const,
      reason: "",
    };
  }
  return {
    outcome: value.outcome,
    reason: String(value.reason || "").trim(),
  };
}

async function previewMutationTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext,
) {
  const mutation = buildMutationRequest(toolName, args);
  const preview = await context.hostApi.mutations.preview(mutation);
  return buildToolResult({
    tool: toolName,
    summary: buildWriteToolSummary({
      toolName,
      mutation,
      preview,
      executed: false,
    }),
    structuredContent: {
      mutation,
      preview,
      executed: false,
    },
  });
}

async function executeMutationTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext,
) {
  const mutation = buildMutationRequest(toolName, args);
  const preview = await context.hostApi.mutations.preview(mutation);
  if (!preview.ok) {
    return buildToolResult({
      tool: toolName,
      summary: buildWriteToolSummary({
        toolName,
        mutation,
        preview,
        executed: false,
        permission: {
          outcome: "not_requested",
          reason: "preview_failed",
        },
      }),
      structuredContent: {
        mutation,
        preview,
        executed: false,
        permission: {
          outcome: "not_requested",
          reason: "preview_failed",
        },
      },
    });
  }
  if (!context.options.requestToolPermission) {
    return buildToolResult({
      tool: toolName,
      summary: buildWriteToolSummary({
        toolName,
        mutation,
        preview,
        executed: false,
        permission: {
          outcome: "unavailable",
          reason: "permission_hook_missing",
        },
      }),
      structuredContent: {
        mutation,
        preview,
        executed: false,
        permission: {
          outcome: "unavailable",
          reason: "permission_hook_missing",
        },
      },
    });
  }
  const permission = normalizePermissionDecision(
    await context.options.requestToolPermission({
      toolName,
      mutation,
      preview,
      summary: preview.summary,
      requestedAt: new Date().toISOString(),
    }),
  );
  if (permission.outcome !== "approved") {
    return buildToolResult({
      tool: toolName,
      summary: buildWriteToolSummary({
        toolName,
        mutation,
        preview,
        executed: false,
        permission,
      }),
      structuredContent: {
        mutation,
        preview,
        executed: false,
        permission,
      },
    });
  }
  const execution = await context.hostApi.mutations.execute(mutation);
  const verificationHint = buildWriteVerificationHint(toolName);
  return buildToolResult({
    tool: toolName,
    summary: buildWriteToolSummary({
      toolName,
      mutation,
      preview,
      executed: execution.ok,
      permission,
      execution,
      verificationHint,
    }),
    structuredContent: {
      mutation,
      preview,
      executed: execution.ok,
      permission,
      execution,
      verificationHint,
    },
  });
}

function normalizeMarkdownNoteKind(value: unknown) {
  const noteKind = String(value || "custom").trim() || "custom";
  if (noteKind !== "custom" && noteKind !== "conversation-note") {
    throw new ZoteroMcpToolInputError(
      "noteKind must be custom or conversation-note for MCP markdown writes",
    );
  }
  return noteKind;
}

function requireNonEmptyString(value: unknown, label: string) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ZoteroMcpToolInputError(`${label} must be non-empty`);
  }
  return text;
}

async function executePreparedMarkdownMutationTool(args: {
  toolName: string;
  mutation: ZoteroHostMutationRequest;
  context: ToolContext;
  payloadType: string;
  noteKind: string;
  markdownLength: number;
}) {
  const preview = await args.context.hostApi.mutations.preview(args.mutation);
  const buildSummary = (
    executed: boolean,
    permission?: { outcome?: string; reason?: string },
    execution?: ZoteroHostMutationExecuteResponse,
    verificationHint?: string,
  ) =>
    [
      `Markdown note payload: payloadType=${args.payloadType}; noteKind=${args.noteKind}; markdownLength=${args.markdownLength}.`,
      buildWriteToolSummary({
        toolName: args.toolName,
        mutation: args.mutation,
        preview,
        executed,
        permission,
        execution,
        verificationHint,
      }),
      executed
        ? `Verify with ${ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD} using payloadType=${args.payloadType}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  if (!preview.ok) {
    const permission = {
      outcome: "not_requested",
      reason: "preview_failed",
    };
    return buildToolResult({
      tool: args.toolName,
      summary: buildSummary(false, permission),
      structuredContent: {
        mutation: args.mutation,
        preview,
        payloadType: args.payloadType,
        noteKind: args.noteKind,
        markdownLength: args.markdownLength,
        executed: false,
        permission,
      },
    });
  }
  if (!args.context.options.requestToolPermission) {
    const permission = {
      outcome: "unavailable",
      reason: "permission_hook_missing",
    };
    return buildToolResult({
      tool: args.toolName,
      summary: buildSummary(false, permission),
      structuredContent: {
        mutation: args.mutation,
        preview,
        payloadType: args.payloadType,
        noteKind: args.noteKind,
        markdownLength: args.markdownLength,
        executed: false,
        permission,
      },
    });
  }
  const permission = normalizePermissionDecision(
    await args.context.options.requestToolPermission({
      toolName: args.toolName,
      mutation: args.mutation,
      preview,
      summary: preview.summary,
      requestedAt: new Date().toISOString(),
    }),
  );
  if (permission.outcome !== "approved") {
    return buildToolResult({
      tool: args.toolName,
      summary: buildSummary(false, permission),
      structuredContent: {
        mutation: args.mutation,
        preview,
        payloadType: args.payloadType,
        noteKind: args.noteKind,
        markdownLength: args.markdownLength,
        executed: false,
        permission,
      },
    });
  }
  const execution = await args.context.hostApi.mutations.execute(args.mutation);
  const verificationHint = `Call ${ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD} on the created or updated note and payloadType=${args.payloadType}.`;
  return buildToolResult({
    tool: args.toolName,
    summary: buildSummary(
      execution.ok,
      permission,
      execution,
      verificationHint,
    ),
    structuredContent: {
      mutation: args.mutation,
      preview,
      payloadType: args.payloadType,
      noteKind: args.noteKind,
      markdownLength: args.markdownLength,
      executed: execution.ok,
      permission,
      execution,
      verificationHint,
    },
  });
}

async function createMarkdownNoteTool(
  args: Record<string, unknown>,
  context: ToolContext,
) {
  const title = requireNonEmptyString(args.title, "title");
  const markdown = requireNonEmptyString(args.markdown, "markdown");
  const noteKind = normalizeMarkdownNoteKind(args.noteKind);
  const rendered = buildMarkdownBackedNoteContent({
    title,
    markdown,
    noteKind,
    noteEntry: String(args.noteEntry || "").trim() || undefined,
  });
  return executePreparedMarkdownMutationTool({
    toolName: ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
    mutation: {
      operation: "note.createChild",
      parent: args.parent || args.target || resolveItemRef(args),
      content: rendered.content,
    },
    context,
    payloadType: rendered.payloadType,
    noteKind: rendered.noteKind,
    markdownLength: markdown.length,
  });
}

async function updateMarkdownNoteTool(
  args: Record<string, unknown>,
  context: ToolContext,
) {
  const noteRef = args.note || args.target || resolveItemRef(args);
  const markdown = requireNonEmptyString(args.markdown, "markdown");
  const existingPayloads = await context.hostApi.library.listNotePayloads(
    noteRef as ZoteroHostItemRefInput,
  );
  const expectedPayloadType = String(args.expectedPayloadType || "").trim();
  const markdownPayload = expectedPayloadType
    ? existingPayloads.find(
        (entry) => entry.payloadType === expectedPayloadType,
      )
    : existingPayloads.find((entry) => entry.payloadType.endsWith("-markdown"));
  if (!markdownPayload) {
    throw new ZoteroMcpToolInputError(
      expectedPayloadType
        ? `expected markdown payload not found: ${expectedPayloadType}`
        : "target note does not contain a markdown payload",
      { payloads: existingPayloads.map((entry) => entry.payloadType) },
    );
  }
  if (!markdownPayload.payloadType.endsWith("-markdown")) {
    throw new ZoteroMcpToolInputError(
      `expectedPayloadType is not markdown-backed: ${markdownPayload.payloadType}`,
    );
  }
  const noteKind = normalizeMarkdownNoteKind(
    args.noteKind || markdownPayload.noteKind,
  );
  const title = String(args.title || "").trim() || "Markdown Note";
  const rendered = buildMarkdownBackedNoteContent({
    title,
    markdown,
    noteKind,
    noteEntry: String(args.noteEntry || "").trim() || undefined,
  });
  if (expectedPayloadType && rendered.payloadType !== expectedPayloadType) {
    throw new ZoteroMcpToolInputError(
      `expectedPayloadType ${expectedPayloadType} does not match rendered payload ${rendered.payloadType}`,
    );
  }
  return executePreparedMarkdownMutationTool({
    toolName: ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
    mutation: {
      operation: "note.update",
      note: noteRef as ZoteroHostItemRefInput,
      content: rendered.content,
    },
    context,
    payloadType: rendered.payloadType,
    noteKind: rendered.noteKind,
    markdownLength: markdown.length,
  });
}

async function preparePaperReadingContextTool(
  args: Record<string, unknown>,
  context: ToolContext,
) {
  const resolution = resolveReadingContextRef(args, context);
  const includeNotes = args.includeNotes !== false;
  const includeAttachments = args.includeAttachments !== false;
  const includePayloads = args.includePayloads !== false;
  const maxNotes = parseBoundedPositiveInteger(args.maxNotes, 8, 20);
  const maxPayloadsPerNote = parseBoundedPositiveInteger(
    args.maxPayloadsPerNote,
    5,
    20,
  );
  const item = await context.hostApi.library.getItemDetail(resolution.ref);
  const notes = includeNotes
    ? await context.hostApi.library.getItemNotes(resolution.ref, {
        limit: maxNotes,
        maxExcerptChars: 280,
      })
    : [];
  const notePayloads = includePayloads
    ? (
        await Promise.all(
          notes.slice(0, maxNotes).map(async (note) => {
            if (!note.key && note.id === undefined) {
              return { note, payloads: [] };
            }
            try {
              const payloads = await context.hostApi.library.listNotePayloads(
                firstItemRefArgs(note) || note,
              );
              return {
                note,
                payloads: payloads
                  .slice(0, maxPayloadsPerNote)
                  .map(summarizePayloadForReading),
              };
            } catch (error) {
              return {
                note,
                payloads: [
                  summarizePayloadForReading({
                    payloadType: "unavailable",
                    noteKind: "",
                    version: "",
                    encoding: "",
                    estimatedSize: 0,
                    format: "text",
                    errors: [
                      error instanceof Error ? error.message : String(error),
                    ],
                  }),
                ],
              };
            }
          }),
        )
      ).filter((entry) => entry.payloads.length > 0)
    : [];
  const attachments = includeAttachments
    ? enrichAttachmentsForReading(
        await context.hostApi.library.getItemAttachments(resolution.ref),
      )
    : [];
  const recommendedAttachment = attachments.find(
    (attachment) => attachment.recommendedForReading,
  );
  const limitations = [
    "Attachment file content is not returned by this tool.",
    recommendedAttachment?.access.path
      ? "The agent may read access.path only when its backend has same-host filesystem access."
      : "No recommended local attachment path is available.",
    "Reader annotations and Zotero reader state are outside this MCP tool.",
  ];
  const summary = buildPaperReadingContextSummary({
    ref: resolution.ref,
    source: resolution.source,
    item,
    notes,
    notePayloads,
    attachments,
    recommendedAttachment,
    limitations,
  });
  return buildToolResult({
    tool: ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
    summary,
    structuredContent: {
      ref: resolution.ref,
      source: resolution.source,
      item,
      notes,
      notePayloads,
      attachments,
      recommendedAttachment,
      nextCalls: [
        item
          ? {
              tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
              args: firstItemRefArgs(item),
            }
          : undefined,
        item
          ? {
              tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
              args: firstItemRefArgs(item),
            }
          : undefined,
        notes[0]
          ? {
              tool: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
              args: firstItemRefArgs(notes[0]),
            }
          : undefined,
      ].filter(Boolean),
      limitations,
    },
  });
}

const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    title: "Get current Zotero view",
    description:
      "Return the active Zotero target, library id, selection state, and current item metadata.",
    inputSchema: objectSchema(),
    handler: (_args, context) => {
      const hostContext = resolveCurrentViewContext(context);
      const summary = summarizeCurrentView(hostContext);
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
        summary,
        structuredContent: {
          hostContext,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
    title: "Get selected Zotero items",
    description:
      "Return JSON-safe summaries for the currently selected Zotero items.",
    inputSchema: objectSchema(),
    handler: (_args, context) => {
      const items = context.hostApi.context.getSelectedItems();
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
        summary: buildSelectedItemsSummary(items),
        structuredContent: {
          items,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_SEARCH_ITEMS,
    title: "Search Zotero items",
    description:
      "Search regular Zotero library items by bounded text query. Required: query. Optional: limit <= 50, libraryId.",
    inputSchema: objectSchema(
      {
        query: {
          type: "string",
          minLength: 1,
          maxLength: 500,
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: MCP_LIBRARY_LIST_LIMIT_MAX,
        },
        libraryId: {
          type: ["number", "string"],
        },
      },
      ["query"],
    ),
    handler: async (args, context) => {
      const query = String(args.query || "").trim();
      if (!query) {
        throw new ZoteroMcpToolInputError("query is required");
      }
      const items = await context.hostApi.library.searchItems({
        query,
        limit: args.limit === undefined ? undefined : Number(args.limit),
        libraryId: args.libraryId as string | number | undefined,
      });
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_SEARCH_ITEMS,
        summary: buildSearchItemsSummary(query, items),
        structuredContent: {
          query,
          items,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    title: "List Zotero library items",
    description:
      "Preferred bounded index tool for collecting parent item keys from a library or collection. Returns compact paged summaries/index entries only; use get_item_detail for full metadata. Optional filters: libraryId, collection/ref, collectionId, collectionKey, tag, itemType, query, limit <= 50, cursor.",
    inputSchema: objectSchema({
      libraryId: {
        type: ["number", "string"],
      },
      collection: {
        description: "Collection reference object/string/id.",
      },
      collectionId: {
        type: ["number", "string"],
      },
      collectionKey: {
        type: "string",
      },
      collectionLibraryId: {
        type: ["number", "string"],
      },
      tag: {
        type: "string",
      },
      itemType: {
        type: "string",
      },
      query: {
        type: "string",
      },
      limit: {
        type: ["number", "string"],
        minimum: 1,
      },
      cursor: {
        type: ["number", "string"],
      },
    }),
    handler: async (args, context) => {
      const result = await context.hostApi.library.listItems(
        buildLibraryListArgs(args),
      );
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
        summary: buildLibraryItemsSummary(result),
        structuredContent: compactLibraryListResult(result),
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
    title: "Get Zotero item detail",
    description:
      'Return detailed JSON-safe metadata for one Zotero item. Prefer arguments {"key":"ITEMKEY","libraryId":1} or {"id":123}.',
    inputSchema: objectSchema(itemRefProperties),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const item = await context.hostApi.library.getItemDetail(ref);
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
        summary: buildItemDetailSummary(ref, item),
        structuredContent: {
          ref,
          item,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
    title: "Get Zotero item notes",
    description:
      'Return bounded child note summaries/excerpts for one Zotero item. This does not return full note HTML; use get_note_detail on the zotero MCP service serially for a specific note body. Prefer {"key":"ITEMKEY","libraryId":1}. Optional: limit, cursor, maxExcerptChars.',
    inputSchema: objectSchema({
      ...itemRefProperties,
      limit: {
        type: ["number", "string"],
      },
      cursor: {
        type: ["number", "string"],
      },
      maxExcerptChars: {
        type: ["number", "string"],
        minimum: 1,
        maximum: 16000,
      },
    }),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const notes = await context.hostApi.library.getItemNotes(ref, {
        limit: args.limit as number | string | undefined,
        cursor: args.cursor as number | string | undefined,
        maxExcerptChars: args.maxExcerptChars as number | string | undefined,
      });
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
        summary: buildItemNotesSummary(ref, notes),
        structuredContent: {
          ref,
          notes,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
    title: "Get Zotero note detail chunk",
    description:
      'Read one Zotero note body in bounded chunks. Prefer note ref {"key":"NOTEKEY","libraryId":1}. Defaults to text format; use offset/nextOffset and maxChars <= 16000 serially for large notes. Do not request chunks concurrently.',
    inputSchema: objectSchema({
      ...itemRefProperties,
      format: {
        type: "string",
        enum: ["text", "html"],
      },
      offset: {
        type: ["number", "string"],
        minimum: 0,
      },
      maxChars: {
        type: ["number", "string"],
        minimum: 1,
        maximum: 16000,
      },
    }),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const note = await context.hostApi.library.getNoteDetail(
        ref,
        buildNoteDetailArgs(args),
      );
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
        summary: buildNoteDetailSummary(note),
        structuredContent: {
          ref,
          note,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
    title: "List Zotero note payloads",
    description:
      "List workflow note payloads from embedded attachments and legacy payload blocks. Use this before get_note_payload when a note may contain markdown or workflow JSON payloads.",
    inputSchema: objectSchema(itemRefProperties),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const payloads = await context.hostApi.library.listNotePayloads(ref);
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
        summary: buildNotePayloadsSummary(ref, payloads),
        structuredContent: {
          ref,
          payloads,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
    title: "Get Zotero note payload",
    description:
      "Decode one workflow payload from a Zotero note. Markdown payloads return canonical markdown; JSON payloads return decoded JSON plus bounded text chunks.",
    inputSchema: objectSchema({
      ...itemRefProperties,
      payloadType: {
        type: "string",
      },
      offset: {
        type: ["number", "string"],
        minimum: 0,
      },
      maxChars: {
        type: ["number", "string"],
        minimum: 1,
        maximum: 16000,
      },
    }),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const payload = await context.hostApi.library.getNotePayload(
        ref,
        buildNotePayloadArgs(args),
      );
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
        summary: buildNotePayloadDetailSummary(ref, payload),
        structuredContent: {
          ref,
          payload,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
    title: "Get Zotero item attachments",
    description:
      "Return child attachments and remote-compatible access metadata without file contents. Local files are returned as access manifests, not file bytes.",
    inputSchema: objectSchema(itemRefProperties),
    handler: async (args, context) => {
      const ref = resolveItemRef(args);
      const attachments = enrichAttachmentsForReading(
        await context.hostApi.library.getItemAttachments(ref),
      );
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
        summary: buildAttachmentsSummary(ref, attachments),
        structuredContent: {
          ref,
          attachments,
        },
      });
    },
  },
  {
    name: ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
    title: "Prepare Zotero paper reading context",
    description:
      "Aggregate one paper's metadata, note summaries, note payload manifests, attachment manifests, and a recommended reading attachment. This tool does not return attachment file contents.",
    inputSchema: objectSchema({
      ...itemRefProperties,
      includeNotes: {
        type: "boolean",
      },
      includeAttachments: {
        type: "boolean",
      },
      includePayloads: {
        type: "boolean",
      },
      maxNotes: {
        type: ["number", "string"],
        minimum: 1,
        maximum: 50,
      },
      maxPayloadsPerNote: {
        type: ["number", "string"],
        minimum: 1,
        maximum: 20,
      },
    }),
    handler: (args, context) => preparePaperReadingContextTool(args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_GET_MCP_STATUS,
    title: "Get Zotero MCP server status",
    description:
      "Return safe diagnostics for the embedded Zotero MCP server, including queue state, guard state, circuit breakers, and recent request summaries. This diagnostic tool does not enter the Zotero host call queue.",
    inputSchema: objectSchema(),
    handler: (_args, context) => {
      const status = context.options.resolveMcpStatus?.() || {};
      return buildToolResult({
        tool: ZOTERO_MCP_TOOL_GET_MCP_STATUS,
        summary: buildMcpStatusSummary(status),
        structuredContent: {
          status,
        },
      });
    },
  },
  synthesisTool({
    name: ZOTERO_MCP_TOOL_TOPICS_LIST,
    title: "List Synthesis topics",
    description:
      "Return a small semantic inventory of existing Synthesis topics for create-mode duplicate checks. This tool does not return resolvers, paper sets, artifacts, or freshness data.",
    method: "listTopics",
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_TOPICS_FIND_BY_PAPER_REF,
    title: "Find Synthesis topics by paper reference",
    description:
      "Return active Synthesis topics associated with one or more paper_ref values from artifact dependency state. This tool does not scan report text or rebuild topic state.",
    method: "findTopicsByPaperRef",
    properties: {
      paper_ref: { type: "string" },
      paperRef: { type: "string" },
      paper_refs: { type: "array", maxItems: 250 },
      paperRefs: { type: "array", maxItems: 250 },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_TOPICS_GET_CONTEXT,
    title: "Get Synthesis topic context",
    description:
      "Return Synthesis topic context. Use view=digest for compact preview, semantic for full semantic content, audit for hashes/freshness/diagnostics, or full for all views. Large view results may be written with outputPath.",
    method: "getTopicContext",
    properties: {
      topicId: { type: "string" },
      view: {
        type: "string",
        enum: ["digest", "semantic", "audit", "full"],
      },
      mode: { type: "string", enum: ["create", "update"] },
      language: { type: "string" },
      updateScope: { type: "string" },
      updateMode: { type: "string" },
      updateReason: { type: "string" },
      includeFull: { type: "boolean" },
      includeMarkdown: { type: "boolean" },
      includeArtifact: { type: "boolean" },
      includeManifest: { type: "boolean" },
      outputPath: { type: "string" },
      output_path: { type: "string" },
      overwrite: { type: "boolean" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_SCHEMAS_GET,
    title: "Get Synthesis schemas",
    description:
      "Return Synthesis Topic Definition, Resolver, Artifact, MCP, or workflow result schemas.",
    method: "getSchemas",
    properties: {
      kind: { type: "string" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CONCEPTS_QUERY,
    title: "Query Synthesis Concept KB",
    description:
      "Return bounded read-only exact, alias, and ambiguous Concept KB matches for topic synthesis KG enrichment. This tool never mutates review state.",
    method: "queryConceptKb",
    properties: {
      concept_candidate_labels: { type: "array", maxItems: 100 },
      conceptCandidateLabels: { type: "array", maxItems: 100 },
      labels: { type: "array", maxItems: 100 },
      label: { type: "string" },
      query: { type: "string" },
      limit: { type: ["number", "string"], minimum: 1, maximum: 100 },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_QUERY_CLUSTER,
    title: "Query Synthesis citation graph cluster",
    description:
      "Return bounded read-only topic-scoped citation graph cluster counts and diagnostics for synthesis statistics. This tool never rebuilds or refreshes graph state.",
    method: "queryCitationGraphCluster",
    properties: {
      source_paper_refs: { type: "array", maxItems: 250 },
      sourcePaperRefs: { type: "array", maxItems: 250 },
      paper_refs: { type: "array", maxItems: 250 },
      paperRefs: { type: "array", maxItems: 250 },
      paper_ref: { type: "string" },
      paperRef: { type: "string" },
      max_external_nodes: {
        type: ["number", "string"],
        minimum: 0,
        maximum: 250,
      },
      maxExternalNodes: {
        type: ["number", "string"],
        minimum: 0,
        maximum: 250,
      },
      cluster_policy: {
        type: "string",
        enum: ["source_only", "include_external", "bounded_external"],
      },
      clusterPolicy: {
        type: "string",
        enum: ["source_only", "include_external", "bounded_external"],
      },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
    title: "Get Synthesis library index",
    description:
      "Return one deterministic page of the global lightweight library index for topic resolver generation. Iterate cursor until has_more=false; index_hash must stay stable across pages.",
    method: "getLibraryIndex",
    properties: {
      libraryId: { type: ["number", "string"] },
      cursor: { type: ["number", "string"] },
      limit: { type: ["number", "string"], minimum: 1, maximum: 250 },
      includeTags: { type: "boolean" },
      includeCollections: { type: "boolean" },
      includeItems: { type: "boolean" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
    title: "Resolve Synthesis resolver",
    description:
      "Validate and execute a simplified Topic Resolver payload. Pass tag, collection_key, and/or paper_refs directly; combine defaults to union and may be intersection.",
    method: "resolveResolver",
    properties: {
      tag: {
        anyOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
          { type: "object" },
        ],
      },
      collection_key: {
        anyOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
      },
      paper_refs: { type: "array", items: { type: "string" } },
      combine: { type: "string", enum: ["union", "intersection"] },
      cursor: { type: ["number", "string"] },
      limit: { type: ["number", "string"], minimum: 1, maximum: 250 },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_REFERENCE_INDEX_GET,
    title: "Get Synthesis reference index",
    description:
      "Return bounded read-only reference index rows with artifact coverage, binding diagnostics, and recommended maintenance commands.",
    method: "getReferenceSidecarIndex",
    properties: {
      sourceRefs: { type: "array", maxItems: 250 },
      includeReferences: { type: "boolean" },
      referenceSourceRefs: { type: "array", maxItems: 250 },
      rawReferenceIds: { type: "array", maxItems: 250 },
      cursor: { type: ["number", "string"] },
      limit: { type: ["number", "string"], minimum: 1, maximum: 250 },
      artifactCoverage: { type: "string" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_GET_MANIFEST,
    title: "Get Synthesis paper artifact manifest",
    description:
      "Return host-computed availability for digest, references, and citation-analysis artifacts for topic synthesis papers. Missing artifacts are reported as status rows, not errors.",
    method: "getPaperArtifactManifest",
    properties: {
      paper_refs: { type: "array" },
      paperRefs: { type: "array" },
      paper_ref: { type: "string" },
      paperRef: { type: "string" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
    title: "Export filtered Synthesis paper artifacts",
    description:
      "Read one or more papers' digest, references, and citation-analysis artifacts through the host decoder and write a filtered manifest plus bounded content files into the ACP skill run workspace.",
    method: "exportFilteredPaperArtifacts",
    properties: {
      run_root: { type: "string" },
      runRoot: { type: "string" },
      paper_refs: { type: "array" },
      paperRefs: { type: "array" },
      paper_ref: { type: "string" },
      paperRef: { type: "string" },
      artifact_types: { type: "array" },
      artifactTypes: { type: "array" },
    },
    required: ["run_root"],
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_SLICE,
    title: "Get Synthesis citation graph slice",
    description:
      "Read a bounded slice from the persisted Synthesis citation graph snapshot with freshness diagnostics. This tool never rebuilds the graph, recomputes layouts, or returns the full graph.",
    method: "getCitationGraphSlice",
    properties: {
      startNodeId: { type: "string" },
      paperRef: { type: "string" },
      depth: { type: ["number", "string"] },
      maxNodes: { type: ["number", "string"] },
      maxEdges: { type: ["number", "string"] },
      direction: { type: "string", enum: ["incoming", "outgoing", "both"] },
      includeLowSignal: { type: "boolean" },
      roleFilter: { type: "array" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_LAYOUT,
    title: "Get Synthesis citation graph layout",
    description:
      'Read persisted citation graph layout coordinates for an explicit full graph or bounded subgraph query. This tool never rebuilds the graph or recomputes layout; use scope:"full" for full graph layout.',
    method: "getCitationGraphLayout",
    properties: {
      scope: { type: "string", enum: ["full"] },
      preset: { type: "string", enum: ["force", "radial", "components"] },
      algorithm: { type: "string", enum: ["force", "radial", "components"] },
      viewKey: { type: "string" },
      view_key: { type: "string" },
      startNodeId: { type: "string" },
      start_node_id: { type: "string" },
      paperRef: { type: "string" },
      paper_ref: { type: "string" },
      nodeIds: { type: "array" },
      node_ids: { type: "array" },
      paperRefs: { type: "array" },
      paper_refs: { type: "array" },
      depth: { type: ["number", "string"] },
      maxNodes: { type: ["number", "string"] },
      max_nodes: { type: ["number", "string"] },
      maxEdges: { type: ["number", "string"] },
      max_edges: { type: ["number", "string"] },
      direction: { type: "string", enum: ["incoming", "outgoing", "both"] },
      includeLowSignal: { type: "boolean" },
      roleFilter: { type: "array" },
      allowTruncated: { type: "boolean" },
      allow_truncated: { type: "boolean" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_GET_METRICS,
    title: "Get Synthesis citation graph metrics",
    description:
      "Read bounded library-paper graph metrics and recommended maintenance commands from the persisted Synthesis citation graph metrics snapshot. This tool never rebuilds the graph or returns the full graph.",
    method: "getCitationGraphMetrics",
    properties: {
      paperRefs: { type: "array", maxItems: 250 },
      paper_refs: { type: "array", maxItems: 250 },
      limit: { type: ["number", "string"], minimum: 1, maximum: 100 },
      sortBy: {
        type: "string",
        enum: ["foundation", "frontier", "pagerank", "in_degree"],
      },
      sort_by: {
        type: "string",
        enum: ["foundation", "frontier", "pagerank", "in_degree"],
      },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_RANK_EXTERNAL_REFERENCES,
    title: "Rank external citation graph references",
    description:
      "Return ranked external references from the persisted citation graph without rebuilding or refreshing graph state.",
    method: "rankExternalReferences",
    properties: {
      limit: { type: ["number", "string"], minimum: 1, maximum: 100 },
      sortBy: {
        type: "string",
        enum: ["external_degree", "shared_source_count", "year"],
      },
      sort_by: {
        type: "string",
        enum: ["external_degree", "shared_source_count", "year"],
      },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_CITATION_GRAPH_RANK_LIBRARY_PAPERS,
    title: "Rank library citation graph papers",
    description:
      "Return ranked library papers from persisted citation graph metrics without rebuilding or refreshing graph state.",
    method: "rankLibraryPapers",
    properties: {
      paperRefs: { type: "array", maxItems: 250 },
      paper_refs: { type: "array", maxItems: 250 },
      limit: { type: ["number", "string"], minimum: 1, maximum: 100 },
      sortBy: {
        type: "string",
        enum: ["foundation", "frontier", "pagerank", "in_degree"],
      },
      sort_by: {
        type: "string",
        enum: ["foundation", "frontier", "pagerank", "in_degree"],
      },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_INSIGHTS_GET_ATTENTION_QUEUE,
    title: "Get Host Bridge insight attention queue",
    description:
      "Return read-only attention items for graph metrics, reference index, and selected paper artifact readiness.",
    method: "getAttentionQueue",
    properties: {
      paperRefs: { type: "array", maxItems: 250 },
      paper_refs: { type: "array", maxItems: 250 },
      sourceRefs: { type: "array", maxItems: 250 },
      source_refs: { type: "array", maxItems: 250 },
      limit: { type: ["number", "string"], minimum: 1, maximum: 100 },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_RESOLVE_TOPIC_DIGEST,
    title: "Resolve topic paper digest",
    description:
      "Resolve the original digest-markdown payload for a structured topic paper evidence digest_ref and report source hash freshness.",
    method: "resolveTopicPaperDigest",
    properties: {
      topicId: { type: "string" },
      paperEvidenceId: { type: "string" },
      paper_ref: { type: "string" },
      paperRef: { type: "string" },
      digest_ref: { type: "object" },
      digestRef: { type: "object" },
      include_representative_image: { type: "boolean" },
      includeRepresentativeImage: { type: "boolean" },
    },
  }),
  synthesisTool({
    name: ZOTERO_MCP_TOOL_TOPICS_GET_REVIEW_INPUT,
    title: "Get Synthesis review workflow input",
    description:
      "Return a read-only topic synthesis input package for downstream literature review workflows.",
    method: "getReviewInput",
    properties: {
      topicId: { type: "string" },
      maxGraphNodes: { type: ["number", "string"], minimum: 1, maximum: 1000 },
      maxGraphEdges: { type: ["number", "string"], minimum: 0, maximum: 2000 },
      includePaperArtifacts: { type: "boolean" },
      maxChars: { type: ["number", "string"], minimum: 1, maximum: 200000 },
    },
    required: ["topicId"],
  }),
  {
    name: ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
    title: "Preview Zotero mutation",
    description:
      'Validate and summarize a supported Zotero write request without writing. Use request.operation such as "item.addTags", not a free-form type field.',
    inputSchema: objectSchema({
      request: {
        type: "object",
      },
    }),
    handler: (args, context) =>
      previewMutationTool(ZOTERO_MCP_TOOL_PREVIEW_MUTATION, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_UPDATE_ITEM_FIELDS,
    title: "Update Zotero item fields",
    description:
      'Permission-gated update of allowed fields on one Zotero item. Required: item ref plus fields object, e.g. {"key":"ITEMKEY","libraryId":1,"fields":{"title":"New title"}}.',
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        fields: {
          type: "object",
        },
      },
      ["fields"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_UPDATE_ITEM_FIELDS, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
    title: "Add Zotero item tags",
    description:
      "Permission-gated tag addition for one or more Zotero items. Required: tags plus either items array or a single item ref.",
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        items: {
          type: "array",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      ["tags"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_ADD_ITEM_TAGS, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_REMOVE_ITEM_TAGS,
    title: "Remove Zotero item tags",
    description:
      "Permission-gated tag removal for one or more Zotero items. Required: tags plus either items array or a single item ref.",
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        items: {
          type: "array",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      ["tags"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_REMOVE_ITEM_TAGS, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_CREATE_CHILD_NOTE,
    title: "Create Zotero child note",
    description:
      "Permission-gated creation of a child note under one Zotero item. Required: parent item ref and non-empty content.",
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        parent: {
          description: "Parent item reference.",
        },
        content: {
          type: "string",
        },
      },
      ["content"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_CREATE_CHILD_NOTE, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_UPDATE_NOTE,
    title: "Update Zotero note",
    description:
      "Permission-gated update of a Zotero note body. Required: note ref or item ref identifying a note, plus non-empty content.",
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        note: {
          description: "Note item reference.",
        },
        content: {
          type: "string",
        },
      },
      ["content"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_UPDATE_NOTE, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
    title: "Create Zotero markdown-backed note",
    description:
      'Permission-gated creation of a child note with rendered HTML plus a base64 markdown payload. Required: parent item ref, title, markdown. Optional noteKind: "custom" or "conversation-note".',
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        parent: {
          description: "Parent item reference.",
        },
        title: {
          type: "string",
        },
        markdown: {
          type: "string",
        },
        noteKind: {
          type: "string",
          enum: ["custom", "conversation-note"],
        },
        noteEntry: {
          type: "string",
        },
      },
      ["title", "markdown"],
    ),
    handler: createMarkdownNoteTool,
  },
  {
    name: ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
    title: "Update Zotero markdown-backed note",
    description:
      "Permission-gated update of an existing markdown-backed Zotero note. Required: note ref and markdown. Optional expectedPayloadType prevents accidental workflow payload mismatch.",
    inputSchema: objectSchema(
      {
        ...itemRefProperties,
        note: {
          description: "Note item reference.",
        },
        title: {
          type: "string",
        },
        markdown: {
          type: "string",
        },
        noteKind: {
          type: "string",
          enum: ["custom", "conversation-note"],
        },
        expectedPayloadType: {
          type: "string",
        },
        noteEntry: {
          type: "string",
        },
      },
      ["markdown"],
    ),
    handler: updateMarkdownNoteTool,
  },
  {
    name: ZOTERO_MCP_TOOL_INGEST_PAPER,
    title: "Ingest one literature paper",
    description:
      "Permission-gated single-paper ingest for literature search workflows. Creates or reuses one Zotero item from DOI/arXiv/PMID/ISBN or metadata, and attaches a public PDF URL on a best-effort basis.",
    inputSchema: objectSchema(
      {
        paper: {
          type: "object",
        },
        collection: {
          description: "Optional target collection reference.",
        },
      },
      ["paper"],
    ),
    handler: (args, context) =>
      executeMutationTool(ZOTERO_MCP_TOOL_INGEST_PAPER, args, context),
  },
  {
    name: ZOTERO_MCP_TOOL_ADD_ITEMS_TO_COLLECTION,
    title: "Add Zotero items to collection",
    description:
      'Permission-gated collection membership addition. Required: items array and collection ref, e.g. {"items":[{"key":"ITEMKEY","libraryId":1}],"collection":{"key":"COLLKEY","libraryId":1}}.',
    inputSchema: objectSchema(
      {
        items: {
          type: "array",
        },
        collection: {
          description: "Collection reference.",
        },
        collectionId: {
          type: ["number", "string"],
        },
        collectionKey: {
          type: "string",
        },
      },
      ["items"],
    ),
    handler: (args, context) =>
      executeMutationTool(
        ZOTERO_MCP_TOOL_ADD_ITEMS_TO_COLLECTION,
        args,
        context,
      ),
  },
  {
    name: ZOTERO_MCP_TOOL_REMOVE_ITEMS_FROM_COLLECTION,
    title: "Remove Zotero items from collection",
    description:
      "Permission-gated collection membership removal. Required: items array and collection ref.",
    inputSchema: objectSchema(
      {
        items: {
          type: "array",
        },
        collection: {
          description: "Collection reference.",
        },
        collectionId: {
          type: ["number", "string"],
        },
        collectionKey: {
          type: "string",
        },
      },
      ["items"],
    ),
    handler: (args, context) =>
      executeMutationTool(
        ZOTERO_MCP_TOOL_REMOVE_ITEMS_FROM_COLLECTION,
        args,
        context,
      ),
  },
];

const ZOTERO_MCP_QUEUE_NOTICE =
  " Zotero host calls are serialized by the embedded server; do not call Zotero MCP tools concurrently. MCP tools mirror Host Bridge capability names and return { capability, approval, data }. For library scans use library.list_items, and for large notes use library.get_note_detail chunks. After write tools, verify state before retrying. If you receive zotero_mcp_queue_full, zotero_mcp_queue_timeout, zotero_mcp_tool_timeout, or zotero_mcp_tool_circuit_open, wait and retry later or call diagnostic.get_status.";

function openObjectSchema(
  properties: Record<string, unknown> = {},
  required: string[] = [],
): JsonObjectSchema {
  const schema: JsonObjectSchema = {
    type: "object",
    properties,
    additionalProperties: true,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

function mcpInputSchemaForCapability(
  input: HostBridgeCapabilityDefinition["input"],
): JsonObjectSchema {
  switch (input.type) {
    case "none":
      return objectSchema();
    case "item-ref":
      return openObjectSchema({
        ref: {
          description:
            'Item reference. Prefer {"key":"ABCD1234","libraryId":1} or {"id":123}.',
        },
        id: {
          type: ["number", "string"],
          description: "Zotero item or note id.",
        },
        key: {
          type: "string",
          description: "Zotero item or note key.",
        },
        libraryId: {
          type: ["number", "string"],
          description: "Zotero library id for key-based refs.",
        },
      });
    case "mutation-preview":
      return openObjectSchema({
        operation: {
          type: "string",
          description: "Canonical Host Bridge mutation operation.",
        },
      });
    case "object":
    default:
      return openObjectSchema(
        isPlainObject(input.properties) ? input.properties : {},
        Array.isArray(input.requiredProperties)
          ? input.requiredProperties.map(String)
          : [],
      );
  }
}

function listHostBridgeMcpToolDefinitions(): ToolDefinition[] {
  return listHostBridgeCapabilities().map((capability) => ({
    name: capability.name,
    title: capability.name,
    description: capability.summary,
    inputSchema: mcpInputSchemaForCapability(capability.input),
    handler: async (args, context) =>
      callHostBridgeCapabilityAsMcpTool(capability.name, args, context),
  }));
}

const HOST_BRIDGE_MCP_ALLOWED_ARGS: Record<string, string[]> = {
  "schemas.get": ["kind"],
};

function summarizeHostBridgeCapabilityResult(
  capabilityName: string,
  data: unknown,
) {
  if (capabilityName === "diagnostic.get_status" && isPlainObject(data)) {
    return buildMcpStatusSummary(data);
  }
  const payload = isPlainObject(data) ? data : {};
  const parts = [`${capabilityName} Host Bridge capability result.`];
  if (capabilityName === "context.get_current_view" && isPlainObject(data)) {
    parts.push(summarizeCurrentView(data as unknown as AcpHostContext));
    if (Array.isArray(payload.selectedItems)) {
      parts.push(`selectedItems=${payload.selectedItems.length}`);
    }
  }
  if (capabilityName === "context.get_selected_items" && Array.isArray(data)) {
    parts.push(`selectedItems=${data.length}`);
    data.slice(0, 5).forEach((item) => {
      if (isPlainObject(item)) {
        parts.push(formatItemLine(item as Partial<ZoteroHostItemSummaryDto>));
      }
    });
    parts.push("next=library.get_item_detail");
  }
  for (const key of [
    "status",
    "state",
    "summary",
    "message",
    "operation",
    "nextCursor",
    "next_cursor",
    "total",
    "returned",
    "hasMore",
    "has_more",
  ]) {
    if (payload[key] !== undefined) {
      parts.push(`${key}=${compactText(payload[key])}`);
    }
  }
  if (Array.isArray(data)) {
    parts.push(`items=${data.length}`);
  }
  if (Array.isArray(payload.items)) {
    parts.push(`items=${payload.items.length}`);
    payload.items.slice(0, 5).forEach((item) => {
      if (isPlainObject(item)) {
        parts.push(formatItemLine(item as Partial<ZoteroHostItemSummaryDto>));
      }
    });
    if (capabilityName === "library.list_items") {
      parts.push("next=library.get_item_detail");
    }
  }
  if (capabilityName === "library.get_item_detail" && isPlainObject(data)) {
    parts.push(formatItemLine(data as Partial<ZoteroHostItemSummaryDto>));
    const fields = isPlainObject(payload.fields) ? payload.fields : {};
    for (const key of ["DOI", "url", "abstractNote"]) {
      if (fields[key] !== undefined) {
        parts.push(`${key}=${compactText(fields[key], 240)}`);
      }
    }
    parts.push("next=library.get_item_notes");
    parts.push("next=library.get_item_attachments");
  }
  if (capabilityName === "library.get_item_notes" && Array.isArray(data)) {
    parts.push(`notes=${data.length}`);
    data.slice(0, 5).forEach((note) => {
      if (isPlainObject(note)) {
        parts.push(formatNoteLine(note as Partial<ZoteroHostNoteDto>));
      }
    });
    parts.push("next=library.get_note_detail");
  }
  if (Array.isArray(payload.notes)) {
    parts.push(`notes=${payload.notes.length}`);
    payload.notes.slice(0, 5).forEach((note) => {
      if (isPlainObject(note)) {
        parts.push(formatNoteLine(note as Partial<ZoteroHostNoteDto>));
      }
    });
    parts.push("next=library.get_note_detail");
  }
  if (capabilityName === "library.get_note_detail" && isPlainObject(data)) {
    parts.push(formatNoteLine(data as Partial<ZoteroHostNoteDto>));
    if (payload.offset !== undefined && payload.nextOffset !== undefined) {
      parts.push(`range=${payload.offset}-${payload.nextOffset}`);
    }
    if (payload.nextOffset !== undefined) {
      parts.push(`nextOffset=${compactText(payload.nextOffset)}`);
    }
    if (payload.totalChars !== undefined) {
      parts.push(`totalChars=${compactText(payload.totalChars)}`);
    }
    if (payload.hasMore !== undefined) {
      parts.push(`hasMore=${Boolean(payload.hasMore)}`);
    }
  }
  if (capabilityName === "library.list_note_payloads" && Array.isArray(data)) {
    parts.push(`payloads=${data.length}`);
    data.slice(0, 5).forEach((entry) => {
      if (isPlainObject(entry)) {
        parts.push(formatPayloadLine(entry as ZoteroHostNotePayloadSummaryDto));
      }
    });
    parts.push("next=library.get_note_payload");
  }
  if (Array.isArray(payload.payloads)) {
    parts.push(`payloads=${payload.payloads.length}`);
    payload.payloads.slice(0, 5).forEach((entry) => {
      if (isPlainObject(entry)) {
        parts.push(formatPayloadLine(entry as ZoteroHostNotePayloadSummaryDto));
      }
    });
    parts.push("next=library.get_note_payload");
  }
  if (capabilityName === "library.get_note_payload" && isPlainObject(data)) {
    parts.push(formatPayloadLine(data as ZoteroHostNotePayloadSummaryDto));
    if (payload.nextOffset !== undefined) {
      parts.push(`nextOffset=${compactText(payload.nextOffset)}`);
    }
    if (payload.totalChars !== undefined) {
      parts.push(`totalChars=${compactText(payload.totalChars)}`);
    }
    if (payload.hasMore !== undefined) {
      parts.push(`hasMore=${Boolean(payload.hasMore)}`);
    }
  }
  if (
    Array.isArray(data) &&
    capabilityName === "library.get_item_attachments"
  ) {
    parts.push(`attachments=${data.length}`);
    data.slice(0, 5).forEach((attachment) => {
      if (isPlainObject(attachment)) {
        parts.push(formatAttachmentLine(attachment as ZoteroHostAttachmentDto));
      }
    });
  }
  if (Array.isArray(payload.rows)) {
    parts.push(`rows=${payload.rows.length}`);
  }
  if (Array.isArray(payload.tasks)) {
    parts.push(`tasks=${payload.tasks.length}`);
  }
  if (isPlainObject(payload.result)) {
    if (payload.result.summary) {
      parts.push(`result.summary=${compactText(payload.result.summary)}`);
    }
    if (Array.isArray(payload.result.items)) {
      parts.push(`result.items=${payload.result.items.length}`);
    }
    if (isPlainObject(payload.result.ingest)) {
      parts.push(`ingest.status=${compactText(payload.result.ingest.status)}`);
      parts.push(
        `ingest.attachmentStatus=${compactText(
          payload.result.ingest.attachmentStatus,
        )}`,
      );
    }
  }
  return parts.join(" ");
}

async function requestCapabilityApprovalForMcp(args: {
  capability: HostBridgeCapabilityDefinition;
  input: Record<string, unknown>;
  context: ToolContext;
}): Promise<HostBridgeApprovalRequirement | "denied" | "unavailable"> {
  if (args.capability.approval === "none") {
    return "none";
  }
  if (!args.context.options.requestToolPermission) {
    return "unavailable";
  }
  const previewCapability = getHostBridgeCapability("mutation.preview");
  const preview =
    args.capability.name === "mutation.execute" && previewCapability
      ? ((await previewCapability.handler(args.input, {
          getStatus:
            args.context.options.resolveHostBridgeStatus ||
            (() =>
              (args.context.options.resolveMcpStatus?.() ||
                {}) as HostBridgeStatusSnapshot),
          connectionMode: "local",
          resolveHostBridgeApis: () =>
            resolveHostBridgeApis(args.context.options, args.context.hostApi),
          resolveSynthesisService: args.context.options.resolveSynthesisService,
        })) as ZoteroHostMutationPreviewResponse)
      : ({
          ok: true,
          operation: args.capability.name,
          summary: args.capability.summary,
          targetRefs: [],
        } as unknown as ZoteroHostMutationPreviewResponse);
  if (preview && preview.ok === false) {
    const previewError = preview as {
      summary?: unknown;
      error?: { message?: unknown };
    };
    throw new ZoteroMcpToolInputError(
      String(
        previewError.summary ||
          previewError.error?.message ||
          "Host Bridge mutation preview failed",
      ),
      preview,
    );
  }
  const decision = normalizePermissionDecision(
    await args.context.options.requestToolPermission({
      toolName: args.capability.name,
      mutation: args.input as ZoteroHostMutationRequest,
      preview,
      summary: preview.summary || args.capability.summary,
      requestedAt: new Date().toISOString(),
    }),
  );
  return decision.outcome === "approved"
    ? args.capability.approval
    : decision.outcome;
}

async function callHostBridgeCapabilityAsMcpTool(
  capabilityName: string,
  input: Record<string, unknown>,
  context: ToolContext,
) {
  const capability = getHostBridgeCapability(capabilityName);
  if (!capability) {
    throw new ZoteroMcpToolInputError(
      `Host Bridge capability not found: ${capabilityName}`,
      { capability: capabilityName },
    );
  }
  const approval = await requestCapabilityApprovalForMcp({
    capability,
    input,
    context,
  });
  if (approval === "denied" || approval === "unavailable") {
    return buildToolResult({
      tool: capability.name,
      summary:
        approval === "unavailable"
          ? "Zotero-side approval is unavailable for this MCP capability."
          : "Zotero-side approval was denied for this MCP capability.",
      isError: true,
      structuredContent: {
        capability: capability.name,
        approval,
        data: null,
      },
    });
  }
  const allowedArgs = HOST_BRIDGE_MCP_ALLOWED_ARGS[capability.name];
  if (allowedArgs) {
    assertKnownArgs(capability.name, input, allowedArgs);
  }
  const data = await capability.handler(input, {
    getStatus:
      context.options.resolveHostBridgeStatus ||
      (() =>
        (context.options.resolveMcpStatus?.() ||
          {}) as HostBridgeStatusSnapshot),
    connectionMode: "local",
    resolveHostBridgeApis: () =>
      resolveHostBridgeApis(context.options, context.hostApi),
    resolveSynthesisService: context.options.resolveSynthesisService,
  });
  return buildToolResult({
    tool: capability.name,
    summary: summarizeHostBridgeCapabilityResult(capability.name, data),
    structuredContent: {
      capability: capability.name,
      approval,
      data,
      result: data,
    },
  });
}

export function listZoteroMcpTools() {
  return listHostBridgeMcpToolDefinitions().map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: `${tool.description}${ZOTERO_MCP_QUEUE_NOTICE}`,
    inputSchema: tool.inputSchema,
  }));
}

export async function handleZoteroMcpJsonRpc(
  payload: unknown,
  options: ZoteroMcpHandlerOptions = {},
): Promise<ZoteroMcpJsonRpcResult> {
  if (Array.isArray(payload)) {
    const responses: ZoteroMcpJsonRpcResponse[] = [];
    for (const entry of payload) {
      const response = await handleZoteroMcpJsonRpc(entry, options);
      if (Array.isArray(response)) {
        responses.push(...response);
      } else if (response) {
        responses.push(response);
      }
    }
    return responses.length > 0 ? responses : null;
  }
  const request = normalizeRequest(payload);
  if (!request) {
    return jsonRpcError(null, -32600, "Invalid JSON-RPC request");
  }
  if ("id" in request && !validateJsonRpcId(request.id)) {
    return jsonRpcError(null, -32600, "Invalid JSON-RPC id");
  }
  switch (request.method) {
    case "notifications/initialized":
      return null;
    case "initialize":
      if (isNotification(request)) {
        return null;
      }
      return {
        jsonrpc: "2.0",
        id: request.id ?? null,
        result: {
          protocolVersion: resolveProtocolVersion(request.params),
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "zotero-skills",
            title: "Zotero Agents Context Broker",
            version: "0.4.0",
          },
        },
      };
    case "tools/list":
      if (isNotification(request)) {
        return null;
      }
      return {
        jsonrpc: "2.0",
        id: request.id ?? null,
        result: {
          tools: listZoteroMcpTools(),
        },
      };
    case "tools/call": {
      if (isNotification(request)) {
        return null;
      }
      const toolName = resolveToolName(request.params);
      const tool = listHostBridgeMcpToolDefinitions().find(
        (entry) => entry.name === toolName,
      );
      if (!tool) {
        return jsonRpcError(
          request.id ?? null,
          -32602,
          "Unknown Zotero MCP tool",
          {
            toolName,
          },
        );
      }
      const toolArguments = resolveToolArguments(request.params);
      try {
        validateToolArguments(tool, toolArguments);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error || "Invalid params");
        return jsonRpcError(request.id ?? null, -32602, message, {
          toolName,
          errorName: error instanceof Error ? error.name : "Error",
          details:
            error instanceof ZoteroMcpToolInputError
              ? error.details
              : undefined,
        });
      }
      try {
        const hostApi = resolveHostApi(options);
        const result = await tool.handler(toolArguments, {
          options,
          hostApi,
        });
        await options.onToolCall?.({
          toolName,
          arguments: toolArguments,
          result: result.structuredContent,
        });
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          result,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error || "Tool failed");
        const isItemNotFound = error instanceof ZoteroItemNotFoundError;
        const isNoteNotFound = error instanceof ZoteroNoteNotFoundError;
        const isCollectionNotFound =
          error instanceof ZoteroCollectionNotFoundError;
        const structuredCode = isItemNotFound
          ? "zotero_item_not_found"
          : isNoteNotFound
            ? "zotero_note_not_found"
            : isCollectionNotFound
              ? "zotero_collection_not_found"
              : undefined;
        await options.onToolCall?.({
          toolName,
          arguments: toolArguments,
          error: {
            name: error instanceof Error ? error.name : "Error",
            message,
          },
        });
        if (structuredCode) {
          return {
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: buildToolErrorResult({
              tool: toolName,
              message,
              errorCode: structuredCode,
              retryable: false,
              details:
                error instanceof Error && "ref" in error
                  ? (error as { ref?: unknown }).ref
                  : undefined,
            }),
          };
        }
        return jsonRpcError(request.id ?? null, -32602, message, {
          toolName,
          errorName: error instanceof Error ? error.name : "Error",
          details:
            error instanceof ZoteroMcpToolInputError
              ? error.details
              : undefined,
        });
      }
    }
    default:
      return jsonRpcError(request.id ?? null, -32601, "Method not found", {
        method: request.method,
      });
  }
}
