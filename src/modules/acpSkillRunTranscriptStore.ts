import { joinPath } from "../utils/path";
import type { AcpSkillRunTranscriptItem } from "./acpSkillRunStore";
import {
  appendRuntimeTextFile,
  readRuntimeTextFile,
  readRuntimeTextRanges,
  scanRuntimeUtf8Lines,
  statRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  discardBufferedWriteKey,
  enqueueBufferedWrite,
  flushAllBufferedWrites,
  flushBufferedWriteKey,
  flushBufferedWriteOwner,
} from "./bufferedWriteCoordinator";

export const ACP_SKILL_RUN_TRANSCRIPT_SCHEMA =
  "zotero-skills.acp.skill-run.transcript.v1";
export const ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA =
  "zotero-skills.acp.skill-run.transcript-index.v2";

const PREVIEW_LIMIT = 8 * 1024;
const TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const TRANSCRIPT_PAGE_MAX_LIMIT = 200;
const INDEX_CHECKPOINT_INTERVAL_MS = 30_000;
const INDEX_CHECKPOINT_BYTES = 1024 * 1024;

export type AcpSkillRunTranscriptEvent = {
  schema: typeof ACP_SKILL_RUN_TRANSCRIPT_SCHEMA;
  seq: number;
  op:
    | "upsert"
    | "delete"
    | "upsert_item"
    | "append_text"
    | "patch_item"
    | "delete_item";
  itemId: string;
  item?: AcpSkillRunTranscriptItem;
  text?: string;
  patch?: Partial<AcpSkillRunTranscriptItem>;
  createdAt: string;
};

export type AcpSkillRunTranscriptIndexItem = {
  itemId: string;
  eventOffsets: number[];
  eventLengths: number[];
  preview?: string;
};

export type AcpSkillRunTranscriptIndex = {
  schema: typeof ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA;
  transcriptPath: string;
  items: AcpSkillRunTranscriptIndexItem[];
  itemIds: string[];
  itemCount: number;
  eventSeq: number;
  preview?: string;
  sourceByteLength: number;
  checkpointedAt: string;
  updatedAt: string;
};

type TranscriptIndexState = {
  index: AcpSkillRunTranscriptIndex;
  dirty: boolean;
  checkpointSourceByteLength: number;
  checkpointedAtMs: number;
};

const transcriptIndexStates = new Map<string, TranscriptIndexState>();
const transcriptWriteKeys = new Set<string>();
const TRANSCRIPT_COOPERATIVE_EVENT_BATCH = 64;

let transcriptIndexDiagnostics = {
  appliedEvents: 0,
  scanReadCalls: 0,
  maxScanReadBytes: 0,
  fullMirrorIndexedPages: 0,
};

export function getAcpTranscriptIndexDiagnosticsForTests() {
  return { ...transcriptIndexDiagnostics };
}

export function resetAcpTranscriptIndexDiagnosticsForTests() {
  transcriptIndexDiagnostics = {
    appliedEvents: 0,
    scanReadCalls: 0,
    maxScanReadBytes: 0,
    fullMirrorIndexedPages: 0,
  };
}

function yieldTranscriptWork() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export type AcpSkillRunTranscriptMetadata = {
  transcriptPath: string;
  transcriptIndexPath: string;
  transcriptRevision: number;
  transcriptEventSeq: number;
  transcriptItemCount: number;
  transcriptPreview?: string;
};

export type AcpSkillRunTranscriptEventInput = {
  seq?: number;
  op: AcpSkillRunTranscriptEvent["op"];
  itemId: string;
  item?: AcpSkillRunTranscriptItem;
  text?: string;
  patch?: Partial<AcpSkillRunTranscriptItem>;
  createdAt?: string;
};

