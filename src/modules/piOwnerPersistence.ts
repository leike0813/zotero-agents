import {
  getRuntimePersistencePaths,
  listRuntimeChildDirectories,
  removeRuntimePath,
} from "./runtimePersistence";
import {
  deletePiConversationMetadata,
  deletePiOwnerRegistry,
  getPiConversationCleanupReceipt,
  getPiConversationMetadata,
  getPiConversationReadFacts,
  insertPiConversationMetadata,
  listPiConversations,
  listPiSkillRunRegistry,
  updatePiConversationProjection,
  upsertPiConversationCleanupReceipt,
  upsertPiOwnerRegistry,
  writePiConversationMetadata,
  type PiConversationCleanupReceipt,
  type PiConversationLifecycle,
  type PiConversationMetadata,
  type PiConversationProjection,
  type PiConversationReadFacts,
  type PiConversationTitleSource,
  type PiConversationUsage,
  type PiSkillRunRegistryEntry,
  type PiSkillRunRegistryScalars,
} from "./pluginStateStore";
import {
  appendPiTranscriptBatch,
  appendPiTranscript,
  createPiTranscript,
  inspectPiTranscript,
  piOwnerPaths,
  readPiTranscriptPage,
  readPiVisibleTranscriptPage,
  rebuildPiIndex,
  repairPiTornTail,
  validatePiEntryInput,
  withPiOwnerWrite,
  type PiInspection,
  type PiOwnerRef,
  type PiTranscriptEntry,
  type PiTranscriptInput,
} from "./piTranscriptStore";
import {
  PI_TRANSCRIPT_NON_CONTEXT_KINDS,
  type PiTranscriptBasis,
  type PiTurnPreparationPorts,
  type PiTurnTranscriptSnapshot,
  type TurnPreparationRecord,
} from "./piTurnPreparation";
import type { JsonValue } from "../workflows/types";
import { joinPath } from "../utils/path";

export {
  getPiConversationCleanupReceipt,
  getPiConversationMetadata,
  getPiConversationReadFacts,
  getPiConversationReadFacts as getPiConversationProjection,
  listPiConversations,
  listPiSkillRunRegistry,
  readPiVisibleTranscriptPage as readPiConversationPage,
};
export type {
  PiConversationCleanupReceipt,
  PiConversationLifecycle,
  PiConversationMetadata,
  PiConversationProjection,
  PiConversationReadFacts,
  PiConversationTitleSource,
  PiConversationUsage,
  PiSkillRunRegistryEntry,
  PiSkillRunRegistryScalars,
  PiTranscriptBasis,
  PiTurnTranscriptSnapshot,
};

export type PiConversationRecord = {
  kind: "conversation";
  conversationId: string;
  entryCount: number;
  lastSequence: number;
  updatedAt: string;
  projection: "ready" | "pending";
};
export type PiSkillRunRecord = {
  kind: "skill_run";
  skillRunId: string;
  entryCount: number;
  lastSequence: number;
  updatedAt: string;
  projection: "ready" | "pending";
};
export type PiOwnerRecord = PiConversationRecord | PiSkillRunRecord;

function record(
  ref: PiOwnerRef,
  inspection: PiInspection,
  projection: "ready" | "pending",
): PiOwnerRecord {
  const common = {
    entryCount: inspection.entries.length,
    lastSequence: inspection.entries.length,
    updatedAt:
      inspection.entries.at(-1)?.createdAt || inspection.header!.createdAt,
    projection,
  };
  return ref.kind === "conversation"
    ? { kind: "conversation", conversationId: ref.ownerId, ...common }
    : { kind: "skill_run", skillRunId: ref.ownerId, ...common };
}

const PI_SKILL_RUN_SCALAR_MAX = 32;

