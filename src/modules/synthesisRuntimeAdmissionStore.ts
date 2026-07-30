import {
  SYNTHESIS_PRODUCTION_RUNTIME_ADMISSION_STATE_SCHEMA,
  SYNTHESIS_RUNTIME_ADMISSION_UPGRADE_STAGES,
  SynthesisClientError,
  rebuildSynthesisCutoverReceipt,
  rebuildSynthesisProductionRuntimeAdmissionState,
  type SynthesisCutoverReceipt,
  type SynthesisProductionRuntimeAdmissionIdentity,
  type SynthesisProductionRuntimeAdmissionState,
  type SynthesisRuntimeAdmissionUpgradeStage,
} from "../../packages/synthesis-contracts/src";
import {
  readRuntimeTextFile,
  replacePrivateRuntimeTextFileAtomically,
  runtimePathExists,
} from "./runtimePersistence";
import type { SynthesisCutoverBackupBasis } from "./synthesisProductionCutover";

type RuntimeAdmissionStoreOptions = {
  statePath: string;
  pathExists?: (path: string) => Promise<boolean>;
  readText?: (path: string) => Promise<string>;
  replacePrivateText?: (path: string, text: string) => Promise<void>;
};

type BootstrapArgs = Omit<
  SynthesisProductionRuntimeAdmissionIdentity,
  "profileId" | "capabilityFingerprint"
> & {
  receipt: SynthesisCutoverReceipt;
  now: number;
};

function conflict(reason: string): never {
  throw new SynthesisClientError(
    "conflict",
    "The Synthesis runtime admission transition was rejected",
    { reason },
  );
}

function sameIdentity(
  left: SynthesisProductionRuntimeAdmissionIdentity,
  right: SynthesisProductionRuntimeAdmissionIdentity,
) {
  return (
    left.profileId === right.profileId &&
    left.target === right.target &&
    left.targetTriple === right.targetTriple &&
    left.protocolVersion === right.protocolVersion &&
    left.schemaVersion === right.schemaVersion &&
    left.bundleId === right.bundleId &&
    left.buildFingerprint === right.buildFingerprint &&
    left.capabilityFingerprint === right.capabilityFingerprint
  );
}

function compatibleIdentity(
  current: SynthesisProductionRuntimeAdmissionIdentity,
  target: SynthesisProductionRuntimeAdmissionIdentity,
) {
  return (
    current.profileId === target.profileId &&
    current.target === target.target &&
    current.targetTriple === target.targetTriple &&
    current.protocolVersion === target.protocolVersion &&
    current.schemaVersion === target.schemaVersion &&
    current.capabilityFingerprint === target.capabilityFingerprint &&
    current.buildFingerprint !== target.buildFingerprint
  );
}

