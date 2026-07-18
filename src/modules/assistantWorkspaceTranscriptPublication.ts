import type { AssistantWorkspaceOwner } from "./assistantWorkspacePublication";

export const MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_MUTATIONS = 512;
export const MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_BYTES = 256 * 1024;

type AssistantWorkspaceTranscriptItemBase = {
  itemId: string;
  itemKind:
    | "message"
    | "thought"
    | "tool-call"
    | "plan"
    | "status"
    | "permission";
  createdAt: string;
  updatedAt: string | null;
};

export type AssistantWorkspaceTranscriptItem =
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "message";
      role: "assistant" | "user" | "system";
      text: string;
      status: "streaming" | "complete" | "error";
      revision: { count: number; status: string; repairRound: number } | null;
    })
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "thought";
      text: string;
      status: "streaming" | "complete" | "error";
    })
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "tool-call";
      toolCallId: string;
      title: string;
      toolKind: string | null;
      toolName: string | null;
      inputSummary: string | null;
      resultSummary: string | null;
      summary: string | null;
      status: "pending" | "in-progress" | "completed" | "failed";
    })
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "plan";
      entries: Array<{
        content: string;
        priority: string | null;
        status: string | null;
      }>;
    })
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "status";
      level: "info" | "warn" | "error";
      label: string;
      text: string;
    })
  | (AssistantWorkspaceTranscriptItemBase & {
      itemKind: "permission";
      permissionRequestId: string;
      title: string;
      summary: string;
      source: string | null;
      status: "pending" | "approved" | "denied" | "cancelled";
    });

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type AssistantWorkspaceTranscriptItemPatch = Partial<
  DistributiveOmit<AssistantWorkspaceTranscriptItem, "itemId" | "itemKind">
>;

export type AssistantWorkspaceTranscriptPageRequest = {
  owner: AssistantWorkspaceOwner;
  request: {
    cursor: number | null;
    limit: number;
  };
};

export function parseAssistantWorkspaceTranscriptPageRequest(
  value: unknown,
): AssistantWorkspaceTranscriptPageRequest | null {
  const source = asRecord(value);
  if (!source || !hasExactKeys(source, ["owner", "request"])) return null;
  const owner = asRecord(source.owner);
  const request = asRecord(source.request);
  if (!owner || !request || !hasExactKeys(request, ["cursor", "limit"])) {
    return null;
  }
  const ownerKey = String(owner.ownerKey || "").trim();
  let canonicalOwner: AssistantWorkspaceOwner;
  if (owner.source === "acp-chat") {
    if (
      !hasExactKeys(owner, [
        "source",
        "ownerKey",
        "backendId",
        "conversationId",
      ])
    ) {
      return null;
    }
    const backendId = String(owner.backendId || "").trim();
    const conversationId = String(owner.conversationId || "").trim();
    if (
      !backendId ||
      !conversationId ||
      ownerKey !== `${backendId}\n${conversationId}`
    ) {
      return null;
    }
    canonicalOwner = {
      source: "acp-chat",
      ownerKey,
      backendId,
      conversationId,
    };
  } else if (owner.source === "acp-skills") {
    if (!hasExactKeys(owner, ["source", "ownerKey", "requestId"])) return null;
    const requestId = String(owner.requestId || "").trim();
    if (!requestId || ownerKey !== requestId) return null;
    canonicalOwner = { source: "acp-skills", ownerKey, requestId };
  } else {
    return null;
  }
  const cursor = request.cursor;
  const normalizedCursor =
    cursor === null
      ? null
      : Number.isFinite(Number(cursor))
        ? Math.max(0, Math.floor(Number(cursor)))
        : null;
  if (cursor !== null && normalizedCursor === null) return null;
  const limit = Math.floor(Number(request.limit));
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return {
    owner: canonicalOwner,
    request: { cursor: normalizedCursor, limit },
  };
}

