import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../packages/synthesis-engine/src/citationGraphBuild";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../packages/synthesis-engine/src/canonicalJson";

const CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-native-worker-transfer-v1/corpus.json",
);
const PROTOCOL_CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json",
);

type Corpus = {
  schema: string;
  lifecycle: string[];
  request: Record<string, unknown>;
};

function assertOwnership(root: string) {
  const runtimeRoot = path.join(
    root,
    "native/synthesis-sidecar/crates/synthesis-sidecar/src",
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
      "native/synthesis-sidecar/crates/synthesis-sidecar/tests/native_worker_pool.rs",
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
      "native/synthesis-sidecar/Cargo.toml",
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
  const errors = assertOwnership(root);
  const protocolCorpusSource = fs.readFileSync(PROTOCOL_CORPUS_PATH, "utf8");
  const protocolCorpus = JSON.parse(protocolCorpusSource) as {
    schema: string;
    cases: Array<{ id: string; valid: boolean }>;
  };
  const rustProtocol = spawnSync(
    "cargo",
    [
      "+nightly-2026-07-25",
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "native/synthesis-sidecar/Cargo.toml",
      "-p",
      "synthesis-sidecar",
      "--example",
      "worker_protocol_corpus_parity",
    ],
    { cwd: root, encoding: "utf8", input: protocolCorpusSource },
  );
  if (rustProtocol.status !== 0) {
    errors.push(`worker_protocol_rust_failed:${rustProtocol.stderr.trim()}`);
  } else {
    const result = JSON.parse(rustProtocol.stdout) as {
      schema: string;
      cases: Array<{ id: string; accepted: boolean }>;
    };
    const expected = new Map(
      protocolCorpus.cases.map((entry) => [entry.id, entry.valid]),
    );
    if (result.schema !== protocolCorpus.schema) {
      errors.push("worker_protocol_schema_mismatch");
    }
    for (const entry of result.cases) {
      if (entry.accepted !== expected.get(entry.id)) {
        errors.push(`worker_protocol_case_mismatch:${entry.id}`);
      }
      expected.delete(entry.id);
    }
    for (const id of expected.keys()) {
      errors.push(`worker_protocol_case_missing:${id}`);
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