// Bounded, rebuildable Skill Run list facts folded from the canonical log. The
// status vocabulary stays owned by the Pi Skill Run owner; this only stores a
// bounded opaque scalar, never a transcript payload.
function piSkillRunScalarsFor(
  inspection: PiInspection,
): PiSkillRunRegistryScalars | undefined {
  const admission = inspection.entries.find(
    (entry) => entry.kind === "skill_run_admitted",
  )?.payload as Record<string, unknown> | undefined;
  if (!admission) return undefined;
  const counts = { user: 0, assistant: 0, tool: 0, thought: 0 };
  let status = "queued";
  let archived = false;
  const boundedStatus = (value: unknown) => {
    if (typeof value !== "string") return null;
    const next = value.trim();
    return next && next.length <= PI_SKILL_RUN_SCALAR_MAX ? next : null;
  };
  for (const entry of inspection.entries) {
    const payload = (entry.payload ?? {}) as Record<string, unknown>;
    if (entry.kind === "skill_run_status") {
      status = boundedStatus(payload.status) ?? status;
    } else if (entry.kind === "skill_run_outcome") {
      const result = payload.result as { status?: unknown } | undefined;
      status = boundedStatus(result?.status) ?? status;
    } else if (entry.kind === "skill_run_archive") {
      archived = true;
    } else if (entry.kind === "message") {
      if (payload.role === "user") counts.user += 1;
      else if (payload.role === "assistant") counts.assistant += 1;
    } else if (entry.kind === "tool_result") {
      counts.tool += 1;
    } else if (entry.kind === "thought") {
      counts.thought += 1;
    }
  }
  return {
    taskName: String(admission.taskName ?? ""),
    skillId: String(admission.skillId ?? ""),
    status,
    archived,
    counts,
  };
}

async function project(
  ref: PiOwnerRef,
  inspection: PiInspection,
  root?: string,
): Promise<"ready" | "pending"> {
  try {
    await rebuildPiIndex(ref, inspection, root);
    const updatedAt =
      inspection.entries.at(-1)?.createdAt || inspection.header!.createdAt;
    const skillRun =
      ref.kind === "skill_run" ? piSkillRunScalarsFor(inspection) : undefined;
    upsertPiOwnerRegistry({
      ownerKind: ref.kind,
      ownerId: ref.ownerId,
      entryCount: inspection.entries.length,
      lastSequence: inspection.entries.length,
      updatedAt,
      ...(skillRun ? { skillRun } : {}),
    });
    if (ref.kind === "conversation") {
      insertPiConversationMetadata({
        conversationId: ref.ownerId,
        createdAt: inspection.header!.createdAt,
      });
      updatePiConversationProjection(
        ref.ownerId,
        piConversationProjectionFor(inspection),
      );
    }
    return "ready";
  } catch {
    return "pending";
  }
}

export async function createPiOwner(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiOwnerRecord> {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await createPiTranscript(ref, root);
    return record(ref, inspection, await project(ref, inspection, root));
  });
}

export async function appendPiOwnerEntry(
  ref: PiOwnerRef,
  input: PiTranscriptInput,
  root?: string,
) {
  return withPiOwnerWrite(ref, root, async () => {
    const { entry, inspection } = await appendPiTranscript(ref, input, root);
    return {
      sequence: entry.seq,
      projection: await project(ref, inspection, root),
    };
  });
}

export function inspectPiOwner(ref: PiOwnerRef, root?: string) {
  return inspectPiTranscript(ref, root);
}
export function readPiOwnerPage(
  ref: PiOwnerRef,
  options: { cursor?: number; limit?: number } = {},
  root?: string,
) {
  return readPiTranscriptPage(ref, options, root);
}

export async function rebuildPiOwnerProjections(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiOwnerRecord> {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await inspectPiTranscript(ref, root);
    if (inspection.status !== "valid")
      throw new Error(`pi_transcript_${inspection.status}`);
    const projection = await project(ref, inspection, root);
    if (projection !== "ready") throw new Error("pi_projection_rebuild_failed");
    return record(ref, inspection, projection);
  });
}

export async function repairPiOwnerTornTail(ref: PiOwnerRef, root?: string) {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await repairPiTornTail(ref, root);
    if (inspection.status !== "valid")
      throw new Error(`pi_transcript_${inspection.status}`);
    return record(ref, inspection, await project(ref, inspection, root));
  });
}

export async function rebuildAllPiOwnerProjections(root?: string) {
  const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
  const results: Array<{
    ref: PiOwnerRef;
    record?: PiOwnerRecord;
    issue?: string;
  }> = [];
  for (const kind of ["conversation", "skill_run"] as const) {
    for (const dir of await listRuntimeChildDirectories(
      joinPath(ownersDir, kind),
    )) {
      const ownerId =
        dir
          .replace(/[\\/]+$/, "")
          .split(/[\\/]/)
          .at(-1) || "";
      const ref = { kind, ownerId };
      try {
        results.push({
          ref,
          record: await rebuildPiOwnerProjections(ref, root),
        });
      } catch (error) {
        results.push({ ref, issue: String(error) });
      }
    }
  }
  return results;
}