export type AcpSkillRunTranscriptPage = {
  items: AcpSkillRunTranscriptItem[];
  cursor: number;
  prevCursor?: number;
  nextCursor?: number;
  total: number;
  eventSeq: number;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function truncatePreview(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return undefined;
  }
  return text.length > PREVIEW_LIMIT
    ? `${text.slice(0, PREVIEW_LIMIT)}...<truncated>`
    : text;
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function resolveAcpSkillRunTranscriptPaths(runtimeDirRaw?: string) {
  const runtimeDir = normalizeString(runtimeDirRaw);
  if (!runtimeDir) {
    return {
      transcriptPath: "",
      transcriptIndexPath: "",
    };
  }
  return {
    transcriptPath: joinPath(runtimeDir, "transcript.jsonl"),
    transcriptIndexPath: joinPath(runtimeDir, "transcript.index.json"),
  };
}

function parseTranscriptEvent(line: string): AcpSkillRunTranscriptEvent | null {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    if (parsed.schema !== ACP_SKILL_RUN_TRANSCRIPT_SCHEMA) {
      return null;
    }
    const seq = Math.max(0, Math.floor(Number(parsed.seq || 0) || 0));
    const opText = normalizeString(parsed.op);
    const op =
      opText === "delete" ||
      opText === "delete_item" ||
      opText === "append_text" ||
      opText === "patch_item" ||
      opText === "upsert_item"
        ? opText
        : "upsert";
    const itemId = normalizeString(parsed.itemId);
    if (!seq || !itemId) {
      return null;
    }
    return {
      schema: ACP_SKILL_RUN_TRANSCRIPT_SCHEMA,
      seq,
      op,
      itemId,
      item:
        (op === "upsert" || op === "upsert_item") &&
        parsed.item &&
        typeof parsed.item === "object"
          ? (parsed.item as AcpSkillRunTranscriptItem)
          : undefined,
      text: typeof parsed.text === "string" ? parsed.text : undefined,
      patch:
        op === "patch_item" && parsed.patch && typeof parsed.patch === "object"
          ? (parsed.patch as Partial<AcpSkillRunTranscriptItem>)
          : undefined,
      createdAt: normalizeString(parsed.createdAt) || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function eventLine(event: AcpSkillRunTranscriptEvent) {
  return JSON.stringify(event);
}

function eventLineWithNewline(event: AcpSkillRunTranscriptEvent) {
  return `${eventLine(event)}\n`;
}

function foldTranscriptEvents(events: AcpSkillRunTranscriptEvent[]) {
  const itemsById = new Map<string, AcpSkillRunTranscriptItem>();
  const itemIds: string[] = [];
  let eventSeq = 0;
  for (const event of events) {
    eventSeq = Math.max(eventSeq, event.seq);
    if (event.op === "delete" || event.op === "delete_item") {
      itemsById.delete(event.itemId);
      const index = itemIds.indexOf(event.itemId);
      if (index >= 0) {
        itemIds.splice(index, 1);
      }
      continue;
    }
    if (event.op === "append_text") {
      const current = itemsById.get(event.itemId);
      if (
        current &&
        (current.kind === "message" || current.kind === "thought")
      ) {
        itemsById.set(event.itemId, {
          ...current,
          text: `${current.text || ""}${event.text || ""}`,
          updatedAt: event.createdAt,
        });
      }
      continue;
    }
    if (event.op === "patch_item") {
      const current = itemsById.get(event.itemId);
      if (current && event.patch) {
        itemsById.set(event.itemId, {
          ...current,
          ...event.patch,
          id: current.id,
          kind: current.kind,
        } as AcpSkillRunTranscriptItem);
      }
      continue;
    }
    if (!event.item) {
      continue;
    }
    if (!itemsById.has(event.itemId)) {
      itemIds.push(event.itemId);
    }
    itemsById.set(event.itemId, { ...event.item });
  }
  return {
    items: itemIds
      .map((itemId) => itemsById.get(itemId))
      .filter((entry): entry is AcpSkillRunTranscriptItem => !!entry),
    itemIds,
    eventSeq,
  };
}

function previewFromItem(item: AcpSkillRunTranscriptItem | null | undefined) {
  if (!item) {
    return undefined;
  }
  const raw = item as {
    kind?: string;
    entries?: Array<{ content?: unknown }>;
  };
  if (item.kind === "message" || item.kind === "thought") {
    return truncatePreview(item.text);
  }
  if (item.kind === "status") {
    return truncatePreview(item.text);
  }
  if (item.kind === "permission") {
    return truncatePreview(item.summary || item.title);
  }
  if (item.kind === "tool_call") {
    return truncatePreview(
      item.summary || item.resultSummary || item.inputSummary || item.title,
    );
  }
  if (raw.kind === "plan") {
    return previewFromPlanEntries(raw.entries);
  }
  return undefined;
}

function previewFromPlanEntries(entries: unknown) {
  if (!Array.isArray(entries)) {
    return undefined;
  }
  return truncatePreview(
    entries
      .map((entry) =>
        entry && typeof entry === "object"
          ? (entry as { content?: unknown }).content
          : "",
      )
      .filter(Boolean)
      .join(" "),
  );
}

function appendPreview(existing: string | undefined, text: unknown) {
  const nextText = String(text || "");
  if (!nextText) {
    return existing;
  }
  const current = normalizeString(existing);
  if (current.endsWith("...<truncated>")) {
    return current;
  }
  return truncatePreview(`${current}${nextText}`);
}

function previewFromPatch(
  patch: Partial<AcpSkillRunTranscriptItem> | undefined,
  existing?: string,
) {
  if (!patch) {
    return existing;
  }
  if (typeof (patch as { text?: unknown }).text === "string") {
    return truncatePreview((patch as { text?: string }).text);
  }
  const planPreview = previewFromPlanEntries(
    (patch as { entries?: unknown }).entries,
  );
  if (planPreview) {
    return planPreview;
  }
  const summary =
    (patch as { summary?: unknown }).summary ||
    (patch as { resultSummary?: unknown }).resultSummary ||
    (patch as { inputSummary?: unknown }).inputSummary ||
    (patch as { title?: unknown }).title;
  return truncatePreview(summary) || existing;
}

function previewFromIndex(index: AcpSkillRunTranscriptIndex) {
  for (let itemIndex = index.items.length - 1; itemIndex >= 0; itemIndex -= 1) {
    const preview = normalizeString(index.items[itemIndex].preview);
    if (preview) {
      return preview;
    }
  }
  return undefined;
}

function parseTranscriptIndex(
  text: string,
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
) {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.schema !== ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA) {
      return null;
    }
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems
      .filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === "object",
      )
      .map((entry) => {
        const itemId = normalizeString(entry.itemId);
        const eventOffsets = Array.isArray(entry.eventOffsets)
          ? entry.eventOffsets
              .map((value) => Math.max(0, Math.floor(Number(value) || 0)))
              .filter((value) => Number.isFinite(value))
          : [];
        const eventLengths = Array.isArray(entry.eventLengths)
          ? entry.eventLengths
              .map((value) => Math.max(0, Math.floor(Number(value) || 0)))
              .filter((value) => Number.isFinite(value) && value > 0)
          : [];
        return {
          itemId,
          eventOffsets,
          eventLengths,
          preview: truncatePreview(entry.preview),
        };
      })
      .filter(
        (entry) =>
          entry.itemId &&
          entry.eventOffsets.length > 0 &&
          entry.eventOffsets.length === entry.eventLengths.length,
      );
    if (items.length !== rawItems.length) {
      return null;
    }
    const eventSeq = Math.max(0, Math.floor(Number(parsed.eventSeq || 0) || 0));
    const sourceByteLength = Math.max(
      0,
      Math.floor(Number(parsed.sourceByteLength || 0) || 0),
    );
    const checkpointedAt =
      normalizeString(parsed.checkpointedAt) ||
      normalizeString(parsed.updatedAt) ||
      new Date(0).toISOString();
    return {
      schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
      transcriptPath:
        normalizeString(parsed.transcriptPath) || paths.transcriptPath,
      items,
      itemIds: items.map((entry) => entry.itemId),
      itemCount: items.length,
      eventSeq,
      preview:
        truncatePreview(parsed.preview) ||
        previewFromIndex({
          schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
          transcriptPath:
            normalizeString(parsed.transcriptPath) || paths.transcriptPath,
          items,
          itemIds: items.map((entry) => entry.itemId),
          itemCount: items.length,
          eventSeq,
          sourceByteLength,
          checkpointedAt,
          updatedAt:
            normalizeString(parsed.updatedAt) || new Date(0).toISOString(),
        }),
      updatedAt: normalizeString(parsed.updatedAt) || new Date(0).toISOString(),
      sourceByteLength,
      checkpointedAt,
    } satisfies AcpSkillRunTranscriptIndex;
  } catch {
    return null;
  }
}

