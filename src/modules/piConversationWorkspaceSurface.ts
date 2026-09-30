import {
  getPiConversationCoordinator,
  type PiConversationChange,
} from "./piConversation";
import {
  createReadyTranscriptRegion,
  createFailedTranscriptRegion,
  type AssistantWorkspaceOwner,
  type AssistantWorkspaceOwnerNavigation,
  type AssistantWorkspacePublicationKind,
} from "./assistant/publication/assistantWorkspacePublication";
import { createAssistantWorkspaceTranscriptPage } from "./assistant/publication/assistantWorkspaceTranscriptPublication";
import {
  defineAssistantWorkspaceSurfaceAdapter,
  readWorkspaceOwnerRegions,
  createWorkspaceOwnerControl,
} from "./assistant/workspace/assistantWorkspaceSurfaceSkeleton";
import { createAssistantMessageCounts } from "./assistant/publication/assistantMessageCounts";
import { loadPiProviderConfigurationState } from "./piProviderConfiguration";
import type { AssistantExecutionDisplayMode } from "./assistant/publication/assistantExecutionDisplayPolicy";
import { getStringOrFallback } from "../utils/locale";

export const createPiConversationWorkspaceOwner = (
  conversationId: string,
): Extract<AssistantWorkspaceOwner, { source: "pi-conversations" }> => ({
  source: "pi-conversations",
  ownerKey: conversationId,
  conversationId,
});
const ALL_KINDS = [
  "owner-navigation",
  "service-status",
  "owner-control",
  "message-counts",
  "transcript",
  "plan",
  "permission",
  "composer",
  "owner-presentation",
  "owner-details",
] as const;
const CHANGE_KINDS: Record<
  PiConversationChange["kinds"][number],
  readonly AssistantWorkspacePublicationKind[]
> = {
  navigation: ["owner-navigation"],
  control: ["owner-control", "composer"],
  resources: ["composer"],
  presentation: ["owner-presentation"],
  details: ["owner-details"],
  counts: ["message-counts"],
  permission: ["permission", "composer", "owner-control"],
  transcript: ["transcript"],
};

