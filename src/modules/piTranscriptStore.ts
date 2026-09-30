import { joinPath } from "../utils/path";
import type { JsonValue } from "../workflows/types";
import { assertWorkflowHostStrictJsonValue } from "../workflows/workflowHostErrorContract";
import {
  appendRuntimeTextFile,
  assertManagedRelativePath,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  readRuntimeTextRanges,
  removeRuntimePath,
  replaceRuntimeTextFileAtomically,
  scanRuntimeUtf8Lines,
  statRuntimePath,
  writeRuntimeBytes,
  moveRuntimePath,
  type RuntimeUtf8Line,
} from "./runtimePersistence";

export type PiOwnerRef = {
  kind: "conversation" | "skill_run";
  ownerId: string;
};
export type PiTranscriptInput = {
  entryId: string;
  turnId?: string;
  parentEntryId?: string;
  kind: string;
  payload: JsonValue;
};
export type PiTranscriptEntry = PiTranscriptInput & {
  seq: number;
  createdAt: string;
};
type Header = {
  schema: "zotero-agents.pi-owner.v1";
  kind: PiOwnerRef["kind"];
  ownerId: string;
  createdAt: string;
};
type IndexRow = {
  seq: number;
  offset: number;
  length: number;
  kind: string;
  visible: 0 | 1;
};
export type PiInspection = {
  status: "valid" | "torn_tail" | "corrupt";
  validBytes: number;
  sourceBytes: number;
  entries: PiTranscriptEntry[];
  index: IndexRow[];
  header: Header | null;
  reason?: string;
};

const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_PAGE_BYTES = 4 * 1024 * 1024;
const VISIBLE_MESSAGE_ROLES = new Set(["user", "assistant", "thought"]);
const queues = new Map<string, Promise<unknown>>();
const utf8 = new TextEncoder();

export function piTranscriptEntryVisible(entry: PiTranscriptEntry): boolean {
  if (entry.kind === "message") {
    const role = (entry.payload as { role?: unknown } | null)?.role;
    return typeof role === "string" && VISIBLE_MESSAGE_ROLES.has(role);
  }
  if (entry.kind === "thought") return true;
  if (entry.kind === "tool_result" || entry.kind === "compaction") return true;
  if (entry.kind === "turn_terminal")
    return (entry.payload as { status?: unknown } | null)?.status === "failed";
  return false;
}

export function piOwnerPaths(ref: PiOwnerRef, root?: string) {
  if (ref.kind !== "conversation" && ref.kind !== "skill_run")
    throw new Error("pi_owner_kind_invalid");
  const id = assertManagedRelativePath(ref.ownerId);
  if (id !== ref.ownerId || id === "." || id === "..")
    throw new Error("pi_owner_id_invalid");
  const dir = joinPath(
    getRuntimePersistencePaths(root).piOwnersDir,
    ref.kind,
    id,
  );
  return {
    dir,
    log: joinPath(dir, "transcript.jsonl"),
    index: joinPath(dir, "index.jsonl"),
  };
}

export function withPiOwnerWrite<T>(
  ref: PiOwnerRef,
  root: string | undefined,
  work: () => Promise<T>,
): Promise<T> {
  const key = piOwnerPaths(ref, root).log;
  const previous = queues.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(work);
  queues.set(key, current);
  void current
    .finally(() => {
      if (queues.get(key) === current) queues.delete(key);
    })
    .catch(() => undefined);
  return current;
}

