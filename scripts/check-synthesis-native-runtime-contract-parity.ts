import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  rebuildSynthesisSidecarDiscovery,
  rebuildSynthesisSidecarLaunchConfig,
} from "../packages/synthesis-contracts/src/sidecarLifecycle";
import { rebuildSynthesisSidecarRuntimeBundleManifest } from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  rebuildSynthesisSidecarHandshakeResult,
  rebuildSynthesisSidecarHealth,
} from "../packages/synthesis-contracts/src/sidecarSystem";

const CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-native-runtime-v2/corpus.json",
);

type Case = {
  id: string;
  kind: "manifest" | "launch" | "discovery" | "health" | "handshake";
  mutation?: { path: string; value: unknown };
  expected: { node: string; rust: string };
};

type Corpus = {
  absoluteRuntimeRootToken: string;
  manifest: Record<string, unknown>;
  launchConfig: Record<string, unknown>;
  discovery: Record<string, unknown>;
  health: Record<string, unknown>;
  handshake: Record<string, unknown>;
  cases: Case[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setPath(root: unknown, dottedPath: string, value: unknown) {
  const segments = dottedPath.split(".");
  let cursor = root as Record<string, unknown> | unknown[];
  for (const segment of segments.slice(0, -1)) {
    cursor = Array.isArray(cursor)
      ? (cursor[Number(segment)] as unknown[])
      : (cursor[segment] as Record<string, unknown>);
  }
  const last = segments.at(-1)!;
  if (Array.isArray(cursor)) cursor[Number(last)] = value;
  else cursor[last] = value;
}

function replaceToken(
  value: unknown,
  token: string,
  replacement: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => replaceToken(entry, token, replacement));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === token) {
      (value as Record<string, unknown>)[key] = replacement;
    } else {
      replaceToken(entry, token, replacement);
    }
  }
}

function nodeCode(_error: unknown, kind: Case["kind"]) {
  return `invalid_${kind === "launch" ? "config" : kind}`;
}

export function checkSynthesisNativeRuntimeContractParity(
  root = process.cwd(),
) {
  const source = fs.readFileSync(CORPUS_PATH, "utf8");
  const corpus = JSON.parse(source) as Corpus;
  const absoluteRoot = path.resolve(root, ".scaffold/native-runtime-contract");
  const nodeResults = corpus.cases.map((testCase) => {
    const value = clone(
      corpus[testCase.kind === "launch" ? "launchConfig" : testCase.kind],
    );
    replaceToken(value, corpus.absoluteRuntimeRootToken, absoluteRoot);
    if (testCase.mutation) {
      setPath(value, testCase.mutation.path, testCase.mutation.value);
    }
    try {
      switch (testCase.kind) {
        case "manifest":
          rebuildSynthesisSidecarRuntimeBundleManifest(value);
          break;
        case "launch":
          rebuildSynthesisSidecarLaunchConfig(value);
          break;
        case "discovery":
          rebuildSynthesisSidecarDiscovery(value);
          break;
        case "health":
          rebuildSynthesisSidecarHealth(value);
          break;
        case "handshake":
          rebuildSynthesisSidecarHandshakeResult(value);
          break;
      }
      return { id: testCase.id, code: "ok" };
    } catch (error) {
      return { id: testCase.id, code: nodeCode(error, testCase.kind) };
    }
  });
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
      "native_runtime_contract_parity",
    ],
    { cwd: root, encoding: "utf8", input: source },
  );
  if (rust.status !== 0) {
    throw new Error(rust.stderr || `Rust checker exited ${rust.status}`);
  }
  const rustResults = (
    JSON.parse(rust.stdout) as {
      results: Array<{ id: string; code: string }>;
    }
  ).results;
  const errors: string[] = [];
  for (const testCase of corpus.cases) {
    const node = nodeResults.find((entry) => entry.id === testCase.id)?.code;
    const rustCode = rustResults.find(
      (entry) => entry.id === testCase.id,
    )?.code;
    if (node !== testCase.expected.node) {
      errors.push(`${testCase.id}:node:${node}:${testCase.expected.node}`);
    }
    if (rustCode !== testCase.expected.rust) {
      errors.push(`${testCase.id}:rust:${rustCode}:${testCase.expected.rust}`);
    }
  }
  return {
    ok: errors.length === 0,
    schema: "synthesis-native-runtime-contract-parity.v1",
    cases: corpus.cases.length,
    nodeResults,
    rustResults,
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = checkSynthesisNativeRuntimeContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
