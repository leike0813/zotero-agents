export const ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA =
  "zotero-agents.assistant-workspace-publication.v1" as const;

export type AcpRuntimeDomainChangeKind =
  | "baseline-status"
  | "message-counts"
  | "transcript"
  | "plan"
  | "permission"
  | "reply-hint"
  | "context-details";

export type AssistantWorkspacePublicationKind = AcpRuntimeDomainChangeKind;

export type WorkspacePublicationOwner =
  | {
      source: "acp-chat";
      key: string;
      backendId: string;
      conversationId: string;
    }
  | {
      source: "acp-skills";
      key: string;
      requestId: string;
    };

export type AssistantWorkspacePublication = {
  schema: typeof ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA;
  id: string;
  tab: "acp-chat" | "acp-skills";
  kind: AssistantWorkspacePublicationKind;
  owner: WorkspacePublicationOwner;
  revision: number;
  deliveryRevision: number;
  signature: string;
  initialization: boolean;
  dto: Record<string, unknown>;
};

export type WorkspacePublicationAckStage =
  | "shell-receive"
  | "shell-forward"
  | "child-apply"
  | "render-complete";

export type WorkspacePublicationAck = {
  publicationId: string;
  tab: AssistantWorkspacePublication["tab"];
  kind: AssistantWorkspacePublicationKind;
  ownerKey: string;
  revision: number;
  signature: string;
  initialization: boolean;
  stage: WorkspacePublicationAckStage;
  outcome: "applied" | "rejected";
  reason?:
    | "old-owner"
    | "stale-revision"
    | "invalid-publication"
    | "superseded";
};

export type WorkspacePublicationLifecycle = {
  publicationId: string;
  state: "pending" | "render-complete" | "rejected";
  reason?: string;
};

export function createAcpChatPublicationOwner(
  backendIdRaw: unknown,
  conversationIdRaw: unknown,
): WorkspacePublicationOwner & { source: "acp-chat" } {
  const backendId = String(backendIdRaw || "").trim();
  const conversationId = String(conversationIdRaw || "").trim();
  return {
    source: "acp-chat",
    key: `${backendId}\n${conversationId}`,
    backendId,
    conversationId,
  };
}

export function createAcpSkillsPublicationOwner(
  requestIdRaw: unknown,
): WorkspacePublicationOwner & { source: "acp-skills" } {
  const requestId = String(requestIdRaw || "").trim();
  return {
    source: "acp-skills",
    key: requestId,
    requestId,
  };
}