export type AssistantWorkspaceTranscriptPageMetadata = {
  pageKey: string;
  startCursor: number;
  limit: number;
  totalVisibleItemCount: number;
  previousCursor: number | null;
  nextCursor: number | null;
  sourceEventSeq: number;
};

export type AssistantWorkspaceTranscriptPage =
  AssistantWorkspaceTranscriptPageMetadata & {
    items: AssistantWorkspaceTranscriptItem[];
  };

export type AssistantWorkspaceTranscriptRegion = {
  owner: AssistantWorkspaceOwner | null;
  status: "idle" | "loading" | "ready" | "failed";
  error: { code: string; message: string } | null;
  page: AssistantWorkspaceTranscriptPage | null;
  transcriptRevision: number;
};

export type AssistantWorkspaceTranscriptMutation =
  | { op: "upsert_item"; item: AssistantWorkspaceTranscriptItem }
  | { op: "append_text"; itemId: string; text: string }
  | {
      op: "patch_item";
      itemId: string;
      patch: AssistantWorkspaceTranscriptItemPatch;
    }
  | { op: "delete_item"; itemId: string };

export type AssistantWorkspaceTranscriptDelta = {
  page: AssistantWorkspaceTranscriptPageMetadata;
  baseTranscriptRevision: number;
  transcriptRevision: number;
  mutations: AssistantWorkspaceTranscriptMutation[];
};

export type AssistantWorkspaceTranscriptBoundary =
  | "text-continuation"
  | "soft-side-channel"
  | "hard-boundary";

export type AssistantWorkspaceTranscriptMutationEvent = {
  boundary: AssistantWorkspaceTranscriptBoundary;
  mutation: AssistantWorkspaceTranscriptMutation;
  cardinality: "insert" | "retain" | "delete";
};

type ProjectionState = {
  held: AssistantWorkspaceTranscriptMutationEvent[];
  visibleItemIds: Set<string>;
};

export type AssistantWorkspaceTranscriptProjectionResult = {
  mutations: AssistantWorkspaceTranscriptMutation[];
  visibleItemCountDelta: number;
};

export class AssistantWorkspaceTranscriptProjection {
  private readonly states = new Map<string, ProjectionState>();

  registerSnapshot(
    owner: AssistantWorkspaceOwner,
    page: AssistantWorkspaceTranscriptPage,
  ) {
    this.states.set(ownerIdentity(owner), {
      held: [],
      visibleItemIds: new Set(page.items.map((item) => item.itemId)),
    });
  }

  record(
    owner: AssistantWorkspaceOwner,
    args: {
      boundary: AssistantWorkspaceTranscriptBoundary;
      mutation: AssistantWorkspaceTranscriptMutation;
      cardinality: "insert" | "retain" | "delete";
      visibility: "live" | "boundary" | "silent";
    },
  ) {
    return this.project(owner, args).mutations;
  }

  project(
    owner: AssistantWorkspaceOwner,
    args: {
      boundary: AssistantWorkspaceTranscriptBoundary;
      mutation: AssistantWorkspaceTranscriptMutation;
      cardinality: "insert" | "retain" | "delete";
      visibility: "live" | "boundary" | "silent";
    },
  ): AssistantWorkspaceTranscriptProjectionResult {
    const state = this.state(owner);
    const cardinality =
      args.cardinality || inferMutationCardinality(args.mutation);
    if (args.visibility === "silent") {
      return { mutations: [], visibleItemCountDelta: 0 };
    }
    if (
      args.visibility === "boundary" &&
      args.boundary === "text-continuation"
    ) {
      state.held.push({
        boundary: args.boundary,
        mutation: cloneMutation(args.mutation),
        cardinality,
      });
      return { mutations: [], visibleItemCountDelta: 0 };
    }
    if (args.boundary === "soft-side-channel") {
      const itemId = mutationItemId(args.mutation);
      if (!itemId || !state.visibleItemIds.has(itemId)) {
        return { mutations: [], visibleItemCountDelta: 0 };
      }
      return {
        mutations: [cloneMutation(args.mutation)],
        visibleItemCountDelta: 0,
      };
    }
    const released =
      args.boundary === "hard-boundary"
        ? this.releaseProjected(owner)
        : { mutations: [], visibleItemCountDelta: 0 };
    const event = {
      boundary: args.boundary,
      mutation: cloneMutation(args.mutation),
      cardinality,
    } satisfies AssistantWorkspaceTranscriptMutationEvent;
    applyVisibility(state, event);
    return {
      mutations: [...released.mutations, event.mutation],
      visibleItemCountDelta:
        released.visibleItemCountDelta + cardinalityDelta(event.cardinality),
    };
  }

