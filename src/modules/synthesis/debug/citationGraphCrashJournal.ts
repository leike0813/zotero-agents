import { isDebugModeEnabled } from "../../debugMode";
import { isSystemE2ETestRun } from "../../systemE2ETestRun";
import {
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "../../runtimePersistence";
import { joinPath } from "../../../utils/path";

export const CITATION_GRAPH_CRASH_JOURNAL_SCHEMA =
  "zotero-agents.citation-graph-crash-journal.v1";

type CrashJournalEvent = {
  stage: string;
  occurredAt: string;
  details?: Record<string, string | number | boolean>;
};

type CrashJournalSession = {
  id: string;
  status: "active" | "clean" | "interrupted";
  startedAt: string;
  endedAt?: string;
  events: CrashJournalEvent[];
};

export type CitationGraphCrashJournal = {
  schema: typeof CITATION_GRAPH_CRASH_JOURNAL_SCHEMA;
  current: CrashJournalSession | null;
  recent: CrashJournalSession[];
};

const MAX_EVENTS = 512;
const MAX_RECENT = 4;
let document: CitationGraphCrashJournal | undefined;
let queue = Promise.resolve();

function journalPath() {
  return joinPath(
    getRuntimePersistencePaths().logsDir,
    "citation-graph-crash-journal.json",
  );
}

function emptyDocument(): CitationGraphCrashJournal {
  return {
    schema: CITATION_GRAPH_CRASH_JOURNAL_SCHEMA,
    current: null,
    recent: [],
  };
}

function sanitizeDetails(details: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "boolean" || typeof value === "number") {
      safe[key] = value;
    } else if (typeof value === "string") {
      safe[key] = value.slice(0, 160);
    }
  }
  return safe;
}

async function loadDocument() {
  if (document) return document;
  const fallback = emptyDocument();
  try {
    const raw = await readRuntimeTextFile(journalPath());
    const parsed = raw ? (JSON.parse(raw) as CitationGraphCrashJournal) : null;
    document =
      parsed?.schema === CITATION_GRAPH_CRASH_JOURNAL_SCHEMA
        ? parsed
        : fallback;
  } catch {
    document = fallback;
  }
  return document;
}

async function persist() {
  if (document) {
    await writeRuntimeTextFile(
      journalPath(),
      JSON.stringify(document, null, 2),
    );
  }
}

function enqueue<T>(run: () => Promise<T>) {
  const next = queue.then(run, run);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function ensureCurrent() {
  const journal = await loadDocument();
  if (journal.current) return journal.current;
  const startedAt = new Date().toISOString();
  journal.current = {
    id: `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`,
    status: "active",
    startedAt,
    events: [{ stage: "plugin-startup", occurredAt: startedAt }],
  };
  return journal.current;
}

export function initializeCitationGraphCrashJournal() {
  if (!isDebugModeEnabled() && !isSystemE2ETestRun()) {
    return Promise.resolve();
  }
  return enqueue(async () => {
    const journal = await loadDocument();
    if (journal.current?.status === "active") {
      journal.current.status = "interrupted";
      journal.current.endedAt = new Date().toISOString();
      journal.recent.unshift(journal.current);
      journal.recent = journal.recent.slice(0, MAX_RECENT);
      journal.current = null;
    }
    await ensureCurrent();
    await persist();
  });
}

export function recordCitationGraphCrashJournalPhase(
  stage: string,
  details: Record<string, unknown> = {},
) {
  if (!isDebugModeEnabled() && !isSystemE2ETestRun()) {
    return Promise.resolve();
  }
  return enqueue(async () => {
    const current = await ensureCurrent();
    const safeDetails = sanitizeDetails(details);
    current.events.push({
      stage: String(stage || "unknown").slice(0, 96),
      occurredAt: new Date().toISOString(),
      ...(Object.keys(safeDetails).length ? { details: safeDetails } : {}),
    });
    current.events = current.events.slice(-MAX_EVENTS);
    await persist();
  });
}

export function finishCitationGraphCrashJournal() {
  if (!isDebugModeEnabled() && !isSystemE2ETestRun()) {
    return Promise.resolve();
  }
  return enqueue(async () => {
    const journal = await loadDocument();
    const current = journal.current;
    if (current) {
      current.status = "clean";
      current.endedAt = new Date().toISOString();
      current.events.push({
        stage: "plugin-shutdown",
        occurredAt: current.endedAt,
      });
      current.events = current.events.slice(-MAX_EVENTS);
      journal.recent.unshift(current);
      journal.recent = journal.recent.slice(0, MAX_RECENT);
      journal.current = null;
    }
    await persist();
  });
}

export function readCitationGraphCrashJournal() {
  if (!isDebugModeEnabled() && !isSystemE2ETestRun()) {
    return Promise.resolve(emptyDocument());
  }
  return enqueue(async () => {
    await loadDocument();
    return JSON.parse(JSON.stringify(document)) as CitationGraphCrashJournal;
  });
}
