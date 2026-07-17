import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
  canonicalSynthesisTopicJsonText,
  canonicalSynthesisTopicSectionFileName,
  canonicalSynthesisTopicPathId,
  computeSynthesisTopicCurrentHashes,
  projectSynthesisTopicCanonicalInspectResult,
  rebuildSynthesisTopicCanonicalInspectRequest,
  rebuildSynthesisTopicCanonicalInspectResult,
  rebuildSynthesisTopicCanonicalSnapshot,
  type SynthesisTopicCanonicalDiagnostic,
  type SynthesisTopicCanonicalInspectResult,
  type SynthesisTopicCanonicalReadResult,
  type SynthesisTopicCanonicalStore,
  type SynthesisTopicCanonicalStoreSnapshot,
} from "../../../packages/synthesis-application/src/topicCanonical.js";

const IDENTITY_SCHEMA =
  "synthesis-sidecar-topic-canonical-identity.v1" as const;
const JOURNAL_SCHEMA = "synthesis-sidecar-topic-canonical-journal.v1" as const;
const RECEIPT_SCHEMA = "synthesis-sidecar-topic-canonical-receipt.v1" as const;
const HASH_ID_PATTERN = /^[a-f0-9]{64}$/;

type FaultPoint =
  | "lock_acquired"
  | "staging_written"
  | "journal_written"
  | "current_backed_up"
  | "current_promoted"
  | "receipt_written"
  | "rollback_restore";

type IdentityMarker = {
  schema: typeof IDENTITY_SCHEMA;
  profileId: string;
  dataRootId: string;
  storeSchemaVersion: typeof SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION;
  storeId: string;
};

type TransactionPhase = "staged" | "backed_up" | "promoted" | "committed";

type TransactionJournal = {
  schema: typeof JOURNAL_SCHEMA;
  transactionId: string;
  topicId: string;
  pathId: string;
  hadCurrent: boolean;
  phase: TransactionPhase;
  manifestHash: string;
  artifactHash: string;
};

type TransactionReceipt = {
  schema: typeof RECEIPT_SCHEMA;
  transactionId: string;
  topicId: string;
  pathId: string;
  manifestHash: string;
  artifactHash: string;
};

type StorePaths = {
  root: string;
  markerPath: string;
  topicsRoot: string;
  journalPath: string;
  receiptPath: string;
  stagingRoot: string;
  stagingCurrent: string;
  backupRoot: string;
  backupCurrent: string;
};

export class SynthesisTopicCanonicalStoreInterruption extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SynthesisTopicCanonicalStoreInterruption";
  }
}

class InspectInvalid extends Error {
  constructor(readonly diagnostic: SynthesisTopicCanonicalDiagnostic) {
    super(diagnostic);
  }
}

function exactRecord(
  value: unknown,
  fields: readonly string[],
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    throw new Error(code);
  }
  return record;
}

function strictHashId(value: unknown, code: string) {
  if (typeof value !== "string" || !HASH_ID_PATTERN.test(value)) {
    throw new Error(code);
  }
  return value;
}

function storeId(profileId: string, dataRootId: string) {
  return crypto
    .createHash("sha256")
    .update(IDENTITY_SCHEMA)
    .update("\0")
    .update(profileId)
    .update("\0")
    .update(dataRootId)
    .update("\0")
    .update(SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION)
    .digest("hex");
}

function storePaths(
  profileRuntimeRoot: string,
  dataRootId: string,
): StorePaths {
  const root = path.join(profileRuntimeRoot, "shadow-canonical", dataRootId);
  return {
    root,
    markerPath: path.join(root, "identity.json"),
    topicsRoot: path.join(root, "topics"),
    journalPath: path.join(root, "transaction.json"),
    receiptPath: path.join(root, "receipt.json"),
    stagingRoot: path.join(root, "staging"),
    stagingCurrent: path.join(root, "staging", "current"),
    backupRoot: path.join(root, "backup"),
    backupCurrent: path.join(root, "backup", "current"),
  };
}

function ensureDirectory(directory: string) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("canonical_store_path_invalid");
  }
  if (process.platform !== "win32") fs.chmodSync(directory, 0o700);
}