function parseEntry(
  value: unknown,
  expectedSeq: number,
  seen: Set<string>,
): PiTranscriptEntry {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("entry_object_invalid");
  const entry = value as PiTranscriptEntry;
  if (
    Object.keys(entry).some(
      (key) =>
        ![
          "seq",
          "entryId",
          "turnId",
          "parentEntryId",
          "kind",
          "payload",
          "createdAt",
        ].includes(key),
    )
  )
    throw new Error("entry_fields_invalid");
  if (entry.seq !== expectedSeq || !Number.isSafeInteger(entry.seq))
    throw new Error("sequence_invalid");
  for (const field of [entry.entryId, entry.kind, entry.createdAt]) {
    if (typeof field !== "string" || !field || field.length > 128)
      throw new Error("entry_identity_invalid");
  }
  if (!Number.isFinite(Date.parse(entry.createdAt)))
    throw new Error("timestamp_invalid");
  if (
    entry.turnId !== undefined &&
    (typeof entry.turnId !== "string" ||
      !entry.turnId ||
      entry.turnId.length > 128)
  )
    throw new Error("turn_id_invalid");
  if (
    entry.parentEntryId !== undefined &&
    (!seen.has(entry.parentEntryId) || entry.parentEntryId === entry.entryId)
  )
    throw new Error("parent_missing");
  if (seen.has(entry.entryId)) throw new Error("entry_duplicate");
  assertWorkflowHostStrictJsonValue(entry.payload);
  seen.add(entry.entryId);
  return entry;
}

export async function inspectPiTranscript(
  ref: PiOwnerRef,
  root?: string,
): Promise<PiInspection> {
  const { log } = piOwnerPaths(ref, root);
  const stat = await statRuntimePath(log);
  if (!stat.exists || stat.isDir) throw new Error("pi_owner_missing");
  const result: PiInspection = {
    status: "valid",
    validBytes: 0,
    sourceBytes: stat.size,
    entries: [],
    index: [],
    header: null,
  };
  const seen = new Set<string>();
  let lineNo = 0;
  await scanRuntimeUtf8Lines({
    path: log,
    onLine(line: RuntimeUtf8Line) {
      if (result.status !== "valid") return;
      if (line.length > MAX_ENTRY_BYTES + 1) {
        result.status = "corrupt";
        result.reason = "entry_too_large";
        return;
      }
      if (!line.text.endsWith("\n")) {
        result.status = lineNo === 0 ? "corrupt" : "torn_tail";
        result.reason = "unterminated_line";
        return;
      }
      try {
        const value = JSON.parse(line.text) as unknown;
        if (lineNo === 0) {
          const header = value as Header;
          if (
            header?.schema !== "zotero-agents.pi-owner.v1" ||
            header.kind !== ref.kind ||
            header.ownerId !== ref.ownerId ||
            typeof header.createdAt !== "string" ||
            !Number.isFinite(Date.parse(header.createdAt)) ||
            Object.keys(header).some(
              (key) =>
                !["schema", "kind", "ownerId", "createdAt"].includes(key),
            )
          )
            throw new Error("header_invalid");
          result.header = header;
        } else {
          const entry = parseEntry(value, lineNo, seen);
          result.entries.push(entry);
          result.index.push({
            seq: entry.seq,
            offset: line.offset,
            length: line.length,
            kind: entry.kind,
            visible: piTranscriptEntryVisible(entry) ? 1 : 0,
          });
        }
        result.validBytes = line.offset + line.length;
        lineNo += 1;
      } catch (error) {
        result.status = "corrupt";
        result.reason = String(error);
      }
    },
  });
  if (!result.header) {
    result.status = "corrupt";
    result.reason ||= "header_missing";
  }
  return result;
}

export async function createPiTranscript(ref: PiOwnerRef, root?: string) {
  const { log } = piOwnerPaths(ref, root);
  const header: Header = {
    schema: "zotero-agents.pi-owner.v1",
    kind: ref.kind,
    ownerId: ref.ownerId,
    createdAt: new Date().toISOString(),
  };
  try {
    await writeRuntimeBytes(log, utf8.encode(`${JSON.stringify(header)}\n`));
  } catch (error) {
    if (!(await statRuntimePath(log)).exists) throw error;
    const existing = await inspectPiTranscript(ref, root);
    if (existing.status !== "valid")
      throw new Error(`pi_owner_${existing.status}`);
    return existing;
  }
  return inspectPiTranscript(ref, root);
}