const CONVERSATION_TITLE_MAX = 200;
const CONVERSATION_SELECTION_MAX = 200;
const TITLE_SOURCES: readonly PiConversationTitleSource[] = [
  "default",
  "user",
  "agent",
];
const LIFECYCLE_TRANSITIONS: Record<
  PiConversationLifecycle,
  readonly PiConversationLifecycle[]
> = {
  active: ["archived"],
  archived: ["active", "deleting"],
  deleting: ["cleanup_pending"],
  cleanup_pending: ["deleting"],
};

export type PiConversationMetadataPatch = {
  title?: string;
  titleSource?: PiConversationTitleSource;
  selection?: string | null;
  lifecycle?: PiConversationLifecycle;
};
export type PiConversationMetadataExpectation = {
  generation?: number;
  titleRevision?: number;
  lifecycle?: PiConversationLifecycle;
};
export type PiConversationDeleteResult =
  | { status: "deleted"; receipt: PiConversationCleanupReceipt }
  | { status: "cleanup_pending"; conversationId: string };
export type PiConversationFrozenTurn = {
  model?: {
    selectionRef: string;
    provider: string;
    modelId: string;
    api: string;
  };
  resources?: {
    ref: string;
    kind: string;
    digest?: string;
    label?: string;
  }[];
};
export type PiConversationTurnAdmission = {
  turnId: string;
  entries: PiTranscriptInput[];
  expectedBasis: PiTranscriptBasis;
  frozen?: PiConversationFrozenTurn;
};
export type PiConversationTurnResult = {
  turnId: string;
  basis: PiTranscriptBasis;
  entries: PiTranscriptEntry[];
};
export type PiConversationCounts = {
  revision: number;
  activeLeaf: string | null;
  user: number;
  assistant: number;
  tool: number;
  other: number;
};

function requireConversationRef(ref: PiOwnerRef) {
  if (ref.kind !== "conversation")
    throw new Error("pi_conversation_owner_required");
}

function normalizeConversationTitle(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("pi_conversation_title_invalid");
  const normalized = value
    .split("")
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 0x1f || code === 0x7f ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > CONVERSATION_TITLE_MAX
    ? normalized.slice(0, CONVERSATION_TITLE_MAX)
    : normalized;
}

function normalizeConversationSelection(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > CONVERSATION_SELECTION_MAX
  )
    throw new Error("pi_conversation_selection_invalid");
  return value;
}

function isContextPiEntry(entry: PiTranscriptEntry) {
  return !PI_TRANSCRIPT_NON_CONTEXT_KINDS.has(entry.kind);
}

// The CAS token is the model-visible revision: durable non-context facts (turn
// boundaries, invocation and tool markers, conversation metadata, title usage)
// never move it, so they cannot stale an in-flight preparation.
function piVisibleRevision(inspection: PiInspection): number {
  return inspection.entries.filter(isContextPiEntry).length;
}

// The active path is the whole committed log, so trailing settle markers stay
// reachable from the leaf; preparation ignores them semantically.
function piActiveLeaf(inspection: PiInspection): string | null {
  return inspection.entries.at(-1)?.entryId ?? null;
}

function transcriptBasisOf(inspection: PiInspection): PiTranscriptBasis {
  return {
    revision: piVisibleRevision(inspection),
    activeLeaf: piActiveLeaf(inspection),
  };
}

// ADR 0003 keeps the Pi Usage shape in the canonical transcript; only these
// declared non-negative numeric scalars reach SQLite. The inputTokens and
// outputTokens spellings are the single accepted alternates at this boundary
// (title usage facts), never a second fact source.
const USAGE_DECLARED_FIELDS = [
  "input",
  "output",
  "cacheRead",
  "cacheWrite",
  "totalTokens",
  "cost",
] as const;
type PiConversationUsageField = (typeof USAGE_DECLARED_FIELDS)[number];
type PiConversationUsageFields = Partial<
  Record<PiConversationUsageField, number>
>;
const TITLE_USAGE_KEYS: Record<PiConversationUsageField, string> = {
  input: "titleInput",
  output: "titleOutput",
  cacheRead: "titleCacheRead",
  cacheWrite: "titleCacheWrite",
  totalTokens: "titleTokens",
  cost: "titleCost",
};

