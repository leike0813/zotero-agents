import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const evidenceDirectory = (kind: "execution" | "observations") =>
  process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR
    ? path.join(process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR, kind)
    : path.join(root, `.scaffold/test/synthesis-protocol-${kind}`);
const evidenceFile = (identity: string) =>
  path.join(evidenceDirectory("execution"), `${identity}.jsonl`);

export type SynthesisProtocolExecutionEvidence = {
  identity: string;
  slot: string;
  outcome: "accepted" | "rejected" | "persisted" | "diverged" | "verified";
  implementation: "native-process" | "typescript-rebuilder";
  executor?: "rust" | "typescript";
  stage?: "typed-row-array" | "schema-predicate" | "request-decoder";
};

export type SynthesisProtocolExecutionScopeOptions = {
  workspaceRoot?: string;
  executable?: string;
};

export type SynthesisProtocolExecutionScope = Readonly<{
  identity: string | undefined;
  end(): void;
}>;

export class SynthesisProtocolExecutionIdentityChangedError extends Error {
  readonly code = "synthesis_protocol_execution_identity_changed";

  constructor() {
    super(
      "Synthesis protocol execution sources or executable changed during the run",
    );
    this.name = "SynthesisProtocolExecutionIdentityChangedError";
  }
}

type ActiveSynthesisProtocolExecutionScope = {
  workspaceRoot: string;
  executable: string;
  identity: string | undefined;
};

const activeScopes: ActiveSynthesisProtocolExecutionScope[] = [];