function fsyncDirectory(directory: string) {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(directory, "r");
    fs.fsyncSync(descriptor);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (
      process.platform !== "win32" ||
      (code !== "EPERM" && code !== "EISDIR")
    ) {
      throw error;
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function writeDurableFile(filePath: string, text: string, exclusive = true) {
  const descriptor = fs.openSync(filePath, exclusive ? "wx" : "w", 0o600);
  try {
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  if (process.platform !== "win32") fs.chmodSync(filePath, 0o600);
}

function writeJsonAtomically(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  writeDurableFile(temporaryPath, `${JSON.stringify(value)}\n`);
  fs.renameSync(temporaryPath, filePath);
  fsyncDirectory(path.dirname(filePath));
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function strictMarker(value: unknown): IdentityMarker {
  const row = exactRecord(
    value,
    ["schema", "profileId", "dataRootId", "storeSchemaVersion", "storeId"],
    "canonical_store_identity_invalid",
  );
  if (
    row.schema !== IDENTITY_SCHEMA ||
    row.storeSchemaVersion !== SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION
  ) {
    throw new Error("canonical_store_identity_invalid");
  }
  return {
    schema: IDENTITY_SCHEMA,
    profileId: strictHashId(row.profileId, "canonical_store_identity_invalid"),
    dataRootId: strictHashId(
      row.dataRootId,
      "canonical_store_identity_invalid",
    ),
    storeSchemaVersion: SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
    storeId: strictHashId(row.storeId, "canonical_store_identity_invalid"),
  };
}

function strictJournal(value: unknown): TransactionJournal {
  const row = exactRecord(
    value,
    [
      "schema",
      "transactionId",
      "topicId",
      "pathId",
      "hadCurrent",
      "phase",
      "manifestHash",
      "artifactHash",
    ],
    "canonical_store_journal_invalid",
  );
  if (
    row.schema !== JOURNAL_SCHEMA ||
    typeof row.transactionId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(row.transactionId) ||
    typeof row.topicId !== "string" ||
    canonicalSynthesisTopicPathId(row.topicId) !== row.pathId ||
    typeof row.hadCurrent !== "boolean" ||
    (row.phase !== "staged" &&
      row.phase !== "backed_up" &&
      row.phase !== "promoted" &&
      row.phase !== "committed") ||
    typeof row.manifestHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(row.manifestHash) ||
    typeof row.artifactHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(row.artifactHash)
  ) {
    throw new Error("canonical_store_journal_invalid");
  }
  return row as TransactionJournal;
}

function strictReceipt(value: unknown): TransactionReceipt {
  const row = exactRecord(
    value,
    [
      "schema",
      "transactionId",
      "topicId",
      "pathId",
      "manifestHash",
      "artifactHash",
    ],
    "canonical_store_receipt_invalid",
  );
  if (
    row.schema !== RECEIPT_SCHEMA ||
    typeof row.transactionId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(row.transactionId) ||
    typeof row.topicId !== "string" ||
    canonicalSynthesisTopicPathId(row.topicId) !== row.pathId ||
    typeof row.manifestHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(row.manifestHash) ||
    typeof row.artifactHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(row.artifactHash)
  ) {
    throw new Error("canonical_store_receipt_invalid");
  }
  return row as TransactionReceipt;
}

function receiptMatches(
  receipt: TransactionReceipt,
  journal: TransactionJournal,
) {
  return (
    receipt.transactionId === journal.transactionId &&
    receipt.topicId === journal.topicId &&
    receipt.pathId === journal.pathId &&
    receipt.manifestHash === journal.manifestHash &&
    receipt.artifactHash === journal.artifactHash
  );
}

function removeTree(target: string) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: false });
  }
}

function topicPaths(paths: StorePaths, pathId: string) {
  const topicRoot = path.join(paths.topicsRoot, pathId);
  const currentRoot = path.join(topicRoot, "current");
  return {
    topicRoot,
    currentRoot,
    manifestPath: path.join(currentRoot, "manifest.json"),
    artifactPath: path.join(currentRoot, "artifact.json"),
    metadataPath: path.join(currentRoot, "metadata.json"),
    sectionsRoot: path.join(currentRoot, "sections"),
  };
}

