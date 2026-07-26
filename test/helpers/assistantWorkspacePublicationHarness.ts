import {
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationPayloadByKind,
} from "../../src/modules/assistantWorkspacePublication";
import {
  createAssistantWorkspaceTranscriptPage,
  type AssistantWorkspaceTranscriptPage,
} from "../../src/modules/assistantWorkspaceTranscriptPublication";

export function assistantWorkspaceTestOwner(
  source: AssistantWorkspaceOwner["source"],
) {
  return source === "acp-chat"
    ? createAcpChatWorkspaceOwner("backend-1", "conversation-1")
    : createAcpSkillsWorkspaceOwner("request-1");
}

export function assistantWorkspaceTestPage(
  owner: AssistantWorkspaceOwner,
): AssistantWorkspaceTranscriptPage {
  return createAssistantWorkspaceTranscriptPage({
    owner,
    anchor: "tail",
    cursor: 0,
    limit: 80,
    totalVisibleItemCount: 1,
    sourceEventSeq: 1,
    items: [
      {
        itemId: "message-1",
        itemKind: "message",
        role: "assistant",
        text: "hello",
        status: "complete",
      },
    ],
  });
}

export function assistantWorkspaceTestPublication<
  K extends AssistantWorkspacePublicationKind,
>(args: {
  owner: AssistantWorkspacePublication["owner"];
  kind: K;
  payload: AssistantWorkspacePublicationPayloadByKind[K];
  form?: AssistantWorkspacePublication["publicationForm"];
  publicationId?: string;
  regionRevision?: number;
  deliverySequence?: number;
}): AssistantWorkspacePublication {
  return {
    schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
    publicationId: args.publicationId || "publication-1",
    owner: args.owner,
    publicationKind: args.kind,
    publicationForm:
      args.form || (args.kind === "transcript" ? "snapshot" : "region"),
    publicationCause: "initialization",
    regionRevision: args.regionRevision || 1,
    deliverySequence: args.deliverySequence || 1,
    payload: args.payload,
  } as AssistantWorkspacePublication;
}
