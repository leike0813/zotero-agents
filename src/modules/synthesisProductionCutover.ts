import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SynthesisClientError,
  rebuildSynthesisCutoverReceipt,
  type SynthesisCutoverReceipt,
  type SynthesisProductionActivationEvidence,
  type SynthesisProductionRuntimeAdmissionIdentity,
  type SynthesisProductionRuntimeAdmissionState,
  type SynthesisRuntimeAdmissionUpgradeStage,
} from "../../packages/synthesis-contracts/src";

export type SynthesisCutoverBackupBasis = {
  sourceOwner: SynthesisCutoverReceipt["sourceOwner"];
  backupId: string;
  sourceSchemaVersion: string;
  targetSchemaVersion: string;
  canonicalManifestSha256: string;
  durableSummarySha256: string;
};

type SynthesisResolvedProductionRuntime = {
  bundleId: string;
  buildFingerprint: string;
};

export type SynthesisProductionRuntimeUpgradeDeps = {
  now: () => number;
  readAdmission: () => Promise<SynthesisProductionRuntimeAdmissionState>;
  resolveRuntime: (
    buildFingerprint: string,
  ) => Promise<SynthesisResolvedProductionRuntime>;
  stopCurrentOwner: () => Promise<void>;
  createVerifiedBackup: () => Promise<SynthesisCutoverBackupBasis>;
  beginUpgrade: (args: {
    target: SynthesisProductionRuntimeAdmissionIdentity;
    backup: SynthesisCutoverBackupBasis;
    now: number;
  }) => Promise<SynthesisProductionRuntimeAdmissionState>;
  advanceUpgrade: (args: {
    stage: Exclude<SynthesisRuntimeAdmissionUpgradeStage, "backup_verified">;
    serviceInstanceId?: string;
    activationEvidenceSha256?: string;
    now: number;
  }) => Promise<SynthesisProductionRuntimeAdmissionState>;
  preflightTarget: (
    runtime: SynthesisResolvedProductionRuntime,
    basis: SynthesisCutoverBackupBasis,
    generation: number,
  ) => Promise<void>;
  startTarget: (
    runtime: SynthesisResolvedProductionRuntime,
    generation: number,
  ) => Promise<{ serviceInstanceId: string }>;
  runCriticalSmoke: (
    serviceInstanceId: string,
    generation: number,
  ) => Promise<SynthesisProductionActivationEvidence>;
  activateTarget: (
    evidence: SynthesisProductionActivationEvidence,
  ) => Promise<string>;
  readPersistedActivationEvidence: (
    pending: NonNullable<
      SynthesisProductionRuntimeAdmissionState["pendingUpgrade"]
    >,
  ) => Promise<string | null>;
  promote: (args: {
    now: number;
  }) => Promise<SynthesisProductionRuntimeAdmissionState>;
  reconcile: () => Promise<void>;
  stopTarget: () => Promise<void>;
  restoreBackup: (basis: SynthesisCutoverBackupBasis) => Promise<void>;
  clearPending: (args: { now: number }) => Promise<unknown>;
  restartPrevious: (
    runtime: SynthesisResolvedProductionRuntime,
    generation: number,
  ) => Promise<void>;
  enterRustOnlyRepair: () => Promise<void>;
};

