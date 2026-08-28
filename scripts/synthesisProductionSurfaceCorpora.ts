import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";

export const SYNTHESIS_PRODUCTION_BASELINE_FIXTURE =
  "test/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json";

export type SynthesisProductionSurfaceCorpus = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  baselineFixture: string;
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

export type SynthesisProductionBaselineFixture = {
  schema: string;
  baseline: {
    commit: string;
    serviceSource: string;
    serviceFactory: string;
    publicMethodCount: number;
    publicMethodFingerprintSha256: string;
  };
  normalization: {
    timestamps: string;
    paths: string;
    operationIds: string;
    unorderedCollections: string;
  };
  surfaces: Array<{
    id: string;
    cases: Array<{
      id: string;
      operation: string;
      access: "read" | "mutation";
      expected: {
        dtoSemantics: string[];
        logicalFacts: string[];
        hostEffects: string[];
        writeExpectation: string;
      };
      comparison: { unorderedCollections: string[] };
    }>;
  }>;
};

export const SYNTHESIS_PRODUCTION_SURFACES = [
  {
    id: "topic-workbench",
    schema: "synthesis-topic-workbench-surface-parity.v1",
    operations: 20,
    operationFingerprint:
      "2578b1d4efdd9e1b1cabbd45ebad4afac96fead2ee9c579e8ed5680f834c5b46",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-topic-workbench-surface-v1/corpus.json",
    evidencePath:
      "test/core/229-synthesis-production-client-rust-route.test.ts",
  },
  {
    id: "citation-graph",
    schema: "synthesis-citation-graph-surface-parity.v1",
    operations: 12,
    operationFingerprint:
      "f6a432b21d30ef967276384e1492e86f287a0c51c1fd62020ceca436ea868d85",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-citation-graph-surface-v1/corpus.json",
    evidencePath:
      "test/core/231-synthesis-native-citation-graph-surface.test.ts",
  },
  {
    id: "reference-canonical",
    schema: "synthesis-reference-canonical-surface-parity.v1",
    operations: 16,
    operationFingerprint:
      "ccbe741f193098f1cb6ec040f12563b3fa09b51f7815f337e62f140ea6243e26",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-reference-canonical-surface-v1/corpus.json",
    evidencePath:
      "test/core/232-synthesis-native-reference-canonical-surface.test.ts",
  },
  {
    id: "tag",
    schema: "synthesis-tag-surface-parity.v1",
    operations: 19,
    operationFingerprint:
      "b1426370401c39112148eb660460f4fa88c0ae18cbbe3137e59bc257534d9e23",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-tag-surface-v1/corpus.json",
    evidencePath: "test/core/233-synthesis-native-tag-surface.test.ts",
  },
  {
    id: "concept-topic-graph",
    schema: "synthesis-concept-topic-graph-surface-parity.v1",
    operations: 9,
    operationFingerprint:
      "dcc95a13e1fe290150534b8b94c660f86ce4c756381f233a5d08041581e4f4e7",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-concept-topic-graph-surface-v1/corpus.json",
    evidencePath:
      "test/core/234-synthesis-native-concept-topic-graph-surface.test.ts",
  },
  {
    id: "artifact-library-debug",
    schema: "synthesis-artifact-library-debug-surface-parity.v1",
    operations: 12,
    operationFingerprint:
      "49d746745fff79c96fe095d70e9f9a85c2be228e3bcd882b0433a6fe7aec37aa",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-artifact-library-debug-surface-v1/corpus.json",
    evidencePath:
      "test/core/230-synthesis-native-artifact-library-debug-surface.test.ts",
  },
  {
    id: "webdav-maintenance",
    schema: "synthesis-webdav-maintenance-surface-parity.v1",
    operations: 10,
    operationFingerprint:
      "e81821b2ec91cd9bc5cb35ecce26c3be87324758165282459b9f694c02380dd4",
    corpusPath:
      "packages/synthesis-contracts/contract-set/synthesis-webdav-maintenance-surface-v1/corpus.json",
    evidencePath:
      "test/core/235-synthesis-native-webdav-maintenance-surface.test.ts",
  },
] as const;

export function synthesisProductionSurfaceOperationFingerprint(
  operations: readonly { id: string }[],
) {
  return createHash("sha256")
    .update(
      `${operations
        .map((operation) => operation.id)
        .sort()
        .join("\n")}\n`,
    )
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

export function readSynthesisProductionBaselineFixture(
  root = process.cwd(),
): SynthesisProductionBaselineFixture {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, SYNTHESIS_PRODUCTION_BASELINE_FIXTURE),
      "utf8",
    ),
  ) as SynthesisProductionBaselineFixture;
}

