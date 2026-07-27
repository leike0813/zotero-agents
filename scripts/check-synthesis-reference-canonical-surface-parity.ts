import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../packages/synthesis-contracts/src/sidecarSystem";

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
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-reference-canonical-surface-v1/corpus.json",
);
const ownershipPath = path.join(
  root,
  "openspec/changes/cut-over-synthesis-production-owner-to-rust/operation-ownership.json",
);
const operationsPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
);

const boundaryCases = ["invalid_args", "oversized", "expired"];
const readCases = [
  "empty",
  "deterministic_order",
  "pagination",
  "coherent_repository_basis",
  "coherent_canonical_basis",
];
const durableMutationCases = [
  "valid",
  "basis_conflict",
  "receipt",
  "reopen",
  "no_partial_write",
];
const hostJobOperations = new Set([
  "client.startReferenceSidecarRefresh",
  "client.refreshReferenceSidecarNow",
  "client.retryReferenceSidecarRefresh",
  "client.runAdvancedReferenceMatchingNow",
  "client.retryAdvancedReferenceMatching",
]);
const workerOperations = new Set([
  "client.runAdvancedReferenceMatchingNow",
  "client.retryAdvancedReferenceMatching",
]);
const batchOperations = new Set([
  "client.applyReferenceMatchProposalActions",
  "client.applyCanonicalRevisionMergeRequests",
]);
const dedicatedCanonicalOperations = new Set([
  "client.applyCanonicalRevisionReviewAction",
  "client.mergeEffectiveCanonicalReference",
  "client.applyCanonicalRevisionMergeRequests",
  "client.updateCanonicalReferenceMetadata",
  "client.archiveCanonicalReference",
]);

export function inspectSynthesisReferenceCanonicalSurfaceParity() {
  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as Corpus;
  const ownership = JSON.parse(fs.readFileSync(ownershipPath, "utf8")) as {
    surfaceChanges: Record<string, string[]>;
  };
  const operationManifest = JSON.parse(
    fs.readFileSync(operationsPath, "utf8"),
  ) as { access: Record<string, Access> };
  const owned =
    ownership.surfaceChanges[
      "complete-synthesis-native-reference-canonical-surface"
    ] || [];
  const ids = corpus.operations.map((operation) => operation.id);
  const ready = SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES;
  const errors = [
    ...(corpus.schema === "synthesis-reference-canonical-surface-parity.v1" &&
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
    ...(ids.length === 16 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...owned.filter((id) => !ids.includes(id)).map((id) => `missing corpus: ${id}`),
    ...ids.filter((id) => !owned.includes(id)).map((id) => `unknown corpus: ${id}`),
    ...corpus.operations
      .filter((operation) => operationManifest.access[operation.id] !== operation.access)
      .map((operation) => `access mismatch: ${operation.id}`),
    ...corpus.operations
      .filter((operation) =>
        boundaryCases.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing boundary cases: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.access === "read" &&
          readCases.some((name) => !operation.cases.includes(name)),
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
          hostJobOperations.has(operation.id) &&
          ["bounded_host_pages", "host_disconnect", "host_revision_drift", "durable_job"].some(
            (name) => !operation.cases.includes(name),
          ),
      )
      .map((operation) => `missing Host job case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          workerOperations.has(operation.id) &&
          ["worker_failed", "worker_retry", "durable_proposals"].some(
            (name) => !operation.cases.includes(name),
          ),
      )
      .map((operation) => `missing worker case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          batchOperations.has(operation.id) &&
          !operation.cases.includes("batch_atomicity"),
      )
      .map((operation) => `missing batch atomicity case: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          dedicatedCanonicalOperations.has(operation.id) &&
          !operation.cases.includes("dedicated_port"),
      )
      .map((operation) => `missing dedicated canonical port case: ${operation.id}`),
    ...ids.filter((id) => !ready.includes(id as never)).map((id) => `not ready: ${id}`),
    ...(new Set(ready).size === ready.length ? [] : ["duplicate ready capability"]),
  ];
  return { ok: errors.length === 0, operations: ids.length, errors };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = inspectSynthesisReferenceCanonicalSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