function readPiConversationUsageFields(
  value: unknown,
): PiConversationUsageFields | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const read = (...names: string[]): number | null => {
    for (const name of names) {
      const candidate = source[name];
      if (
        typeof candidate === "number" &&
        Number.isFinite(candidate) &&
        candidate >= 0
      )
        return candidate;
    }
    return null;
  };
  const found: Record<string, number | null> = {
    input: read("inputTokens", "input"),
    output: read("outputTokens", "output"),
    cacheRead: read("cacheRead"),
    cacheWrite: read("cacheWrite"),
    totalTokens: read("totalTokens"),
    // ADR 0003 keeps the Pi Usage shape: cost is either a plain number or the
    // SDK aggregate object with a numeric total.
    cost: readCost(source),
  };
  const fields: PiConversationUsageFields = {};
  for (const field of USAGE_DECLARED_FIELDS) {
    const candidate = found[field];
    if (candidate !== null) fields[field] = candidate;
  }
  return Object.keys(fields).length ? fields : null;
}

function readCost(source: Record<string, unknown>): number | null {
  const direct = source.cost;
  if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0)
    return direct;
  if (!direct || typeof direct !== "object" || Array.isArray(direct))
    return null;
  const total = (direct as { total?: unknown }).total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0
    ? total
    : null;
}

function toPiConversationUsage(
  fields: PiConversationUsageFields,
): PiConversationUsage {
  return {
    input: fields.input ?? 0,
    output: fields.output ?? 0,
    cacheRead: fields.cacheRead ?? 0,
    cacheWrite: fields.cacheWrite ?? 0,
    totalTokens: fields.totalTokens ?? 0,
    cost: fields.cost ?? 0,
  };
}

// Durable scalar projection for cheap restart hydration: no message bodies,
// only rebuildable counts, the latest turn status and bounded usage scalars.
function piConversationProjectionFor(
  inspection: PiInspection,
): PiConversationProjection {
  const counts = { user: 0, assistant: 0, tool: 0, thought: 0, other: 0 };
  let latestTurnId: string | null = null;
  let latestTurnStatus: string | null = null;
  let usage: PiConversationUsage | null = null;
  const usageTotals: Record<string, number> = {};
  for (const entry of inspection.entries) {
    const payload = entry.payload as Record<string, unknown> | null;
    if (entry.kind === "message") {
      const role = payload?.role;
      if (role === "user") counts.user += 1;
      else if (role === "assistant") counts.assistant += 1;
      else counts.other += 1;
    } else if (entry.kind === "thought") counts.thought += 1;
    else if (entry.kind === "tool_result") counts.tool += 1;
    else counts.other += 1;
    if (entry.kind === "turn_started") {
      if (typeof payload?.turnId === "string") {
        latestTurnId = payload.turnId;
        latestTurnStatus = "active";
      }
    } else if (entry.kind === "turn_terminal") {
      if (typeof payload?.turnId === "string") latestTurnId = payload.turnId;
      const status =
        typeof payload?.status === "string" ? payload.status : null;
      const outcome =
        typeof payload?.outcome === "string" ? payload.outcome : null;
      // An unprovable effect must survive restore as state_unknown; it must not
      // be presented as a settled failure, which would invite replay.
      latestTurnStatus =
        outcome === "unknown" ||
        outcome === "state_unknown" ||
        status === "state_unknown"
          ? "state_unknown"
          : (status ?? outcome);
    }
    const modelFields = readPiConversationUsageFields(payload?.usage);
    if (modelFields) {
      usage = toPiConversationUsage(modelFields);
      for (const field of USAGE_DECLARED_FIELDS)
        usageTotals[field] =
          (usageTotals[field] ?? 0) + (modelFields[field] ?? 0);
    }
    if (entry.kind === "title_usage") {
      // Title usage is a top-level token fact, kept distinct from model usage.
      const titleFields = readPiConversationUsageFields(payload);
      if (titleFields)
        for (const field of USAGE_DECLARED_FIELDS) {
          const key = TITLE_USAGE_KEYS[field];
          usageTotals[key] =
            (usageTotals[key] ?? 0) + (titleFields[field] ?? 0);
        }
    }
  }
  const basis = transcriptBasisOf(inspection);
  return {
    counts,
    contextRevision: basis.revision,
    activeLeaf: basis.activeLeaf,
    latestTurnId,
    latestTurnStatus,
    usage,
    usageTotals,
  };
}

