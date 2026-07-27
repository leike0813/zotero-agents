import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SynthesisClientError,
  rebuildSynthesisCutoverReceipt,
  type SynthesisCutoverReceipt,
} from "../../packages/synthesis-contracts/src";

export type SynthesisCutoverBackupBasis = {
  backupId: string;
  sourceSchemaVersion: string;
  targetSchemaVersion: string;
  canonicalManifestSha256: string;
  durableSummarySha256: string;
};

export type SynthesisCutoverCoordinatorDeps = {
  now: () => number;
  readReceipt: () => Promise<SynthesisCutoverReceipt | null>;
  writeReceipt: (receipt: SynthesisCutoverReceipt) => Promise<void>;
  enterMaintenance: () => Promise<void>;
  drainLegacyOwner: () => Promise<void>;
  createVerifiedBackup: () => Promise<SynthesisCutoverBackupBasis>;
  preflightNativeOwner: (
    basis: SynthesisCutoverBackupBasis,
  ) => Promise<void>;
  acquireNativeOwner: (
    basis: SynthesisCutoverBackupBasis,
  ) => Promise<{ serviceInstanceId: string }>;
  runCriticalSmoke: (serviceInstanceId: string) => Promise<void>;
  enableNativeMutations: (serviceInstanceId: string) => Promise<void>;
  resumeLegacyBeforeMigration: (
    receipt: SynthesisCutoverReceipt | null,
  ) => Promise<void>;
  restoreBackupBeforeAdmission: (
    receipt: SynthesisCutoverReceipt,
  ) => Promise<void>;
  enterRustOnlyRepair: (receipt: SynthesisCutoverReceipt) => Promise<void>;
};

type CoordinatorOptions = {
  profileId: string;
  bundleFingerprint: string;
  capabilityFingerprint: string;
  deps: SynthesisCutoverCoordinatorDeps;
};

function receipt(
  options: CoordinatorOptions,
  basis: SynthesisCutoverBackupBasis,
  args: {
    receiptId: string;
    phase: SynthesisCutoverReceipt["phase"];
    serviceInstanceId: string | null;
    mutationEnabled: boolean;
  },
) {
  return rebuildSynthesisCutoverReceipt({
    schema: SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
    receiptId: args.receiptId,
    profileId: options.profileId,
    phase: args.phase,
    sourceOwner: "legacy-plugin",
    targetOwner: "rust-native",
    backupId: basis.backupId,
    sourceSchemaVersion: basis.sourceSchemaVersion,
    targetSchemaVersion: basis.targetSchemaVersion,
    canonicalManifestSha256: basis.canonicalManifestSha256,
    durableSummarySha256: basis.durableSummarySha256,
    bundleFingerprint: options.bundleFingerprint,
    capabilityFingerprint: options.capabilityFingerprint,
    serviceInstanceId: args.serviceInstanceId,
    mutationEnabled: args.mutationEnabled,
    updatedAtMs: options.deps.now(),
  });
}

function sameIdentity(
  value: SynthesisCutoverReceipt,
  options: CoordinatorOptions,
) {
  return (
    value.profileId === options.profileId &&
    value.bundleFingerprint === options.bundleFingerprint &&
    value.capabilityFingerprint === options.capabilityFingerprint
  );
}

export function createSynthesisProductionCutoverCoordinator(
  options: CoordinatorOptions,
) {
  let running: Promise<{
    status: "mutation_enabled";
    receipt: SynthesisCutoverReceipt;
  }> | null = null;

  async function execute() {
    const existing = await options.deps.readReceipt();
    if (
      existing &&
      sameIdentity(existing, options) &&
      existing.phase === "mutation_enabled" &&
      existing.mutationEnabled
    ) {
      return { status: "mutation_enabled" as const, receipt: existing };
    }
    if (
      existing?.phase === "mutation_enabled" ||
      existing?.mutationEnabled
    ) {
      await options.deps.enterRustOnlyRepair(existing);
      throw new SynthesisClientError(
        "conflict",
        "The admitted native Synthesis owner does not match this runtime",
        { reason: "runtime_mismatch" },
      );
    }

    if (existing?.phase === "native_owner") {
      await options.deps.restoreBackupBeforeAdmission(existing);
    } else if (existing && existing.phase !== "legacy") {
      await options.deps.resumeLegacyBeforeMigration(existing);
    }

    let latest: SynthesisCutoverReceipt | null = null;
    let nativeOwnerAcquired = false;
    let mutationAdmitted = false;
    try {
      await options.deps.enterMaintenance();
      await options.deps.drainLegacyOwner();
      const basis = await options.deps.createVerifiedBackup();
      const receiptId = `cutover:${options.profileId.slice(0, 16)}:${options.deps.now()}`;

      latest = receipt(options, basis, {
        receiptId,
        phase: "backup_verified",
        serviceInstanceId: null,
        mutationEnabled: false,
      });
      await options.deps.writeReceipt(latest);

      await options.deps.preflightNativeOwner(basis);
      latest = receipt(options, basis, {
        receiptId,
        phase: "preflight_verified",
        serviceInstanceId: null,
        mutationEnabled: false,
      });
      await options.deps.writeReceipt(latest);

      const owner = await options.deps.acquireNativeOwner(basis);
      nativeOwnerAcquired = true;
      latest = receipt(options, basis, {
        receiptId,
        phase: "native_owner",
        serviceInstanceId: owner.serviceInstanceId,
        mutationEnabled: false,
      });
      await options.deps.writeReceipt(latest);

      await options.deps.runCriticalSmoke(owner.serviceInstanceId);
      await options.deps.enableNativeMutations(owner.serviceInstanceId);
      mutationAdmitted = true;
      latest = receipt(options, basis, {
        receiptId,
        phase: "mutation_enabled",
        serviceInstanceId: owner.serviceInstanceId,
        mutationEnabled: true,
      });
      await options.deps.writeReceipt(latest);
      return { status: "mutation_enabled" as const, receipt: latest };
    } catch (error) {
      if (mutationAdmitted && latest) {
        await options.deps.enterRustOnlyRepair(latest);
      } else if (nativeOwnerAcquired && latest) {
        await options.deps.restoreBackupBeforeAdmission(latest);
      } else {
        await options.deps.resumeLegacyBeforeMigration(latest);
      }
      throw error;
    }
  }

  return {
    run() {
      running ||= execute().finally(() => {
        running = null;
      });
      return running;
    },
  };
}