async function readTranscriptIndex(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
) {
  const text = await readRuntimeTextFile(paths.transcriptIndexPath);
  return text ? parseTranscriptIndex(text, paths) : null;
}

class TranscriptIndexBuilder {
  private readonly entries = new Map<string, AcpSkillRunTranscriptIndexItem>();

  private sourceByteLength: number;

  private eventSeq: number;

  private updatedAt: string;

  private readonly checkpointedAt: string;

  constructor(
    private readonly paths: ReturnType<
      typeof resolveAcpSkillRunTranscriptPaths
    >,
    updatedAt: string,
    base?: AcpSkillRunTranscriptIndex,
  ) {
    for (const entry of base?.items || []) {
      this.entries.set(entry.itemId, {
        itemId: entry.itemId,
        eventOffsets: [...entry.eventOffsets],
        eventLengths: [...entry.eventLengths],
        preview: entry.preview,
      });
    }
    this.sourceByteLength = base?.sourceByteLength || 0;
    this.eventSeq = base?.eventSeq || 0;
    this.updatedAt = base?.updatedAt || updatedAt;
    this.checkpointedAt = base?.checkpointedAt || updatedAt;
  }

  get currentEventSeq() {
    return this.eventSeq;
  }

  apply(args: {
    event: AcpSkillRunTranscriptEvent;
    offset: number;
    length: number;
    updatedAt: string;
  }) {
    transcriptIndexDiagnostics.appliedEvents += 1;
    this.eventSeq = Math.max(this.eventSeq, args.event.seq);
    this.sourceByteLength = Math.max(
      this.sourceByteLength,
      args.offset + args.length,
    );
    this.updatedAt = args.updatedAt;
    const existing = this.entries.get(args.event.itemId);
    if (args.event.op === "delete" || args.event.op === "delete_item") {
      this.entries.delete(args.event.itemId);
      return;
    }
    if (existing) {
      existing.eventOffsets.push(args.offset);
      existing.eventLengths.push(args.length);
      if (args.event.op === "append_text") {
        existing.preview = appendPreview(existing.preview, args.event.text);
      } else if (args.event.op === "patch_item") {
        existing.preview = previewFromPatch(args.event.patch, existing.preview);
      } else if (args.event.item) {
        existing.preview = previewFromItem(args.event.item);
      }
      return;
    }
    if (args.event.op === "upsert" || args.event.op === "upsert_item") {
      this.entries.set(args.event.itemId, {
        itemId: args.event.itemId,
        eventOffsets: [args.offset],
        eventLengths: [args.length],
        preview: previewFromItem(args.event.item),
      });
    }
  }

