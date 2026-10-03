import manifest from "../../package.json";

/** Pi entry footprint budgets defined by the C20 acceptance specification. */
export const PI_BUNDLE_LIMITS = {
  rawBytes: 20 * 1024 ** 2,
  gzipBytes: 1.5 * 1024 ** 2,
  xpiDeltaBytes: 2 * 1024 ** 2,
} as const;

/** Build provenance written into a packed XPI by the plugin build. */
export type PiRuntimeBuildIdentity = {
  schema: "zotero-agents.pi-runtime-build.v1";
  enabled: boolean;
  capacity: number;
  measurementOnly: boolean;
  debug: boolean;
  buildTime: string;
  source: { commit: string; clean: boolean };
};

export const PI_RUNTIME_BUILD_IDENTITY_ENTRY = "content/pi-runtime-build.json";

/**
 * Validates build provenance read from a packed XPI and rejects a Pi-excluded
 * control presented as a release candidate.
 */
export function assertCandidatePiRuntimeBuildIdentity(
  value: unknown,
): PiRuntimeBuildIdentity {
  const identity = value as PiRuntimeBuildIdentity;
  if (
    identity?.schema !== "zotero-agents.pi-runtime-build.v1" ||
    typeof identity.enabled !== "boolean" ||
    typeof identity.measurementOnly !== "boolean" ||
    typeof identity.debug !== "boolean" ||
    !Number.isInteger(identity.capacity) ||
    identity.capacity <= 0 ||
    typeof identity.source?.clean !== "boolean" ||
    !/^[a-f\d]{40}$/.test(String(identity.source?.commit || ""))
  ) {
    throw new Error("pi_runtime_build_identity_invalid");
  }
  if (identity.enabled !== true || identity.measurementOnly === true) {
    throw new Error("pi_runtime_control_build_is_not_a_candidate");
  }
  return identity;
}

/** Numeric Pi footprint contribution plus its measurement contract flags. */
export type PiBundleEvidence = {
  rawBytes: number;
  gzipBytes: number;
  xpiDeltaBytes: number;
  sameInputs: boolean;
  browserGuardPassed: boolean;
  /** `false` when the control still carries reachable Pi code. */
  excludedFully: boolean;
};

/** Projects a bundle measurement into the acceptance evidence shape. */
export function toPiBundleEvidence(measurement: {
  rawBytes: number;
  gzipBytes: number;
  xpiDeltaBytes: number;
  sameInputs: boolean;
  browserGuardPassed: boolean;
  excludedFully: boolean;
}): PiBundleEvidence {
  return {
    rawBytes: measurement.rawBytes,
    gzipBytes: measurement.gzipBytes,
    xpiDeltaBytes: measurement.xpiDeltaBytes,
    sameInputs: measurement.sameInputs,
    browserGuardPassed: measurement.browserGuardPassed,
    excludedFully: measurement.excludedFully,
  };
}
/** Execution identities follow the exact admitted dependencies, independent of catalog revision. */
export const PI_RUNTIME_VERSION =
  manifest.dependencies["@earendil-works/pi-agent-core"];
export const PI_PROVIDER_ADAPTER_VERSION =
  manifest.dependencies["@earendil-works/pi-ai"];
