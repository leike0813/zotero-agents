import {
  executeHostBridgeCapability,
  getHostBridgeCapability,
  listHostBridgeCapabilities,
} from "./hostBridgeCapabilityRegistry";
import type { SynthesisClient } from "../../packages/synthesis-contracts/src/index";
import type { DirectResearchBundleApplication } from "./researchBundleService";
import { validateHostBridgeCapabilityInput } from "./hostBridgeCapabilityContract";
import { HostBridgeCursorError } from "./hostBridgePagination";
import {
  resolveZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import { ZoteroLibraryCursorError } from "./zoteroLibraryPageQuery";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeCapabilityManifestEntry,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import type {
  ZoteroHostAttachmentDto,
  ZoteroHostCollectionRefInput,
  ZoteroHostCurrentViewDto,
  ZoteroHostItemRefInput,
  ZoteroHostItemSummaryDto,
  ZoteroHostLibraryListArgs,
  ZoteroHostMutationPreviewResponse,
  ZoteroHostMutationRequest,
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
export const ZOTERO_MCP_TOOL_TOPICS_EXPORT_RESEARCH_BUNDLE =
  "topics.export_research_bundle";
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
export const ZOTERO_MCP_TOOL_ITEMS_EXPORT_RESEARCH_BUNDLE =
  "items.export_research_bundle";
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
  resolveZoteroHostCapabilityBroker?: () => ZoteroHostCapabilityBroker;
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
  resolveDirectResearchBundleApplication?: () =>
    | DirectResearchBundleApplication
    | Promise<DirectResearchBundleApplication>;
  resolveMcpStatus?: () => Record<string, unknown>;
  resolveHostBridgeStatus?: () => HostBridgeStatusSnapshot;
  requestToolPermission?: (
    request: ZoteroMcpToolPermissionRequest,
  ) =>
    | Promise<ZoteroMcpToolPermissionDecision>
    | ZoteroMcpToolPermissionDecision;
  onToolCall?: (event: ZoteroMcpToolCallEvent) => void | Promise<void>;
};

type JsonObjectSchema = Record<string, unknown> & {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean | Record<string, unknown>;
};

type ToolContext = {
  options: ZoteroMcpHandlerOptions;
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

const MCP_LIBRARY_LIST_LIMIT_DEFAULT = 25;
const MCP_LIBRARY_LIST_LIMIT_MAX = 50;

function resolveCapabilityBroker(options: ZoteroMcpHandlerOptions) {
  return (
    options.resolveZoteroHostCapabilityBroker?.() ||
    resolveZoteroHostCapabilityBroker()
  );
}

function summarizeCurrentView(context: ZoteroHostCurrentViewDto) {
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

const LIBRARY_CURSOR_TOOL_NAMES = new Set([
  "library.list_items",
  "library.sync_snapshot",
  "library.readiness_audit",
  ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
]);

function hasInvalidLibraryCursorType(
  toolName: string,
  args: Record<string, unknown>,
) {
  return (
    LIBRARY_CURSOR_TOOL_NAMES.has(toolName) &&
    Object.prototype.hasOwnProperty.call(args, "cursor") &&
    typeof args.cursor !== "string"
  );
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

function parseBoundedPositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(maximum, Math.floor(parsed))
    : fallback;
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
    cursor: args.cursor as string | undefined,
  };
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

const ZOTERO_MCP_QUEUE_NOTICE =
  " Zotero host calls are serialized by the embedded server; do not call Zotero MCP tools concurrently. MCP tools mirror Host Bridge capability names and return { capability, approval, data }. For library scans use library.list_items, and for large notes use library.get_note_detail chunks. After write tools, verify state before retrying. If you receive zotero_mcp_queue_full, zotero_mcp_queue_timeout, zotero_mcp_tool_timeout, or zotero_mcp_tool_circuit_open, wait and retry later or call diagnostic.get_status.";

function mcpInputSchemaForCapability(
  inputSchema: Record<string, unknown>,
): JsonObjectSchema {
  if (inputSchema.type === "object") {
    return inputSchema as JsonObjectSchema;
  }
  if (Array.isArray(inputSchema.oneOf)) {
    return {
      ...inputSchema,
      type: "object",
    } as JsonObjectSchema;
  }
  return objectSchema();
}

function listHostBridgeMcpToolDefinitions(): ToolDefinition[] {
  return listHostBridgeCapabilities()
    .filter(
      (capability) =>
        capability.name !== "workflow_products.export" &&
        capability.name !== "workflow_products.remove",
    )
    .map((capability) => ({
      name: capability.name,
      title: capability.name,
      description: capability.summary,
      inputSchema: mcpInputSchemaForCapability(capability.inputSchema),
      handler: async (args, context) =>
        callHostBridgeCapabilityAsMcpTool(capability.name, args, context),
    }));
}

const HOST_BRIDGE_MCP_ALLOWED_ARGS: Record<string, string[]> = {
  "schemas.get": ["kind"],
};

function normalizeHostBridgeMcpInput(
  capabilityName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (capabilityName === "library.list_items") {
    return buildLibraryListArgs(input) as Record<string, unknown>;
  }
  return input;
}

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
    parts.push(summarizeCurrentView(data as ZoteroHostCurrentViewDto));
    if (Array.isArray(payload.selectedItems)) {
      parts.push(`selectedItems=${payload.selectedItems.length}`);
    }
  }
  if (
    capabilityName === "context.get_selected_items" &&
    Array.isArray(payload.items)
  ) {
    parts.push(`selectedItems=${payload.items.length}`);
    payload.items.slice(0, 5).forEach((item) => {
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
  if (
    capabilityName === "library.get_item_notes" &&
    Array.isArray(payload.items)
  ) {
    parts.push(`notes=${payload.items.length}`);
    payload.items.slice(0, 5).forEach((note) => {
      if (isPlainObject(note)) {
        parts.push(formatNoteLine(note as Partial<ZoteroHostNoteDto>));
      }
    });
    parts.push("next=library.get_note_detail");
  } else if (
    Array.isArray(payload.items) &&
    capabilityName !== "context.get_selected_items"
  ) {
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
  if (Array.isArray(payload.attachments)) {
    parts.push(`attachments=${payload.attachments.length}`);
    payload.attachments.slice(0, 5).forEach((attachment) => {
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
      if ("hasPdfAttachment" in payload.result.ingest) {
        parts.push(
          `ingest.hasPdfAttachment=${compactText(
            payload.result.ingest.hasPdfAttachment,
          )}`,
        );
      }
      if (payload.result.ingest.landingAttachmentStatus) {
        parts.push(
          `ingest.landingAttachmentStatus=${compactText(
            payload.result.ingest.landingAttachmentStatus,
          )}`,
        );
      }
    }
  }
  return parts.join(" ");
}

async function requestCapabilityApprovalForMcp(args: {
  capability: HostBridgeCapabilityManifestEntry;
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
      ? ((await executeHostBridgeCapability(
          previewCapability.name,
          args.input,
          {
            getStatus:
              args.context.options.resolveHostBridgeStatus ||
              (() =>
                (args.context.options.resolveMcpStatus?.() ||
                  {}) as HostBridgeStatusSnapshot),
            connectionMode: "local",
            resolveZoteroHostCapabilityBroker: () =>
              resolveCapabilityBroker(args.context.options),
            resolveSynthesisClient: args.context.options.resolveSynthesisClient,
            resolveDirectResearchBundleApplication:
              args.context.options.resolveDirectResearchBundleApplication,
          },
        )) as ZoteroHostMutationPreviewResponse)
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
  const normalizedInput = normalizeHostBridgeMcpInput(capability.name, input);
  const violations = validateHostBridgeCapabilityInput(
    capability.name,
    normalizedInput,
  );
  if (violations.length) {
    throw new ZoteroMcpToolInputError(
      `Input for ${capability.name} does not satisfy its executable contract`,
      {
        schema: "host-bridge.argument-error.v1",
        phase: "capability_input",
        capability: capability.name,
        violations,
        truncated: false,
      },
    );
  }
  const allowedArgs = HOST_BRIDGE_MCP_ALLOWED_ARGS[capability.name];
  if (allowedArgs) {
    assertKnownArgs(capability.name, normalizedInput, allowedArgs);
  }
  const approval = await requestCapabilityApprovalForMcp({
    capability,
    input: normalizedInput,
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
  let data: unknown;
  try {
    data = await executeHostBridgeCapability(capability.name, normalizedInput, {
      getStatus:
        context.options.resolveHostBridgeStatus ||
        (() =>
          (context.options.resolveMcpStatus?.() ||
            {}) as HostBridgeStatusSnapshot),
      connectionMode: "local",
      resolveZoteroHostCapabilityBroker: () =>
        resolveCapabilityBroker(context.options),
      resolveSynthesisClient: context.options.resolveSynthesisClient,
      resolveDirectResearchBundleApplication:
        context.options.resolveDirectResearchBundleApplication,
    });
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      throw new ZoteroMcpToolInputError(error.message, {
        code: error.code,
        reason: error.reason,
        ...error.details,
      });
    }
    throw error;
  }
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
        if (hasInvalidLibraryCursorType(toolName, toolArguments)) {
          return {
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: buildToolErrorResult({
              tool: toolName,
              message: "library cursor must be an opaque string",
              errorCode: "invalid_library_cursor",
              retryable: false,
              details: { reason: "invalid_type" },
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
      try {
        const result = await tool.handler(toolArguments, {
          options,
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
        const brokerError =
          error instanceof ZoteroHostCapabilityError ? error : null;
        const isInvalidLibraryCursor =
          error instanceof ZoteroLibraryCursorError;
        const structuredCode =
          brokerError?.code === "item_not_found"
            ? "zotero_item_not_found"
            : brokerError?.code === "note_not_found"
              ? "zotero_note_not_found"
              : brokerError?.code === "collection_not_found"
                ? "zotero_collection_not_found"
                : isInvalidLibraryCursor
                  ? error.code
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
                error instanceof ZoteroLibraryCursorError
                  ? error.details
                  : brokerError?.details,
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
