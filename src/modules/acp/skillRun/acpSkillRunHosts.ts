import type {
  AcpSkillRunRecord,
  AcpSkillRunRuntimeCatalog,
  AcpSkillRunWorkspaceChange,
  AcpSkillRunWorkspaceChangeKind,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import type { AcpSkillRunTranscriptLiveState } from "./acpSkillRunTranscriptMirror";

// Host slots for the ACP skill run store's three collaborator modules
// (persistence, transcript mirror, workspace data plane). The store injects
// its record-pipeline callbacks at module evaluation time. Holding the slots
// in this leaf module — which has no runtime imports — keeps that wiring safe
// regardless of which module of the store/persistence import cycle evaluates
// first.

// Registry access owned by acpSkillRunStore (run records, selection,
// transcript live states) plus workspace-change emission owned by the
// workspace data-plane. Injected once at module load so this module never
// imports the store or the data-plane at runtime.
export type AcpSkillRunPersistenceHost = {
  listRunRecords(): Iterable<AcpSkillRunRecord>;
  resolveRunRecord(requestId: string): AcpSkillRunRecord | undefined;
  setAcpSkillRunRecord(record: AcpSkillRunRecord): void;
  upsertAcpSkillRun(update: Parameters<typeof upsertAcpSkillRun>[0]): void;
  deleteRunRecord(requestId: string): void;
  isEligibleForPostTerminalConversation(record: AcpSkillRunRecord): boolean;
  getSelectedRequestId(): string;
  clearSelectedRequestId(): void;
  peekTranscriptLiveState(
    requestId: string,
  ): AcpSkillRunTranscriptLiveState | undefined;
  acpSkillRunWorkspaceChange(
    requestId: string,
    kinds: AcpSkillRunWorkspaceChangeKind[],
  ): AcpSkillRunWorkspaceChange;
  createWorkspaceChange(
    change: AcpSkillRunWorkspaceChange,
  ): AcpSkillRunWorkspaceChange;
  emitWorkspaceChanged(change?: AcpSkillRunWorkspaceChange): void;
};

export type AcpSkillRunTranscriptMirrorHost = {
  ensureHydrated(): void;
  resolveRunRecord(requestId: string): AcpSkillRunRecord | undefined;
  getTranscriptLiveState(
    record: AcpSkillRunRecord,
  ): AcpSkillRunTranscriptLiveState;
  peekTranscriptLiveState(
    requestId: string,
  ): AcpSkillRunTranscriptLiveState | undefined;
  listTranscriptLiveStates(): Iterable<
    readonly [string, AcpSkillRunTranscriptLiveState]
  >;
  getSelectedRequestId(): string;
  isLifecycleOpen(record: AcpSkillRunRecord): boolean;
  setAcpSkillRunRecord(record: AcpSkillRunRecord): void;
  persistRun(record: AcpSkillRunRecord): void;
  scheduleSoftRunPersist(record: AcpSkillRunRecord): void;
  emitWorkspaceChanged(change?: AcpSkillRunWorkspaceChange): void;
  scheduleWorkspaceChangedEmit(change?: AcpSkillRunWorkspaceChange): void;
  acpSkillRunWorkspaceChange(
    requestId: string,
    kinds: AcpSkillRunWorkspaceChangeKind[],
  ): AcpSkillRunWorkspaceChange;
};

export type AcpSkillRunWorkspaceDataPlaneHost = {
  resolveRunRecord(requestId: string): AcpSkillRunRecord | undefined;
  listRunRecords(): Iterable<AcpSkillRunRecord>;
  listActiveRunRequestIds(): Iterable<string>;
  isActiveRecordForSummary(record: AcpSkillRunRecord): boolean;
  projectRunRecordMetadata(record: AcpSkillRunRecord): AcpSkillRunRecord;
  getTranscriptLiveState(
    record: AcpSkillRunRecord,
  ): AcpSkillRunTranscriptLiveState;
  peekTranscriptLiveState(
    requestId: string,
  ): AcpSkillRunTranscriptLiveState | undefined;
  runtimeCatalogForRun(run: AcpSkillRunRecord): AcpSkillRunRuntimeCatalog;
};

let persistenceHost: AcpSkillRunPersistenceHost | undefined;
let transcriptMirrorHost: AcpSkillRunTranscriptMirrorHost | undefined;
let workspaceDataPlaneHost: AcpSkillRunWorkspaceDataPlaneHost | undefined;

export function configureAcpSkillRunPersistenceHost(
  nextHost: AcpSkillRunPersistenceHost,
) {
  persistenceHost = nextHost;
}

export function getAcpSkillRunPersistenceHost(): AcpSkillRunPersistenceHost {
  if (!persistenceHost) {
    throw new Error("ACP skill run persistence host is not configured.");
  }
  return persistenceHost;
}

export function configureAcpSkillRunTranscriptMirrorHost(
  nextHost: AcpSkillRunTranscriptMirrorHost,
) {
  transcriptMirrorHost = nextHost;
}

export function getAcpSkillRunTranscriptMirrorHost(): AcpSkillRunTranscriptMirrorHost {
  if (!transcriptMirrorHost) {
    throw new Error("ACP skill run transcript mirror host is not configured.");
  }
  return transcriptMirrorHost;
}

export function configureAcpSkillRunWorkspaceDataPlaneHost(
  nextHost: AcpSkillRunWorkspaceDataPlaneHost,
) {
  workspaceDataPlaneHost = nextHost;
}

export function getAcpSkillRunWorkspaceDataPlaneHost(): AcpSkillRunWorkspaceDataPlaneHost {
  if (!workspaceDataPlaneHost) {
    throw new Error(
      "ACP skill run workspace data plane host is not configured.",
    );
  }
  return workspaceDataPlaneHost;
}
