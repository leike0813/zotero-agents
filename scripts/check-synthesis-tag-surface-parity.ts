import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES as ready } from "../packages/synthesis-contracts/src/sidecarSystem";
import { readSynthesisProductionSurfaceCorpora } from "./synthesisProductionSurfaceCorpora";

type Access = "read" | "mutation";
type Corpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  bounds: {
    requestBytes: number;
    responseBytes: number;
    deadlineMs: number;
    hostPageLimit: number;
  };
  operations: Array<{ id: string; access: Access; cases: string[] }>;
};
const root = path.resolve(import.meta.dirname, "..");
const operationsPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
);
const baselinePath = path.join(
  root,
  "test/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json",
);
const boundary = ["invalid_args", "oversized", "expired"];
const readCases = ["empty", "deterministic_order", "pagination"];
const mutationCases = [
  "valid",
  "basis_conflict",
  "receipt",
  "reopen",
  "no_partial_write",
];
const special: Record<string, string[]> = {
  "client.previewTagVocabularyImport": ["preview_digest", "basis_capture"],
  "client.applyTagVocabularyImport": ["preview_digest", "stale_preview"],
  "client.promoteStagedTagSuggestions": [
    "host_effect",
    "partial_host_failure",
    "effect_recovery",
  ],
  "client.replaceTagAuditRecords": ["batch_atomicity"],
};

export function inspectSynthesisTagSurfaceParity() {
  const corpus = readSynthesisProductionSurfaceCorpora(root).find(
    (surface) => surface.id === "tag",
  )!.corpus as Corpus;
  const manifest = JSON.parse(fs.readFileSync(operationsPath, "utf8")) as {
    access: Record<string, Access>;
  };
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
    productionRouteScenario: { stableErrors: Record<string, string> };
  };
  const ids = corpus.operations.map((op) => op.id);
  const errors = [
    ...(corpus.schema === "synthesis-tag-surface-parity.v1" &&
    corpus.requestCodec === "synthesis-client-args.v1" &&
    corpus.resultCodec === "synthesis-client-result.v1"
      ? []
      : ["invalid corpus identity"]),
    ...(corpus.bounds.requestBytes === 1048576 &&
    corpus.bounds.responseBytes === 1048576 &&
    corpus.bounds.deadlineMs === 10000 &&
    corpus.bounds.hostPageLimit === 100
      ? []
      : ["invalid corpus bounds"]),
    ...(ids.length === 25 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...corpus.operations
      .filter((op) => manifest.access[op.id] !== op.access)
      .map((op) => `access mismatch: ${op.id}`),
    ...corpus.operations
      .filter((op) => boundary.some((name) => !op.cases.includes(name)))
      .map((op) => `missing boundary: ${op.id}`),
    ...corpus.operations
      .filter(
        (op) =>
          op.access === "read" &&
          readCases.some((name) => !op.cases.includes(name)),
      )
      .map((op) => `missing read case: ${op.id}`),
    ...corpus.operations
      .filter(
        (op) =>
          op.access === "mutation" &&
          mutationCases.some((name) => !op.cases.includes(name)),
      )
      .map((op) => `missing mutation case: ${op.id}`),
    ...corpus.operations
      .filter((op) =>
        (special[op.id] || []).some((name) => !op.cases.includes(name)),
      )
      .map((op) => `missing family case: ${op.id}`),
    ...ids
      .filter((id) => !ready.includes(id as never))
      .map((id) => `not ready: ${id}`),
    ...(new Set(ready).size === ready.length
      ? []
      : ["duplicate ready capability"]),
    ...ids
      .filter((id) => baseline.productionRouteScenario.stableErrors[id])
      .map((id) => `valid Tag scenario is classified as stable error: ${id}`),
  ];
  return { ok: errors.length === 0, operations: ids.length, errors };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = inspectSynthesisTagSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
