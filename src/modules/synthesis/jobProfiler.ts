import { joinPath } from "../../utils/path";
import { isDebugModeEnabled } from "../debugMode";
import { ensureRuntimeDirectory } from "../runtimePersistence";
import { buildSynthesisKnowledgeGraphPaths } from "./foundation";
import {
  createSynthesisSqlAdapterForPath,
  type SqlAdapter,
  type SqlRow,
} from "./repository";

type JsonObject = Record<string, unknown>;

export type SynthesisJobProfileStatus =
  | "ready"
  | "queued"
  | "failed_retryable"
  | "failed_terminal"
  | "completed";

export type SynthesisJobProfileRunRow = {
  run_id: string;
  job_name: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  queue_wait_ms: number | null;
  time_budget_ms: number | null;
  batch_limit: number | null;
  processed_count: number;
  skipped_count: number;
  failed_count: number;
  counters_json: string;
  diagnostics_json: string;
};

export type SynthesisJobProfilePhaseRow = {
  run_id: string;
  phase_name: string;
  started_at: string;
  duration_ms: number;
  counters_json: string;
  diagnostics_json: string;
};

export type SynthesisJobProfileSnapshot = {
  databasePath: string;
  runs: SynthesisJobProfileRunRow[];
  phases: SynthesisJobProfilePhaseRow[];
};

export type SynthesisJobProfilePhase = {
  end: (args?: { counters?: JsonObject; diagnostics?: unknown[] }) => void;
};

export type SynthesisJobProfileRun = {
  enabled: boolean;
  runId: string;
  phase: (phaseName: string) => SynthesisJobProfilePhase;
  finish: (args: {
    status: SynthesisJobProfileStatus;
    processedCount?: number;
    skippedCount?: number;
    failedCount?: number;
    counters?: JsonObject;
    diagnostics?: unknown[];
  }) => Promise<void>;
};

type ProfileRunDraft = {
  run: SynthesisJobProfileRunRow;
  phases: SynthesisJobProfilePhaseRow[];
};

type MemoryProfilerStore = {
  runs: SynthesisJobProfileRunRow[];
  phases: SynthesisJobProfilePhaseRow[];
};

const memoryStoresByDbPath = new Map<string, MemoryProfilerStore>();
let runSequence = 0;

const NOOP_PHASE: SynthesisJobProfilePhase = {
  end() {
    // no-op
  },
};

