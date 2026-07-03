import { joinPath } from "../utils/path";
import type { AcpSkillRunTranscriptItem } from "./acpSkillRunStore";
import {
  appendRuntimeTextFile,
  readRuntimeTextFile,
  readRuntimeTextRange,
  statRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";

export const ACP_SKILL_RUN_TRANSCRIPT_SCHEMA =
  "zotero-skills.acp.skill-run.transcript.v1";
export const ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA =
  "zotero-skills.acp.skill-run.transcript-index.v1";

const PREVIEW_LIMIT = 8 * 1024;
const TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const TRANSCRIPT_PAGE_MAX_LIMIT = 200;
const writeQueues = new Map<string, Promise<void>>();

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
  updatedAt: string;
};

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

async function readTranscriptEventsWithOffsets(transcriptPath: string) {
  const text: string = await readRuntimeTextFile(transcriptPath);
  const chunks = text.match(/[^\n]*(?:\n|$)/g) || [];
  const events: Array<{
    event: AcpSkillRunTranscriptEvent;
    offset: number;
    length: number;
  }> = [];
  let offset = 0;
  for (const chunk of chunks) {
    if (!chunk) {
      continue;
    }
    const length = utf8ByteLength(chunk);
    const line = chunk.replace(/\r?\n$/, "").trim();
    const event = line ? parseTranscriptEvent(line) : null;
    if (event) {
      events.push({ event, offset, length });
    }
    offset += length;
  }
  return events;
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
          updatedAt:
            normalizeString(parsed.updatedAt) || new Date(0).toISOString(),
        }),
      updatedAt: normalizeString(parsed.updatedAt) || new Date(0).toISOString(),
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

function emptyTranscriptIndex(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  updatedAt: string,
): AcpSkillRunTranscriptIndex {
  return {
    schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
    transcriptPath: paths.transcriptPath,
    items: [],
    itemIds: [],
    itemCount: 0,
    eventSeq: 0,
    preview: undefined,
    updatedAt,
  };
}

function indexFromEvents(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  entries: Array<{
    event: AcpSkillRunTranscriptEvent;
    offset: number;
    length: number;
  }>,
  updatedAt: string,
): AcpSkillRunTranscriptIndex {
  let index = emptyTranscriptIndex(paths, updatedAt);
  for (const entry of entries) {
    index = applyEventToIndex({
      index,
      event: entry.event,
      offset: entry.offset,
      length: entry.length,
      updatedAt,
    });
  }
  return index;
}

function applyEventToIndex(args: {
  index: AcpSkillRunTranscriptIndex;
  event: AcpSkillRunTranscriptEvent;
  offset: number;
  length: number;
  updatedAt: string;
}): AcpSkillRunTranscriptIndex {
  const items = args.index.items.map((entry) => ({
    itemId: entry.itemId,
    eventOffsets: [...entry.eventOffsets],
    eventLengths: [...entry.eventLengths],
    preview: entry.preview,
  }));
  const existingIndex = items.findIndex(
    (entry) => entry.itemId === args.event.itemId,
  );
  if (args.event.op === "delete" || args.event.op === "delete_item") {
    if (existingIndex >= 0) {
      items.splice(existingIndex, 1);
    }
  } else if (existingIndex >= 0) {
    items[existingIndex].eventOffsets.push(args.offset);
    items[existingIndex].eventLengths.push(args.length);
    if (args.event.op === "append_text") {
      items[existingIndex].preview = appendPreview(
        items[existingIndex].preview,
        args.event.text,
      );
    } else if (args.event.op === "patch_item") {
      items[existingIndex].preview = previewFromPatch(
        args.event.patch,
        items[existingIndex].preview,
      );
    } else if (args.event.item) {
      items[existingIndex].preview = previewFromItem(args.event.item);
    }
  } else if (args.event.op === "upsert" || args.event.op === "upsert_item") {
    items.push({
      itemId: args.event.itemId,
      eventOffsets: [args.offset],
      eventLengths: [args.length],
      preview: previewFromItem(args.event.item),
    });
  }
  return {
    schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
    transcriptPath: args.index.transcriptPath,
    items,
    itemIds: items.map((entry) => entry.itemId),
    itemCount: items.length,
    eventSeq: Math.max(args.index.eventSeq, args.event.seq),
    preview: previewFromIndex({
      schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
      transcriptPath: args.index.transcriptPath,
      items,
      itemIds: items.map((entry) => entry.itemId),
      itemCount: items.length,
      eventSeq: Math.max(args.index.eventSeq, args.event.seq),
      updatedAt: args.updatedAt,
    }),
    updatedAt: args.updatedAt,
  };
}