export function validatePiEntryInput(input: PiTranscriptInput) {
  for (const field of [input.entryId, input.kind]) {
    if (typeof field !== "string" || !field || field.length > 128)
      throw new Error("pi_entry_identity_invalid");
  }
  if (
    input.turnId !== undefined &&
    (typeof input.turnId !== "string" ||
      !input.turnId ||
      input.turnId.length > 128)
  )
    throw new Error("pi_turn_id_invalid");
  if (
    input.parentEntryId !== undefined &&
    (typeof input.parentEntryId !== "string" ||
      !input.parentEntryId ||
      input.parentEntryId.length > 128)
  )
    throw new Error("pi_parent_id_invalid");
  if (
    Object.keys(input).some(
      (key) =>
        !["entryId", "turnId", "parentEntryId", "kind", "payload"].includes(
          key,
        ),
    )
  )
    throw new Error("pi_entry_fields_invalid");
  assertWorkflowHostStrictJsonValue(input.payload);
}

function stableJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function samePiInput(
  entry: PiTranscriptEntry,
  input: PiTranscriptInput,
) {
  return (
    entry.entryId === input.entryId &&
    entry.turnId === input.turnId &&
    entry.parentEntryId === input.parentEntryId &&
    entry.kind === input.kind &&
    stableJson(entry.payload) === stableJson(input.payload)
  );
}

export async function appendPiTranscript(
  ref: PiOwnerRef,
  input: PiTranscriptInput,
  root?: string,
) {
  validatePiEntryInput(input);
  // ponytail: Full integrity scan on append is O(history); use a validated tail checkpoint if large owners need higher throughput.
  const inspection = await inspectPiTranscript(ref, root);
  if (inspection.status !== "valid")
    throw new Error(`pi_transcript_${inspection.status}`);
  const existing = inspection.entries.find(
    (entry) => entry.entryId === input.entryId,
  );
  if (existing) {
    if (!samePiInput(existing, input)) throw new Error("pi_entry_conflict");
    return { entry: existing, inspection, appended: false };
  }
  if (
    input.parentEntryId &&
    !inspection.entries.some((entry) => entry.entryId === input.parentEntryId)
  )
    throw new Error("pi_parent_missing");
  const entry: PiTranscriptEntry = {
    entryId: input.entryId,
    ...(input.turnId ? { turnId: input.turnId } : {}),
    ...(input.parentEntryId ? { parentEntryId: input.parentEntryId } : {}),
    kind: input.kind,
    payload: input.payload,
    seq: inspection.entries.length + 1,
    createdAt: new Date().toISOString(),
  };
  const line = `${JSON.stringify(entry)}\n`;
  if (utf8.encode(line).length > MAX_ENTRY_BYTES)
    throw new Error("pi_entry_too_large");
  await appendRuntimeTextFile(piOwnerPaths(ref, root).log, line);
  const row = {
    seq: entry.seq,
    offset: inspection.validBytes,
    length: utf8.encode(line).length,
    kind: entry.kind,
    visible: (piTranscriptEntryVisible(entry) ? 1 : 0) as 0 | 1,
  };
  inspection.entries.push(entry);
  inspection.index.push(row);
  inspection.validBytes += row.length;
  inspection.sourceBytes = inspection.validBytes;
  return { entry, inspection, appended: true };
}

export async function rebuildPiIndex(
  ref: PiOwnerRef,
  inspection: PiInspection,
  root?: string,
) {
  if (inspection.status !== "valid")
    throw new Error(`pi_transcript_${inspection.status}`);
  await replaceRuntimeTextFileAtomically(
    piOwnerPaths(ref, root).index,
    inspection.index.map((row) => `${JSON.stringify(row)}\n`).join(""),
  );
}

async function loadPiIndex(
  ref: PiOwnerRef,
  root?: string,
): Promise<IndexRow[]> {
  const { index, log } = piOwnerPaths(ref, root);
  if (!(await statRuntimePath(index)).exists)
    throw new Error("pi_index_missing");
  const raw = await readRuntimeTextFile(index);
  const rows: IndexRow[] = raw.trim()
    ? String(raw)
        .trim()
        .split("\n")
        .map((line: string) => JSON.parse(line) as IndexRow)
    : [];
  const sourceSize = (await statRuntimePath(log)).size;
  const emptyInspection =
    rows.length === 0 ? await inspectPiTranscript(ref, root) : null;
  const last = rows.at(-1);
  if (
    (last && last.offset + last.length !== sourceSize) ||
    (!last &&
      (emptyInspection?.status !== "valid" ||
        emptyInspection.entries.length !== 0)) ||
    rows.some(
      (row: IndexRow, index: number) =>
        row.seq !== index + 1 ||
        row.length <= 0 ||
        row.length > MAX_ENTRY_BYTES ||
        typeof row.kind !== "string" ||
        !row.kind ||
        (row.visible !== 0 && row.visible !== 1) ||
        (index > 0 &&
          row.offset !== rows[index - 1].offset + rows[index - 1].length),
    )
  )
    throw new Error("pi_index_stale");
  return rows;
}