function requireRegularFile(filePath: string) {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    throw new InspectInvalid("topic_current_missing_file");
  }
  if (stat.isSymbolicLink()) throw new InspectInvalid("symlink_forbidden");
  if (!stat.isFile()) throw new InspectInvalid("unknown_current_entry");
}

function requireDirectory(directory: string) {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new InspectInvalid("topic_current_missing_file");
  }
  if (stat.isSymbolicLink()) throw new InspectInvalid("symlink_forbidden");
  if (!stat.isDirectory()) throw new InspectInvalid("unknown_current_entry");
}

function parseCurrentJson(filePath: string) {
  requireRegularFile(filePath);
  try {
    return readJson(filePath);
  } catch {
    throw new InspectInvalid("invalid_json");
  }
}

function invalidResult(
  topicId: string,
  diagnostic: SynthesisTopicCanonicalDiagnostic,
): SynthesisTopicCanonicalInspectResult {
  return rebuildSynthesisTopicCanonicalInspectResult({
    status: "invalid",
    topicId,
    pathId: canonicalSynthesisTopicPathId(topicId),
    manifestHash: null,
    artifactHash: null,
    metadataHash: null,
    sections: [],
    diagnostics: [diagnostic],
  });
}

function inspectCurrent(
  paths: StorePaths,
  rawRequest: unknown,
): SynthesisTopicCanonicalInspectResult {
  const request = rebuildSynthesisTopicCanonicalInspectRequest(rawRequest);
  const pathId = canonicalSynthesisTopicPathId(request.topicId);
  const topic = topicPaths(paths, pathId);
  try {
    requireDirectory(paths.topicsRoot);
  } catch (error) {
    if (error instanceof InspectInvalid) {
      return invalidResult(request.topicId, error.diagnostic);
    }
    return invalidResult(request.topicId, "snapshot_invalid");
  }
  if (fs.existsSync(topic.topicRoot)) {
    try {
      requireDirectory(topic.topicRoot);
    } catch (error) {
      if (error instanceof InspectInvalid) {
        return invalidResult(request.topicId, error.diagnostic);
      }
      return invalidResult(request.topicId, "snapshot_invalid");
    }
  }
  if (!fs.existsSync(topic.currentRoot)) {
    return rebuildSynthesisTopicCanonicalInspectResult({
      status: "absent",
      topicId: request.topicId,
      pathId,
      manifestHash: null,
      artifactHash: null,
      metadataHash: null,
      sections: [],
      diagnostics: [],
    });
  }
  try {
    requireDirectory(topic.currentRoot);
    const rootEntries = fs.readdirSync(topic.currentRoot).sort();
    const expectedRootEntries = [
      "artifact.json",
      "manifest.json",
      "metadata.json",
      "sections",
    ];
    if (
      rootEntries.length !== expectedRootEntries.length ||
      rootEntries.some((entry, index) => entry !== expectedRootEntries[index])
    ) {
      throw new InspectInvalid(
        rootEntries.some((entry) => !expectedRootEntries.includes(entry))
          ? "unknown_current_entry"
          : "topic_current_missing_file",
      );
    }
    requireDirectory(topic.sectionsRoot);
    const manifest = parseCurrentJson(topic.manifestPath);
    const artifact = parseCurrentJson(topic.artifactPath);
    const metadata = parseCurrentJson(topic.metadataPath);
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new InspectInvalid("snapshot_invalid");
    }
    const declaredSections = (manifest as Record<string, unknown>).sections;
    if (
      !declaredSections ||
      typeof declaredSections !== "object" ||
      Array.isArray(declaredSections)
    ) {
      throw new InspectInvalid("snapshot_invalid");
    }
    const sections: Record<string, unknown> = {};
    const expectedSectionFiles = Object.keys(
      declaredSections as Record<string, unknown>,
    )
      .map((name) => canonicalSynthesisTopicSectionFileName(name))
      .sort();
    if (new Set(expectedSectionFiles).size !== expectedSectionFiles.length) {
      throw new InspectInvalid("duplicate_section_filename");
    }
    const actualSectionFiles = fs.readdirSync(topic.sectionsRoot).sort();
    if (
      actualSectionFiles.length !== expectedSectionFiles.length ||
      actualSectionFiles.some(
        (entry, index) => entry !== expectedSectionFiles[index],
      )
    ) {
      throw new InspectInvalid(
        actualSectionFiles.some(
          (entry) => !expectedSectionFiles.includes(entry),
        )
          ? "unknown_current_entry"
          : "topic_current_missing_file",
      );
    }
    for (const name of Object.keys(declaredSections).sort()) {
      sections[name] = parseCurrentJson(
        path.join(
          topic.sectionsRoot,
          canonicalSynthesisTopicSectionFileName(name),
        ),
      );
    }
    let snapshot;
    try {
      snapshot = rebuildSynthesisTopicCanonicalSnapshot({
        topicId: request.topicId,
        pathId,
        manifest,
        artifact,
        metadata,
        sections,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("hash")) throw new InspectInvalid("hash_mismatch");
      if (message.includes("collide")) {
        throw new InspectInvalid("duplicate_section_filename");
      }
      if (message.includes("pathId")) {
        throw new InspectInvalid("path_identity_mismatch");
      }
      throw new InspectInvalid("snapshot_invalid");
    }
    return projectSynthesisTopicCanonicalInspectResult(snapshot);
  } catch (error) {
    if (error instanceof InspectInvalid) {
      return invalidResult(request.topicId, error.diagnostic);
    }
    return invalidResult(request.topicId, "snapshot_invalid");
  }
}