  release(owner: AssistantWorkspaceOwner) {
    return this.releaseProjected(owner).mutations;
  }

  releaseProjected(
    owner: AssistantWorkspaceOwner,
  ): AssistantWorkspaceTranscriptProjectionResult {
    const state = this.state(owner);
    const released = state.held.map(cloneMutationEvent);
    state.held = [];
    for (const event of released) applyVisibility(state, event);
    return {
      mutations: released.map((event) => event.mutation),
      visibleItemCountDelta: released.reduce(
        (total, event) => total + cardinalityDelta(event.cardinality),
        0,
      ),
    };
  }

  clear(owner: AssistantWorkspaceOwner) {
    this.states.delete(ownerIdentity(owner));
  }

  private state(owner: AssistantWorkspaceOwner) {
    const key = ownerIdentity(owner);
    let state = this.states.get(key);
    if (!state) {
      state = { held: [], visibleItemIds: new Set() };
      this.states.set(key, state);
    }
    return state;
  }
}

export class AssistantWorkspaceTranscriptAccumulator {
  private mutations: AssistantWorkspaceTranscriptMutation[] = [];
  private byteLength = 0;
  private overflowed = false;

  enqueue(mutations: readonly AssistantWorkspaceTranscriptMutation[]) {
    if (this.overflowed) return false;
    for (const mutation of mutations) {
      const before = this.mutations.length;
      enqueueMerged(this.mutations, mutation);
      this.byteLength +=
        before === this.mutations.length && mutation.op === "append_text"
          ? utf8Bytes(mutation.text)
          : utf8Bytes(JSON.stringify(mutation));
      if (
        this.mutations.length > MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_MUTATIONS ||
        this.byteLength > MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_BYTES
      ) {
        this.mutations = [];
        this.byteLength = 0;
        this.overflowed = true;
        return false;
      }
    }
    return true;
  }

  get size() {
    return this.mutations.length;
  }

  get overflowedState() {
    return this.overflowed;
  }

  read() {
    return this.mutations.map(cloneMutation);
  }

  drain() {
    const result = this.read();
    this.mutations = [];
    this.byteLength = 0;
    this.overflowed = false;
    return result;
  }
}

export function transcriptPageMetadata(
  page: AssistantWorkspaceTranscriptPage,
): AssistantWorkspaceTranscriptPageMetadata {
  const { items: _items, ...metadata } = page;
  return metadata;
}

function ownerIdentity(owner: AssistantWorkspaceOwner) {
  return `${owner.source}\n${owner.ownerKey}`;
}

function mutationItemId(mutation: AssistantWorkspaceTranscriptMutation) {
  return mutation.op === "upsert_item" ? mutation.item.itemId : mutation.itemId;
}

function applyVisibility(
  state: ProjectionState,
  event: AssistantWorkspaceTranscriptMutationEvent,
) {
  const mutation = event.mutation;
  const itemId = mutationItemId(mutation);
  if (event.cardinality === "delete") state.visibleItemIds.delete(itemId);
  else if (event.cardinality === "insert" && itemId) {
    state.visibleItemIds.add(itemId);
  }
}

function cardinalityDelta(
  cardinality: AssistantWorkspaceTranscriptMutationEvent["cardinality"],
) {
  return cardinality === "insert" ? 1 : cardinality === "delete" ? -1 : 0;
}

