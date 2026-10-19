import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../packages/synthesis-engine/src/canonicalJson";
import {
  rebuildSynthesisProtocolDto,
  rebuildSynthesisProtocolWorkerDto,
} from "../../packages/synthesis-contracts/src/protocolSchema.js";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/common.js";
import {
  appendSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
  appendSynthesisProtocolObservation,
} from "./synthesisProtocolExecutionEvidence";
import type { StructureCoverageInput } from "./synthesisProtocolStructureCoverage";

const CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-native-worker-transfer-v1/corpus.json",
);
const PROTOCOL_CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json",
);
const PROTOCOL_REGISTRY_PATH = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json",
);
const WORKER_PROTOCOL_NAME = "synthesis-rust-worker.v1";
const WORKER_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/worker.schema.json";
/**
 * Operations the worker dispatches as direct runs (its deterministic-operation
 * spec has no paged sections); every other registry worker operation is paged.
 */
const DIRECT_RUN_OPERATIONS = new Set([
  "citation_graph_metrics.v1",
  "citation_graph_layout.v2",
]);
const DIRECT_OUTPUT_HEADER_DEFINITIONS: Record<string, string> = {
  "citation_graph_metrics.v1": "CitationGraphMetricsResultHeader",
  "citation_graph_layout.v2": "CitationGraphLayoutResultHeader",
};
const WORKER_READY_TIMEOUT_MS = 20_000;
const WORKER_FRAME_TIMEOUT_MS = 20_000;
const WORKER_GUARD_TIMEOUT_MS = 90_000;

type WorkerCorpusCase = {
  id: string;
  valid: boolean;
  value?: unknown;
  absent?: true;
};

