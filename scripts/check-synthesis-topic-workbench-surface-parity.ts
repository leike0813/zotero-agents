import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES } from "../packages/synthesis-contracts/src/sidecarSystem";
import {
  readSynthesisProductionBaselineFixture,
  readSynthesisProductionSurfaceCorpora,
} from "./synthesisProductionSurfaceCorpora";

type Corpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  bounds: { requestBytes: number; responseBytes: number; deadlineMs: number };
  operations: Array<{
    id: string;
    access: "read" | "mutation";
    cases: string[];
  }>;
};

const root = path.resolve(import.meta.dirname, "..");

export function inspectSynthesisTopicWorkbenchSurfaceParity() {
  const corpus = readSynthesisProductionSurfaceCorpora(root).find(
    (surface) => surface.id === "topic-workbench",
  )!.corpus as Corpus;
  const ids = corpus.operations.map((operation) => operation.id);
  const baseline = readSynthesisProductionBaselineFixture(root);
  const observables =
    baseline.surfaces.find((surface) => surface.id === "topic-workbench")
      ?.cases ?? [];
  const observableIds = observables.map((observable) => observable.operation);
  const observableAccess = new Map(
    observables.map((observable) => [observable.operation, observable.access]),
  );
  const requiredCases = ["invalid_args", "oversized", "expired"];
  const errors = [
    ...(corpus.schema === "synthesis-topic-workbench-surface-parity.v1" &&
    corpus.requestCodec === "synthesis-client-args.v1" &&
    corpus.resultCodec === "synthesis-client-result.v1"
      ? []
      : ["invalid corpus identity"]),
    ...(corpus.bounds.requestBytes === 1048576 &&
    corpus.bounds.responseBytes === 1048576 &&
    corpus.bounds.deadlineMs === 10000
      ? []
      : ["invalid corpus bounds"]),
    ...(ids.length === 20 && new Set(ids).size === ids.length
      ? []
      : ["invalid operation count"]),
    ...ids
      .filter((id) => !observableIds.includes(id))
      .map((id) => `missing baseline observable: ${id}`),
    ...observableIds
      .filter((id) => !ids.includes(id))
      .map((id) => `unknown baseline observable: ${id}`),
    ...corpus.operations
      .filter(
        (operation) => observableAccess.get(operation.id) !== operation.access,
      )
      .map((operation) => `baseline access mismatch: ${operation.id}`),
    ...corpus.operations
      .filter((operation) =>
        requiredCases.some((name) => !operation.cases.includes(name)),
      )
      .map((operation) => `missing boundary cases: ${operation.id}`),
    ...corpus.operations
      .filter(
        (operation) =>
          operation.access === "mutation" &&
          !operation.cases.includes("reopen"),
      )
      .map((operation) => `missing reopen case: ${operation.id}`),
    ...ids
      .filter(
        (id) =>
          !SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES.includes(
            id as never,
          ),
      )
      .map((id) => `not ready: ${id}`),
  ];
  return {
    ok: errors.length === 0,
    operations: ids.length,
    observables: observableIds.length,
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = inspectSynthesisTopicWorkbenchSurfaceParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