export function inspectSynthesisProductionBaselineEvidence(
  surfaceCorpora: ReturnType<typeof readSynthesisProductionSurfaceCorpora>,
  root = process.cwd(),
  fixtureOverride?: SynthesisProductionBaselineFixture,
): string[] {
  const errors: string[] = [];
  const fixturePaths = new Set(
    surfaceCorpora.map(({ corpus }) => corpus.baselineFixture),
  );
  if (
    fixturePaths.size !== 1 ||
    !fixturePaths.has(SYNTHESIS_PRODUCTION_BASELINE_FIXTURE)
  ) {
    errors.push("surface corpora must share the governed baseline fixture");
    return errors;
  }

  const fixture =
    fixtureOverride ?? readSynthesisProductionBaselineFixture(root);
  const inventory = parseYaml(
    fs.readFileSync(
      path.join(
        root,
        "doc/synthesis-layer/contracts/service-api-migration.yaml",
      ),
      "utf8",
    ),
  ) as {
    baseline: {
      commit: string;
      service_source: string;
      service_factory: string;
      public_method_count: number;
      fingerprint_sha256: string;
    };
  };
  const baseline = inventory.baseline;
  if (
    fixture.schema !== "synthesis.production_observables.v1" ||
    fixture.baseline.commit !== baseline.commit ||
    fixture.baseline.serviceSource !== baseline.service_source ||
    fixture.baseline.serviceFactory !== baseline.service_factory ||
    fixture.baseline.publicMethodCount !== baseline.public_method_count ||
    fixture.baseline.publicMethodFingerprintSha256 !==
      baseline.fingerprint_sha256
  ) {
    errors.push("baseline fixture identity does not match migration SSOT");
  }
  if (
    fixture.normalization.timestamps !== "fixed-iso-8601" ||
    fixture.normalization.paths !== "repo-relative-or-redacted" ||
    fixture.normalization.operationIds !== "logical-case-id" ||
    fixture.normalization.unorderedCollections !== "canonical-key"
  ) {
    errors.push("baseline fixture normalization policy is incomplete");
  }
  const inspectStableValue = (value: unknown, valuePath: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        inspectStableValue(entry, `${valuePath}[${index}]`),
      );
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) =>
        inspectStableValue(entry, `${valuePath}.${key}`),
      );
      return;
    }
    if (typeof value !== "string" || valuePath.startsWith(".normalization.")) {
      return;
    }
    if (/^(?:\/|~\/|[A-Za-z]:[\\/])/.test(value)) {
      errors.push(`unstable absolute path: ${valuePath}`);
    }
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) &&
      value !== "2000-01-01T00:00:00.000Z"
    ) {
      errors.push(`unstable timestamp: ${valuePath}`);
    }
    if (/operationids?$/i.test(valuePath) && !/^case:[a-z0-9-]+$/.test(value)) {
      errors.push(`unstable operation id: ${valuePath}`);
    }
  };
  inspectStableValue(fixture, "");

  const fixtureSurfaceIds = fixture.surfaces.map((surface) => surface.id);
  const corpusSurfaceIds = surfaceCorpora.map((surface) => surface.id);
  for (const id of [
    ...corpusSurfaceIds.filter((value) => !fixtureSurfaceIds.includes(value)),
    ...fixtureSurfaceIds.filter((value) => !corpusSurfaceIds.includes(value)),
  ]) {
    errors.push(`baseline fixture surface mismatch: ${id}`);
  }
  for (const surface of fixture.surfaces) {
    const corpus = surfaceCorpora.find(({ id }) => id === surface.id)?.corpus;
    if (!corpus || surface.cases.length === 0) {
      errors.push(`baseline fixture has no cases: ${surface.id}`);
      continue;
    }
    for (const fixtureCase of surface.cases) {
      const operation = corpus.operations.find(
        ({ id }) => id === fixtureCase.operation,
      );
      if (!operation || operation.access !== fixtureCase.access) {
        errors.push(
          `baseline fixture operation mismatch: ${surface.id}:${fixtureCase.operation}`,
        );
      }
      if (
        !/^case:[a-z0-9-]+$/.test(fixtureCase.id) ||
        fixtureCase.expected.dtoSemantics.length === 0 ||
        fixtureCase.expected.logicalFacts.length === 0 ||
        !["zero", "bounded-mutation"].includes(
          fixtureCase.expected.writeExpectation,
        ) ||
        fixtureCase.comparison.unorderedCollections.length === 0
      ) {
        errors.push(`invalid normalized baseline case: ${fixtureCase.id}`);
      }
    }
  }
  return errors.sort();
}