  setSourceByteLength(value: number) {
    this.sourceByteLength = Math.max(
      this.sourceByteLength,
      Math.max(0, Math.floor(Number(value || 0) || 0)),
    );
  }

  finalize(options: { checkpointedAt?: string } = {}) {
    const items = Array.from(this.entries.values());
    const index: AcpSkillRunTranscriptIndex = {
      schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
      transcriptPath: this.paths.transcriptPath,
      items,
      itemIds: items.map((entry) => entry.itemId),
      itemCount: items.length,
      eventSeq: this.eventSeq,
      preview: undefined,
      sourceByteLength: this.sourceByteLength,
      checkpointedAt: options.checkpointedAt || this.checkpointedAt,
      updatedAt: this.updatedAt,
    };
    index.preview = previewFromIndex(index);
    return index;
  }
}

async function scanTranscriptIndex(args: {
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>;
  builder: TranscriptIndexBuilder;
  offset?: number;
  length?: number;
}) {
  let scannedLines = 0;
  const result = await scanRuntimeUtf8Lines({
    path: args.paths.transcriptPath,
    offset: args.offset,
    length: args.length,
    onLine: async (line) => {
      const event = parseTranscriptEvent(
        line.text.replace(/\r?\n$/, "").trim(),
      );
      if (event) {
        args.builder.apply({
          event,
          offset: line.offset,
          length: line.length,
          updatedAt: event.createdAt,
        });
      }
      scannedLines += 1;
      if (scannedLines % TRANSCRIPT_COOPERATIVE_EVENT_BATCH === 0) {
        await yieldTranscriptWork();
      }
    },
  });
  transcriptIndexDiagnostics.scanReadCalls += result.readCalls;
  transcriptIndexDiagnostics.maxScanReadBytes = Math.max(
    transcriptIndexDiagnostics.maxScanReadBytes,
    result.maxReadBytes,
  );
  args.builder.setSourceByteLength(result.endOffset);
  return result;
}

