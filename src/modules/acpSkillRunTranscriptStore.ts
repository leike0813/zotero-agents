import { joinPath } from "../utils/path";
import type { AcpSkillRunTranscriptItem } from "./acpSkillRunStore";
import {
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "./runtimePersistence";

export const ACP_SKILL_RUN_TRANSCRIPT_SCHEMA =
  "zotero-skills.acp.skill-run.transcript.v1";
export const ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA =
  "zotero-skills.acp.skill-run.transcript-index.v1";

const PREVIEW_LIMIT = 8 * 1024;
const writeQueues = new Map<string, Promise<void>>();

export type AcpSkillRunTranscriptEvent = {
  schema: typeof ACP_SKILL_RUN_TRANSCRIPT_SCHEMA;
  seq: number;
  op: "upsert" | "delete";
  itemId: string;
  item?: AcpSkillRunTranscriptItem;
  createdAt: string;
};

export type AcpSkillRunTranscriptIndex = {
  schema: typeof ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA;
  transcriptPath: string;
  itemIds: string[];
  itemCount: number;
  eventSeq: number;
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

export type AcpSkillRunTranscriptPage = {
  items: AcpSkillRunTranscriptItem[];
  cursor: number;
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
    const op = parsed.op === "delete" ? "delete" : "upsert";
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
        op === "upsert" && parsed.item && typeof parsed.item === "object"
          ? (parsed.item as AcpSkillRunTranscriptItem)
          : undefined,
      createdAt: normalizeString(parsed.createdAt) || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function readTranscriptEvents(transcriptPath: string) {
  const text: string = await readRuntimeTextFile(transcriptPath);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseTranscriptEvent)
    .filter((entry): entry is AcpSkillRunTranscriptEvent => !!entry);
}

function foldTranscriptEvents(events: AcpSkillRunTranscriptEvent[]) {
  const itemsById = new Map<string, AcpSkillRunTranscriptItem>();
  const itemIds: string[] = [];
  let eventSeq = 0;
  for (const event of events) {
    eventSeq = Math.max(eventSeq, event.seq);
    if (event.op === "delete") {
      itemsById.delete(event.itemId);
      const index = itemIds.indexOf(event.itemId);
      if (index >= 0) {
        itemIds.splice(index, 1);
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

function previewFromItems(items: AcpSkillRunTranscriptItem[]) {
  const latest = [...items].reverse().find((item) => {
    if (item.kind === "message" || item.kind === "thought") {
      return normalizeString(item.text);
    }
    if (item.kind === "status") {
      return normalizeString(item.text);
    }
    return false;
  });
  if (!latest) {
    return undefined;
  }
  if (latest.kind === "message" || latest.kind === "thought") {
    return truncatePreview(latest.text);
  }
  if (latest.kind === "status") {
    return truncatePreview(latest.text);
  }
  return undefined;
}

function eventLine(event: AcpSkillRunTranscriptEvent) {
  return JSON.stringify(event);
}

function withWriteQueue(path: string, write: () => Promise<void>) {
  const previous = writeQueues.get(path) || Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  writeQueues.set(
    path,
    next.finally(() => {
      if (writeQueues.get(path) === next) {
        writeQueues.delete(path);
      }
    }),
  );
  return next;
}

export async function writeAcpSkillRunTranscriptSnapshot(args: {
  runtimeDir?: string;
  items: AcpSkillRunTranscriptItem[];
  updatedAt?: string;
}): Promise<AcpSkillRunTranscriptMetadata | null> {
  const paths = resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return null;
  }
  const updatedAt = normalizeString(args.updatedAt) || new Date().toISOString();
  const items = args.items.map((item) => ({ ...item }));
  await withWriteQueue(paths.transcriptPath, async () => {
    const lines = items.map((item, index) =>
      eventLine({
        schema: ACP_SKILL_RUN_TRANSCRIPT_SCHEMA,
        seq: index + 1,
        op: "upsert",
        itemId: item.id,
        item,
        createdAt: item.createdAt || updatedAt,
      }),
    );
    await writeRuntimeTextFile(
      paths.transcriptPath,
      lines.length > 0 ? `${lines.join("\n")}\n` : "",
    );
    const index: AcpSkillRunTranscriptIndex = {
      schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
      transcriptPath: paths.transcriptPath,
      itemIds: items.map((item) => item.id),
      itemCount: items.length,
      eventSeq: items.length,
      updatedAt,
    };
    await writeRuntimeTextFile(
      paths.transcriptIndexPath,
      JSON.stringify(index),
    );
  });
  return {
    transcriptPath: paths.transcriptPath,
    transcriptIndexPath: paths.transcriptIndexPath,
    transcriptRevision: items.length,
    transcriptEventSeq: items.length,
    transcriptItemCount: items.length,
    transcriptPreview: previewFromItems(items),
  };
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
  const folded = foldTranscriptEvents(
    await readTranscriptEvents(paths.transcriptPath),
  );
  const cursor = Math.max(0, Math.floor(Number(args.cursor || 0) || 0));
  const limit = Math.max(
    1,
    Math.min(200, Math.floor(Number(args.limit || 80))),
  );
  const items = folded.items.slice(cursor, cursor + limit);
  const nextCursor =
    cursor + items.length < folded.items.length
      ? cursor + items.length
      : undefined;
  return {
    items,
    cursor,
    nextCursor,
    total: folded.items.length,
    eventSeq: folded.eventSeq,
  };
}

export async function rebuildAcpSkillRunTranscriptIndex(args: {
  runtimeDir?: string;
}) {
  const paths = resolveAcpSkillRunTranscriptPaths(args.runtimeDir);
  if (!paths.transcriptPath) {
    return null;
  }
  const folded = foldTranscriptEvents(
    await readTranscriptEvents(paths.transcriptPath),
  );
  const index: AcpSkillRunTranscriptIndex = {
    schema: ACP_SKILL_RUN_TRANSCRIPT_INDEX_SCHEMA,
    transcriptPath: paths.transcriptPath,
    itemIds: folded.itemIds,
    itemCount: folded.items.length,
    eventSeq: folded.eventSeq,
    updatedAt: new Date().toISOString(),
  };
  await writeRuntimeTextFile(paths.transcriptIndexPath, JSON.stringify(index));
  return index;
}