function readCurrent(
  paths: StorePaths,
  rawRequest: unknown,
): SynthesisTopicCanonicalReadResult {
  const request = rebuildSynthesisTopicCanonicalInspectRequest(rawRequest);
  const inspected = inspectCurrent(paths, request);
  if (inspected.status !== "ready") {
    return {
      status: inspected.status,
      topicId: inspected.topicId,
      pathId: inspected.pathId,
      snapshot: null,
      diagnostics: inspected.diagnostics,
    };
  }
  try {
    const topic = topicPaths(paths, inspected.pathId);
    const manifest = parseCurrentJson(topic.manifestPath);
    const artifact = parseCurrentJson(topic.artifactPath);
    const metadata = parseCurrentJson(topic.metadataPath);
    const declaredSections = (manifest as Record<string, unknown>).sections;
    if (
      !declaredSections ||
      typeof declaredSections !== "object" ||
      Array.isArray(declaredSections)
    ) {
      throw new InspectInvalid("snapshot_invalid");
    }
    const sections: Record<string, unknown> = {};
    for (const name of Object.keys(declaredSections).sort()) {
      sections[name] = parseCurrentJson(
        path.join(
          topic.sectionsRoot,
          canonicalSynthesisTopicSectionFileName(name),
        ),
      );
    }
    const snapshot = rebuildSynthesisTopicCanonicalSnapshot({
      topicId: inspected.topicId,
      pathId: inspected.pathId,
      manifest,
      artifact,
      metadata,
      sections,
    });
    return {
      status: "ready",
      topicId: inspected.topicId,
      pathId: inspected.pathId,
      snapshot,
      diagnostics: [],
    };
  } catch (error) {
    return {
      status: "invalid",
      topicId: inspected.topicId,
      pathId: inspected.pathId,
      snapshot: null,
      diagnostics: [
        error instanceof InspectInvalid ? error.diagnostic : "snapshot_invalid",
      ],
    };
  }
}

function writeStaging(
  paths: StorePaths,
  snapshot: ReturnType<typeof rebuildSynthesisTopicCanonicalSnapshot>,
) {
  ensureDirectory(paths.stagingRoot);
  ensureDirectory(paths.stagingCurrent);
  const sectionsRoot = path.join(paths.stagingCurrent, "sections");
  ensureDirectory(sectionsRoot);
  writeDurableFile(
    path.join(paths.stagingCurrent, "manifest.json"),
    canonicalSynthesisTopicJsonText(snapshot.manifest),
  );
  writeDurableFile(
    path.join(paths.stagingCurrent, "artifact.json"),
    canonicalSynthesisTopicJsonText(snapshot.artifact),
  );
  writeDurableFile(
    path.join(paths.stagingCurrent, "metadata.json"),
    canonicalSynthesisTopicJsonText(snapshot.metadata),
  );
  for (const [name, value] of Object.entries(snapshot.sections).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    writeDurableFile(
      path.join(sectionsRoot, canonicalSynthesisTopicSectionFileName(name)),
      canonicalSynthesisTopicJsonText(value),
    );
  }
  fsyncDirectory(sectionsRoot);
  fsyncDirectory(paths.stagingCurrent);
  fsyncDirectory(paths.stagingRoot);
}