async function readIndexedItems(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  entries: AcpSkillRunTranscriptIndexItem[],
) {
  const ranges: Array<{ offset: number; length: number }> = [];
  const owners: number[] = [];
  entries.forEach((entry, entryIndex) => {
    for (let index = 0; index < entry.eventOffsets.length; index += 1) {
      ranges.push({
        offset: entry.eventOffsets[index],
        length: entry.eventLengths[index],
      });
      owners.push(entryIndex);
    }
  });
  const lines = await readRuntimeTextRanges(paths.transcriptPath, ranges);
  const eventsByEntry = entries.map(() => [] as AcpSkillRunTranscriptEvent[]);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const owner = owners[index];
    const event = parseTranscriptEvent(String(line || "").trim());
    if (event) {
      eventsByEntry[owner]?.push(event);
    }
    if ((index + 1) % TRANSCRIPT_COOPERATIVE_EVENT_BATCH === 0) {
      await yieldTranscriptWork();
    }
  }
  return entries
    .map((entry, index) =>
      foldTranscriptEvents(eventsByEntry[index] || []).items.find(
        (item) => item.id === entry.itemId,
      ),
    )
    .filter((entry): entry is AcpSkillRunTranscriptItem => !!entry);
}

function transcriptWriteKey(transcriptPath: string) {
  return `acp-transcript:${transcriptPath}`;
}

function coalesceTranscriptEvents(events: AcpSkillRunTranscriptEventInput[]) {
  const result: AcpSkillRunTranscriptEventInput[] = [];
  for (const event of events) {
    const previous = result[result.length - 1];
    if (
      previous?.op === "append_text" &&
      event.op === "append_text" &&
      previous.itemId === event.itemId
    ) {
      previous.text = `${previous.text || ""}${event.text || ""}`;
      previous.seq = Math.max(previous.seq || 0, event.seq || 0) || undefined;
      previous.createdAt = event.createdAt || previous.createdAt;
      continue;
    }
    result.push({ ...event });
  }
  return result;
}

async function loadTranscriptIndexState(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
) {
  const cached = transcriptIndexStates.get(paths.transcriptPath);
  const stat = await statRuntimePath(paths.transcriptPath);
  const sourceByteLength = stat.exists ? stat.size : 0;
  let index = cached?.index || (await readTranscriptIndex(paths));
  let dirty = cached?.dirty || false;
  let checkpointSourceByteLength =
    cached?.checkpointSourceByteLength || index?.sourceByteLength || 0;
  let checkpointedAtMs =
    cached?.checkpointedAtMs || Date.parse(index?.checkpointedAt || "") || 0;

  if (!index || index.sourceByteLength > sourceByteLength) {
    const updatedAt = new Date().toISOString();
    const builder = new TranscriptIndexBuilder(paths, updatedAt);
    await scanTranscriptIndex({ paths, builder });
    index = builder.finalize({ checkpointedAt: updatedAt });
    dirty = true;
    checkpointSourceByteLength = 0;
    checkpointedAtMs = 0;
  } else if (index.sourceByteLength < sourceByteLength) {
    const builder = new TranscriptIndexBuilder(paths, index.updatedAt, index);
    await scanTranscriptIndex({
      paths,
      builder,
      offset: index.sourceByteLength,
      length: sourceByteLength - index.sourceByteLength,
    });
    builder.setSourceByteLength(sourceByteLength);
    index = builder.finalize();
    dirty = true;
  }

  const state: TranscriptIndexState = {
    index,
    dirty,
    checkpointSourceByteLength,
    checkpointedAtMs,
  };
  transcriptIndexStates.set(paths.transcriptPath, state);
  return state;
}

async function checkpointTranscriptIndex(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  state: TranscriptIndexState,
  force: boolean,
) {
  const now = Date.now();
  const due =
    force ||
    state.index.sourceByteLength - state.checkpointSourceByteLength >=
      INDEX_CHECKPOINT_BYTES ||
    now - state.checkpointedAtMs >= INDEX_CHECKPOINT_INTERVAL_MS;
  if (!state.dirty || !due) {
    return;
  }
  const checkpointedAt = new Date(now).toISOString();
  const checkpoint = { ...state.index, checkpointedAt };
  await writeRuntimeTextFile(
    paths.transcriptIndexPath,
    JSON.stringify(checkpoint),
  );
  state.index = checkpoint;
  state.dirty = false;
  state.checkpointSourceByteLength = checkpoint.sourceByteLength;
  state.checkpointedAtMs = now;
}

