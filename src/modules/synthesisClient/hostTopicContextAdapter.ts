import {
  SynthesisClientError,
  rebuildSynthesisTopicContextRequest,
  rebuildSynthesisTopicContextResult,
  type SynthesisHostTopicContextResult,
  type SynthesisJsonObject,
  type SynthesisPlannedTopicInventoryRow,
  type SynthesisTopicContextFlatResult,
  type SynthesisTopicContextInventoryResult,
  type SynthesisTopicContextOutputResult,
  type SynthesisTopicContextRequest,
  type SynthesisTopicContextResult,
  type SynthesisTopicContextView,
  type SynthesisTopicInventoryRow,
  type SynthesisTopicListRequest,
  type SynthesisTopicListResult,
  type SynthesisTopicPlanningMetadata,
} from "../../../packages/synthesis-contracts/src/index";
import type {
  SynthesisHostExportDeliveryPort,
  SynthesisTopicArtifact,
  SynthesisTopicManifest,
  SynthesisTopicMetadata,
  SynthesisTopicProjection,
} from "../../../packages/synthesis-contracts/src/index";
import { sha256 } from "../synthesis/foundation";
import {
  runtimePathExists,
  writeRuntimeTextFileStrict,
} from "../runtimePersistence";
import { getBaseName } from "../../utils/path";
import { createSynthesisHostExportDeliveryPort } from "../synthesis/exportDeliveryAdapter";

const INVENTORY_PAGE_SIZE = 250;
const INVENTORY_PAGE_LIMIT = 100;

export type NativeTopicContextPort = {
  listTopics?: (
    request: SynthesisTopicListRequest,
  ) => Promise<SynthesisTopicListResult>;
  getTopicContext?: (
    request: { topicId: string; view: SynthesisTopicContextView },
    delivery?: { mode: "local" | "remote" },
  ) => Promise<SynthesisTopicContextResult>;
  readTopicDetail?: (request: { topicId: string }) => Promise<{
    status: "ready" | "unavailable";
    artifact?: SynthesisTopicArtifact;
    manifest?: SynthesisTopicManifest;
  }>;
  getTopicReport?: (request: {
    topicId: string;
  }) => Promise<{ markdown?: string }>;
  getTopicPlanningContext?: () => Promise<SynthesisJsonObject>;
};

type InventorySource = {
  listPage(
    request: SynthesisTopicListRequest,
  ): Promise<SynthesisTopicListResult>;
  planningContext(): Promise<SynthesisJsonObject>;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function stringRecord(value: unknown) {
  return Object.fromEntries(
    Object.entries(object(value)).flatMap(([key, entry]) => {
      const normalized = text(entry);
      return normalized ? [[key, normalized]] : [];
    }),
  );
}

function plannedRow(value: unknown): SynthesisPlannedTopicInventoryRow | null {
  const node = object(value);
  const topicId = text(node.topic_id);
  if (
    !topicId ||
    node.node_type !== "placeholder" ||
    node.definition_status === "deleted"
  ) {
    return null;
  }
  const planning = object(node.planning) as SynthesisTopicPlanningMetadata;
  if (planning.lifecycle !== "planned" && planning.lifecycle !== "stale") {
    return null;
  }
  const lifecycle = planning.lifecycle;
  return {
    topic_id: topicId,
    title: text(node.title) || topicId,
    definition: text(node.definition),
    aliases: strings(node.aliases),
    updated_at: text(node.updated_at),
    lifecycle,
    planning,
    ...(text(node.status) ? { status: text(node.status) } : {}),
  };
}

function pageOffset(cursor: string) {
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Topic inventory cursor is invalid",
    );
  }
  return value;
}

function pageLimit(limit: number) {
  return Math.max(1, Math.min(250, Math.floor(limit) || 25));
}

export async function loadPublicTopicInventory(
  source: InventorySource,
  request?: { cursor?: string; limit?: number },
): Promise<SynthesisTopicContextInventoryResult> {
  const materialized: SynthesisTopicInventoryRow[] = [];
  let cursor = "";
  for (let page = 0; page < INVENTORY_PAGE_LIMIT; page += 1) {
    const result = await source.listPage({
      cursor,
      limit: INVENTORY_PAGE_SIZE,
    });
    materialized.push(...result.topics);
    if (!result.has_more) {
      break;
    }
    if (!result.next_cursor || result.next_cursor === cursor) {
      throw new Error("Topic inventory cursor did not advance");
    }
    if (page === INVENTORY_PAGE_LIMIT - 1) {
      throw new Error("Topic inventory page limit exceeded");
    }
    cursor = result.next_cursor;
  }

  const byId = new Map<string, SynthesisTopicInventoryRow>();
  for (const row of materialized) {
    byId.set(text(row.topic_id), row);
  }
  const planningSnapshot = await source.planningContext();
  const planningNodes = Array.isArray(planningSnapshot.topics)
    ? planningSnapshot.topics
    : Array.isArray(object(planningSnapshot.topic_graph).nodes)
      ? (object(planningSnapshot.topic_graph).nodes as unknown[])
      : undefined;
  if (!planningNodes)
    throw new Error("Topic planning inventory is unavailable");
  for (const node of planningNodes) {
    const row = plannedRow(node);
    if (row && !byId.has(row.topic_id)) {
      byId.set(row.topic_id, row);
    }
  }

  const rows = [...byId.values()].sort((left, right) =>
    left.topic_id.localeCompare(right.topic_id),
  );
  const offset = pageOffset(request?.cursor || "");
  const limit = request
    ? pageLimit(request.limit || 25)
    : Math.max(1, rows.length);
  const topics = rows.slice(offset, offset + limit);
  const next = offset + topics.length;
  return {
    topics,
    cursor: request?.cursor || "",
    next_cursor: next < rows.length ? String(next) : "",
    has_more: next < rows.length,
    returned: topics.length,
    total: rows.length,
    limit,
    diagnostics: {
      count: topics.length,
      total_count: rows.length,
      source: "rust-topic-application",
    },
  };
}

