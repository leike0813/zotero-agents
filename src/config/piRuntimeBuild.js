/** Review thresholds for the Pi entry footprint (issue #26 Q240). */
export const PI_BUNDLE_LIMITS = {
    rawBytes: 8 * 1024 ** 2,
    gzipBytes: 1.5 * 1024 ** 2,
    xpiDeltaBytes: 2 * 1024 ** 2,
};
export const PI_RUNTIME_BUILD_IDENTITY_ENTRY = "content/pi-runtime-build.json";
/**
 * Validates build provenance read from a packed XPI and rejects a Pi-excluded
 * control presented as a release candidate.
 */
export function assertCandidatePiRuntimeBuildIdentity(value) {
    const identity = value;
    if (identity?.schema !== "zotero-agents.pi-runtime-build.v1" ||
        typeof identity.enabled !== "boolean" ||
        typeof identity.measurementOnly !== "boolean" ||
        typeof identity.debug !== "boolean" ||
        !Number.isInteger(identity.capacity) ||
        identity.capacity <= 0 ||
        typeof identity.source?.clean !== "boolean" ||
        !/^[a-f\d]{40}$/.test(String(identity.source?.commit || ""))) {
        throw new Error("pi_runtime_build_identity_invalid");
    }
    if (identity.enabled !== true || identity.measurementOnly === true) {
        throw new Error("pi_runtime_control_build_is_not_a_candidate");
    }
    return identity;
}
/** Projects a bundle measurement into the acceptance evidence shape. */
export function toPiBundleEvidence(measurement) {
    return {
        rawBytes: measurement.rawBytes,
        gzipBytes: measurement.gzipBytes,
        xpiDeltaBytes: measurement.xpiDeltaBytes,
        sameInputs: measurement.sameInputs,
        browserGuardPassed: measurement.browserGuardPassed,
        excludedFully: measurement.excludedFully,
    };
}