const NOOP_RUN: SynthesisJobProfileRun = {
  enabled: false,
  runId: "",
  phase() {
    return NOOP_PHASE;
  },
  async finish() {
    // no-op
  },
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeNonNegativeInt(value: unknown, fallback = 0) {
  const numberValue = Math.floor(Number(value));
  return Number.isFinite(numberValue) && numberValue >= 0
    ? numberValue
    : fallback;
}

function normalizeNullableNonNegativeInt(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return normalizeNonNegativeInt(value);
}

function stringifyJson(value: unknown, fallback: unknown) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function rowString(row: SqlRow, key: string) {
  return String(row[key] || "");
}

function rowNumber(row: SqlRow, key: string) {
  return normalizeNonNegativeInt(row[key]);
}

function rowNullableNumber(row: SqlRow, key: string) {
  return normalizeNullableNonNegativeInt(row[key]);
}

function hasZoteroSqlRuntime() {
  const runtime = globalThis as {
    Services?: unknown;
    Zotero?: unknown;
  };
  return Boolean(runtime.Services && runtime.Zotero);
}

export function getSynthesisJobProfilerDatabasePath(root: string) {
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  return joinPath(paths.stateRoot, "debug", "synthesis-job-profiler.db");
}

function getMemoryStore(dbPath: string) {
  const existing = memoryStoresByDbPath.get(dbPath);
  if (existing) {
    return existing;
  }
  const created: MemoryProfilerStore = { runs: [], phases: [] };
  memoryStoresByDbPath.set(dbPath, created);
  return created;
}

function ensureProfilerSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS job_profile_run (
      run_id TEXT PRIMARY KEY,
      job_name TEXT NOT NULL,
      trigger TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      queue_wait_ms INTEGER,
      time_budget_ms INTEGER,
      batch_limit INTEGER,
      processed_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      counters_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]'
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS job_profile_phase (
      run_id TEXT NOT NULL,
      phase_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      counters_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]'
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS job_profile_phase_run_idx
    ON job_profile_phase(run_id);
  `);
}

async function writeProfileDraft(root: string, draft: ProfileRunDraft) {
  const dbPath = getSynthesisJobProfilerDatabasePath(root);
  if (!hasZoteroSqlRuntime()) {
    const store = getMemoryStore(dbPath);
    store.runs.push(draft.run);
    store.phases.push(...draft.phases);
    return;
  }

  await ensureRuntimeDirectory(
    joinPath(buildSynthesisKnowledgeGraphPaths(root).stateRoot, "debug"),
  );
  const db = createSynthesisSqlAdapterForPath(dbPath);
  ensureProfilerSchema(db);
  db.transaction(() => {
    db.run(
      `
        INSERT OR REPLACE INTO job_profile_run (
          run_id, job_name, trigger, status, started_at, finished_at,
          duration_ms, queue_wait_ms, time_budget_ms, batch_limit,
          processed_count, skipped_count, failed_count, counters_json,
          diagnostics_json
        ) VALUES (
          :run_id, :job_name, :trigger, :status, :started_at, :finished_at,
          :duration_ms, :queue_wait_ms, :time_budget_ms, :batch_limit,
          :processed_count, :skipped_count, :failed_count, :counters_json,
          :diagnostics_json
        );
      `,
      draft.run,
    );
    for (const phase of draft.phases) {
      db.run(
        `
          INSERT INTO job_profile_phase (
            run_id, phase_name, started_at, duration_ms, counters_json,
            diagnostics_json
          ) VALUES (
            :run_id, :phase_name, :started_at, :duration_ms, :counters_json,
            :diagnostics_json
          );
        `,
        phase,
      );
    }
  });
}

function mapRunRow(row: SqlRow): SynthesisJobProfileRunRow {
  return {
    run_id: rowString(row, "run_id"),
    job_name: rowString(row, "job_name"),
    trigger: rowString(row, "trigger"),
    status: rowString(row, "status"),
    started_at: rowString(row, "started_at"),
    finished_at: rowString(row, "finished_at"),
    duration_ms: rowNumber(row, "duration_ms"),
    queue_wait_ms: rowNullableNumber(row, "queue_wait_ms"),
    time_budget_ms: rowNullableNumber(row, "time_budget_ms"),
    batch_limit: rowNullableNumber(row, "batch_limit"),
    processed_count: rowNumber(row, "processed_count"),
    skipped_count: rowNumber(row, "skipped_count"),
    failed_count: rowNumber(row, "failed_count"),
    counters_json: rowString(row, "counters_json"),
    diagnostics_json: rowString(row, "diagnostics_json"),
  };
}

function mapPhaseRow(row: SqlRow): SynthesisJobProfilePhaseRow {
  return {
    run_id: rowString(row, "run_id"),
    phase_name: rowString(row, "phase_name"),
    started_at: rowString(row, "started_at"),
    duration_ms: rowNumber(row, "duration_ms"),
    counters_json: rowString(row, "counters_json"),
    diagnostics_json: rowString(row, "diagnostics_json"),
  };
}

export function maybeStartSynthesisJobProfileRun(args: {
  root: string;
  jobName: string;
  trigger?: string;
  batchLimit?: number;
  timeBudgetMs?: number;
  queueWaitMs?: number;
  now?: () => string;
  debugEnabled?: boolean;
}): SynthesisJobProfileRun {
  const debugEnabled =
    typeof args.debugEnabled === "boolean"
      ? args.debugEnabled
      : isDebugModeEnabled();
  if (!debugEnabled) {
    return NOOP_RUN;
  }

  const now = args.now || nowIso;
  const startedAt = now();
  const startedMs = Date.now();
  const phases: SynthesisJobProfilePhaseRow[] = [];
  runSequence += 1;
  const runId = [
    "synthesis-job",
    String(startedMs),
    String(runSequence).padStart(4, "0"),
  ].join(":");
  let finished = false;

  return {
    enabled: true,
    runId,
    phase(phaseName: string) {
      const cleanPhaseName = String(phaseName || "phase");
      const phaseStartedAt = now();
      const phaseStartedMs = Date.now();
      let phaseFinished = false;
      return {
        end(phaseArgs = {}) {
          if (phaseFinished || finished) {
            return;
          }
          phaseFinished = true;
          phases.push({
            run_id: runId,
            phase_name: cleanPhaseName,
            started_at: phaseStartedAt,
            duration_ms: Math.max(0, Date.now() - phaseStartedMs),
            counters_json: stringifyJson(phaseArgs.counters, {}),
            diagnostics_json: stringifyJson(phaseArgs.diagnostics, []),
          });
        },
      };
    },
    async finish(finishArgs) {
      if (finished) {
        return;
      }
      finished = true;
      const draft: ProfileRunDraft = {
        run: {
          run_id: runId,
          job_name: String(args.jobName || "synthesis.job"),
          trigger: String(args.trigger || ""),
          status: finishArgs.status,
          started_at: startedAt,
          finished_at: now(),
          duration_ms: Math.max(0, Date.now() - startedMs),
          queue_wait_ms: normalizeNullableNonNegativeInt(args.queueWaitMs),
          time_budget_ms: normalizeNullableNonNegativeInt(args.timeBudgetMs),
          batch_limit: normalizeNullableNonNegativeInt(args.batchLimit),
          processed_count: normalizeNonNegativeInt(finishArgs.processedCount),
          skipped_count: normalizeNonNegativeInt(finishArgs.skippedCount),
          failed_count: normalizeNonNegativeInt(finishArgs.failedCount),
          counters_json: stringifyJson(finishArgs.counters, {}),
          diagnostics_json: stringifyJson(finishArgs.diagnostics, []),
        },
        phases: phases.slice(),
      };
      try {
        await writeProfileDraft(args.root, draft);
      } catch {
        // Debug profiler failures must never affect Synthesis background jobs.
      }
    },
  };
}

export async function readSynthesisJobProfilerSnapshotForTests(root: string) {
  const dbPath = getSynthesisJobProfilerDatabasePath(root);
  if (!hasZoteroSqlRuntime()) {
    const store = getMemoryStore(dbPath);
    return {
      databasePath: dbPath,
      runs: store.runs.slice(),
      phases: store.phases.slice(),
    };
  }

  const db = createSynthesisSqlAdapterForPath(dbPath);
  ensureProfilerSchema(db);
  return {
    databasePath: dbPath,
    runs: db
      .all("SELECT * FROM job_profile_run ORDER BY started_at, run_id;")
      .map(mapRunRow),
    phases: db
      .all("SELECT * FROM job_profile_phase ORDER BY started_at, phase_name;")
      .map(mapPhaseRow),
  };
}

export function resetSynthesisJobProfilerForTests(root?: string) {
  if (root) {
    memoryStoresByDbPath.delete(getSynthesisJobProfilerDatabasePath(root));
    return;
  }
  memoryStoresByDbPath.clear();
}