function openPiConversationTurnId(entries: PiTranscriptEntry[]): string | null {
  const open = new Set<string>();
  for (const entry of entries) {
    const turnId = (entry.payload as { turnId?: unknown } | null)?.turnId;
    if (typeof turnId !== "string" || !turnId) continue;
    if (entry.kind === "turn_started") open.add(turnId);
    else if (entry.kind === "turn_terminal") open.delete(turnId);
  }
  return open.values().next().value ?? null;
}

function requireValidPiTranscript(inspection: PiInspection) {
  if (inspection.status !== "valid")
    throw new Error(`pi_transcript_${inspection.status}`);
}

function assertPiTranscriptBasis(
  inspection: PiInspection,
  expected: PiTranscriptBasis,
) {
  const basis = transcriptBasisOf(inspection);
  if (
    !expected ||
    expected.revision !== basis.revision ||
    expected.activeLeaf !== basis.activeLeaf
  )
    throw new Error("pi_conversation_basis_mismatch");
  return basis;
}

function sanitizeFrozenTurn(
  frozen: PiConversationFrozenTurn,
): PiConversationFrozenTurn {
  const result: PiConversationFrozenTurn = {};
  if (frozen.model) {
    const model = frozen.model;
    if (
      typeof model.selectionRef !== "string" ||
      !model.selectionRef ||
      typeof model.provider !== "string" ||
      !model.provider ||
      typeof model.modelId !== "string" ||
      !model.modelId ||
      typeof model.api !== "string" ||
      !model.api
    )
      throw new Error("pi_conversation_frozen_model_invalid");
    result.model = {
      selectionRef: model.selectionRef,
      provider: model.provider,
      modelId: model.modelId,
      api: model.api,
    };
  }
  if (frozen.resources) {
    if (!Array.isArray(frozen.resources))
      throw new Error("pi_conversation_frozen_resources_invalid");
    result.resources = frozen.resources.map((resource) => {
      if (
        !resource ||
        typeof resource.ref !== "string" ||
        !resource.ref ||
        typeof resource.kind !== "string" ||
        !resource.kind
      )
        throw new Error("pi_conversation_frozen_resources_invalid");
      return {
        ref: resource.ref,
        kind: resource.kind,
        ...(typeof resource.digest === "string"
          ? { digest: resource.digest }
          : {}),
        ...(typeof resource.label === "string"
          ? { label: resource.label }
          : {}),
      };
    });
  }
  return result;
}

export function updatePiConversationMetadata(
  conversationId: string,
  patch: PiConversationMetadataPatch = {},
  expected: PiConversationMetadataExpectation = {},
): PiConversationMetadata {
  const current = getPiConversationMetadata(conversationId);
  if (!current) throw new Error("pi_conversation_missing");
  if (
    (expected.generation !== undefined &&
      current.generation !== expected.generation) ||
    (expected.titleRevision !== undefined &&
      current.titleRevision !== expected.titleRevision) ||
    (expected.lifecycle !== undefined &&
      current.lifecycle !== expected.lifecycle)
  )
    throw new Error("pi_conversation_metadata_stale");
  const next = { ...current };
  if (patch.title !== undefined)
    next.title = normalizeConversationTitle(patch.title);
  if (patch.titleSource !== undefined) {
    if (!TITLE_SOURCES.includes(patch.titleSource))
      throw new Error("pi_conversation_title_source_invalid");
    next.titleSource = patch.titleSource;
  }
  if (patch.selection !== undefined)
    next.selection = normalizeConversationSelection(patch.selection);
  if (patch.lifecycle !== undefined) {
    const target = patch.lifecycle;
    if (
      target !== current.lifecycle &&
      !(LIFECYCLE_TRANSITIONS[current.lifecycle] ?? []).includes(target)
    )
      throw new Error("pi_conversation_lifecycle_invalid");
    next.lifecycle = target;
  }
  if (next.title !== current.title || next.titleSource !== current.titleSource)
    next.titleRevision = current.titleRevision + 1;
  // generation is a stable owner-incarnation token: it changes only when the
  // owner irreversibly enters deleting. Archive/restore/rename/selection keep
  // it stable so a pending title result is judged by titleRevision, not by
  // unrelated metadata churn.
  if (next.lifecycle === "deleting" && current.lifecycle !== "deleting")
    next.generation = current.generation + 1;
  next.updatedAt = new Date().toISOString();
  const updated = writePiConversationMetadata(
    conversationId,
    {
      generation: current.generation,
      titleRevision: current.titleRevision,
      lifecycle: current.lifecycle,
    },
    next,
  );
  if (!updated) throw new Error("pi_conversation_metadata_stale");
  return updated;
}

