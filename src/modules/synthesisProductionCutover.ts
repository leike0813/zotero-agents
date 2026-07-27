import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SynthesisClientError,
  rebuildSynthesisCutoverReceipt,
  type SynthesisCutoverReceipt,
  type SynthesisProductionActivationEvidence,
} from "../../packages/synthesis-contracts/src";

export type SynthesisCutoverBackupBasis = {
  backupId: string;
  sourceSchemaVersion: string;
  targetSchemaVersion: string;
  canonicalManifestSha256: string;
  durableSummarySha256: string;
};

export type SynthesisCutoverCoordinatorDeps<
  BackupBasis extends SynthesisCutoverBackupBasis =
    SynthesisCutoverBackupBasis,
> = {
  now: () => number;
  readReceipt: () => Promise<SynthesisCutoverReceipt | null>;
  writeReceipt: (receipt: SynthesisCutoverReceipt) => Promise<void>;
  enterMaintenance: () => Promise<void>;
  drainLegacyOwner: () => Promise<void>;
  createVerifiedBackup: () => Promise<BackupBasis>;
  preflightNativeOwner: (
    basis: BackupBasis,
    receipt: SynthesisCutoverReceipt,
  ) => Promise<void>;
  acquireNativeOwner: (
    basis: SynthesisCutoverBackupBasis,
    receipt: SynthesisCutoverReceipt,
  ) => Promise<{ serviceInstanceId: string }>;
  runCriticalSmoke: (
    serviceInstanceId: string,
    receipt: SynthesisCutoverReceipt,
  ) => Promise<SynthesisProductionActivationEvidence>;
  enableNativeMutations: (
    serviceInstanceId: string,
    receipt: SynthesisCutoverReceipt,
    evidence: SynthesisProductionActivationEvidence,
  ) => Promise<void>;
  resumeLegacyBeforeMigration: (
    receipt: SynthesisCutoverReceipt | null,
  ) => Promise<void>;
  restoreBackupBeforeAdmission: (
    receipt: SynthesisCutoverReceipt,
  ) => Promise<void>;
  enterRustOnlyRepair: (receipt: SynthesisCutoverReceipt) => Promise<void>;
};

type CoordinatorOptions<
  BackupBasis extends SynthesisCutoverBackupBasis =
    SynthesisCutoverBackupBasis,
> = {
  profileId: string;
  bundleFingerprint: string;
  capabilityFingerprint: string;
  deps: SynthesisCutoverCoordinatorDeps<BackupBasis>;
};

function receipt<
  BackupBasis extends SynthesisCutoverBackupBasis,
>(
  options: CoordinatorOptions<BackupBasis>,
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
  options: Pick<
    CoordinatorOptions,
    "profileId" | "bundleFingerprint" | "capabilityFingerprint"
  >,
) {
  return (
    value.profileId === options.profileId &&
    value.bundleFingerprint === options.bundleFingerprint &&
    value.capabilityFingerprint === options.capabilityFingerprint
  );
}

export function createSynthesisProductionCutoverCoordinator<
  BackupBasis extends SynthesisCutoverBackupBasis,
>(
  options: CoordinatorOptions<BackupBasis>,
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
      const basis: SynthesisCutoverBackupBasis = {
        backupId: existing.backupId,
        sourceSchemaVersion: existing.sourceSchemaVersion,
        targetSchemaVersion: existing.targetSchemaVersion,
        canonicalManifestSha256:
          existing.canonicalManifestSha256,
        durableSummarySha256: existing.durableSummarySha256,
      };
      try {
        const owner = await options.deps.acquireNativeOwner(
          basis,
          existing,
        );
        await options.deps.runCriticalSmoke(
          owner.serviceInstanceId,
          existing,
        );
        return {
          status: "mutation_enabled" as const,
          receipt: existing,
        };
      } catch (error) {
        await options.deps.enterRustOnlyRepair(existing);
        throw error;
      }
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

      await options.deps.preflightNativeOwner(basis, latest);
      latest = receipt(options, basis, {
        receiptId,
        phase: "preflight_verified",
        serviceInstanceId: null,
        mutationEnabled: false,
      });
      await options.deps.writeReceipt(latest);

      const owner = await options.deps.acquireNativeOwner(basis, latest);
      nativeOwnerAcquired = true;
      latest = receipt(options, basis, {
        receiptId,
        phase: "native_owner",
        serviceInstanceId: owner.serviceInstanceId,
        mutationEnabled: false,
      });
      await options.deps.writeReceipt(latest);

      const smokeEvidence = await options.deps.runCriticalSmoke(
        owner.serviceInstanceId,
        latest,
      );
      await options.deps.enableNativeMutations(
        owner.serviceInstanceId,
        latest,
        smokeEvidence,
      );
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
