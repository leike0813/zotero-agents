import { createSynthesisDebugMaintenanceApplication } from "../../../packages/synthesis-application/src/debugMaintenanceApplication.js";
import type { SynthesisTopicCanonicalStore } from "../../../packages/synthesis-application/src/topicCanonical.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function createSynthesisSidecarDebugMaintenanceApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  canonicalStore: SynthesisTopicCanonicalStore;
}) {
  return createSynthesisDebugMaintenanceApplication({
    repository: {
      capture() {
        const captured = options.repository.captureDebugProjection();
        return {
          basis: captured.basis,
          schema: captured.schema,
          caches: captured.caches.map((row) => ({
            cacheKey: clean(row.cacheKey),
            cacheKind: clean(row.cacheKind),
            status: clean(row.status) || "missing",
            updatedAt: clean(row.updatedAt),
          })),
          operations: captured.operations.map((row) => ({
            operationId: clean(row.operationId),
            operationType: clean(row.operationType),
            status: clean(row.status) || "pending",
            updatedAt: clean(row.updatedAt),
          })),
          topicIds: captured.topicIds,
        };
      },
    },
    canonicalStore: options.canonicalStore,
  });
}