export function createSynthesisRuntimeAdmissionStore(
  options: RuntimeAdmissionStoreOptions,
) {
  const pathExists = options.pathExists ?? runtimePathExists;
  const readText = options.readText ?? readRuntimeTextFile;
  const replacePrivateText =
    options.replacePrivateText ?? replacePrivateRuntimeTextFileAtomically;

  async function read() {
    if (!(await pathExists(options.statePath))) {
      return null;
    }
    return rebuildSynthesisProductionRuntimeAdmissionState(
      JSON.parse(await readText(options.statePath)),
    );
  }

  async function replace(value: SynthesisProductionRuntimeAdmissionState) {
    const state = rebuildSynthesisProductionRuntimeAdmissionState(value);
    await replacePrivateText(options.statePath, `${JSON.stringify(state)}\n`);
    return state;
  }

  async function bootstrap(args: BootstrapArgs) {
    const receipt = rebuildSynthesisCutoverReceipt(args.receipt);
    if (
      receipt.phase !== "mutation_enabled" ||
      !receipt.mutationEnabled ||
      !receipt.serviceInstanceId ||
      receipt.bundleFingerprint !== args.buildFingerprint
    ) {
      conflict("runtime_admission_bootstrap_receipt_invalid");
    }
    const identity: SynthesisProductionRuntimeAdmissionIdentity = {
      profileId: receipt.profileId,
      target: args.target,
      targetTriple: args.targetTriple,
      protocolVersion: args.protocolVersion,
      schemaVersion: args.schemaVersion,
      bundleId: args.bundleId,
      buildFingerprint: args.buildFingerprint,
      capabilityFingerprint: receipt.capabilityFingerprint,
    };
    const existing = await read();
    if (existing) {
      if (
        existing.cutoverReceiptId !== receipt.receiptId ||
        existing.current.generation !== 1 ||
        !sameIdentity(existing.current, identity)
      ) {
        conflict("runtime_admission_bootstrap_conflict");
      }
      return existing;
    }
    return replace({
      schema: SYNTHESIS_PRODUCTION_RUNTIME_ADMISSION_STATE_SCHEMA,
      cutoverReceiptId: receipt.receiptId,
      current: {
        generation: 1,
        ...identity,
        serviceInstanceId: receipt.serviceInstanceId,
        activationEvidenceSha256: null,
        admittedAtMs: args.now,
      },
      pendingUpgrade: null,
      updatedAtMs: args.now,
    });
  }

  async function beginUpgrade(args: {
    target: SynthesisProductionRuntimeAdmissionIdentity;
    backup: SynthesisCutoverBackupBasis;
    now: number;
  }) {
    const state = await read();
    if (
      !state ||
      state.pendingUpgrade ||
      !compatibleIdentity(state.current, args.target)
    ) {
      conflict("runtime_admission_upgrade_incompatible");
    }
    return replace({
      ...state,
      pendingUpgrade: {
        generation: state.current.generation + 1,
        previousGeneration: state.current.generation,
        stage: "backup_verified",
        target: args.target,
        backup: {
          sourceOwner: args.backup.sourceOwner,
          backupId: args.backup.backupId,
          sourceSchemaVersion: args.backup.sourceSchemaVersion,
          targetSchemaVersion: args.backup.targetSchemaVersion,
          canonicalManifestSha256: args.backup.canonicalManifestSha256,
          durableSummarySha256: args.backup.durableSummarySha256,
        },
        serviceInstanceId: null,
        activationEvidenceSha256: null,
        updatedAtMs: args.now,
      },
      updatedAtMs: args.now,
    });
  }

  async function refreshCurrent(args: {
    serviceInstanceId: string;
    activationEvidenceSha256: string;
    now: number;
  }) {
    const state = await read();
    if (!state || state.pendingUpgrade) {
      conflict("runtime_admission_refresh_conflict");
    }
    return replace({
      ...state,
      current: {
        ...state.current,
        serviceInstanceId: args.serviceInstanceId,
        activationEvidenceSha256: args.activationEvidenceSha256,
        admittedAtMs: args.now,
      },
      updatedAtMs: args.now,
    });
  }

  async function advanceUpgrade(args: {
    stage: Exclude<
      SynthesisRuntimeAdmissionUpgradeStage,
      "backup_verified"
    >;
    serviceInstanceId?: string;
    activationEvidenceSha256?: string;
    now: number;
  }) {
    const state = await read();
    const pending = state?.pendingUpgrade;
    if (!state || !pending) {
      conflict("runtime_admission_upgrade_missing");
    }
    const currentIndex = SYNTHESIS_RUNTIME_ADMISSION_UPGRADE_STAGES.indexOf(
      pending.stage,
    );
    const nextIndex = SYNTHESIS_RUNTIME_ADMISSION_UPGRADE_STAGES.indexOf(
      args.stage,
    );
    if (nextIndex !== currentIndex + 1) {
      conflict("runtime_admission_upgrade_stage_conflict");
    }
    const serviceInstanceId =
      args.serviceInstanceId ?? pending.serviceInstanceId;
    const activationEvidenceSha256 =
      args.activationEvidenceSha256 ?? pending.activationEvidenceSha256;
    return replace({
      ...state,
      pendingUpgrade: {
        ...pending,
        stage: args.stage,
        serviceInstanceId,
        activationEvidenceSha256,
        updatedAtMs: args.now,
      },
      updatedAtMs: args.now,
    });
  }

  async function clearPending(args: { now: number }) {
    const state = await read();
    if (!state?.pendingUpgrade) {
      return state;
    }
    if (state.pendingUpgrade.stage === "activation_persisted") {
      conflict("runtime_admission_activated_rollback_forbidden");
    }
    return replace({
      ...state,
      pendingUpgrade: null,
      updatedAtMs: args.now,
    });
  }

  async function promote(args: { now: number }) {
    const state = await read();
    const pending = state?.pendingUpgrade;
    if (
      !state ||
      !pending ||
      pending.stage !== "activation_persisted" ||
      !pending.serviceInstanceId ||
      !pending.activationEvidenceSha256
    ) {
      conflict("runtime_admission_promotion_not_ready");
    }
    return replace({
      ...state,
      current: {
        generation: pending.generation,
        ...pending.target,
        serviceInstanceId: pending.serviceInstanceId,
        activationEvidenceSha256: pending.activationEvidenceSha256,
        admittedAtMs: args.now,
      },
      pendingUpgrade: null,
      updatedAtMs: args.now,
    });
  }

  return {
    read,
    bootstrap,
    beginUpgrade,
    refreshCurrent,
    advanceUpgrade,
    clearPending,
    promote,
  };
}