async function persistTranscriptBatch(
  runtimeDir: string,
  inputs: AcpSkillRunTranscriptEventInput[],
) {
  const paths = resolveAcpSkillRunTranscriptPaths(runtimeDir);
  const pending = coalesceTranscriptEvents(inputs);
  if (!paths.transcriptPath || pending.length === 0) {
    return;
  }
  const state = await loadTranscriptIndexState(paths);
  const builder = new TranscriptIndexBuilder(
    paths,
    state.index.updatedAt,
    state.index,
  );
  let offset = state.index.sourceByteLength;
  const lines: string[] = [];
  for (const input of pending) {
    const event: AcpSkillRunTranscriptEvent = {
      schema: ACP_SKILL_RUN_TRANSCRIPT_SCHEMA,
      seq:
        typeof input.seq === "number" && Number.isFinite(input.seq)
          ? Math.max(0, Math.floor(input.seq))
          : builder.currentEventSeq + 1,
      op: input.op,
      itemId: input.itemId,
      item: input.item,
      text: typeof input.text === "string" ? input.text : undefined,
      patch: input.patch,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    const line = eventLineWithNewline(event);
    const length = utf8ByteLength(line);
    lines.push(line);
    builder.apply({
      event,
      offset,
      length,
      updatedAt: event.createdAt,
    });
    offset += length;
  }
  await appendRuntimeTextFile(paths.transcriptPath, lines.join(""));
  builder.setSourceByteLength(offset);
  state.index = builder.finalize();
  state.dirty = true;
  try {
    await checkpointTranscriptIndex(paths, state, false);
  } catch {
    state.dirty = true;
  }
}

export function enqueueAcpSkillRunTranscriptEvents(args: {
  runtimeDir?: string;
  requestId?: string;
  events: AcpSkillRunTranscriptEventInput[];
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  const paths = resolveAcpSkillRunTranscriptPaths(runtimeDir);
  for (const input of args.events) {
    const itemId = normalizeString(input.itemId);
    if (!paths.transcriptPath || !itemId) {
      continue;
    }
    const entry = {
      ...input,
      itemId,
      createdAt: normalizeString(input.createdAt) || new Date().toISOString(),
    };
    enqueueBufferedWrite({
      key: transcriptWriteKey(paths.transcriptPath),
      owner: runtimeDir,
      entry,
      bytes: utf8ByteLength(JSON.stringify(entry)) + 1,
      performanceProfileRequestId: normalizeString(args.requestId),
      performanceChannel: "transcript",
      sink: (events) => persistTranscriptBatch(runtimeDir, events),
    });
    transcriptWriteKeys.add(transcriptWriteKey(paths.transcriptPath));
  }
}

export async function flushAcpSkillRunTranscriptWrites(runtimeDirRaw?: string) {
  const runtimeDir = normalizeString(runtimeDirRaw);
  const paths = resolveAcpSkillRunTranscriptPaths(runtimeDir);
  if (!paths.transcriptPath) {
    return;
  }
  await flushBufferedWriteKey(transcriptWriteKey(paths.transcriptPath));
  const state = await loadTranscriptIndexState(paths);
  await checkpointTranscriptIndex(paths, state, true);
}

export async function flushAcpSkillRunTranscriptOwner(runtimeDirRaw?: string) {
  const runtimeDir = normalizeString(runtimeDirRaw);
  if (!runtimeDir) {
    return;
  }
  await flushBufferedWriteOwner(runtimeDir);
  await flushAcpSkillRunTranscriptWrites(runtimeDir);
}

export async function flushAllAcpTranscriptWrites() {
  await flushAllBufferedWrites();
  await Promise.all(
    Array.from(transcriptIndexStates.entries()).map(async ([path, state]) => {
      const runtimeDir = path.replace(/[\\/]transcript\.jsonl$/, "");
      const paths = resolveAcpSkillRunTranscriptPaths(runtimeDir);
      await checkpointTranscriptIndex(paths, state, true);
    }),
  );
}

export function resetAcpTranscriptWritesForTests() {
  for (const key of transcriptWriteKeys) {
    discardBufferedWriteKey(key);
  }
  transcriptWriteKeys.clear();
  transcriptIndexStates.clear();
}

export async function appendAcpSkillRunTranscriptEvents(args: {
  runtimeDir?: string;
  requestId?: string;
  events: AcpSkillRunTranscriptEventInput[];
}): Promise<AcpSkillRunTranscriptMetadata | null> {
  const runtimeDir = normalizeString(args.runtimeDir);
  const paths = resolveAcpSkillRunTranscriptPaths(runtimeDir);
  if (!paths.transcriptPath || args.events.length === 0) {
    return null;
  }
  enqueueAcpSkillRunTranscriptEvents({
    runtimeDir,
    requestId: args.requestId,
    events: args.events,
  });
  await flushAcpSkillRunTranscriptWrites(runtimeDir);
  const index = (await loadTranscriptIndexState(paths)).index;
  return {
    transcriptPath: paths.transcriptPath,
    transcriptIndexPath: paths.transcriptIndexPath,
    transcriptRevision: index.eventSeq,
    transcriptEventSeq: index.eventSeq,
    transcriptItemCount: index.itemCount,
    transcriptPreview: index.preview,
  };
}

export async function appendAcpSkillRunTranscriptEvent(
  args: AcpSkillRunTranscriptEventInput & { runtimeDir?: string },
) {
  return appendAcpSkillRunTranscriptEvents({
    runtimeDir: args.runtimeDir,
    events: [args],
  });
}

export async function readAcpSkillRunTranscriptPage(args: {
  runtimeDir?: string;
  cursor?: number;
  limit?: number;
}): Promise<AcpSkillRunTranscriptPage> {
  const paths = resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return { items: [], cursor: 0, total: 0, eventSeq: 0 };
  }
  await flushAcpSkillRunTranscriptWrites(args.runtimeDir);
  const index = (await loadTranscriptIndexState(paths)).index;
  if (!index || index.itemCount <= 0) {
    return { items: [], cursor: 0, total: 0, eventSeq: index?.eventSeq || 0 };
  }
  const limit = Math.max(
    1,
    Math.min(
      TRANSCRIPT_PAGE_MAX_LIMIT,
      Math.floor(Number(args.limit || TRANSCRIPT_PAGE_DEFAULT_LIMIT)),
    ),
  );
  const requestedCursor =
    typeof args.cursor === "number" && Number.isFinite(args.cursor)
      ? Math.max(0, Math.floor(args.cursor))
      : Math.max(0, index.itemCount - limit);
  const cursor = Math.min(requestedCursor, index.itemCount);
  const pageEntries = index.items.slice(cursor, cursor + limit);
  const items = await readIndexedItems(paths, pageEntries);
  const prevCursor = cursor > 0 ? Math.max(0, cursor - limit) : undefined;
  const nextCursor =
    cursor + pageEntries.length < index.itemCount
      ? cursor + pageEntries.length
      : undefined;
  return {
    items,
    cursor,
    prevCursor,
    nextCursor,
    total: index.itemCount,
    eventSeq: index.eventSeq,
  };
}

export async function readAcpSkillRunTranscriptItems(args: {
  runtimeDir?: string;
}): Promise<{
  items: AcpSkillRunTranscriptItem[];
  eventSeq: number;
  total: number;
}> {
  const paths = resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return { items: [], eventSeq: 0, total: 0 };
  }
  await flushAcpSkillRunTranscriptWrites(args.runtimeDir);
  const index = (await loadTranscriptIndexState(paths)).index;
  const items: AcpSkillRunTranscriptItem[] = [];
  for (
    let offset = 0;
    offset < index.items.length;
    offset += TRANSCRIPT_PAGE_MAX_LIMIT
  ) {
    transcriptIndexDiagnostics.fullMirrorIndexedPages += 1;
    items.push(
      ...(await readIndexedItems(
        paths,
        index.items.slice(offset, offset + TRANSCRIPT_PAGE_MAX_LIMIT),
      )),
    );
    await yieldTranscriptWork();
  }
  return {
    items,
    eventSeq: index.eventSeq,
    total: index.itemCount,
  };
}

export async function rebuildAcpSkillRunTranscriptIndex(
  args: {
    runtimeDir?: string;
  },
  resolvedPaths?: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
) {
  const paths =
    resolvedPaths || resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return null;
  }
  const updatedAt = new Date().toISOString();
  const builder = new TranscriptIndexBuilder(paths, updatedAt);
  await scanTranscriptIndex({ paths, builder });
  const index = builder.finalize({ checkpointedAt: updatedAt });
  await writeRuntimeTextFile(paths.transcriptIndexPath, JSON.stringify(index));
  transcriptIndexStates.set(paths.transcriptPath, {
    index,
    dirty: false,
    checkpointSourceByteLength: index.sourceByteLength,
    checkpointedAtMs: Date.parse(index.checkpointedAt) || Date.now(),
  });
  return index;
}
