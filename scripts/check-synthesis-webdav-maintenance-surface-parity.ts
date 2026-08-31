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
  bounds: { requestBytes: number; responseBytes: number; deadlineMs: number };
  operations: Array<{ id: string; access: Access; cases: string[] }>;
};

const root = path.resolve(import.meta.dirname, "..");
const operationsPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
);

export function inspectSynthesisWebDavMaintenanceSurfaceParity() {
  const corpus = readSynthesisProductionSurfaceCorpora(root).find(
    (surface) => surface.id === "webdav-maintenance",
  )!.corpus as Corpus;
  const manifest = JSON.parse(fs.readFileSync(operationsPath, "utf8")) as {
    access: Record<string, Access>;
  };
  const ids = corpus.operations.map((operation) => operation.id);
  const boundaries = ["invalid_args", "oversized", "expired"];
  const durable = ["valid", "receipt", "reopen", "no_partial_write"];
  const controlOperation = corpus.operations.find(
    (operation) => operation.id === "client.controlPublicMaintenanceOperation",
  );
  const controlCoverageComplete =
    controlOperation?.access === "mutation" &&
    ["cancel", "continue", "retry", "restart"].every((name) =>
      controlOperation.cases.includes(name),
    );
  const errors = [
    ...(corpus.schema === "synthesis-webdav-maintenance-surface-parity.v1" &&
    corpus.requestCodec === "synthesis-client-args.v1" &&
    corpus.resultCodec === "synthesis-client-result.v1"
      ? []
      : ["invalid corpus identity"]),
    ...(corpus.bounds.requestBytes === 1048576 &&
    corpus.bounds.responseBytes === 1048576 &&
    corpus.bounds.deadlineMs === 10000
      ? []
      : ["invalid corpus bounds"]),
    ...(ids.length === 10 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...corpus.operations
      .filter((operation) => manifest.access[operation.id] !== operation.access)
      .map((operation) => `access mismatch: ${operation.id}`),
    ...corpus.operations
      .filter((operation) =>
        boundaries.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing boundary: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.access === "mutation" &&
          durable.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing durable case: ${operation.id}`),
    ...(controlCoverageComplete
      ? []
      : ["invalid public maintenance operation control coverage"]),
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
  const report = inspectSynthesisWebDavMaintenanceSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