function canonicalText(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function entryPath(pathRaw: string, fallback: string) {
  const raw = pathRaw.replace(/\\/g, "/").replace(/\/+/g, "/");
  const candidate =
    raw.startsWith("/") || /^[A-Za-z]:\//.test(raw) ? getBaseName(raw) : raw;
  const parts: string[] = [];
  for (const part of candidate.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/") || fallback;
}

function outputName(topicId: string, view: SynthesisTopicContextView) {
  const safe = `topic-context-${topicId}`.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `${safe}-${view}.zip`;
}

async function deliverOutput(args: {
  topicId: string;
  view: SynthesisTopicContextView;
  outputPath: string;
  overwrite: boolean;
  payload: unknown;
  delivery?: { mode: "local" | "remote" };
  publishArchive: SynthesisHostExportDeliveryPort["publishArchive"];
}): Promise<SynthesisHostTopicContextResult> {
  const serialized = canonicalText(args.payload);
  const bytes = new TextEncoder().encode(serialized).byteLength;
  const digest = sha256(serialized);
  if (args.delivery?.mode === "remote") {
    const path = entryPath(
      args.outputPath,
      `runtime/payloads/topic-context.${args.view}.json`,
    );
    const delivery = await args.publishArchive({
      capability: "topics.get_context",
      displayName: outputName(args.topicId, args.view),
      entries: [{ path, text: serialized }],
    });
    if (delivery.status !== "available") {
      throw new Error("Topic context export delivery is unavailable");
    }
    return {
      schema_id: "synthesis.topic_context.output",
      schema_version: "2.0.0",
      topic_id: args.topicId,
      view: args.view,
      output: { mode: "bridge-download", path, bytes, sha256: digest },
      delivery: delivery.delivery,
      omitted_inline_result: true,
    };
  }
  if (!args.overwrite && (await runtimePathExists(args.outputPath))) {
    return {
      ok: false,
      status: "output_exists",
      topic_id: args.topicId,
      view: args.view,
      output: { mode: "file", path: args.outputPath },
      diagnostics: ["output_path_exists"],
    };
  }
  await writeRuntimeTextFileStrict(args.outputPath, serialized);
  const output: SynthesisTopicContextOutputResult = {
    schema_id: "synthesis.topic_context.output",
    schema_version: "2.0.0",
    topic_id: args.topicId,
    view: args.view,
    output: { mode: "file", path: args.outputPath, bytes, sha256: digest },
    omitted_inline_result: true,
  };
  return output;
}

function requestEcho(request: SynthesisTopicContextRequest) {
  return {
    mode: request.mode || "read",
    ...(request.language ? { language: request.language } : {}),
    ...(request.updateScope ? { updateScope: request.updateScope } : {}),
    ...(request.updateMode ? { updateMode: request.updateMode } : {}),
    ...(request.updateReason ? { updateReason: request.updateReason } : {}),
  };
}

function flatResult(args: {
  topicId: string;
  request: SynthesisTopicContextRequest;
  native: SynthesisTopicContextResult;
  detail?: Awaited<
    ReturnType<NonNullable<NativeTopicContextPort["readTopicDetail"]>>
  >;
  report?: Awaited<
    ReturnType<NonNullable<NativeTopicContextPort["getTopicReport"]>>
  >;
}): SynthesisTopicContextFlatResult {
  const digest = object(args.native.digest);
  const semantic = object(args.native.semantic);
  const audit = object(args.native.audit);
  const merged = { ...digest, ...semantic, ...audit };
  const planned =
    semantic.lifecycle === "planned" || semantic.lifecycle === "stale";
  const includeFull = args.request.includeFull === true;
  const markdown = includeFull || args.request.includeMarkdown === true;
  const artifact = includeFull || args.request.includeArtifact === true;
  const manifest =
    includeFull || artifact || args.request.includeManifest === true;
  const response: SynthesisTopicContextFlatResult = {
    topic_id: text(merged.topic_id) || args.topicId,
    ...(planned
      ? {
          lifecycle: semantic.lifecycle as "planned" | "stale",
          planning: semantic.planning as SynthesisTopicPlanningMetadata,
          digest: args.native.digest,
          audit: args.native.audit,
        }
      : {}),
    request: requestEcho(args.request),
    diagnostics: {
      bounded: true,
      omitted: [
        !(markdown && !planned && args.report?.markdown) ? "markdown" : "",
        !(artifact && !planned && args.detail?.artifact) ? "artifact" : "",
        !(manifest && !planned && args.detail?.manifest) ? "manifest" : "",
      ].filter(Boolean),
    },
  };
  const language = text(merged.language);
  if (language) response.language = language;
  if (merged.paths) response.paths = stringRecord(merged.paths);
  if (merged.current_metadata) {
    response.current_metadata =
      merged.current_metadata as SynthesisTopicMetadata;
  }
  if (merged.current_hashes)
    response.current_hashes = stringRecord(merged.current_hashes);
  if (merged.section_hashes)
    response.section_hashes = stringRecord(merged.section_hashes);
  if (merged.topic_definition) {
    response.topic_definition =
      merged.topic_definition as SynthesisTopicContextFlatResult["topic_definition"];
  }
  if (merged.topic_resolver) {
    response.topic_resolver =
      merged.topic_resolver as SynthesisTopicContextFlatResult["topic_resolver"];
  }
  if (merged.resolved_paper_set) {
    response.resolved_paper_set =
      merged.resolved_paper_set as SynthesisTopicContextFlatResult["resolved_paper_set"];
  }
  if (Array.isArray(merged.prospective_topic_relation_proposals)) {
    response.prospective_topic_relation_proposals =
      merged.prospective_topic_relation_proposals as SynthesisJsonObject[];
  }
  if (merged.freshness !== undefined) {
    response.freshness = merged.freshness as SynthesisJsonObject | null;
  }
  const auditDiscovery = object(audit.discovery);
  if (Array.isArray(auditDiscovery.hints)) {
    response.discovery_hints =
      auditDiscovery.hints as SynthesisTopicContextFlatResult["discovery_hints"];
  }
  if (merged.recommended_update) {
    response.recommended_update =
      merged.recommended_update as SynthesisTopicProjection["recommendedUpdate"];
  }
  if (markdown && args.report?.markdown && !planned) {
    response.markdown = args.report.markdown;
  }
  if (artifact && args.detail?.artifact && !planned) {
    response.artifact = args.detail.artifact;
    response.current_artifact = args.detail.artifact;
  }
  if (manifest && args.detail?.manifest && !planned) {
    response.manifest = args.detail.manifest;
    response.current_manifest = args.detail.manifest;
  }
  return response;
}

export function createHostTopicContextAdapter(
  native: NativeTopicContextPort,
  options: { exportDeliveryPort?: SynthesisHostExportDeliveryPort } = {},
) {
  const publishArchive =
    options.exportDeliveryPort?.publishArchive ||
    createSynthesisHostExportDeliveryPort().publishArchive;
  return {
    async getTopicContext(
      rawRequest: SynthesisTopicContextRequest,
      delivery?: { mode: "local" | "remote" },
    ): Promise<SynthesisHostTopicContextResult> {
      const request = rebuildSynthesisTopicContextRequest(rawRequest);
      const topicId = request.topicId;
      if (!topicId) {
        const listPage = native.listTopics;
        const planningContext = native.getTopicPlanningContext;
        if (!listPage || !planningContext) {
          throw new Error("Host topic inventory is unavailable");
        }
        return loadPublicTopicInventory({ listPage, planningContext });
      }
      const view = request.view;
      const getContext = native.getTopicContext;
      if (!getContext) throw new Error("Native topic context is unavailable");
      if (view) {
        const validated = rebuildSynthesisTopicContextResult(
          await getContext({ topicId, view }),
        );
        if (validated.status) return validated;
        const result = validated.audit
          ? {
              ...validated,
              audit: { ...validated.audit, request: requestEcho(request) },
            }
          : validated;
        return request.outputPath
          ? deliverOutput({
              topicId,
              view,
              outputPath: request.outputPath,
              overwrite: request.overwrite === true,
              payload: result,
              delivery,
              publishArchive,
            })
          : result;
      }

      const result = rebuildSynthesisTopicContextResult(
        await getContext({ topicId, view: "full" }),
      );
      if (result.status) return result;
      const lifecycle = object(result.semantic).lifecycle;
      const planned = lifecycle === "planned" || lifecycle === "stale";
      const [detail, report] = planned
        ? [undefined, undefined]
        : await Promise.all([
            request.includeFull ||
            request.includeArtifact ||
            request.includeManifest
              ? native.readTopicDetail?.({ topicId })
              : undefined,
            request.includeFull || request.includeMarkdown
              ? native.getTopicReport?.({ topicId })
              : undefined,
          ]);
      return flatResult({ topicId, request, native: result, detail, report });
    },
  };
}
