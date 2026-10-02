import { SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID, buildSynthesisDebugPage, diffSynthesisDebugSnapshots, rebuildSynthesisDebugDiagnostic, } from "../../synthesis-contracts/src/debugMaintenance.js";
export class SynthesisDebugMaintenanceApplicationError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "SynthesisDebugMaintenanceApplicationError";
    }
}
export function createSynthesisDebugMaintenanceApplication(options) {
    let accepting = true;
    let active = null;
    const snapshot = () => {
        const first = options.repository.capture();
        const topics = [...new Set(first.topicIds)]
            .sort((left, right) => left.localeCompare(right))
            .slice(0, 1_000)
            .map((topicId) => {
            const inspected = options.canonicalStore.inspect({ topicId });
            return {
                topicId,
                status: inspected.status,
                manifestHash: inspected.manifestHash,
                artifactHash: inspected.artifactHash,
                metadataHash: inspected.metadataHash,
                sectionCount: inspected.sections.length,
                diagnostics: inspected.diagnostics.map((code) => rebuildSynthesisDebugDiagnostic(code)),
            };
        });
        const second = options.repository.capture();
        if (first.basis.schemaVersion !== second.basis.schemaVersion ||
            first.basis.revision !== second.basis.revision) {
            return {
                schemaId: SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
                status: "superseded",
                diagnostics: [
                    rebuildSynthesisDebugDiagnostic("repository_basis_superseded", "info"),
                ],
            };
        }
        return {
            schemaId: SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
            status: "ready",
            basis: first.basis,
            schema: first.schema,
            caches: buildSynthesisDebugPage({
                items: first.caches.sort((left, right) => left.cacheKey.localeCompare(right.cacheKey)),
                debug: true,
            }),
            operations: buildSynthesisDebugPage({
                items: first.operations.sort((left, right) => left.operationId.localeCompare(right.operationId)),
                debug: true,
            }),
            topics: buildSynthesisDebugPage({ items: topics, debug: true }),
            diagnostics: [],
        };
    };
    const runMaintenance = async (kind, request) => {
        if (!accepting)
            throw new SynthesisDebugMaintenanceApplicationError("stopping");
        if (active)
            throw new SynthesisDebugMaintenanceApplicationError("busy");
        const operation = options.maintenance?.[kind];
        if (!operation) {
            throw new SynthesisDebugMaintenanceApplicationError("unsupported_operation");
        }
        const pending = Promise.resolve().then(() => operation(request));
        active = pending;
        try {
            return await pending;
        }
        finally {
            if (active === pending)
                active = null;
        }
    };
    return {
        snapshot,
        inspectTopic(topicId) {
            return options.canonicalStore.inspect({ topicId });
        },
        diff(before, after) {
            return diffSynthesisDebugSnapshots(before, after);
        },
        async inspectProfiler() {
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
