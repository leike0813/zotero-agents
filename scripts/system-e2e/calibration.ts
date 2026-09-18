import type {
  CompatibilityE2ELane,
  CompatibilityExecutionCell,
  CompatibilityScenarioFamily,
} from "../zotero-compatibility-fixture";
import type { RunManifest } from "./manifest";

export type CalibrationRound = {
  workflowRunId: string;
  profileIdentity: string;
  durationMs: number;
  cell: CompatibilityExecutionCell;
  manifest: RunManifest;
  infrastructure: {
    processes: "clean" | "leaked";
    ports: "released" | "held";
    locks: "released" | "held";
  };
};

export type CalibrationResult = {
  eligible: boolean;
  reasons: string[];
  maxDurationMs: number;
  identityKey: string;
};

function calibrationIdentity(cell: CompatibilityExecutionCell) {
  return JSON.stringify({
    lane: cell.lane,
    targetId: cell.targetId,
    version: cell.version,
    platform: cell.platform,
    families: cell.families,
    runnerEnvironment: cell.runnerEnvironment,
    fixtureScale: cell.fixtureScale,
    sidecarStartupModel: cell.sidecarStartupModel,
    invocationProfileModel: cell.invocationProfileModel,
  });
}

function expectedManifestPlatform(
  os: CompatibilityExecutionCell["runnerEnvironment"]["os"],
) {
  return os === "windows" ? "win32" : os === "macos" ? "darwin" : os;
}

export function validateCalibrationRounds(
  rounds: readonly CalibrationRound[],
): CalibrationResult {
  const reasons = new Set<string>();
  const identityKey = rounds[0] ? calibrationIdentity(rounds[0].cell) : "";
  if (rounds.length !== 3) reasons.add("round-count");
  if (
    new Set(rounds.map((round) => round.workflowRunId)).size !== rounds.length
  )
    reasons.add("workflow");
  if (
    new Set(rounds.map((round) => round.profileIdentity)).size !== rounds.length
  )
    reasons.add("profile");
  if (
    new Set(rounds.map((round) => round.manifest.runId)).size !== rounds.length
  )
    reasons.add("profile");

  for (const round of rounds) {
    if (calibrationIdentity(round.cell) !== identityKey)
      reasons.add("identity");
    if (
      round.manifest.triggerLane !== round.cell.lane ||
      round.manifest.zoteroVersion !== round.cell.version ||
      round.manifest.platform !==
        expectedManifestPlatform(round.cell.runnerEnvironment.os)
    ) {
      reasons.add("identity");
    }
    if (round.manifest.terminalState !== "complete") reasons.add("terminal");
    const phase1Families = round.manifest.families.filter(
      (family) => family.familyId !== "runner-foundation",
    );
    const observedFamilies = new Set(
      phase1Families.map((family) => family.familyId),
    );
    if (
      round.cell.families.some((family) => !observedFamilies.has(family)) ||
      [...observedFamilies].some(
        (family) =>
          !round.cell.families.includes(family as CompatibilityScenarioFamily),
      ) ||
      round.manifest.families.some((family) => family.result !== "passed")
    ) {
      reasons.add("families");
    }
    if (round.manifest.families.some((family) => family.cleanup !== "passed"))
      reasons.add("cleanup");
    if (round.manifest.families.some((family) => family.health !== "passed"))
      reasons.add("health");
    if (round.infrastructure.processes !== "clean") reasons.add("process");
    if (round.infrastructure.ports !== "released") reasons.add("port");
    if (round.infrastructure.locks !== "released") reasons.add("lock");
  }

  return {
    eligible: reasons.size === 0,
    reasons: [...reasons],
    maxDurationMs: Math.max(0, ...rounds.map((round) => round.durationMs)),
    identityKey,
  };
}

const GROUPING_THRESHOLD_MINUTES: Record<CompatibilityE2ELane, number> = {
  "pull-request": 15,
  main: 30,
  release: 45,
  weekly: 60,
  stress: 60,
  "manual-gold": 90,
};

export function evaluateCalibrationGrouping(
  lane: CompatibilityE2ELane,
  families: CompatibilityScenarioFamily[],
  durationsMs: number[],
) {
  const thresholdMs = GROUPING_THRESHOLD_MINUTES[lane] * 60_000;
  const maxDurationMs = Math.max(0, ...durationsMs);
  let nextGroups: CompatibilityScenarioFamily[][] | undefined;
  if (
    maxDurationMs > thresholdMs &&
    families.includes("HB") &&
    families.length > 1
  ) {
    nextGroups = [families.filter((family) => family !== "HB"), ["HB"]];
  } else if (
    maxDurationMs > thresholdMs &&
    ["SL", "RH", "PA", "PM", "CG"].every((family) =>
      families.includes(family as CompatibilityScenarioFamily),
    )
  ) {
    nextGroups = [
      ["SL", "PM"],
      ["RH", "PA", "CG"],
    ];
  }
  return {
    thresholdMs,
    maxDurationMs,
    exceeded: maxDurationMs > thresholdMs,
    ...(nextGroups ? { nextGroups } : {}),
  };
}

export function evaluateE2EPromotion(args: {
  cell: CompatibilityExecutionCell;
  configuredBlocking: boolean;
  calibration: CalibrationResult;
  windowsEvidence?: {
    cg02: "passed" | "failed";
    trustworthy: boolean;
    zotero9Classification: "passed" | "affected" | "unverified";
  };
}) {
  if (!args.configuredBlocking) {
    return { allowed: true, blocking: false };
  }
  if (!args.calibration.eligible) {
    return { allowed: false, blocking: false, reason: "calibration" };
  }
  if (args.cell.lane === "release" && args.cell.platform === "windows-x64") {
    const evidence = args.windowsEvidence;
    if (!evidence || evidence.cg02 !== "passed" || !evidence.trustworthy) {
      return { allowed: false, blocking: false, reason: "cg02" };
    }
    if (evidence.zotero9Classification === "unverified") {
      return { allowed: false, blocking: false, reason: "zotero9" };
    }
  }
  return { allowed: true, blocking: true };
}