function withWriteQueue(path: string, write: () => Promise<void>) {
  const previous = writeQueues.get(path) || Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  const queued: Promise<void> = next
    .finally(() => {
      if (writeQueues.get(path) === queued) {
        writeQueues.delete(path);
      }
    })
    .catch(() => undefined) as Promise<void>;
  writeQueues.set(path, queued);
  return next;
}

async function readEventAtIndexedOffset(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  offset: number,
  length: number,
) {
  const line = await readRuntimeTextRange(paths.transcriptPath, offset, length);
  return parseTranscriptEvent(line.trim());
}

async function readIndexedItem(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
  entry: AcpSkillRunTranscriptIndexItem,
) {
  const events: AcpSkillRunTranscriptEvent[] = [];
  for (let index = 0; index < entry.eventOffsets.length; index += 1) {
    const event = await readEventAtIndexedOffset(
      paths,
      entry.eventOffsets[index],
      entry.eventLengths[index],
    );
    if (event) {
      events.push(event);
    }
  }
  return foldTranscriptEvents(events).items.find(
    (item) => item.id === entry.itemId,
  );
}

async function readOrRebuildTranscriptIndex(
  paths: ReturnType<typeof resolveAcpSkillRunTranscriptPaths>,
) {
  const index = await readTranscriptIndex(paths);
  if (index) {
    return index;
  }
  return rebuildAcpSkillRunTranscriptIndex({ runtimeDir: "" }, paths);
}

export async function appendAcpSkillRunTranscriptEvents(args: {
  runtimeDir?: string;
  events: AcpSkillRunTranscriptEventInput[];
}): Promise<AcpSkillRunTranscriptMetadata | null> {
  const paths = resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return null;
  }
  const pending = args.events
    .map((event) => ({
      ...event,
      itemId: normalizeString(event.itemId),
      createdAt: normalizeString(event.createdAt) || new Date().toISOString(),
    }))
    .filter((event) => !!event.itemId);
  if (pending.length === 0) {
    return null;
  }
  let metadata: AcpSkillRunTranscriptMetadata | null = null;
  await withWriteQueue(paths.transcriptPath, async () => {
    const currentIndex =
      (await readOrRebuildTranscriptIndex(paths)) ||
      emptyTranscriptIndex(paths, pending[0].createdAt || new Date().toISOString());
    const stat = await statRuntimePath(paths.transcriptPath);
    let offset = stat.exists ? stat.size : 0;
    let nextIndex = currentIndex;
    const lines: string[] = [];
    for (const input of pending) {
      const event: AcpSkillRunTranscriptEvent = {
        schema: ACP_SKILL_RUN_TRANSCRIPT_SCHEMA,
        seq:
          typeof input.seq === "number" && Number.isFinite(input.seq)
            ? Math.max(0, Math.floor(input.seq))
            : nextIndex.eventSeq + 1,
        op: input.op,
        itemId: input.itemId,
        item: input.item,
        text: typeof input.text === "string" ? input.text : undefined,
        patch: input.patch,
        createdAt: input.createdAt || new Date().toISOString(),
      };
      const line = eventLineWithNewline(event);
      lines.push(line);
      nextIndex = applyEventToIndex({
        index: nextIndex,
        event,
        offset,
        length: utf8ByteLength(line),
        updatedAt: event.createdAt,
      });
      offset += utf8ByteLength(line);
    }
    await appendRuntimeTextFile(paths.transcriptPath, lines.join(""));
    await writeRuntimeTextFile(
      paths.transcriptIndexPath,
      JSON.stringify(nextIndex),
    );
    metadata = {
      transcriptPath: paths.transcriptPath,
      transcriptIndexPath: paths.transcriptIndexPath,
      transcriptRevision: nextIndex.eventSeq,
      transcriptEventSeq: nextIndex.eventSeq,
      transcriptItemCount: nextIndex.itemCount,
      transcriptPreview: nextIndex.preview,
    };
  });
  return metadata;
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
  const index = await readOrRebuildTranscriptIndex(paths);
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
  const items = (
    await Promise.all(pageEntries.map((entry) => readIndexedItem(paths, entry)))
  ).filter((entry): entry is AcpSkillRunTranscriptItem => !!entry);
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
  const entries = await readTranscriptEventsWithOffsets(paths.transcriptPath);
  const index = indexFromEvents(paths, entries, updatedAt);
  await writeRuntimeTextFile(paths.transcriptIndexPath, JSON.stringify(index));
  return index;
}