function synthesisProtocolExecutable(
  workspaceRoot: string,
  executable?: string,
) {
  if (executable) return path.resolve(workspaceRoot, executable);
  const target = process.env.CARGO_TARGET_DIR
    ? path.resolve(workspaceRoot, process.env.CARGO_TARGET_DIR)
    : path.join(workspaceRoot, "rust/synthesis-sidecar/target");
  return path.join(
    target,
    "debug",
    `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
  );
}

function computeSynthesisProtocolExecutionIdentity(
  workspaceRoot: string,
  executablePath: string,
) {
  const hash = createHash("sha256");
  const add = (directory: string) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) add(file);
      else if (/\.(?:json|ts|mjs|rs|sql)$/.test(entry.name))
        hash
          .update(path.relative(workspaceRoot, file))
          .update(fs.readFileSync(file));
    }
  };
  for (const directory of [
    "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1",
    "packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1",
    "packages/synthesis-contracts/src",
    "src/modules/synthesisClient",
    "src/modules/synthesis/sidecar",
    "src/modules/synthesis/reverseHost",
    "src/modules/zoteroHost",
    "workflows_builtin",
    "rust/synthesis-sidecar/crates",
    "tests/helpers",
    "tests/fixtures",
    "tests/synthesis",
    "tests/workflow-literature-analysis",
    "tests/workflow-literature-workbench-package",
  ]) {
    const fullPath = path.join(workspaceRoot, directory);
    if (!fs.existsSync(fullPath)) return undefined;
    add(fullPath);
  }
  for (const relative of [
    "scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts",
    "scripts/synthesis/check-synthesis-cross-language-contracts.ts",
    "scripts/synthesis/synthesisProtocolStructureCoverage.ts",
    "scripts/synthesis/synthesisProtocolExecutionEvidence.ts",
  ]) {
    const file = path.join(workspaceRoot, relative);
    if (!fs.existsSync(file)) return undefined;
    hash.update(relative).update(fs.readFileSync(file));
  }
  const hostBroker = path.join(
    workspaceRoot,
    "src/modules/zoteroHostCapabilityBroker.ts",
  );
  if (!fs.existsSync(hostBroker)) return undefined;
  hash.update(fs.readFileSync(hostBroker));
  if (!fs.existsSync(executablePath)) return undefined;
  hash.update(fs.readFileSync(executablePath));
  return hash.digest("hex");
}

function activeExecutionScope(workspaceRoot: string, executablePath: string) {
  return activeScopes.findLast(
    (scope) =>
      scope.workspaceRoot === workspaceRoot &&
      scope.executable === executablePath,
  );
}

export function synthesisProtocolExecutionIdentity(
  workspaceRoot = root,
  executable?: string,
) {
  const normalizedRoot = path.resolve(workspaceRoot);
  const executablePath = synthesisProtocolExecutable(
    normalizedRoot,
    executable,
  );
  const scope = activeExecutionScope(normalizedRoot, executablePath);
  return scope
    ? scope.identity
    : computeSynthesisProtocolExecutionIdentity(normalizedRoot, executablePath);
}

export function beginSynthesisProtocolExecutionScope(
  options: SynthesisProtocolExecutionScopeOptions = {},
): SynthesisProtocolExecutionScope {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? root);
  const executable = synthesisProtocolExecutable(
    workspaceRoot,
    options.executable,
  );
  if (activeExecutionScope(workspaceRoot, executable)) {
    throw new Error("synthesis_protocol_execution_scope_already_active");
  }
  const scope: ActiveSynthesisProtocolExecutionScope = {
    workspaceRoot,
    executable,
    identity: computeSynthesisProtocolExecutionIdentity(
      workspaceRoot,
      executable,
    ),
  };
  activeScopes.push(scope);
  let ended = false;
  return {
    identity: scope.identity,
    end() {
      if (ended) return;
      ended = true;
      const index = activeScopes.indexOf(scope);
      if (index >= 0) activeScopes.splice(index, 1);
      if (
        computeSynthesisProtocolExecutionIdentity(workspaceRoot, executable) !==
        scope.identity
      ) {
        throw new SynthesisProtocolExecutionIdentityChangedError();
      }
    },
  };
}

export function appendSynthesisProtocolExecutionEvidence(
  identity: string,
  slot: string,
  outcome: SynthesisProtocolExecutionEvidence["outcome"],
  executor?: SynthesisProtocolExecutionEvidence["executor"],
  stage?: SynthesisProtocolExecutionEvidence["stage"],
) {
  const file = evidenceFile(identity);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(
    file,
    `${JSON.stringify({
      identity,
      slot,
      outcome,
      implementation:
        executor === "typescript" ? "typescript-rebuilder" : "native-process",
      executor:
        executor ?? (slot.startsWith("structure:") ? "rust" : undefined),
      ...(stage ? { stage } : {}),
    })}\n`,
    "utf8",
  );
}

export function readSynthesisProtocolExecutionEvidence() {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity) return [];
  const file = evidenceFile(identity);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .flatMap((line): SynthesisProtocolExecutionEvidence[] => {
      if (!line) return [];
      try {
        const record = JSON.parse(line);
        return record.identity === identity &&
          ["native-process", "typescript-rebuilder"].includes(
            record.implementation,
          ) &&
          typeof record.slot === "string" &&
          [
            "accepted",
            "rejected",
            "persisted",
            "diverged",
            "verified",
          ].includes(record.outcome)
          ? [record]
          : [];
      } catch {
        return [];
      }
    });
}

const observedSamples = new Set<string>();
const observationFile = (identity: string) =>
  path.join(evidenceDirectory("observations"), `${identity}.jsonl`);

/** Synthetic test values only; call after native consumption or production emission is established. */
export function appendSynthesisProtocolObservation(
  identity: string,
  schemaRef: string,
  value: unknown,
) {
  const source = JSON.stringify({
    identity,
    schemaRef,
    value,
    implementation: "native-process",
  });
  if (Buffer.byteLength(source) > 512 * 1024) return;
  const file = observationFile(identity);
  const key = createHash("sha256").update(file).update(source).digest("hex");
  if (observedSamples.has(key)) return;
  observedSamples.add(key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${source}\n`, "utf8");
}

export function readSynthesisProtocolObservations() {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity || !fs.existsSync(observationFile(identity))) return [];
  const samples = new Map<
    string,
    { id: string; schemaRef: string; valid: boolean; value: unknown }
  >();
  for (const line of fs
    .readFileSync(observationFile(identity), "utf8")
    .split(/\r?\n/)) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (
        record.identity !== identity ||
        record.implementation !== "native-process" ||
        typeof record.schemaRef !== "string"
      )
        continue;
      const id = createHash("sha256").update(line).digest("hex");
      samples.set(id, {
        id,
        schemaRef: record.schemaRef,
        valid: true,
        value: record.value,
      });
    } catch {
      // An interrupted observation is not execution evidence.
    }
  }
  return [...samples.values()];
}