function recoverTransaction(args: {
  paths: StorePaths;
  journal: TransactionJournal;
  fault?: (point: FaultPoint) => void;
}) {
  const { paths, journal } = args;
  const currentRoot = topicPaths(paths, journal.pathId).currentRoot;
  let committed = journal.phase === "committed";
  if (fs.existsSync(paths.receiptPath)) {
    let receipt: TransactionReceipt;
    try {
      const receiptStat = fs.lstatSync(paths.receiptPath);
      if (receiptStat.isSymbolicLink() || !receiptStat.isFile()) {
        throw new Error();
      }
      receipt = strictReceipt(readJson(paths.receiptPath));
    } catch {
      throw new Error("canonical_store_receipt_invalid");
    }
    committed ||= receiptMatches(receipt, journal);
  }
  if (!committed && journal.phase !== "staged") {
    if (fs.existsSync(currentRoot)) removeTree(currentRoot);
    if (journal.hadCurrent) {
      if (!fs.existsSync(paths.backupCurrent)) {
        throw new Error("canonical_store_recovery_failed");
      }
      const backupStat = fs.lstatSync(paths.backupCurrent);
      if (backupStat.isSymbolicLink() || !backupStat.isDirectory()) {
        throw new Error("canonical_store_recovery_failed");
      }
      args.fault?.("rollback_restore");
      ensureDirectory(path.dirname(currentRoot));
      fs.renameSync(paths.backupCurrent, currentRoot);
      fsyncDirectory(path.dirname(currentRoot));
    }
  }
  if (!committed && journal.phase === "staged" && journal.hadCurrent) {
    if (!fs.existsSync(currentRoot)) {
      throw new Error("canonical_store_recovery_failed");
    }
  }
  removeTree(paths.stagingRoot);
  removeTree(paths.backupRoot);
  if (fs.existsSync(paths.journalPath)) fs.unlinkSync(paths.journalPath);
  fsyncDirectory(paths.root);
}