export async function readPiTranscriptPage(
  ref: PiOwnerRef,
  options: { cursor?: number; limit?: number } = {},
  root?: string,
) {
  let rows: IndexRow[];
  try {
    rows = await loadPiIndex(ref, root);
  } catch {
    const inspection = await inspectPiTranscript(ref, root);
    await rebuildPiIndex(ref, inspection, root);
    rows = inspection.index;
  }
  const cursor = options.cursor ?? 0;
  const limit = options.limit ?? 80;
  if (
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 200
  )
    throw new Error("pi_page_invalid");
  const selected: IndexRow[] = [];
  let bytes = 0;
  for (const row of rows.slice(cursor, cursor + limit)) {
    if (bytes + row.length > MAX_PAGE_BYTES) break;
    selected.push(row);
    bytes += row.length;
  }
  if (cursor < rows.length && selected.length === 0)
    throw new Error("pi_page_entry_too_large");
  const text = await readRuntimeTextRanges(
    piOwnerPaths(ref, root).log,
    selected.map((row) => ({ offset: row.offset, length: row.length })),
  );
  const seen = new Set<string>();
  const entries = text.map((line, index) => {
    if (
      !line.endsWith("\n") ||
      utf8.encode(line).length !== selected[index].length
    )
      throw new Error("pi_index_corrupt");
    const entry = JSON.parse(line) as PiTranscriptEntry;
    if (entry.seq !== selected[index].seq || seen.has(entry.entryId))
      throw new Error("pi_index_corrupt");
    seen.add(entry.entryId);
    return entry;
  });
  const nextCursor =
    cursor + selected.length < rows.length ? cursor + selected.length : null;
  return { entries, nextCursor, total: rows.length };
}

export async function appendPiTranscriptBatch(
  ref: PiOwnerRef,
  inputs: PiTranscriptInput[],
  root?: string,
) {
  if (!Array.isArray(inputs) || inputs.length === 0)
    throw new Error("pi_batch_empty");
  for (const input of inputs) validatePiEntryInput(input);
  const inspection = await inspectPiTranscript(ref, root);
  if (inspection.status !== "valid")
    throw new Error(`pi_transcript_${inspection.status}`);
  const inBatch = new Set<string>();
  const newEntries: PiTranscriptEntry[] = [];
  const processed: PiTranscriptEntry[] = [];
  let parent = inspection.entries.at(-1)?.entryId;
  let seq = inspection.entries.length + 1;
  let bytes = 0;
  for (const input of inputs) {
    if (inBatch.has(input.entryId)) throw new Error("pi_entry_duplicate");
    inBatch.add(input.entryId);
    const existing = inspection.entries.find(
      (entry) => entry.entryId === input.entryId,
    );
    if (existing) {
      if (!samePiInput(existing, input)) throw new Error("pi_entry_conflict");
      processed.push(existing);
      parent = existing.entryId;
      continue;
    }
    const parentEntryId = input.parentEntryId ?? parent;
    if (
      parentEntryId &&
      !inspection.entries.some((entry) => entry.entryId === parentEntryId) &&
      !processed.some((entry) => entry.entryId === parentEntryId)
    )
      throw new Error("pi_parent_missing");
    const entry: PiTranscriptEntry = {
      entryId: input.entryId,
      ...(input.turnId ? { turnId: input.turnId } : {}),
      ...(parentEntryId ? { parentEntryId } : {}),
      kind: input.kind,
      payload: input.payload,
      seq,
      createdAt: new Date().toISOString(),
    };
    const length = utf8.encode(`${JSON.stringify(entry)}\n`).length;
    if (length > MAX_ENTRY_BYTES) throw new Error("pi_entry_too_large");
    bytes += length;
    if (bytes > MAX_PAGE_BYTES) throw new Error("pi_batch_too_large");
    newEntries.push(entry);
    processed.push(entry);
    parent = entry.entryId;
    seq += 1;
  }
  if (newEntries.length) {
    const buffer = newEntries
      .map((entry) => `${JSON.stringify(entry)}\n`)
      .join("");
    await appendRuntimeTextFile(piOwnerPaths(ref, root).log, buffer);
    for (const entry of newEntries) {
      const length = utf8.encode(`${JSON.stringify(entry)}\n`).length;
      inspection.index.push({
        seq: entry.seq,
        offset: inspection.validBytes,
        length,
        kind: entry.kind,
        visible: piTranscriptEntryVisible(entry) ? 1 : 0,
      });
      inspection.entries.push(entry);
      inspection.validBytes += length;
    }
    inspection.sourceBytes = inspection.validBytes;
  }
  return { entries: processed, inspection };
}

