import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export type SynthesisProductionSurfaceCorpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  bounds: {
    requestBytes: number;
    responseBytes: number;
    deadlineMs: number;
    hostPageLimit?: number;
  };
  operations: Array<{
    id: string;
    access: "read" | "mutation";
    cases: string[];
  }>;
};

export const SYNTHESIS_PRODUCTION_SURFACES = [
  {
    id: "topic-workbench",
    schema: "synthesis-topic-workbench-surface-parity.v1",
    operations: 18,
    operationFingerprint: "99ef4976b55a203e89015e46bcd41ed4242fb63bad90f43b4d63b03a2f61e6ba",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-topic-workbench-surface-v1/corpus.json",
    evidencePath: "test/core/229-synthesis-production-client-rust-route.test.ts",
  },
  {
    id: "citation-graph",
    schema: "synthesis-citation-graph-surface-parity.v1",
    operations: 12,
    operationFingerprint: "f6a432b21d30ef967276384e1492e86f287a0c51c1fd62020ceca436ea868d85",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-citation-graph-surface-v1/corpus.json",
    evidencePath: "test/core/231-synthesis-native-citation-graph-surface.test.ts",
  },
  {
    id: "reference-canonical",
    schema: "synthesis-reference-canonical-surface-parity.v1",
    operations: 16,
    operationFingerprint: "ccbe741f193098f1cb6ec040f12563b3fa09b51f7815f337e62f140ea6243e26",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-reference-canonical-surface-v1/corpus.json",
    evidencePath: "test/core/232-synthesis-native-reference-canonical-surface.test.ts",
  },
  {
    id: "tag",
    schema: "synthesis-tag-surface-parity.v1",
    operations: 19,
    operationFingerprint: "b1426370401c39112148eb660460f4fa88c0ae18cbbe3137e59bc257534d9e23",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-tag-surface-v1/corpus.json",
    evidencePath: "test/core/233-synthesis-native-tag-surface.test.ts",
  },
  {
    id: "concept-topic-graph",
    schema: "synthesis-concept-topic-graph-surface-parity.v1",
    operations: 9,
    operationFingerprint: "dcc95a13e1fe290150534b8b94c660f86ce4c756381f233a5d08041581e4f4e7",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-concept-topic-graph-surface-v1/corpus.json",
    evidencePath: "test/core/234-synthesis-native-concept-topic-graph-surface.test.ts",
  },
  {
    id: "artifact-library-debug",
    schema: "synthesis-artifact-library-debug-surface-parity.v1",
    operations: 12,
    operationFingerprint: "49d746745fff79c96fe095d70e9f9a85c2be228e3bcd882b0433a6fe7aec37aa",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-artifact-library-debug-surface-v1/corpus.json",
    evidencePath: "test/core/230-synthesis-native-artifact-library-debug-surface.test.ts",
  },
  {
    id: "webdav-maintenance",
    schema: "synthesis-webdav-maintenance-surface-parity.v1",
    operations: 9,
    operationFingerprint: "b3b95eecf9b4bf3a5c1ac3e05617602e3a70b49d3de0f42c11b9c0876435714a",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-webdav-maintenance-surface-v1/corpus.json",
    evidencePath: "test/core/235-synthesis-native-webdav-maintenance-surface.test.ts",
  },
] as const;

export function synthesisProductionSurfaceOperationFingerprint(
  operations: readonly { id: string }[],
) {
  return createHash("sha256")
    .update(`${operations.map((operation) => operation.id).sort().join("\n")}\n`)
    .digest("hex");
}

export function readSynthesisProductionSurfaceCorpora(root = process.cwd()) {
  return SYNTHESIS_PRODUCTION_SURFACES.map((surface) => ({
    ...surface,
    corpus: JSON.parse(
      fs.readFileSync(path.join(root, surface.corpusPath), "utf8"),
    ) as SynthesisProductionSurfaceCorpus,
  }));
}
