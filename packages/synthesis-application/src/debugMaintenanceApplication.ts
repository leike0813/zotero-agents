import {
  SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
  buildSynthesisDebugPage,
  diffSynthesisDebugSnapshots,
  rebuildSynthesisDebugDiagnostic,
  type SynthesisDebugCacheItem,
  type SynthesisDebugIsolatedSnapshot,
  type SynthesisDebugOperationItem,
  type SynthesisDebugProfilerResult,
  type SynthesisDebugRepositoryBasis,
  type SynthesisDebugSchemaSummary,
  type SynthesisDebugSnapshotResult,
  type SynthesisDebugTopicDescriptor,
} from "../../synthesis-contracts/src/debugMaintenance.js";
import type { SynthesisJsonObject } from "../../synthesis-contracts/src/common.js";
import type { SynthesisTopicCanonicalStore } from "./topicCanonical.js";

export type SynthesisDebugRepositoryCapture = {
  basis: SynthesisDebugRepositoryBasis;
  schema: SynthesisDebugSchemaSummary;
  caches: SynthesisDebugCacheItem[];
  operations: SynthesisDebugOperationItem[];
  topicIds: string[];
};

export interface SynthesisDebugMaintenanceRepositoryProjection {
  capture(): SynthesisDebugRepositoryCapture;
}

export interface SynthesisDebugProfilerPort {
  inspect():
    | Promise<SynthesisDebugProfilerResult>
    | SynthesisDebugProfilerResult;
}

export interface SynthesisDebugMaintenanceOperationPorts {
  checkpoint?: (request: SynthesisJsonObject) => Promise<SynthesisJsonObject>;
  durable?: (request: SynthesisJsonObject) => Promise<SynthesisJsonObject>;
  reset?: (request: SynthesisJsonObject) => Promise<SynthesisJsonObject>;
}

export class SynthesisDebugMaintenanceApplicationError extends Error {
  constructor(readonly code: "busy" | "stopping" | "unsupported_operation") {
    super(code);
    this.name = "SynthesisDebugMaintenanceApplicationError";
  }
}

export function createSynthesisDebugMaintenanceApplication(options: {
  repository: SynthesisDebugMaintenanceRepositoryProjection;
  canonicalStore: Pick<SynthesisTopicCanonicalStore, "inspect">;
  profiler?: SynthesisDebugProfilerPort;
  maintenance?: SynthesisDebugMaintenanceOperationPorts;
}) {
  let accepting = true;
  let active: Promise<unknown> | null = null;

  const snapshot = (): SynthesisDebugSnapshotResult => {
    const first = options.repository.capture();
    const topics = [...new Set(first.topicIds)]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 1_000)
      .map((topicId): SynthesisDebugTopicDescriptor => {
        const inspected = options.canonicalStore.inspect({ topicId });
        return {
          topicId,
          status: inspected.status,
          manifestHash: inspected.manifestHash,
          artifactHash: inspected.artifactHash,
          metadataHash: inspected.metadataHash,
          sectionCount: inspected.sections.length,
          diagnostics: inspected.diagnostics.map((code) =>
            rebuildSynthesisDebugDiagnostic(code),
          ),
        };
      });
    const second = options.repository.capture();
    if (
      first.basis.schemaVersion !== second.basis.schemaVersion ||
      first.basis.revision !== second.basis.revision
    ) {
      return {
        schemaId: SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
        status: "superseded",
        diagnostics: [
          rebuildSynthesisDebugDiagnostic(
            "repository_basis_superseded",
            "info",
          ),
        ],
      };
    }
    return {
      schemaId: SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
      status: "ready",
      basis: first.basis,
      schema: first.schema,
      caches: buildSynthesisDebugPage({
        items: first.caches.sort((left, right) =>
          left.cacheKey.localeCompare(right.cacheKey),
        ),
        debug: true,
      }),
      operations: buildSynthesisDebugPage({
        items: first.operations.sort((left, right) =>
          left.operationId.localeCompare(right.operationId),
        ),
        debug: true,
      }),
      topics: buildSynthesisDebugPage({ items: topics, debug: true }),
      diagnostics: [],
    };
  };

  const runMaintenance = async (
    kind: keyof SynthesisDebugMaintenanceOperationPorts,
    request: SynthesisJsonObject,
  ) => {
    if (!accepting)
      throw new SynthesisDebugMaintenanceApplicationError("stopping");
    if (active) throw new SynthesisDebugMaintenanceApplicationError("busy");
    const operation = options.maintenance?.[kind];
    if (!operation) {
      throw new SynthesisDebugMaintenanceApplicationError(
        "unsupported_operation",
      );
    }
    const pending = Promise.resolve().then(() => operation(request));
    active = pending;
    try {
      return await pending;
    } finally {
      if (active === pending) active = null;
    }
  };

  return {
    snapshot,
    inspectTopic(topicId: string) {
      return options.canonicalStore.inspect({ topicId });
    },
    diff(
      before: SynthesisDebugIsolatedSnapshot,
      after: SynthesisDebugIsolatedSnapshot,
    ) {
      return diffSynthesisDebugSnapshots(before, after);
    },
    async inspectProfiler(): Promise<SynthesisDebugProfilerResult> {
      return options.profiler
        ? options.profiler.inspect()
        : { status: "unavailable", diagnostics: [] };
    },
    runMaintenance,
    stopAdmission() {
      accepting = false;
    },
    async shutdown() {
      accepting = false;
      await active;
    },
  };
}