export async function readPiVisibleTranscriptPage(
  ref: PiOwnerRef,
  options: { cursor?: number; limit?: number } = {},
  root?: string,
) {
  let rows: IndexRow[];
  try {
    rows = await loadPiIndex(ref, root);
  } catch {
    const inspection = await inspectPiTranscript(ref, root);
    await rebuildPiIndex(ref, inspection, root);
    rows = inspection.index;
  }
  const visible = rows.filter((row) => row.visible === 1);
  const limit = options.limit ?? 80;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 80)
    throw new Error("pi_page_invalid");
  // Page-first, tail-first: an unspecified cursor lands on the newest page,
  // computed from the index alone (no bodies read) before one bounded read.
  const cursor = options.cursor ?? Math.max(0, visible.length - limit);
  if (!Number.isSafeInteger(cursor) || cursor < 0)
    throw new Error("pi_page_invalid");
  const selected: IndexRow[] = [];
  let bytes = 0;
  for (const row of visible.slice(cursor, cursor + limit)) {
    if (bytes + row.length > MAX_PAGE_BYTES) break;
    selected.push(row);
    bytes += row.length;
  }
  if (cursor < visible.length && selected.length === 0)
    throw new Error("pi_page_entry_too_large");
  const text = await readRuntimeTextRanges(
    piOwnerPaths(ref, root).log,
    selected.map((row) => ({ offset: row.offset, length: row.length })),
  );
  const entries = text.map((line, index) => {
    if (
      !line.endsWith("\n") ||
      utf8.encode(line).length !== selected[index].length
    )
      throw new Error("pi_index_corrupt");
    return JSON.parse(line) as PiTranscriptEntry;
  });
  return {
    entries,
    cursor,
    nextCursor:
      cursor + selected.length < visible.length
        ? cursor + selected.length
        : null,
    totalVisible: visible.length,
    total: rows.length,
  };
}

export async function repairPiTornTail(ref: PiOwnerRef, root?: string) {
  const inspection = await inspectPiTranscript(ref, root);
  if (inspection.status !== "torn_tail")
    throw new Error(`pi_repair_unavailable_${inspection.status}`);
  const { log, dir } = piOwnerPaths(ref, root);
  const temp = joinPath(
    dir,
    `.repair-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  try {
    await scanRuntimeUtf8Lines({
      path: log,
      length: inspection.validBytes,
      onLine: async (line) => {
        await appendRuntimeTextFile(temp, line.text);
      },
    });
    const repair: PiTranscriptEntry = {
      seq: inspection.entries.length + 1,
      entryId: `repair-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: "repair",
      payload: {
        discardedTailBytes: inspection.sourceBytes - inspection.validBytes,
      },
      createdAt: new Date().toISOString(),
    };
    await appendRuntimeTextFile(temp, `${JSON.stringify(repair)}\n`);
    if ((await statRuntimePath(log)).size !== inspection.sourceBytes)
      throw new Error("pi_repair_source_changed");
    await moveRuntimePath({
      sourcePath: temp,
      targetPath: log,
      overwrite: true,
    });
    return inspectPiTranscript(ref, root);
  } finally {
    await removeRuntimePath(temp).catch(() => undefined);
  }
}
