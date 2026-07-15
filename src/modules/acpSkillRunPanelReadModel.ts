import { snapshotAcpMessageCounts } from "./acpExecutionProgress";
import {
  getAcpSkillRunRecord,
  getAcpSkillRunRuntimeOptions,
  getSelectedAcpSkillRunRequestId,
  readAcpSkillRunTranscriptRegion,
  type AcpSkillRunSnapshotChangeKind,
  type AcpSkillRunTranscriptPageRequest,
} from "./acpSkillRunStore";
import type {
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationPayload,
} from "./assistantWorkspacePublication";

export const ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING = {
  run: "baseline-status",
  transcript: "transcript",
  progress: "message-counts",
  "runtime-options": "reply-hint",
  selection: "baseline-status",
  archive: "baseline-status",
  global: "baseline-status",
} as const satisfies Record<
  AcpSkillRunSnapshotChangeKind,
  AssistantWorkspacePublicationKind
>;

export function mapAcpSkillRunChangeToPublicationKinds(
  kinds: readonly AcpSkillRunSnapshotChangeKind[],
) {
  return Array.from(
    new Set(
      kinds.map((kind) => ACP_SKILL_RUN_CHANGE_PUBLICATION_MAPPING[kind]),
    ),
  );
}

export async function prepareAcpSkillRunPublication(args: {
  requestId?: string;
  publicationKind: AssistantWorkspacePublicationKind;
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
}): Promise<AssistantWorkspacePublicationPayload | null> {
  const requestId = String(
    args.requestId || getSelectedAcpSkillRunRequestId() || "",
  ).trim();
  if (!requestId) return null;
  if (args.publicationKind === "transcript") {
    return readAcpSkillRunTranscriptRegion({
      requestId,
      transcriptReadMode: args.transcriptReadMode,
      transcriptPage: args.transcriptPage,
    });
  }
  if (args.publicationKind === "message-counts") {
    return { counts: snapshotAcpMessageCounts(requestId) || null };
  }
  const record = getAcpSkillRunRecord(requestId);
  if (!record) return null;
  if (args.publicationKind === "reply-hint") {
    const options = getAcpSkillRunRuntimeOptions(requestId);
    return {
      reply: {
        status: record.activePrompt ? "busy" : "enabled",
        hint: record.pendingInteraction?.message || null,
      },
      runtimeOptions: {
        mode: optionGroup(options?.modeOptions, options?.currentMode?.id),
        model: optionGroup(
          options?.displayModelOptions?.length
            ? options.displayModelOptions
            : options?.modelOptions,
          options?.currentDisplayModel?.id || options?.currentModel?.id,
        ),
        reasoningEffort: optionGroup(
          options?.reasoningEffortOptions,
          options?.currentReasoningEffort?.id,
        ),
      },
    };
  }
  if (args.publicationKind === "permission") {
    const pending = record.pendingPermission;
    return {
      request: pending
        ? {
            requestId: pending.requestId,
            title: pending.toolTitle,
            summary: pending.summary || "",
            options: (pending.options || []).map((option) => ({
              optionId: option.optionId,
              label: option.name,
              description: option.description || null,
            })),
          }
        : null,
    };
  }
  if (args.publicationKind === "context-details") {
    return { context: [], details: [] };
  }
  if (args.publicationKind === "plan") return null;
  return {
    status: String(record.status || "idle"),
    busy:
      record.status === "running" ||
      record.status === "repairing" ||
      record.activePrompt === true,
    message: record.error || null,
  };
}

function optionGroup(
  options:
    | Array<{ id: string; label: string; description?: string }>
    | undefined,
  selectedOptionId: string | undefined,
) {
  return {
    selectedOptionId: selectedOptionId || null,
    options: (options || []).map((option) => ({
      optionId: option.id,
      label: option.label,
      description: option.description || null,
    })),
  };
}