function runtimeIdentityCompatible(
  current: SynthesisProductionRuntimeAdmissionState["current"],
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

function requireResolvedRuntime(
  runtime: SynthesisResolvedProductionRuntime,
  identity: Pick<
    SynthesisProductionRuntimeAdmissionIdentity,
    "bundleId" | "buildFingerprint"
  >,
) {
  if (
    runtime.bundleId !== identity.bundleId ||
    runtime.buildFingerprint !== identity.buildFingerprint
  ) {
    throw new SynthesisClientError(
      "conflict",
      "The verified Synthesis runtime does not match runtime admission",
      { reason: "runtime_mismatch" },
    );
  }
  return runtime;
}

export function createSynthesisProductionRuntimeUpgradeCoordinator(options: {
  receipt: SynthesisCutoverReceipt;
  target: SynthesisProductionRuntimeAdmissionIdentity;
  deps: SynthesisProductionRuntimeUpgradeDeps;
}) {
  let running: Promise<{
    status: "matching" | "upgraded" | "recovered";
    admission: SynthesisProductionRuntimeAdmissionState;
  }> | null = null;

  async function recoverBeforeActivation(
    state: SynthesisProductionRuntimeAdmissionState,
    previousRuntime: SynthesisResolvedProductionRuntime,
  ) {
    const pending = state.pendingUpgrade;
    if (!pending) {
      await options.deps.restartPrevious(
        previousRuntime,
        state.current.generation,
      );
      return state;
    }
    await options.deps.stopTarget();
    await options.deps.restoreBackup(pending.backup);
    await options.deps.clearPending({ now: options.deps.now() });
    await options.deps.restartPrevious(
      previousRuntime,
      state.current.generation,
    );
    return options.deps.readAdmission();
  }

  async function resumePending(
    state: SynthesisProductionRuntimeAdmissionState,
    previousRuntime: SynthesisResolvedProductionRuntime,
  ) {
    const pending = state.pendingUpgrade!;
    if (pending.stage !== "activation_persisted") {
      const persisted =
        await options.deps.readPersistedActivationEvidence(pending);
      if (pending.stage === "smoke_passed" && persisted) {
        state = await options.deps.advanceUpgrade({
          stage: "activation_persisted",
          activationEvidenceSha256: persisted,
          now: options.deps.now(),
        });
      } else {
        return {
          status: "recovered" as const,
          admission: await recoverBeforeActivation(state, previousRuntime),
        };
      }
    }
    const promoted = await options.deps.promote({ now: options.deps.now() });
    await options.deps.reconcile();
    return { status: "upgraded" as const, admission: promoted };
  }

  async function resumePendingOrRepair(
    state: SynthesisProductionRuntimeAdmissionState,
    previousRuntime: SynthesisResolvedProductionRuntime,
  ) {
    try {
      return await resumePending(state, previousRuntime);
    } catch (error) {
      await options.deps.enterRustOnlyRepair();
      throw error;
    }
  }

  async function execute() {
    let state = await options.deps.readAdmission();
    if (
      state.cutoverReceiptId !== options.receipt.receiptId ||
      state.current.profileId !== options.receipt.profileId ||
      state.current.capabilityFingerprint !==
        options.receipt.capabilityFingerprint
    ) {
      throw new SynthesisClientError(
        "conflict",
        "The Synthesis runtime admission does not match first cutover",
        { reason: "runtime_mismatch" },
      );
    }
    const previousRuntime = requireResolvedRuntime(
      await options.deps.resolveRuntime(state.current.buildFingerprint),
      state.current,
    );
    if (state.pendingUpgrade) {
      requireResolvedRuntime(
        await options.deps.resolveRuntime(
          state.pendingUpgrade.target.buildFingerprint,
        ),
        state.pendingUpgrade.target,
      );
      return resumePendingOrRepair(state, previousRuntime);
    }
    if (
      state.current.buildFingerprint === options.target.buildFingerprint &&
      state.current.bundleId === options.target.bundleId
    ) {
      return { status: "matching" as const, admission: state };
    }
    if (!runtimeIdentityCompatible(state.current, options.target)) {
      throw new SynthesisClientError(
        "conflict",
        "The installed native Synthesis runtime is not upgrade-compatible",
        {
          reason: "runtime_mismatch",
          currentBuildFingerprint: state.current.buildFingerprint,
          targetBuildFingerprint: options.target.buildFingerprint,
        },
      );
    }
    const targetRuntime = requireResolvedRuntime(
      await options.deps.resolveRuntime(options.target.buildFingerprint),
      options.target,
    );

    let currentStopped = false;
    let activationAttempted = false;
    try {
      await options.deps.stopCurrentOwner();
      currentStopped = true;
      const backup = await options.deps.createVerifiedBackup();
      state = await options.deps.beginUpgrade({
        target: options.target,
        backup,
        now: options.deps.now(),
      });
      const generation = state.pendingUpgrade!.generation;
      await options.deps.preflightTarget(targetRuntime, backup, generation);
      state = await options.deps.advanceUpgrade({
        stage: "preflight_passed",
        now: options.deps.now(),
      });
      const owner = await options.deps.startTarget(targetRuntime, generation);
      state = await options.deps.advanceUpgrade({
        stage: "candidate_started",
        serviceInstanceId: owner.serviceInstanceId,
        now: options.deps.now(),
      });
      const evidence = await options.deps.runCriticalSmoke(
        owner.serviceInstanceId,
        generation,
      );
      if (evidence.runtimeAdmissionGeneration !== generation) {
        throw new SynthesisClientError(
          "conflict",
          "The Synthesis smoke evidence generation is stale",
          { reason: "runtime_mismatch" },
        );
      }
      state = await options.deps.advanceUpgrade({
        stage: "smoke_passed",
        now: options.deps.now(),
      });
      activationAttempted = true;
      const activationEvidenceSha256 =
        await options.deps.activateTarget(evidence);
      state = await options.deps.advanceUpgrade({
        stage: "activation_persisted",
        activationEvidenceSha256,
        now: options.deps.now(),
      });
      const promoted = await options.deps.promote({
        now: options.deps.now(),
      });
      await options.deps.reconcile();
      return { status: "upgraded" as const, admission: promoted };
    } catch (error) {
      const latest = await options.deps.readAdmission();
      const targetIsCurrent =
        latest.current.buildFingerprint === options.target.buildFingerprint;
      if (targetIsCurrent) {
        await options.deps.enterRustOnlyRepair();
      } else if (latest.pendingUpgrade?.stage === "activation_persisted") {
        return await resumePendingOrRepair(latest, previousRuntime);
      } else if (
        activationAttempted &&
        latest.pendingUpgrade?.stage === "smoke_passed"
      ) {
        const persisted = await options.deps.readPersistedActivationEvidence(
          latest.pendingUpgrade,
        );
        if (persisted) {
          try {
            state = await options.deps.advanceUpgrade({
              stage: "activation_persisted",
              activationEvidenceSha256: persisted,
              now: options.deps.now(),
            });
          } catch (resumeError) {
            await options.deps.enterRustOnlyRepair();
            throw resumeError;
          }
          return await resumePendingOrRepair(state, previousRuntime);
        }
        await options.deps.enterRustOnlyRepair();
      } else if (currentStopped) {
        await recoverBeforeActivation(latest, previousRuntime);
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

export type SynthesisCutoverCoordinatorDeps<
  BackupBasis extends SynthesisCutoverBackupBasis = SynthesisCutoverBackupBasis,
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
  BackupBasis extends SynthesisCutoverBackupBasis = SynthesisCutoverBackupBasis,
> = {
  profileId: string;
  bundleFingerprint: string;
  capabilityFingerprint: string;
  admittedRuntime?: {
    generation: number;
    buildFingerprint: string;
    refresh: (
      serviceInstanceId: string,
      evidence: SynthesisProductionActivationEvidence,
    ) => Promise<void>;
  };
  deps: SynthesisCutoverCoordinatorDeps<BackupBasis>;
};

function receipt<BackupBasis extends SynthesisCutoverBackupBasis>(
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
    sourceOwner: basis.sourceOwner,
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
>(options: CoordinatorOptions<BackupBasis>) {
  let running: Promise<{
    status: "mutation_enabled";
    receipt: SynthesisCutoverReceipt;
  }> | null = null;

  async function execute() {
    const existing = await options.deps.readReceipt();
    if (
      existing &&
      existing.profileId === options.profileId &&
      existing.capabilityFingerprint === options.capabilityFingerprint &&
      (options.admittedRuntime
        ? options.admittedRuntime.buildFingerprint === options.bundleFingerprint
        : sameIdentity(existing, options)) &&
      existing.phase === "mutation_enabled" &&
      existing.mutationEnabled
    ) {
      const basis: SynthesisCutoverBackupBasis = {
        sourceOwner: existing.sourceOwner,
        backupId: existing.backupId,
        sourceSchemaVersion: existing.sourceSchemaVersion,
        targetSchemaVersion: existing.targetSchemaVersion,
        canonicalManifestSha256: existing.canonicalManifestSha256,
        durableSummarySha256: existing.durableSummarySha256,
      };
      try {
        const owner = await options.deps.acquireNativeOwner(basis, existing);
        const smokeEvidence = await options.deps.runCriticalSmoke(
          owner.serviceInstanceId,
          existing,
        );
        await options.deps.enableNativeMutations(
          owner.serviceInstanceId,
          existing,
          smokeEvidence,
        );
        if (options.admittedRuntime) {
          await options.admittedRuntime.refresh(
            owner.serviceInstanceId,
            smokeEvidence,
          );
          return {
            status: "mutation_enabled" as const,
            receipt: existing,
          };
        }
        const refreshed = receipt(options, basis, {
          receiptId: existing.receiptId,
          phase: "mutation_enabled",
          serviceInstanceId: owner.serviceInstanceId,
          mutationEnabled: true,
        });
        await options.deps.writeReceipt(refreshed);
        return {
          status: "mutation_enabled" as const,
          receipt: refreshed,
        };
      } catch (error) {
        await options.deps.enterRustOnlyRepair(existing);
        throw error;
      }
    }
    if (existing?.phase === "mutation_enabled" || existing?.mutationEnabled) {
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