function workerCorpusCase(
  cases: readonly WorkerCorpusCase[],
  operation: string,
  part: string,
  positive: boolean,
): WorkerCorpusCase | undefined {
  const prefix = `worker-${operation.replaceAll(".", "-")}-${part}-`;
  const suffix = positive ? "positive" : "negative";
  if (positive) {
    const primary = cases.find((entry) => entry.id === `${prefix}${suffix}`);
    if (primary) return primary;
  }
  const matches = cases.filter(
    (entry) => entry.id.startsWith(prefix) && entry.id.endsWith(suffix),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function synthesisSidecarWorkerExecutable(root: string) {
  return path.join(
    root,
    "rust/synthesis-sidecar/target/debug",
    `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
  );
}

type WorkerAdmission = "accepted" | "rejected" | "unavailable";
type WorkerTerminal = Record<string, unknown> | "unavailable";

function workerAdmissionOf(terminal: WorkerTerminal): WorkerAdmission {
  if (terminal === "unavailable") return "unavailable";
  return terminal.type === "error" ? "rejected" : "accepted";
}

type WorkerFrame = Record<string, unknown> | string;

function frameLine(frame: WorkerFrame) {
  return (typeof frame === "string" ? frame : JSON.stringify(frame)) + "\n";
}

/** TypeScript production rebuild for the worker error writer contract. */
function rebuildWorkerErrorFrame(value: unknown) {
  return rebuildSynthesisProtocolDto({
    schemaId: WORKER_SCHEMA_ID,
    definition: "WorkerErrorFrame",
    value,
    direction: "request",
  });
}

/** TypeScript production rebuild for a direct-run result contract. */
function rebuildWorkerResult(definition: string, value: unknown) {
  return rebuildSynthesisProtocolDto({
    schemaId: WORKER_SCHEMA_ID,
    definition,
    value,
    direction: "result",
  });
}

/** Drives the real worker binary over its stdin/stdout frame protocol. */
function admitWorkerFrames(
  root: string,
  frames: readonly Record<string, unknown>[],
  onFrame?: (frame: Record<string, unknown>) => void,
): Promise<WorkerTerminal> {
  const executable = synthesisSidecarWorkerExecutable(root);
  if (!fs.existsSync(executable)) return Promise.resolve("unavailable");
  return new Promise<WorkerTerminal>((resolve) => {
    const child = spawn(executable, ["worker"], {
      stdio: ["pipe", "pipe", "ignore"],
    });
    const queue: string[] = [];
    let waiter: ((line: string | undefined) => void) | undefined;
    let buffer = "";
    let settled = false;
    const finish = (outcome: WorkerTerminal) => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      child.kill();
      resolve(outcome);
    };
    const nextLine = (timeoutMs: number) =>
      new Promise<string | undefined>((next) => {
        const queued = queue.shift();
        if (queued !== undefined) return next(queued);
        const timer = setTimeout(() => {
          waiter = undefined;
          next(undefined);
        }, timeoutMs);
        waiter = (line) => {
          clearTimeout(timer);
          next(line);
        };
      });
    const guard = setTimeout(
      () => finish("unavailable"),
      WORKER_GUARD_TIMEOUT_MS,
    );
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      for (;;) {
        const index = buffer.indexOf("\n");
        if (index < 0) break;
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        if (waiter) {
          const pending = waiter;
          waiter = undefined;
          pending(line);
        } else {
          queue.push(line);
        }
      }
    });
    child.on("error", () => finish("unavailable"));
    void (async () => {
      const ready = await nextLine(WORKER_READY_TIMEOUT_MS);
      if (!ready || (JSON.parse(ready) as { type?: string }).type !== "ready") {
        finish("unavailable");
        return;
      }
      child.stdin.write(frames.map(frameLine).join(""));
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const line = await nextLine(WORKER_FRAME_TIMEOUT_MS);
        if (line === undefined) break;
        const frame = JSON.parse(line) as Record<string, unknown>;
        onFrame?.(frame);
        if (
          frame.type === "error" ||
          frame.type === "canceled" ||
          frame.type === "result" ||
          frame.type === "input_ack"
        ) {
          return finish(frame);
        }
      }
      finish("unavailable");
    })();
  });
}

function runBeginFrames(operation: string, header: unknown) {
  const taskId = `corpus:${operation}`;
  return [
    {
      protocol: WORKER_PROTOCOL_NAME,
      type: "run_begin",
      taskId,
      operation,
      requestHash: `sha256:${"0".repeat(64)}`,
      header,
    },
    { protocol: WORKER_PROTOCOL_NAME, type: "cancel", taskId },
  ];
}

function directRunFrames(operation: string, payload: unknown) {
  return [
    {
      protocol: WORKER_PROTOCOL_NAME,
      type: "run",
      taskId: `corpus:${operation}`,
      operation,
      payload,
    },
  ];
}

function inputPageFrames(operation: string, header: unknown, page: unknown) {
  const taskId = `corpus:${operation}`;
  const value = page as { descriptor?: unknown; rows?: unknown } | undefined;
  const line =
    value !== undefined && value !== null && "descriptor" in value
      ? `{"protocol":${JSON.stringify(WORKER_PROTOCOL_NAME)},"type":"input_page","taskId":${JSON.stringify(taskId)},"descriptor":${canonicalizeSynthesisEngineJson(value.descriptor)},"rows":${canonicalizeSynthesisEngineJson(value.rows)}}`
      : JSON.stringify({
          protocol: WORKER_PROTOCOL_NAME,
          type: "input_page",
          taskId,
          ...(value as Record<string, unknown>),
        });
  return [
    {
      protocol: WORKER_PROTOCOL_NAME,
      type: "run_begin",
      taskId,
      operation,
      requestHash: `sha256:${"0".repeat(64)}`,
      header,
    },
    line,
  ];
}

/**
 * The worker's dispatch decides the path: operations in DIRECT_RUN_OPERATIONS
 * send a run frame with the corpus value as payload; every other registry
 * operation sends a run_begin header plus a cancel frame, whose canceled reply
 * attests header admission only, not full run semantics. The negative sample
 * is rejected on that same path.
 */
async function admitRunHeader(
  root: string,
  operation: string,
  header: unknown,
  onFrame?: (frame: Record<string, unknown>) => void,
): Promise<{
  path: "paged" | "run";
  terminal: WorkerTerminal;
  available: boolean;
}> {
  const direct = DIRECT_RUN_OPERATIONS.has(operation);
  const terminal = await admitWorkerFrames(
    root,
    direct
      ? directRunFrames(operation, header)
      : runBeginFrames(operation, header),
    onFrame,
  );
  return {
    path: direct ? "run" : "paged",
    terminal,
    available: terminal !== "unavailable",
  };
}

type Corpus = {
  schema: string;
  lifecycle: string[];
  request: Record<string, unknown>;
};

export async function checkSynthesisWorkerStructureWitnesses(
  witnesses: readonly Parameters<
    NonNullable<StructureCoverageInput["onWitness"]>
  >[0][],
  root = process.cwd(),
) {
  const registry = JSON.parse(
    fs.readFileSync(PROTOCOL_REGISTRY_PATH, "utf8"),
  ) as {
    workers: Array<{ operation: string; runHeaderSchemaRef: string }>;
  };
  const operations = new Map(
    registry.workers.map((worker) => [
      worker.runHeaderSchemaRef,
      worker.operation,
    ]),
  );
  const identity = synthesisProtocolExecutionIdentity(root);
  const verified: string[] = [];
  const divergences: string[] = [];
  const unavailable: string[] = [];
  const deferred: string[] = [];
  const seeds = new Map<string, boolean>();
  const outcomes = new Map<string, WorkerTerminal>();
  for (const witness of witnesses) {
    const operation = operations.get(witness.root.schemaRef);
    if (
      operation &&
      witness.expectValid &&
      witness.root.valid &&
      Buffer.byteLength(JSON.stringify(witness.root.value)) <= 512 * 1024
    ) {
      const key = JSON.stringify([operation, witness.root.value]);
      if (!outcomes.has(key)) {
        const outcome = await admitRunHeader(
          root,
          operation,
          witness.root.value,
        );
        outcomes.set(key, outcome.terminal);
      }
      const terminal = outcomes.get(key)!;
      if (
        terminal !== "unavailable" &&
        ["result", "canceled"].includes(String(terminal.type))
      ) {
        if (terminal.type === "result")
          rebuildWorkerResult(
            DIRECT_OUTPUT_HEADER_DEFINITIONS[operation],
            terminal.result,
          );
        else rebuildWorkerErrorFrame(terminal);
        verified.push(witness.obligationId);
        if (identity)
          appendSynthesisProtocolExecutionEvidence(
            identity,
            `structure:${witness.obligationId}`,
            "verified",
          );
      } else if (terminal === "unavailable") {
        unavailable.push(witness.obligationId);
      } else {
        divergences.push(
          `${operation}:${witness.obligationId}:${terminal.type}:${terminal.code || ""}`,
        );
        if (identity)
          appendSynthesisProtocolExecutionEvidence(
            identity,
            `structure:${witness.obligationId}`,
            "diverged",
          );
      }
      continue;
    }
    if (
      !operation ||
      !witness.keyword ||
      witness.expectValid ||
      witness.root.valid
    )
      continue;
    if (
      !witness.root.errors?.some(
        (error) =>
          (error.keyword === witness.keyword ||
            (witness.keyword === "unevaluatedProperties" &&
              error.keyword === "additionalProperties")) &&
          error.instancePath === witness.instancePath,
      )
    )
      continue;
    const seedKey = JSON.stringify([operation, witness.root.seedValue]);
    const key = JSON.stringify([operation, witness.root.value]);
    // Frame capacity is transport evidence, not proof of a nested constraint.
    if (
      Buffer.byteLength(key) > 512 * 1024 ||
      Buffer.byteLength(seedKey) > 512 * 1024
    )
      continue;
    if (!seeds.has(seedKey)) {
      const seed = await admitRunHeader(
        root,
        operation,
        witness.root.seedValue,
      );
      seeds.set(seedKey, workerAdmissionOf(seed.terminal) === "accepted");
    }
    if (!seeds.get(seedKey)) continue;
    if (!outcomes.has(key)) {
      const outcome = await admitRunHeader(root, operation, witness.root.value);
      outcomes.set(key, outcome.terminal);
    }
    const terminal = outcomes.get(key)!;
    if (terminal === "unavailable") {
      unavailable.push(witness.obligationId);
      continue;
    }
    // Cancellation proves framing admission; deferred compute validation is unobserved.
    if (terminal.type === "canceled") {
      deferred.push(witness.obligationId);
      continue;
    }
    if (terminal.type === "error" && terminal.code === "invalid_request") {
      rebuildWorkerErrorFrame(terminal);
      verified.push(witness.obligationId);
      if (identity)
        appendSynthesisProtocolExecutionEvidence(
          identity,
          `structure:${witness.obligationId}`,
          "verified",
        );
    } else {
      divergences.push(
        `${operation}:${witness.obligationId}:${terminal.type}:${terminal.code || ""}`,
      );
      if (identity)
        appendSynthesisProtocolExecutionEvidence(
          identity,
          `structure:${witness.obligationId}`,
          "diverged",
        );
    }
  }

  return {
    verified,
    divergences,
    unavailable,
    deferred,
  };
}

export function inspectSynthesisNativeWorkerTransferOwnership(root: string) {
  const runtimeRoot = path.join(
    root,
    "rust/synthesis-sidecar/crates/synthesis-sidecar/src",
  );
  const read = (name: string) =>
    fs.readFileSync(path.join(runtimeRoot, name), "utf8");
  const transfer = read("runtime_transfer.rs");
  const worker = read("runtime_worker.rs");
  const pool = read("runtime_worker_pool.rs");
  const service = read("runtime_service.rs");
  const transport = read("runtime_server_loop.rs");
  const capabilities = read("runtime_capabilities.rs");
  const library = read("lib.rs");
  const main = read("main.rs");
  const workerPoolTest = fs.readFileSync(
    path.join(
      root,
      "rust/synthesis-sidecar/crates/synthesis-sidecar/tests/native_worker_pool.rs",
    ),
    "utf8",
  );
  const errors: string[] = [];
  if (transfer.includes("synthesis_citation_graph_build")) {
    errors.push("transfer_imports_graph_kernel");
  }
  for (const [name, source] of [
    ["worker", worker],
    ["worker_pool", pool],
  ] as const) {
    for (const authority of [
      "synthesis_repository",
      "synthesis_canonical_store",
      "WorkbenchApplication",
      "NativeLaunchConfig",
    ]) {
      if (source.includes(authority)) {
        errors.push(`${name}_imports_${authority}`);
      }
    }
  }
  if (service.includes("enum WorkerCommand")) {
    errors.push("service_owns_worker_framing");
  }
  if (service.includes("match call.capability.as_str()")) {
    errors.push("service_owns_capability_dispatch");
  }
  if (
    !service.includes("struct RunningRuntime") ||
    !service.includes("publish_discovery") ||
    !service.includes("fn shutdown")
  ) {
    errors.push("service_missing_lifecycle_ownership");
  }
  for (const authority of [
    "BackgroundTaskOwner",
    "NativeComputePool",
    "NativeTransferOwner",
    "RuntimeOwnership",
    "publish_discovery",
    "canonical_autosync",
    "shutdown_incomplete",
  ]) {
    if (transport.includes(authority)) {
      errors.push(`transport_owns_${authority}`);
    }
  }
  if (
    !transport.includes("struct SidecarTransport") ||
    !transport.includes("fn begin_shutdown") ||
    !transport.includes("fn drain")
  ) {
    errors.push("transport_missing_bounded_connection_ownership");
  }
  if (/canonical\s*\.owner\s*\(/u.test(capabilities)) {
    errors.push("capability_ingress_acquires_canonical_owner");
  }
  if (capabilities.includes("TransferDispatch::Execute")) {
    errors.push("capability_ingress_owns_transfer_execution");
  }
  if (
    !library.includes("mod runtime_service;") ||
    !library.includes("pub use runtime_service::serve;") ||
    main.includes("mod runtime_service;")
  ) {
    errors.push("library_missing_runtime_graph_ownership");
  }
  if (workerPoolTest.includes("#[path")) {
    errors.push("worker_pool_test_recompiles_production_source");
  }
  return errors;
}

export async function checkSynthesisNativeWorkerTransferParity(
  root = process.cwd(),
) {
  const source = fs.readFileSync(CORPUS_PATH, "utf8");
  const corpus = JSON.parse(source) as Corpus;
  const request = rebuildSynthesisCitationGraphBuildRequest(corpus.request);
  const pages = [
    buildSynthesisCitationGraphBuildTransferPage(
      "library_nodes",
      0,
      request.libraryNodes,
    ),
    buildSynthesisCitationGraphBuildTransferPage(
      "references",
      0,
      request.references,
    ),
  ].map((page) => rebuildSynthesisCitationGraphBuildTransferPage(page));
  const manifest = rebuildSynthesisCitationGraphBuildTransferManifest(
    buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: request.contractVersion,
        scope: request.scope,
        rolePriority: request.rolePriority,
      },
      pages: pages.map((page) => page.descriptor),
    }),
  );
  const expected =
    await createInProcessSynthesisCitationGraphBuildEngine().compute(request);
  const canonicalResult = canonicalizeSynthesisEngineJson(expected);
  const rust = spawnSync(
    "cargo",
    [
      "+nightly-2026-07-25",
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "rust/synthesis-sidecar/Cargo.toml",
      "-p",
      "synthesis-sidecar",
      "--example",
      "native_worker_transfer_parity",
    ],
    { cwd: root, encoding: "utf8", input: source },
  );
  if (rust.status !== 0) {
    throw new Error(rust.stderr || `Rust checker exited ${rust.status}`);
  }
  const rustResult = JSON.parse(rust.stdout) as {
    schema: string;
    lifecycle: string[];
    canonicalResult: string;
    resultSha256: string;
  };
  const errors = inspectSynthesisNativeWorkerTransferOwnership(root);
  const protocolCorpusSource = fs.readFileSync(PROTOCOL_CORPUS_PATH, "utf8");
  const protocolCorpus = JSON.parse(protocolCorpusSource) as {
    schema: string;
    cases: WorkerCorpusCase[];
  };
  const privateCorpusTest = spawnSync(
    "cargo",
    [
      "+nightly-2026-07-25",
      "test",
      "--quiet",
      "--locked",
      "--manifest-path",
      "rust/synthesis-sidecar/Cargo.toml",
      "-p",
      "synthesis-sidecar",
      "--lib",
      "corpus_parity",
      "--",
      "--nocapture",
      "--test-threads=1",
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (privateCorpusTest.status !== 0) {
    errors.push(
      `worker_private_corpus_test_failed:${(privateCorpusTest.stderr || privateCorpusTest.stdout || "").trim().slice(0, 240)}`,
    );
  }
  const executionIdentity = synthesisProtocolExecutionIdentity(root);
  const registry = JSON.parse(
    fs.readFileSync(PROTOCOL_REGISTRY_PATH, "utf8"),
  ) as {
    workers: Array<{
      operation: string;
      runHeaderSchemaRef: string;
      inputSectionSchemaRef: string;
      outputHeaderSchemaRef: string;
      outputSectionSchemaRef: string;
      errorSchemaRef: string;
    }>;
  };
  const coveredSlots = new Set<string>();
  const directResults = new Map<
    string,
    { terminal: WorkerTerminal; frames: Record<string, unknown>[] }
  >();
  const sectionSample = protocolCorpus.cases.find(
    (entry) =>
      entry.valid &&
      (entry.value as { descriptor?: unknown } | undefined)?.descriptor,
  )?.value;
  const sectionlessRun = (operation: string) => {
    const run = directResults.get(operation);
    return (
      run !== undefined &&
      run.terminal !== "unavailable" &&
      run.terminal.type === "result" &&
      run.frames.length > 0 &&
      run.frames.every((frame) =>
        ["result", "progress"].includes(String(frame.type)),
      )
    );
  };
  const runHeaderAdmissions: Array<{
    operation: string;
    path: "paged" | "run";
    accepted: boolean;
    rejected: boolean;
  }> = [];
  for (const worker of registry.workers) {
    const operation = worker.operation;
    const positive = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "runHeader",
      true,
    );
    const negative = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "runHeader",
      false,
    );
    if (!positive || !negative) {
      errors.push(`worker_corpus_case_missing:${operation}:runHeader`);
      continue;
    }
    const frames: Record<string, unknown>[] = [];
    const admission = await admitRunHeader(
      root,
      operation,
      positive.value,
      (frame) => frames.push(frame),
    );
    if (admission.path === "run")
      directResults.set(operation, { terminal: admission.terminal, frames });
    if (!admission.available) {
      errors.push(`worker_process_unavailable:${operation}`);
      continue;
    }
    const accepted = workerAdmissionOf(admission.terminal) === "accepted";
    const negativeOutcome =
      admission.path === "paged"
        ? await admitWorkerFrames(
            root,
            runBeginFrames(operation, negative.value),
          )
        : await admitWorkerFrames(
            root,
            directRunFrames(operation, negative.value),
          );
    const rejected = workerAdmissionOf(negativeOutcome) === "rejected";
    runHeaderAdmissions.push({
      operation,
      path: admission.path,
      accepted,
      rejected,
    });
    if (!accepted || !rejected) {
      errors.push(
        `worker_run_header_admission_gap:${operation}:${admission.path}:${accepted ? "accepted" : "not_accepted"}:${rejected ? "rejected" : "not_rejected"}`,
      );
      continue;
    }
    coveredSlots.add(`${operation}:runHeader`);
    if (executionIdentity) {
      appendSynthesisProtocolObservation(
        executionIdentity,
        worker.runHeaderSchemaRef,
        positive.value,
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:runHeader`,
        "accepted",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:runHeader`,
        "rejected",
      );
    }
  }
  const errorAdmissions: Array<{
    operation: string;
    accepted: boolean;
    rejected: boolean;
  }> = [];
  for (const worker of registry.workers) {
    const operation = worker.operation;
    const negative = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "runHeader",
      false,
    );
    const negativeError = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "error",
      false,
    );
    if (!negative || !negativeError) {
      errors.push(`worker_corpus_case_missing:${operation}:error`);
      continue;
    }
    // The error frame is a production writer output: drive the real worker to
    // emit one, then admit it through the TypeScript production rebuild.
    const emitted = await admitWorkerFrames(
      root,
      runBeginFrames(operation, negative.value),
    );
    let accepted = false;
    if (typeof emitted !== "string" && emitted.type === "error") {
      try {
        rebuildWorkerErrorFrame(emitted);
        accepted = true;
      } catch {
        errors.push(`worker_error_frame_rejected_by_contract:${operation}`);
      }
    }
    // Receiver negative: the corpus's out-of-enum code applied to the real
    // production frame, so rejection is attributable to the TypeScript rebuild.
    const negativeCode = (negativeError.value as { code?: unknown }).code;
    let rejected = false;
    if (typeof emitted !== "string") {
      try {
        rebuildWorkerErrorFrame({ ...emitted, code: negativeCode });
      } catch (error) {
        rejected =
          error instanceof SynthesisClientError &&
          error.code === "invalid_request";
      }
    }
    errorAdmissions.push({ operation, accepted, rejected });
    if (!accepted || !rejected) {
      errors.push(
        `worker_error_admission_gap:${operation}:${accepted ? "accepted" : "not_accepted"}:${rejected ? "rejected" : "not_rejected"}`,
      );
      continue;
    }
    coveredSlots.add(`${operation}:error`);
    if (executionIdentity) {
      appendSynthesisProtocolObservation(
        executionIdentity,
        worker.errorSchemaRef,
        emitted,
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:error`,
        "accepted",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:error`,
        "rejected",
      );
    }
  }
  const inputSectionAdmissions: Array<{
    operation: string;
    accepted: boolean;
    rejected: boolean;
  }> = [];
  for (const worker of registry.workers) {
    const operation = worker.operation;
    if (DIRECT_RUN_OPERATIONS.has(operation)) {
      const runHeader = workerCorpusCase(
        protocolCorpus.cases,
        operation,
        "runHeader",
        true,
      );
      if (!runHeader || sectionSample === undefined) continue;
      // These operations define no input section: a sectioned frame is refused
      // and the no-section direct run is the accepted transport.
      const accepted =
        sectionlessRun(operation) &&
        workerCorpusCase(protocolCorpus.cases, operation, "inputSection", true)
          ?.absent === true;
      const illegal = await admitWorkerFrames(root, [
        {
          ...directRunFrames(operation, runHeader.value)[0],
          sections: [sectionSample],
        },
      ]);
      const rejected =
        illegal !== "unavailable" &&
        illegal.type === "error" &&
        illegal.code === "invalid_request";
      if (rejected) rebuildWorkerErrorFrame(illegal);
      inputSectionAdmissions.push({ operation, accepted, rejected });
      if (!accepted || !rejected) continue;
      coveredSlots.add(`${operation}:inputSection`);
      if (executionIdentity) {
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:inputSection`,
          "accepted",
        );
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:inputSection`,
          "rejected",
        );
      }
      continue;
    }
    const header = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "runHeader",
      true,
    );
    const positive = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "inputSection",
      true,
    );
    const negative = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "inputSection",
      false,
    );
    const descriptor = (
      positive?.value as { descriptor?: Record<string, unknown> } | undefined
    )?.descriptor;
    if (
      !header ||
      !positive ||
      !negative ||
      !descriptor ||
      !("section" in descriptor)
    ) {
      continue;
    }
    const accepted =
      workerAdmissionOf(
        await admitWorkerFrames(
          root,
          inputPageFrames(operation, header.value, positive.value),
        ),
      ) === "accepted";
    const rejected =
      workerAdmissionOf(
        await admitWorkerFrames(
          root,
          inputPageFrames(operation, header.value, negative.value),
        ),
      ) === "rejected";
    inputSectionAdmissions.push({ operation, accepted, rejected });
    if (!accepted || !rejected) continue;
    coveredSlots.add(`${operation}:inputSection`);
    if (executionIdentity) {
      appendSynthesisProtocolObservation(
        executionIdentity,
        worker.inputSectionSchemaRef,
        positive.value,
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:inputSection`,
        "accepted",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:inputSection`,
        "rejected",
      );
    }
  }
  if (rustResult.schema !== corpus.schema) errors.push("schema_mismatch");
  if (
    JSON.stringify(rustResult.lifecycle) !== JSON.stringify(corpus.lifecycle)
  ) {
    errors.push("lifecycle_mismatch");
  }
  if (rustResult.canonicalResult !== canonicalResult) {
    errors.push("canonical_result_mismatch");
  }
  if (rustResult.resultSha256 !== hashSynthesisEngineCanonicalJson(expected)) {
    errors.push("result_hash_mismatch");
  }
  const outputHeaderAdmissions: Array<{
    operation: string;
    accepted: boolean;
    rejected: boolean;
  }> = [];
  for (const operation of DIRECT_RUN_OPERATIONS) {
    const runHeader = workerCorpusCase(
      protocolCorpus.cases,
      operation,
      "runHeader",
      true,
    );
    const definition = DIRECT_OUTPUT_HEADER_DEFINITIONS[operation];
    if (!runHeader || !definition) continue;
    // The direct run's result frame is production output; the receiver admits it
    // and rejects the same frame once an unknown field is added.
    const emitted = directResults.get(operation)?.terminal ?? "unavailable";
    let accepted = false;
    let rejected = false;
    if (typeof emitted !== "string" && emitted.type === "result") {
      const result = emitted.result;
      try {
        rebuildWorkerResult(definition, result);
        accepted = true;
      } catch {
        errors.push(`worker_result_rejected_by_contract:${operation}`);
      }
      if (result !== null && typeof result === "object") {
        try {
          rebuildWorkerResult(definition, {
            ...(result as Record<string, unknown>),
            __unexpected: true,
          });
        } catch {
          rejected = true;
        }
      }
    }
    outputHeaderAdmissions.push({ operation, accepted, rejected });
    if (!accepted || !rejected) continue;
    coveredSlots.add(`${operation}:outputHeader`);
    if (executionIdentity) {
      const entry = registry.workers.find(
        (worker) => worker.operation === operation,
      )!;
      appendSynthesisProtocolObservation(
        executionIdentity,
        entry.outputHeaderSchemaRef,
        (emitted as { result: unknown }).result,
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:outputHeader`,
        "accepted",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:outputHeader`,
        "rejected",
      );
    }
  }
  const sectionlessOutputAdmissions: Array<{
    operation: string;
    accepted: boolean;
    rejected: boolean;
  }> = [];
  for (const worker of registry.workers) {
    const operation = worker.operation;
    if (!DIRECT_RUN_OPERATIONS.has(operation)) continue;
    // Absence is observed on a real result; it is never a fabricated section DTO.
    const accepted =
      sectionlessRun(operation) &&
      outputHeaderAdmissions.some(
        (entry) => entry.operation === operation && entry.accepted,
      ) &&
      workerCorpusCase(protocolCorpus.cases, operation, "outputSection", true)
        ?.absent === true;
    let rejected = false;
    if (sectionSample !== undefined) {
      try {
        rebuildSynthesisProtocolWorkerDto({
          operation,
          part: "outputSection",
          value: sectionSample,
        });
      } catch (error) {
        rejected =
          error instanceof SynthesisClientError &&
          error.code === "invalid_request";
      }
    }
    sectionlessOutputAdmissions.push({ operation, accepted, rejected });
    if (!accepted || !rejected) continue;
    coveredSlots.add(`${operation}:outputSection`);
    if (executionIdentity) {
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:outputSection`,
        "accepted",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `${operation}:outputSection`,
        "rejected",
        "typescript",
      );
    }
  }
  const pagedOutputAdmissions: Array<{
    operation: string;
    headerAccepted: boolean;
    headerRejected: boolean;
    sectionAccepted: boolean;
    sectionRejected: boolean;
  }> = [];
  for (const line of (privateCorpusTest.stdout ?? "").split(/\r?\n/)) {
    // libtest writes its progress dot on the same line before test output.
    const marker = line.indexOf("WORKER_PAGED_OUTPUT ");
    if (marker < 0) continue;
    const rest = line.slice(marker + "WORKER_PAGED_OUTPUT ".length);
    const separator = rest.indexOf(" ");
    if (separator < 0) continue;
    const operation = rest.slice(0, separator);
    const entry = registry.workers.find(
      (worker) => worker.operation === operation,
    );
    if (!entry) continue;
    const headerDefinition = (entry.outputHeaderSchemaRef ?? "").split(
      "#/$defs/",
    )[1];
    const sectionDefinition = (entry.outputSectionSchemaRef ?? "").split(
      "#/$defs/",
    )[1];
    if (!headerDefinition || !sectionDefinition) continue;
    const emitted = JSON.parse(rest.slice(separator + 1)) as {
      header: unknown;
      section: unknown;
    };
    const admits = (definition: string, value: unknown) => {
      try {
        rebuildWorkerResult(definition, value);
        return true;
      } catch {
        return false;
      }
    };
    const headerAccepted = admits(headerDefinition, emitted.header);
    const headerRejected = !admits(headerDefinition, {
      ...(emitted.header as Record<string, unknown>),
      __unexpected: true,
    });
    const sectionAccepted = admits(sectionDefinition, emitted.section);
    const sectionRejected = !admits(sectionDefinition, {
      ...(emitted.section as Record<string, unknown>),
      __unexpected: true,
    });
    pagedOutputAdmissions.push({
      operation,
      headerAccepted,
      headerRejected,
      sectionAccepted,
      sectionRejected,
    });
    if (headerAccepted && headerRejected) {
      coveredSlots.add(`${operation}:outputHeader`);
      if (executionIdentity) {
        appendSynthesisProtocolObservation(
          executionIdentity,
          entry.outputHeaderSchemaRef,
          emitted.header,
        );
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:outputHeader`,
          "accepted",
        );
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:outputHeader`,
          "rejected",
        );
      }
    }
    if (sectionAccepted && sectionRejected) {
      coveredSlots.add(`${operation}:outputSection`);
      if (executionIdentity) {
        appendSynthesisProtocolObservation(
          executionIdentity,
          entry.outputSectionSchemaRef,
          emitted.section,
        );
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:outputSection`,
          "accepted",
        );
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${operation}:outputSection`,
          "rejected",
        );
      }
    }
  }
  const workerSlotIds = registry.workers.flatMap((worker) =>
    ["runHeader", "inputSection", "outputHeader", "outputSection", "error"].map(
      (part) => `${worker.operation}:${part}`,
    ),
  );
  const uncoveredSlots = workerSlotIds.filter((id) => !coveredSlots.has(id));
  return {
    ok: errors.length === 0,
    schema: corpus.schema,
    lifecycleActions: corpus.lifecycle.length,
    inputPages: pages.length,
    inputBytes: manifest.pages.reduce(
      (total, page) => total + page.byteLength,
      0,
    ),
    resultSha256: rustResult.resultSha256,
    protocolCorpusCases: protocolCorpus.cases.length,
    workerRunHeaderAdmissions: runHeaderAdmissions,
    workerErrorAdmissions: errorAdmissions,
    workerInputSectionAdmissions: inputSectionAdmissions,
    workerOutputHeaderAdmissions: outputHeaderAdmissions,
    workerSectionlessOutputAdmissions: sectionlessOutputAdmissions,
    workerPagedOutputAdmissions: pagedOutputAdmissions,
    workerSlots: {
      total: workerSlotIds.length,
      covered: coveredSlots.size,
      uncovered: uncoveredSlots,
    },
    executionConsistency: errors.length === 0,
    coverageComplete: workerSlotIds.length > 0 && uncoveredSlots.length === 0,
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await checkSynthesisNativeWorkerTransferParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