export function openSynthesisSidecarTopicCanonicalStore(options: {
  profileRuntimeRoot: string;
  profileId: string;
  dataRootId: string;
  fault?: (point: FaultPoint) => void;
}): SynthesisTopicCanonicalStore & { paths: StorePaths } {
  if (!path.isAbsolute(options.profileRuntimeRoot)) {
    throw new Error("canonical_store_runtime_root_invalid");
  }
  const profileId = strictHashId(
    options.profileId,
    "canonical_store_identity_invalid",
  );
  const dataRootId = strictHashId(
    options.dataRootId,
    "canonical_store_identity_invalid",
  );
  const paths = storePaths(options.profileRuntimeRoot, dataRootId);
  ensureDirectory(path.join(options.profileRuntimeRoot, "shadow-canonical"));
  ensureDirectory(paths.root);
  ensureDirectory(paths.topicsRoot);
  const expectedMarker: IdentityMarker = {
    schema: IDENTITY_SCHEMA,
    profileId,
    dataRootId,
    storeSchemaVersion: SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
    storeId: storeId(profileId, dataRootId),
  };
  if (fs.existsSync(paths.markerPath)) {
    let marker: IdentityMarker;
    try {
      const stat = fs.lstatSync(paths.markerPath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error();
      marker = strictMarker(readJson(paths.markerPath));
    } catch {
      throw new Error("canonical_store_identity_invalid");
    }
    if (JSON.stringify(marker) !== JSON.stringify(expectedMarker)) {
      throw new Error("canonical_store_identity_invalid");
    }
  } else {
    writeJsonAtomically(paths.markerPath, expectedMarker);
  }

  let state: SynthesisTopicCanonicalStoreSnapshot["state"] = "ready";
  let busy = false;
  if (fs.existsSync(paths.journalPath)) {
    let journal: TransactionJournal;
    try {
      const stat = fs.lstatSync(paths.journalPath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error();
      journal = strictJournal(readJson(paths.journalPath));
    } catch {
      throw new Error("canonical_store_journal_invalid");
    }
    try {
      recoverTransaction({ paths, journal, fault: options.fault });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "canonical_store_receipt_invalid"
      ) {
        throw error;
      }
      state = "repair_required";
    }
  } else if (
    fs.existsSync(paths.stagingRoot) ||
    fs.existsSync(paths.backupRoot)
  ) {
    throw new Error("canonical_store_orphan_transaction_state");
  }

  const owner: SynthesisTopicCanonicalStore & { paths: StorePaths } = {
    paths,
    inspect(request) {
      return inspectCurrent(paths, request);
    },
    readCurrent(request) {
      return readCurrent(paths, request);
    },
    promote(args) {
      const snapshot = rebuildSynthesisTopicCanonicalSnapshot(args.snapshot);
      if (state !== "ready") return { status: "repair_required" };
      if (busy) return { status: "canonical_store_busy" };
      busy = true;
      try {
        options.fault?.("lock_acquired");
        const current = inspectCurrent(paths, { topicId: snapshot.topicId });
        const basisMatches =
          args.expectedBasis === null
            ? current.status === "absent"
            : current.status === "ready" &&
              current.manifestHash === args.expectedBasis.manifestHash &&
              current.artifactHash === args.expectedBasis.artifactHash;
        if (!basisMatches) return { status: "basis_mismatch" };
        const target = topicPaths(paths, snapshot.pathId);
        const hashes = computeSynthesisTopicCurrentHashes(snapshot);
        const journal: TransactionJournal = {
          schema: JOURNAL_SCHEMA,
          transactionId: crypto.randomUUID(),
          topicId: snapshot.topicId,
          pathId: snapshot.pathId,
          hadCurrent: current.status === "ready",
          phase: "staged",
          manifestHash: hashes.manifestHash,
          artifactHash: hashes.artifactHash,
        };
        ensureDirectory(paths.topicsRoot);
        writeStaging(paths, snapshot);
        options.fault?.("staging_written");
        writeJsonAtomically(paths.journalPath, journal);
        options.fault?.("journal_written");
        ensureDirectory(target.topicRoot);
        if (journal.hadCurrent) {
          ensureDirectory(paths.backupRoot);
          fs.renameSync(target.currentRoot, paths.backupCurrent);
          fsyncDirectory(target.topicRoot);
          journal.phase = "backed_up";
          writeJsonAtomically(paths.journalPath, journal);
          options.fault?.("current_backed_up");
        }
        fs.renameSync(paths.stagingCurrent, target.currentRoot);
        fsyncDirectory(target.topicRoot);
        journal.phase = "promoted";
        writeJsonAtomically(paths.journalPath, journal);
        options.fault?.("current_promoted");
        const receipt: TransactionReceipt = {
          schema: RECEIPT_SCHEMA,
          transactionId: journal.transactionId,
          topicId: journal.topicId,
          pathId: journal.pathId,
          manifestHash: journal.manifestHash,
          artifactHash: journal.artifactHash,
        };
        options.fault?.("receipt_written");
        writeJsonAtomically(paths.receiptPath, receipt);
        journal.phase = "committed";
        writeJsonAtomically(paths.journalPath, journal);
        recoverTransaction({ paths, journal, fault: options.fault });
        return { status: "promoted" };
      } catch (error) {
        if (error instanceof SynthesisTopicCanonicalStoreInterruption) {
          throw error;
        }
        try {
          if (fs.existsSync(paths.journalPath)) {
            recoverTransaction({
              paths,
              journal: strictJournal(readJson(paths.journalPath)),
              fault: options.fault,
            });
          } else {
            removeTree(paths.stagingRoot);
            removeTree(paths.backupRoot);
          }
          return { status: "failed_recovered" };
        } catch {
          state = "repair_required";
          return { status: "repair_required" };
        }
      } finally {
        busy = false;
      }
    },
    snapshot() {
      return {
        state,
        schemaVersion: SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
        storeId: expectedMarker.storeId,
      };
    },
    stopAdmission() {
      if (state === "ready") state = "stopping";
    },
    close() {
      owner.stopAdmission();
    },
  };
  return owner;
}