function inferMutationCardinality(
  mutation: AssistantWorkspaceTranscriptMutation,
): AssistantWorkspaceTranscriptMutationEvent["cardinality"] {
  return mutation.op === "upsert_item"
    ? "insert"
    : mutation.op === "delete_item"
      ? "delete"
      : "retain";
}

function cloneMutationEvent(
  event: AssistantWorkspaceTranscriptMutationEvent,
): AssistantWorkspaceTranscriptMutationEvent {
  return {
    boundary: event.boundary,
    mutation: cloneMutation(event.mutation),
    cardinality: event.cardinality,
  };
}

function enqueueMerged(
  target: AssistantWorkspaceTranscriptMutation[],
  mutation: AssistantWorkspaceTranscriptMutation,
) {
  const previous = target.at(-1);
  if (
    previous?.op === "append_text" &&
    mutation.op === "append_text" &&
    previous.itemId === mutation.itemId
  ) {
    previous.text += mutation.text;
    return;
  }
  target.push(cloneMutation(mutation));
}

function cloneMutation(
  mutation: AssistantWorkspaceTranscriptMutation,
): AssistantWorkspaceTranscriptMutation {
  if (mutation.op === "upsert_item") {
    return { op: mutation.op, item: cloneJsonValue(mutation.item) };
  }
  if (mutation.op === "patch_item") {
    return {
      op: mutation.op,
      itemId: mutation.itemId,
      patch: cloneJsonValue(mutation.patch),
    };
  }
  return { ...mutation };
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeAssistantWorkspaceTranscriptItem(
  source: Record<string, unknown>,
): AssistantWorkspaceTranscriptItem {
  const itemId = String(source.id || source.itemId || "").trim();
  const itemKind = String(source.kind || source.itemKind || "").trim();
  const createdAt = String(source.createdAt || "");
  const updatedAt = source.updatedAt ? String(source.updatedAt) : null;
  if (!itemId) throw new Error("assistant-workspace-transcript-item-id");
  if (itemKind === "message") {
    const revisionSource = asRecord(source.revision);
    return {
      itemId,
      itemKind,
      createdAt,
      updatedAt,
      role:
        source.role === "user" || source.role === "system"
          ? source.role
          : "assistant",
      text: String(source.text || ""),
      status:
        source.state === "streaming" || source.state === "error"
          ? source.state
          : "complete",
      revision: revisionSource
        ? {
            count: Math.max(0, Number(revisionSource.count) || 0),
            status: String(
              revisionSource.status || revisionSource.latestStatus || "",
            ),
            repairRound: Math.max(
              0,
              Number(
                revisionSource.repairRound || revisionSource.latestRepairRound,
              ) || 0,
            ),
          }
        : null,
    };
  }
  if (itemKind === "thought") {
    return {
      itemId,
      itemKind,
      createdAt,
      updatedAt,
      text: String(source.text || ""),
      status:
        source.state === "streaming" || source.state === "error"
          ? source.state
          : "complete",
    };
  }
  if (itemKind === "tool_call" || itemKind === "tool-call") {
    return {
      itemId,
      itemKind: "tool-call",
      createdAt,
      updatedAt,
      toolCallId: String(source.toolCallId || itemId),
      title: String(source.title || ""),
      toolKind: source.toolKind ? String(source.toolKind) : null,
      toolName: source.toolName ? String(source.toolName) : null,
      inputSummary: source.inputSummary ? String(source.inputSummary) : null,
      resultSummary: source.resultSummary ? String(source.resultSummary) : null,
      summary: source.summary ? String(source.summary) : null,
      status:
        source.state === "in_progress" || source.status === "in-progress"
          ? "in-progress"
          : source.state === "completed" || source.status === "completed"
            ? "completed"
            : source.state === "failed" || source.status === "failed"
              ? "failed"
              : "pending",
    };
  }
  if (itemKind === "plan") {
    return {
      itemId,
      itemKind,
      createdAt,
      updatedAt,
      entries: (Array.isArray(source.entries) ? source.entries : []).map(
        (entry) => {
          const value = asRecord(entry) || {};
          return {
            content: String(value.content || ""),
            priority: value.priority ? String(value.priority) : null,
            status: value.status ? String(value.status) : null,
          };
        },
      ),
    };
  }
  if (itemKind === "status") {
    return {
      itemId,
      itemKind,
      createdAt,
      updatedAt,
      level:
        source.level === "warn" || source.level === "error"
          ? source.level
          : "info",
      label: String(source.label || ""),
      text: String(source.text || ""),
    };
  }
  if (itemKind === "permission") {
    const status = String(source.status || "pending");
    return {
      itemId,
      itemKind,
      createdAt,
      updatedAt,
      permissionRequestId: String(source.permissionRequestId || itemId),
      title: String(source.title || ""),
      summary: String(source.summary || ""),
      source: source.source ? String(source.source) : null,
      status:
        status === "approved" || status === "denied" || status === "cancelled"
          ? status
          : "pending",
    };
  }
  throw new Error(`assistant-workspace-transcript-item-kind:${itemKind}`);
}

export function createAssistantWorkspaceTranscriptMutation(args: {
  op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
  itemId: string;
  beforeItem?: Record<string, unknown>;
  afterItem?: Record<string, unknown>;
  text?: string;
}): AssistantWorkspaceTranscriptMutation | null {
  const itemId = String(args.itemId || "").trim();
  if (!itemId) return null;
  if (args.op === "append_text") {
    const text = String(args.text || "");
    return text ? { op: "append_text", itemId, text } : null;
  }
  if (args.op === "delete_item") return { op: "delete_item", itemId };
  if (!args.afterItem) return null;
  const after = normalizeAssistantWorkspaceTranscriptItem(args.afterItem);
  if (!args.beforeItem) {
    return { op: "upsert_item", item: after };
  }
  const before = normalizeAssistantWorkspaceTranscriptItem(args.beforeItem);
  if (before.itemId !== after.itemId || before.itemKind !== after.itemKind) {
    return { op: "upsert_item", item: after };
  }
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after)) {
    if (key === "itemId" || key === "itemKind") continue;
    if (!jsonValuesEqual(before[key as keyof typeof before], value)) {
      patch[key] = cloneJsonValue(value);
    }
  }
  if (Object.keys(patch).length === 0) return null;
  return {
    op: "patch_item",
    itemId,
    patch: patch as AssistantWorkspaceTranscriptItemPatch,
  };
}