export function markPiConversationDeleting(
  conversationId: string,
  expected: PiConversationMetadataExpectation = {},
): PiConversationMetadata {
  return updatePiConversationMetadata(
    conversationId,
    { lifecycle: "deleting" },
    expected,
  );
}

export async function cleanupPiConversation(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiConversationDeleteResult> {
  requireConversationRef(ref);
  return withPiOwnerWrite(ref, root, async () => {
    const metadata = getPiConversationMetadata(ref.ownerId);
    if (!metadata) {
      const receipt = getPiConversationCleanupReceipt(ref.ownerId);
      if (receipt) return { status: "deleted" as const, receipt };
      throw new Error("pi_conversation_missing");
    }
    if (
      metadata.lifecycle !== "deleting" &&
      metadata.lifecycle !== "cleanup_pending"
    )
      throw new Error("pi_conversation_not_deleting");
    try {
      await removeRuntimePath(piOwnerPaths(ref, root).dir);
      deletePiOwnerRegistry(ref.kind, ref.ownerId);
      const receipt: PiConversationCleanupReceipt = {
        conversationId: ref.ownerId,
        generation: metadata.generation,
        cleanedAt: new Date().toISOString(),
      };
      upsertPiConversationCleanupReceipt(receipt);
      deletePiConversationMetadata(ref.ownerId);
      return { status: "deleted" as const, receipt };
    } catch {
      try {
        updatePiConversationMetadata(ref.ownerId, {
          lifecycle: "cleanup_pending",
        });
      } catch {
        // The row keeps its deleting mark; a later cleanup call retries.
      }
      return {
        status: "cleanup_pending" as const,
        conversationId: ref.ownerId,
      };
    }
  });
}

export async function createPiConversationOwner(
  options: { conversationId?: string; selection?: string | null } = {},
  root?: string,
): Promise<{ ref: PiOwnerRef; metadata: PiConversationMetadata }> {
  const conversationId =
    options.conversationId ||
    `conversation-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  const ref: PiOwnerRef = { kind: "conversation", ownerId: conversationId };
  const existing = getPiConversationMetadata(conversationId);
  if (
    existing &&
    (existing.lifecycle === "deleting" ||
      existing.lifecycle === "cleanup_pending")
  )
    throw new Error("pi_conversation_owner_unavailable");
  await createPiOwner(ref, root);
  const created = getPiConversationMetadata(conversationId);
  if (!created) throw new Error("pi_conversation_metadata_unavailable");
  if (
    created.lifecycle === "deleting" ||
    created.lifecycle === "cleanup_pending"
  )
    throw new Error("pi_conversation_owner_unavailable");
  const metadata =
    options.selection === undefined
      ? created
      : updatePiConversationMetadata(conversationId, {
          selection: options.selection,
        });
  return { ref, metadata };
}

export async function appendPiConversationFact(
  ref: PiOwnerRef,
  fact: {
    kind: string;
    payload: JsonValue;
    turnId?: string;
    entryId?: string;
  },
  root?: string,
) {
  if (typeof fact.kind !== "string" || !fact.kind)
    throw new Error("pi_fact_kind_invalid");
  return withPiOwnerWrite(ref, root, async () => {
    const metadata = getPiConversationMetadata(ref.ownerId);
    if (ref.kind === "conversation" && !metadata)
      throw new Error("pi_conversation_missing");
    if (
      metadata?.lifecycle === "deleting" ||
      metadata?.lifecycle === "cleanup_pending"
    )
      throw new Error("pi_conversation_lifecycle_frozen");
    const inspection = await inspectPiTranscript(ref, root);
    requireValidPiTranscript(inspection);
    const existing = fact.entryId
      ? inspection.entries.find((entry) => entry.entryId === fact.entryId)
      : undefined;
    const parent = existing
      ? existing.parentEntryId
      : inspection.entries.at(-1)?.entryId;
    const seq = inspection.entries.length + 1;
    const { entry, inspection: after } = await appendPiTranscript(
      ref,
      {
        entryId: fact.entryId || `fact-${seq}-${fact.kind}`,
        kind: fact.kind,
        payload: fact.payload,
        ...(fact.turnId ? { turnId: fact.turnId } : {}),
        ...(parent ? { parentEntryId: parent } : {}),
      },
      root,
    );
    await project(ref, after, root);
    return { entry, basis: transcriptBasisOf(after) };
  });
}

export async function admitPiConversationTurn(
  ref: PiOwnerRef,
  admission: PiConversationTurnAdmission,
  root?: string,
): Promise<PiConversationTurnResult> {
  requireConversationRef(ref);
  if (typeof admission.turnId !== "string" || !admission.turnId)
    throw new Error("pi_turn_id_invalid");
  if (!Array.isArray(admission.entries) || admission.entries.length === 0)
    throw new Error("pi_turn_entries_invalid");
  const prepared = admission.entries.map((input) => ({
    ...input,
    turnId: input.turnId ?? admission.turnId,
  }));
  for (const input of prepared) validatePiEntryInput(input);
  const frozen = admission.frozen
    ? sanitizeFrozenTurn(admission.frozen)
    : undefined;
  return withPiOwnerWrite(ref, root, async () => {
    const metadata = getPiConversationMetadata(ref.ownerId);
    if (!metadata) throw new Error("pi_conversation_missing");
    if (metadata.lifecycle !== "active")
      throw new Error("pi_conversation_lifecycle_frozen");
    const inspection = await inspectPiTranscript(ref, root);
    requireValidPiTranscript(inspection);
    assertPiTranscriptBasis(inspection, admission.expectedBasis);
    const openTurn = openPiConversationTurnId(inspection.entries);
    if (openTurn) throw new Error("pi_conversation_turn_open");
    // One bounded, all-or-nothing append: the user input precedes the
    // turn_started boundary, and nothing lands before the whole batch is
    // validated.
    const batch: PiTranscriptInput[] = [
      ...prepared,
      {
        entryId: `turn-started-${admission.turnId}-${
          inspection.entries.length + 1
        }`,
        kind: "turn_started",
        payload: {
          schemaVersion: 1,
          turnId: admission.turnId,
          ...(frozen ? frozen : {}),
        },
        turnId: admission.turnId,
      },
    ];
    const { entries, inspection: after } = await appendPiTranscriptBatch(
      ref,
      batch,
      root,
    );
    await project(ref, after, root);
    try {
      const fresh = getPiConversationMetadata(ref.ownerId);
      if (fresh)
        writePiConversationMetadata(
          ref.ownerId,
          { generation: fresh.generation },
          { ...fresh, updatedAt: new Date().toISOString() },
        );
    } catch {
      // Activity refresh is best-effort; the transcript is already durable.
    }
    return {
      turnId: admission.turnId,
      basis: transcriptBasisOf(after),
      entries,
    };
  });
}

export async function readPiConversationTranscriptSnapshot(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiTurnTranscriptSnapshot> {
  const inspection = await inspectPiTranscript(ref, root);
  requireValidPiTranscript(inspection);
  const metadata = getPiConversationMetadata(ref.ownerId);
  return {
    generation: String(metadata?.generation ?? 1),
    ...transcriptBasisOf(inspection),
    entries: [...inspection.entries],
  };
}

export async function summarizePiConversationTranscript(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiConversationCounts> {
  requireConversationRef(ref);
  const inspection = await inspectPiTranscript(ref, root);
  requireValidPiTranscript(inspection);
  const counts = { user: 0, assistant: 0, tool: 0, other: 0 };
  for (const item of inspection.entries) {
    const payload = item.payload as Record<string, unknown> | null;
    if (item.kind === "message" && payload && payload.role === "user")
      counts.user += 1;
    else if (item.kind === "message" && payload && payload.role === "assistant")
      counts.assistant += 1;
    else if (item.kind === "tool_result") counts.tool += 1;
    else counts.other += 1;
  }
  return {
    ...transcriptBasisOf(inspection),
    ...counts,
  };
}

export async function recordPiConversationPreparation(
  ref: PiOwnerRef,
  record: TurnPreparationRecord,
  expected: PiTranscriptBasis,
  root?: string,
): Promise<PiTranscriptBasis> {
  return createPiConversationPreparationAdapter(ref, root).record(
    record,
    expected,
  );
}

export function createPiConversationPreparationAdapter(
  ref: PiOwnerRef,
  root?: string,
): Pick<PiTurnPreparationPorts, "record" | "commitCompaction"> {
  return {
    async record(record: TurnPreparationRecord, expected: PiTranscriptBasis) {
      return withPiOwnerWrite(ref, root, async () => {
        const metadata = getPiConversationMetadata(ref.ownerId);
        if (ref.kind === "conversation" && !metadata)
          throw new Error("pi_conversation_missing");
        // Q188: archive may not cancel a pending auxiliary title result, so a
        // title-preparation record is the only one accepted on an archived
        // owner; every other preparation still requires an active owner.
        const titlePreparation =
          (record as { purpose?: unknown }).purpose === "title";
        if (
          ref.kind === "conversation" &&
          metadata?.lifecycle !== "active" &&
          !(titlePreparation && metadata?.lifecycle === "archived")
        )
          throw new Error("pi_conversation_lifecycle_frozen");
        const inspection = await inspectPiTranscript(ref, root);
        requireValidPiTranscript(inspection);
        if (piVisibleRevision(inspection) !== expected.revision)
          throw new Error("pi_conversation_basis_mismatch");
        const parent = inspection.entries.at(-1)?.entryId;
        const result = await appendPiTranscript(
          ref,
          {
            entryId: `turn-preparation-${inspection.entries.length + 1}-${
              record.kind
            }`,
            kind: "turn_preparation",
            payload: record as unknown as JsonValue,
            ...(parent ? { parentEntryId: parent } : {}),
          },
          root,
        );
        await project(ref, result.inspection, root);
        // A preparation record is durable but not model-visible, so the CAS
        // basis the caller holds is unchanged.
        return { revision: expected.revision, activeLeaf: expected.activeLeaf };
      });
    },
    async commitCompaction({ owner, turnId, expectedRevision, summary }) {
      if (owner.kind !== ref.kind || owner.ownerId !== ref.ownerId)
        throw new Error("pi_conversation_owner_mismatch");
      return withPiOwnerWrite(ref, root, async () => {
        const metadata = getPiConversationMetadata(ref.ownerId);
        const inspection = await inspectPiTranscript(ref, root);
        const basis =
          inspection.status === "valid" ? transcriptBasisOf(inspection) : null;
        if (
          (ref.kind === "conversation" &&
            (!metadata || metadata.lifecycle !== "active")) ||
          !basis ||
          basis.revision !== expectedRevision
        )
          return { status: "stale" as const };
        const parent = inspection.entries.at(-1)?.entryId;
        await appendPiTranscript(
          ref,
          {
            entryId: `compaction-${inspection.entries.length + 1}`,
            turnId,
            kind: "compaction",
            payload: {
              schemaVersion: 1,
              inputDigest: summary.inputDigest,
              summary,
            } as unknown as JsonValue,
            ...(parent ? { parentEntryId: parent } : {}),
          },
          root,
        );
        return {
          status: "committed" as const,
          transcript: await readPiConversationTranscriptSnapshot(ref, root),
        };
      });
    },
  };
}

// Both owner kinds share the canonical append and preparation CAS protocol.
export const appendPiOwnerFact = appendPiConversationFact;
export const readPiOwnerTranscriptSnapshot =
  readPiConversationTranscriptSnapshot;
export const createPiOwnerPreparationAdapter =
  createPiConversationPreparationAdapter;

/** Commit a caller-owned CAS transition as one canonical owner batch. */
export function commitPiOwnerFacts(
  ref: PiOwnerRef,
  decide: (
    entries: readonly PiTranscriptEntry[],
  ) => PiTranscriptInput[] | Promise<PiTranscriptInput[]>,
  root?: string,
) {
  return withPiOwnerWrite(ref, root, async () => {
    const inspection = await inspectPiTranscript(ref, root);
    requireValidPiTranscript(inspection);
    const inputs = await decide(inspection.entries);
    if (!inputs.length) return [];
    let parent = inspection.entries.at(-1)?.entryId;
    const linked = inputs.map((input) => {
      const result = { ...input, ...(parent ? { parentEntryId: parent } : {}) };
      parent = input.entryId;
      return result;
    });
    const result = await appendPiTranscriptBatch(ref, linked, root);
    await project(ref, result.inspection, root);
    return result.entries;
  });
}
