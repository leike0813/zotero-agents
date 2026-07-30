import { sha256Hex } from "../platform/hash";

export const SYNTHESIS_PRODUCTION_SMOKE_ROSTER_VERSION =
  "synthesis-production-critical-smoke.v1" as const;

export const SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS = [
  "identity",
  "storage",
  "workbench",
  "topic-list",
  "topic-detail",
  "canonical-manifest",
  "reference-cache",
  "graph-read",
  "worker",
] as const;

export type SynthesisProductionSmokeCheckId =
  (typeof SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS)[number];

function stable(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .map(stable)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key]) =>
          !/(message|log|time|timestamp|createdAt|updatedAt|private)/i.test(
            key,
          ),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]),
  );
}

async function digest(value: unknown) {
  return sha256Hex(new TextEncoder().encode(JSON.stringify(stable(value))));
}

export async function createSynthesisProductionSmokeEvidence(args: {
  profileId: string;
  receiptId: string;
  runtimeAdmissionGeneration: number;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  capabilityFingerprint: string;
  results: ReadonlyArray<{
    id: SynthesisProductionSmokeCheckId;
    observable: unknown;
  }>;
}) {
  const ids = args.results.map((result) => result.id);
  if (ids.join("\n") !== SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS.join("\n")) {
    throw new Error("synthesis_production_smoke_roster_incomplete");
  }
  const smokeCheckDigests = await Promise.all(
    args.results.map((result) =>
      digest({
        id: result.id,
        profileId: args.profileId,
        receiptId: args.receiptId,
        runtimeAdmissionGeneration: args.runtimeAdmissionGeneration,
        serviceInstanceId: args.serviceInstanceId,
        supervisorInstanceId: args.supervisorInstanceId,
        observable: result.observable,
      }),
    ),
  );
  const smokeEvidenceDigest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify([
        SYNTHESIS_PRODUCTION_SMOKE_ROSTER_VERSION,
        ...ids,
        ...smokeCheckDigests,
        args.profileId,
        args.receiptId,
        args.runtimeAdmissionGeneration,
        args.serviceInstanceId,
        args.supervisorInstanceId,
        args.capabilityFingerprint,
      ]),
    ),
  );
  return {
    smokeRosterVersion: SYNTHESIS_PRODUCTION_SMOKE_ROSTER_VERSION,
    smokeCheckIds: ids,
    smokeCheckDigests,
    profileId: args.profileId,
    supervisorInstanceId: args.supervisorInstanceId,
    runtimeAdmissionGeneration: args.runtimeAdmissionGeneration,
    smokeEvidenceDigest,
  };
}