function jsonValuesEqual(left: unknown, right: unknown) {
  if (left === right) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createAssistantWorkspaceTranscriptPage(args: {
  owner: AssistantWorkspaceOwner;
  anchor: "tail" | "cursor";
  cursor: number;
  limit: number;
  totalVisibleItemCount: number;
  previousCursor?: number | null;
  nextCursor?: number | null;
  sourceEventSeq: number;
  items: Array<Record<string, unknown>>;
}): AssistantWorkspaceTranscriptPage {
  const limit = Math.max(1, Math.floor(Number(args.limit) || 80));
  const startCursor = Math.max(0, Math.floor(Number(args.cursor) || 0));
  return {
    pageKey:
      args.anchor === "tail"
        ? `${args.owner.ownerKey}\ntail:${limit}`
        : `${args.owner.ownerKey}\ncursor:${startCursor}:${limit}`,
    startCursor,
    limit,
    totalVisibleItemCount: Math.max(
      0,
      Math.floor(Number(args.totalVisibleItemCount) || 0),
    ),
    previousCursor:
      args.previousCursor === undefined ? null : args.previousCursor,
    nextCursor: args.nextCursor === undefined ? null : args.nextCursor,
    sourceEventSeq: Math.max(0, Math.floor(Number(args.sourceEventSeq) || 0)),
    items: args.items.map(normalizeAssistantWorkspaceTranscriptItem),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
