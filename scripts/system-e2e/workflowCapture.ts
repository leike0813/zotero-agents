import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFixtureRegistry } from "./fixture";

const PROFILE_LOCK_FILES = ["parent.lock", ".parentlock", "lock"];

type ContinueCaptureState = {
  status?: string;
  fixtureAdmitted?: boolean;
};

type ContinueCheckpoint = {
  completed?: unknown;
  nextStep?: unknown;
};

type ContinueImportEntry = {
  sourceKey?: unknown;
  id?: unknown;
  pdfIds?: unknown;
};

type ContinueImportDocument = {
  imported?: unknown;
  collections?: unknown;
  facts?: unknown;
};

export async function stageWorkflowCapture(args: {
  testRoot: string;
  env: NodeJS.ProcessEnv;
}) {
  const mode = args.env.ZOTERO_WORKFLOW_E2E_MODE || "offline";
  if (mode === "offline") {
    const source = path.resolve("tests/fixtures/workflow-happy-path/source");
    const identity = JSON.parse(
      await readFile(path.join(source, "fixture.json"), "utf8"),
    );
    const registry = await readFixtureRegistry(
      path.resolve("tests/fixtures/zotero-e2e/registry.json"),
    );
    const registered = registry.fixtures.find(
      (entry) => entry.fixtureId === identity.fixtureId,
    );
    if (
      !registered ||
      registered.schemaVersion !== identity.schemaVersion ||
      registered.fixtureRevision !== identity.fixtureRevision
    )
      throw new Error("workflow_fixture_identity_mismatch");
    const target = path.join(
      path.resolve(args.testRoot),
      "data",
      "workflow-e2e",
    );
    await cp(source, target, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    return target;
  }
  if (mode !== "live") throw new Error("workflow_capture_mode_invalid");
  if (
    args.env.ZOTERO_E2E_GOLD_DATA_DIR ||
    args.env.ZOTERO_E2E_GOLD_PROFILE_DIR ||
    args.env.ZOTERO_E2E_FIXTURE === "gold" ||
    args.env.ZOTERO_SYSTEM_E2E_RESUME_ROOT
  ) {
    throw new Error("workflow_capture_requires_fresh_profile");
  }
  const continueFrom = String(
    args.env.ZOTERO_WORKFLOW_E2E_CONTINUE_FROM || "",
  ).trim();
  if (continueFrom) {
    return stageWorkflowContinuation({
      testRoot: args.testRoot,
      priorRoot: continueFrom,
    });
  }
  const source = args.env.ZOTERO_WORKFLOW_E2E_SOURCE;
  if (!source) throw new Error("workflow_capture_source_missing");
  await readFile(path.join(source, "source.json"), "utf8");
  const target = path.join(path.resolve(args.testRoot), "data", "workflow-e2e");
  const relative = path.relative(path.resolve(source), target);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  ) {
    throw new Error("workflow_capture_source_target_overlap");
  }
  await cp(source, target, {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
  return target;
}

async function stageWorkflowContinuation(args: {
  testRoot: string;
  priorRoot: string;
}) {
  const priorRoot = path.resolve(args.priorRoot);
  const testRoot = path.resolve(args.testRoot);
  if (isWithin(priorRoot, testRoot) || isWithin(testRoot, priorRoot)) {
    throw new Error("workflow_capture_continue_overlap");
  }
  const state = await readJson(path.join(priorRoot, "capture-state.json"));
  const captureState = state as ContinueCaptureState;
  if (
    captureState?.status !== "stopped" ||
    captureState?.fixtureAdmitted !== false
  ) {
    throw new Error("workflow_capture_continue_state_invalid");
  }
  const checkpoint = await readJson(path.join(priorRoot, "checkpoint.json"));
  const checkpointDocument = checkpoint as ContinueCheckpoint;
  const completed = checkpointDocument?.completed;
  if (
    !Array.isArray(completed) ||
    completed.length === 0 ||
    completed.some((entry) => typeof entry !== "string") ||
    checkpointDocument?.nextStep !== completed.length + 1
  ) {
    throw new Error("workflow_capture_continue_checkpoint_invalid");
  }
  const importDocument = await readJson(path.join(priorRoot, "import.json"));
  if (!isValidImportDocument(importDocument)) {
    throw new Error("workflow_capture_continue_import_invalid");
  }
  const dataSource = path.join(priorRoot, "stopped-data");
  const profileSource = path.join(priorRoot, "stopped-profile");
  if (!(await isDirectory(dataSource)) || !(await isDirectory(profileSource))) {
    throw new Error("workflow_capture_continue_snapshot_missing");
  }
  const dataTarget = path.join(testRoot, "data");
  const profileTarget = path.join(testRoot, "profile");
  await cp(dataSource, dataTarget, { recursive: true, force: true });
  await cp(profileSource, profileTarget, { recursive: true, force: true });
  // The stopped profile may still carry the locks of the killed instance.
  await Promise.all(
    PROFILE_LOCK_FILES.map((name) =>
      rm(path.join(profileTarget, name), { force: true }),
    ),
  );
  const metadataDirectory = path.join(dataTarget, "workflow-e2e");
  await mkdir(metadataDirectory, { recursive: true });
  await writeFile(
    path.join(metadataDirectory, "continuation.json"),
    `${JSON.stringify(
      { priorEvidenceRoot: priorRoot, imported: importDocument, completed },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return metadataDirectory;
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new Error("workflow_capture_continue_metadata_unreadable");
  }
}

function isValidImportDocument(document: unknown) {
  const candidate = document as ContinueImportDocument | null;
  return (
    candidate &&
    Array.isArray(candidate.imported) &&
    candidate.imported.every((entry: unknown) =>
      isValidImportEntry(entry as ContinueImportEntry),
    ) &&
    Array.isArray(candidate.collections) &&
    candidate.collections.every((id: unknown) => typeof id === "number") &&
    Boolean(candidate.facts)
  );
}

function isValidImportEntry(entry: ContinueImportEntry) {
  return (
    entry &&
    typeof entry.sourceKey === "string" &&
    typeof entry.id === "number" &&
    Array.isArray(entry.pdfIds) &&
    entry.pdfIds.every((id: unknown) => typeof id === "number")
  );
}

async function isDirectory(target: string) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function isWithin(basePath: string, candidatePath: string) {
  const relative = path.relative(basePath, candidatePath);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
