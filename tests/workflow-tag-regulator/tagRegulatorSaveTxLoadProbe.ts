import {
  ensureDiagnosticsDirectory,
  readDiagnosticsEnv,
  writeDiagnosticsText,
} from "../zotero/testDiagnosticsOutput";
import { getProjectRoot, joinPath } from "../zotero/workflow-test-utils";
import { registerZoteroTestObjectForCleanup } from "../zotero/objectCleanupHarness";

export type SaveTxLoadMode = "create-only" | "create-and-update";

type SaveTxLoadProbeResult = {
  title: string;
  mode: SaveTxLoadMode;
  count: number;
  idlePolicy: string;
  warmupDurationMs: number;
  scenarioDurationMs: number;
  startedAt: string;
  finishedAt: string;
};

const recordedResults: SaveTxLoadProbeResult[] = [];

function resolveDiagnosticsDirname(targetPath: string) {
  const slashIndex = Math.max(
    targetPath.lastIndexOf("/"),
    targetPath.lastIndexOf("\\"),
  );
  return slashIndex >= 0 ? targetPath.slice(0, slashIndex) : "";
}

function resolveSaveTxLoadProbeOutputPath() {
  const explicit = readDiagnosticsEnv("ZOTERO_SAVE_TX_LOAD_PROBE_OUT");
  if (explicit) {
    return explicit;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return joinPath(
    getProjectRoot(),
    "artifacts",
    "test-diagnostics",
    `tag-regulator-save-tx-load-probe-${stamp}.json`,
  );
}

export function isTagRegulatorSaveTxLoadProbeEnabled() {
  const raw = readDiagnosticsEnv("ZOTERO_SAVE_TX_LOAD_PROBE").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export async function runSaveTxLoadWarmup(args: {
  count: number;
  mode: SaveTxLoadMode;
  idleEvery?: number;
  idleMs?: number;
}) {
  const startedAt = Date.now();
  const createdIds: number[] = [];
  if (args.count <= 0) {
    return {
      durationMs: 0,
      createdIds,
    };
  }
  const libraryID = Zotero.Libraries.userLibraryID;
  for (let index = 0; index < args.count; index += 1) {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = libraryID;
    item.setField(
      "title",
      `saveTx load probe ${args.mode} ${Date.now()} ${index}`,
    );
    await item.saveTx();
    registerZoteroTestObjectForCleanup(item);
    if (typeof item.id === "number") {
      createdIds.push(item.id);
    }
    if (args.mode === "create-and-update") {
      item.setField(
        "abstractNote",
        `updated by saveTx load probe ${index} ${"x".repeat(64)}`,
      );
      await item.saveTx();
    }
    if (
      typeof args.idleEvery === "number" &&
      args.idleEvery > 0 &&
      typeof args.idleMs === "number" &&
      args.idleMs > 0 &&
      (index + 1) % args.idleEvery === 0
    ) {
      await new Promise((resolve) => setTimeout(resolve, args.idleMs));
    }
  }
  return {
    durationMs: Date.now() - startedAt,
    createdIds,
  };
}

export function recordSaveTxLoadProbeResult(result: SaveTxLoadProbeResult) {
  recordedResults.push(result);
}

export async function flushSaveTxLoadProbeReport() {
  if (!isTagRegulatorSaveTxLoadProbeEnabled() || recordedResults.length === 0) {
    return "";
  }
  const outputPath = resolveSaveTxLoadProbeOutputPath();
  const outputDir = resolveDiagnosticsDirname(outputPath);
  if (outputDir) {
    await ensureDiagnosticsDirectory(outputDir);
  }
  await writeDiagnosticsText(
    outputPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          resultCount: recordedResults.length,
        },
        results: recordedResults,
      },
      null,
      2,
    ),
  );
  return outputPath;
}
