import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES as ready } from "../packages/synthesis-contracts/src/sidecarSystem";

type Access = "read" | "mutation";
type Corpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  bounds: { requestBytes: number; responseBytes: number; deadlineMs: number };
  operations: Array<{ id: string; access: Access; cases: string[] }>;
};
const root = path.resolve(import.meta.dirname, "..");
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-concept-topic-graph-surface-v1/corpus.json",
);
const ownershipPath = path.join(
  root,
  "openspec/changes/cut-over-synthesis-production-owner-to-rust/operation-ownership.json",
);
const operationsPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
);
const mutations = new Set([
  "client.rebuildConceptKbIndex",
  "client.updateConceptDisplayText",
  "client.applyConceptReviewAction",
  "client.deleteConceptEntries",
  "client.rebuildTopicGraphIndex",
  "client.acceptTopicGraphRelation",
  "client.rejectTopicGraphRelation",
  "client.applyTopicGraphReviewAction",
]);

export function inspectSynthesisConceptTopicGraphSurfaceParity() {
  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as Corpus;
  const ownership = JSON.parse(fs.readFileSync(ownershipPath, "utf8")) as {
    surfaceChanges: Record<string, string[]>;
  };
  const manifest = JSON.parse(fs.readFileSync(operationsPath, "utf8")) as {
    access: Record<string, Access>;
  };
  const owned =
    ownership.surfaceChanges[
      "complete-synthesis-native-concept-topic-graph-surface"
    ] || [];
  const ids = corpus.operations.map((operation) => operation.id);
  const boundary = ["invalid_args", "oversized", "expired"];
  const durable = [
    "valid",
    "basis_conflict",
    "receipt",
    "reopen",
    "no_partial_write",
  ];
  const errors = [
    ...(corpus.schema === "synthesis-concept-topic-graph-surface-parity.v1" &&
    corpus.requestCodec === "synthesis-client-args.v1" &&
    corpus.resultCodec === "synthesis-client-result.v1"
      ? []
      : ["invalid corpus identity"]),
    ...(corpus.bounds.requestBytes === 1048576 &&
    corpus.bounds.responseBytes === 1048576 &&
    corpus.bounds.deadlineMs === 10000
      ? []
      : ["invalid corpus bounds"]),
    ...(ids.length === 9 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...owned
      .filter((id) => !ids.includes(id))
      .map((id) => `missing corpus: ${id}`),
    ...ids
      .filter((id) => !owned.includes(id))
      .map((id) => `unknown corpus: ${id}`),
    ...corpus.operations
      .filter((operation) => manifest.access[operation.id] !== operation.access)
      .map((operation) => `access mismatch: ${operation.id}`),
    ...corpus.operations
      .filter((operation) =>
        boundary.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing boundary: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          mutations.has(operation.id) &&
          durable.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing durable case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.id === "client.queryConceptKb" &&
          [
            "empty",
            "deterministic_order",
            "pagination",
            "legacy_labels",
            "legacy_aliases",
            "index_degraded",
          ].some((name) => !operation.cases.includes(name)),
      )
      .map(() => "missing Concept query case"),
    ...corpus.operations
      .filter(
        (operation) =>
          [
            "client.acceptTopicGraphRelation",
            "client.rejectTopicGraphRelation",
          ].includes(operation.id) &&
          !operation.cases.includes("relation_policy"),
      )
      .map((operation) => `missing relation policy: ${operation.id}`),
    ...ids
      .filter((id) => !ready.includes(id as never))
      .map((id) => `not ready: ${id}`),
    ...(new Set(ready).size === ready.length
      ? []
      : ["duplicate ready capability"]),
  ];
  return { ok: errors.length === 0, operations: ids.length, errors };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = inspectSynthesisConceptTopicGraphSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
