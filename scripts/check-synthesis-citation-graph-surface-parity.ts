import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../packages/synthesis-contracts/src/sidecarSystem";

type Corpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  bounds: { requestBytes: number; responseBytes: number; deadlineMs: number };
  operations: Array<{ id: string; access: "read" | "mutation"; cases: string[] }>;
};

const root = path.resolve(import.meta.dirname, "..");
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-citation-graph-surface-v1/corpus.json",
);
const ownershipPath = path.join(
  root,
  "openspec/changes/cut-over-synthesis-production-owner-to-rust/operation-ownership.json",
);

const boundaryCases = ["invalid_args", "oversized", "expired"];
const coherentReadCases = ["empty", "deterministic_order", "coherent_basis"];
const durableMutationCases = [
  "valid",
  "worker_canceled",
  "publication_failed",
  "previous_cache_preserved",
  "receipt",
  "reopen",
];

export function inspectSynthesisCitationGraphSurfaceParity() {
  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as Corpus;
  const ownership = JSON.parse(fs.readFileSync(ownershipPath, "utf8")) as {
    surfaceChanges: Record<string, string[]>;
  };
  const owned =
    ownership.surfaceChanges["complete-synthesis-native-citation-graph-surface"] || [];
  const ids = corpus.operations.map((operation) => operation.id);
  const ready = SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES;
  const errors = [
    ...(corpus.schema === "synthesis-citation-graph-surface-parity.v1" &&
    corpus.requestCodec === "synthesis-client-args.v1" &&
    corpus.resultCodec === "synthesis-client-result.v1"
      ? []
      : ["invalid corpus identity"]),
    ...(corpus.bounds.requestBytes === 1048576 &&
    corpus.bounds.responseBytes === 1048576 &&
    corpus.bounds.deadlineMs === 10000
      ? []
      : ["invalid corpus bounds"]),
    ...(ids.length === 12 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...owned.filter((id) => !ids.includes(id)).map((id) => `missing corpus: ${id}`),
    ...ids.filter((id) => !owned.includes(id)).map((id) => `unknown corpus: ${id}`),
    ...corpus.operations
      .filter((operation) => boundaryCases.some((name) => !operation.cases.includes(name)))
      .map((operation) => `missing boundary cases: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.access === "read" &&
          coherentReadCases.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing coherent read case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.access === "mutation" &&
          durableMutationCases.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing durable mutation case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.id !== "client.recomputeCitationGraphLayout" &&
          operation.id !== "client.refreshCitationGraphMetricsNow" &&
          operation.access === "mutation" &&
          !operation.cases.includes("host_revision_drift"),
      )
      .map((operation) => `missing Host revision case: ${operation.id}`),
    ...ids
      .filter((id) => !ready.includes(id as never))
      .map((id) => `not ready: ${id}`),
    ...(new Set(ready).size === ready.length
      ? []
      : ["duplicate ready capability"]),
  ];
  return { ok: errors.length === 0, operations: ids.length, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectSynthesisCitationGraphSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
