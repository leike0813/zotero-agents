import type { AssistantWorkspacePublishReason } from "./assistantExecutionDisplayPolicy";
import type {
  AcpChatWorkspaceChange,
  AcpChatWorkspaceChangeKind,
} from "./acpChatWorkspaceDataPlane";
import type { AcpChatSessionRuntime } from "./acpSessionManager";

export type AcpChatWorkspaceEmitOptions = {
  persist?: boolean;
  throttleUi?: boolean;
  throttlePersist?: boolean;
  touchUpdatedAt?: boolean;
  notifyUi?: boolean;
  uiReason?: AssistantWorkspacePublishReason;
  changeKinds?: AcpChatWorkspaceChangeKind[];
};

// Emission surface owned by acpChatWorkspaceDataPlane (snapshot emission,
// workspace-change build/notify/kind resolution, foreground checks, listener
// reset). Registered once at module load so the acpSessionManager domain core
// can emit without a runtime import of the data-plane module (same
// cycle-breaker shape as acpSkillRunPermissionFacade).
export type AcpChatWorkspaceEmission = {
  emitSessionRuntimeSnapshot(
    sessionRuntime: AcpChatSessionRuntime,
    options?: AcpChatWorkspaceEmitOptions,
  ): void;
  buildAcpChatWorkspaceChange(
    sessionRuntime: AcpChatSessionRuntime,
    kinds: readonly AcpChatWorkspaceChangeKind[],
    options?: { global?: boolean },
  ): AcpChatWorkspaceChange;
  notifyAcpChatWorkspaceListeners(
    change: AcpChatWorkspaceChange | undefined,
  ): void;
  resolveAcpChatWorkspaceChangeKinds(
    reason: AssistantWorkspacePublishReason,
    sessionRuntime: AcpChatSessionRuntime,
    explicitKinds?: readonly AcpChatWorkspaceChangeKind[],
  ): AcpChatWorkspaceChangeKind[];
  isForegroundSessionRuntime(sessionRuntime: AcpChatSessionRuntime): boolean;
  clearAcpChatWorkspaceListeners(): void;
};

let emission: AcpChatWorkspaceEmission | undefined;

export function registerAcpChatWorkspaceEmission(
  nextEmission: AcpChatWorkspaceEmission,
) {
  emission = nextEmission;
}

export function getAcpChatWorkspaceEmission() {
  return emission;
}