export function createPiConversationWorkspaceSurfaceAdapter(
  coordinator = getPiConversationCoordinator(),
) {
  return defineAssistantWorkspaceSurfaceAdapter({
    source: "pi-conversations" as const,
    supportedKinds: ALL_KINDS,
    selectedOwner: () =>
      coordinator.selectedId
        ? createPiConversationWorkspaceOwner(coordinator.selectedId)
        : null,
    async readOwnerNavigation(): Promise<AssistantWorkspaceOwnerNavigation> {
      const owners = await coordinator.list();
      const archived = await coordinator.list({ archived: true });
      return {
        selectedOwner: coordinator.selectedId
          ? createPiConversationWorkspaceOwner(coordinator.selectedId)
          : null,
        selectedGroupId: "pi-conversations",
        groups: [
          {
            groupId: "pi-conversations",
            label: "Zotero Agent",
            status: "ready",
            disabledReason: null,
          },
        ],
        entries: owners.map((owner) => ({
          owner: createPiConversationWorkspaceOwner(owner.conversationId),
          groupId: "pi-conversations",
          label: owner.title || "Conversation",
          subtitle: null,
          description: null,
          groupLabel: "Zotero Agent",
          status: owner.status,
          backendStatus: null,
          applyState: null,
          attention: owner.attention ? "attention" : null,
          updatedAt: owner.updatedAt,
          messageCount: owner.messageCount,
          canArchive: owner.canArchive,
          submission: null,
          resumptionPending: false,
        })),
        archivedEntries: archived.map((owner) => ({
          owner: createPiConversationWorkspaceOwner(owner.conversationId),
          groupId: "pi-conversations",
          label: owner.title || "Conversation",
          subtitle: null,
          description: null,
          groupLabel: "Zotero Agent",
          status: owner.lifecycle,
          backendStatus: null,
          applyState: null,
          attention: null,
          updatedAt: owner.updatedAt,
          messageCount: owner.messageCount,
          canArchive: false,
          canRestore: owner.lifecycle === "archived",
          canDelete: owner.lifecycle === "archived",
          lifecycle: owner.lifecycle,
          submission: null,
          resumptionPending: false,
        })),
        queuedEntries: [],
        canCreateOwner: true,
        notice: null,
      };
    },
    mapChange(
      change: PiConversationChange,
      context:
        | { executionDisplayMode?: AssistantExecutionDisplayMode }
        | undefined = {},
    ) {
      return {
        owner: change.conversationId
          ? createPiConversationWorkspaceOwner(change.conversationId)
          : null,
        targetsActiveOwner:
          change.conversationId === coordinator.selectedId ||
          change.kinds.includes("navigation"),
        publicationKinds: [
          ...new Set(change.kinds.flatMap((kind) => CHANGE_KINDS[kind])),
        ],
        transcript: {
          events: change.transcriptEvents || [],
          sourceEventSeq: change.sourceEventSeq || 0,
          visibility: context?.executionDisplayMode || ("live" as const),
        },
      };
    },
    async readOwnerRegions({
      owner,
      kinds,
    }: {
      owner: Extract<AssistantWorkspaceOwner, { source: "pi-conversations" }>;
      kinds: readonly Exclude<
        AssistantWorkspacePublicationKind,
        "owner-navigation" | "service-status" | "transcript"
      >[];
    }) {
      const model = await coordinator.readModel(owner.conversationId);
      const busy = model.status === "busy" || model.status === "cancelling";
      const replyable =
        model.lifecycle === "active" &&
        ["idle", "failed"].includes(model.status) &&
        !!model.model;
      const optionGroup = (
        options: { id: string; name: string }[],
        currentId: string | undefined,
      ) => ({
        enabled: replyable && options.length > 0,
        selectedOptionId: currentId || null,
        options: options.map((option) => ({
          optionId: option.id,
          label: option.name,
          description: null,
        })),
      });
      const pending = model.pending[0];
      return readWorkspaceOwnerRegions({
        kinds,
        readers: {
          "owner-control": () =>
            createWorkspaceOwnerControl({
              status: model.status,
              busy,
              hint: {
                kind:
                  model.status === "waiting_permission"
                    ? "waiting_user"
                    : model.status === "recovery_required"
                      ? "error"
                      : busy
                        ? "running"
                        : "hidden",
                message: null,
              },
              interaction: null,
              connection: {
                status: "local",
                sessionAvailable: true,
                connected: false,
                canConnect: false,
                canDisconnect: false,
              },
              execution: { canCancel: busy, canInterrupt: busy },
              authentication: {
                required: false,
                canAuthenticate: false,
                methodId: null,
              },
              permissionPolicy: {
                autoApprove: false,
                canSetAutoApprove: false,
              },
              badges: null,
            }),
          "message-counts": () => {
            const counts = createAssistantMessageCounts(owner.ownerKey);
            counts.active = busy;
            counts.executionKey = model.turnId;
            counts.cumulative = {
              assistant: model.counts?.assistant || 0,
              thought: model.counts?.thought || 0,
              tool: model.counts?.tool || 0,
            };
            counts.current = { ...counts.cumulative };
            counts.revision = model.revision;
            return { counts };
          },
          plan: () => ({ items: [] }),
          permission: () => ({
            request: pending
              ? {
                  requestId: pending.call.callId,
                  approvalKind: "pi-tool" as const,
                  title: pending.call.name,
                  summary: pending.call.name,
                  tool: {
                    title: pending.call.name,
                    callId: pending.call.callId,
                  },
                  review: {
                    requestedAt: null,
                    command: null,
                    preview:
                      pending.admissionFacts !== undefined
                        ? JSON.stringify(pending.admissionFacts)
                        : JSON.stringify(pending.call.arguments).slice(
                            0,
                            12000,
                          ),
                  },
                  options: [
                    { optionId: "approve", label: "Allow", description: null },
                    { optionId: "deny", label: "Deny", description: null },
                  ],
                }
              : null,
          }),
          composer: () => ({
            sendAdmissionRevision: model.sendAdmissionRevision,
            reply: {
              status:
                model.status === "cancelling"
                  ? "cancelling"
                  : busy
                    ? "busy"
                    : replyable
                      ? "enabled"
                      : "disabled",
            },
            runtimeOptions: {
              mode: optionGroup([], undefined),
              model: optionGroup(
                loadPiProviderConfigurationState()
                  .configurations.filter((item) => item.enabled)
                  .map((item) => ({
                    id: item.id,
                    name: item.label || item.modelId,
                  })),
                model.model?.configurationId,
              ),
              reasoningEffort: optionGroup(
                ["off", "minimal", "low", "medium", "high", "xhigh", "max"].map(
                  (id) => ({ id, name: id }),
                ),
                model.model?.reasoning,
              ),
            },
            resources: model.resources.map((resource) => ({
              resourceId: resource.resourceId,
              kind: resource.kind,
              label: resource.displayName,
              detail: null,
              status: "ready" as const,
            })),
            errors: model.composerError
              ? [
                  {
                    code: model.composerError,
                    message: getStringOrFallback(
                      "assistant-workspace-pi-resource-error" as never,
                      "Unable to use these resources. Check the selection and try again.",
                    ),
                  },
                ]
              : [],
          }),
          "owner-presentation": () => ({
            title: model.title || "Conversation",
            subtitle: null,
            description: null,
            notice: model.failure
              ? { tone: "danger", text: model.failure }
              : null,
            metadata: model.model
              ? [
                  { fieldId: "model", value: model.model.modelId },
                  { fieldId: "reasoning", value: model.model.reasoning },
                ]
              : [],
            usage: {
              used: model.usage.main + model.usage.title,
              limit: model.model?.policy.contextWindow || 0,
              costText:
                model.usage.cost + model.usage.titleCost > 0
                  ? `$${(model.usage.cost + model.usage.titleCost).toFixed(4)}`
                  : null,
            },
          }),
          "owner-details": () => ({
            status: "ready",
            title: model.title || "Conversation",
            subtitle: null,
            sections: [
              {
                sectionId: "session",
                collapsed: false,
                items: [
                  {
                    fieldId: "model",
                    value: model.model?.modelId || "",
                    format: "text",
                  },
                  { fieldId: "status", value: model.status, format: "text" },
                ],
              },
              {
                sectionId: "usage",
                collapsed: false,
                items: [
                  {
                    fieldId: "usage-main",
                    value: String(model.usage.main),
                    format: "text",
                  },
                  {
                    fieldId: "usage-title",
                    value: String(model.usage.title),
                    format: "text",
                  },
                ],
              },
            ],
            actions:
              model.lifecycle === "active"
                ? [
                    "rename-conversation",
                    ...(replyable ? ["compact-conversation" as const] : []),
                  ]
                : [],
            error: null,
          }),
        },
      });
    },
    async readTranscriptPage({
      owner,
      request,
    }: {
      owner: Extract<AssistantWorkspaceOwner, { source: "pi-conversations" }>;
      request?: { cursor?: number | null; limit?: number };
    }) {
      try {
        const page = await coordinator.readPage(owner.conversationId, request);
        return createReadyTranscriptRegion(
          owner,
          createAssistantWorkspaceTranscriptPage({
            owner,
            anchor: request?.cursor == null ? "tail" : "cursor",
            cursor: page.cursor,
            limit: page.limit,
            totalVisibleItemCount: page.total,
            previousCursor: page.previousCursor,
            nextCursor: page.nextCursor,
            sourceEventSeq: page.sourceEventSeq,
            items: page.items,
          }),
          0,
        );
      } catch {
        return createFailedTranscriptRegion(owner, {
          code: "transcript-page-read-failed",
          message: "Transcript unavailable",
        });
      }
    },
  });
}

export const PI_CONVERSATIONS_WORKSPACE_ADAPTER =
  createPiConversationWorkspaceSurfaceAdapter();
