import {
  getAcpSkillRunRecord,
  getSelectedAcpSkillRunRequestId,
  listAcpSkillRunSummaries,
  readAcpSkillRunTranscriptRegion,
  readAcpSkillRunTranscriptRegionFromMemoryForTests,
  selectAcpSkillRun,
  subscribeAcpSkillRunWorkspaceChanges,
} from "../../src/modules/acpSkillRunStore";
import { snapshotAcpMessageCounts } from "../../src/modules/acpExecutionProgress";

export function buildAcpSkillRunPanelSnapshot(
  args: {
    selectedRequestId?: string;
  } = {},
) {
  const selectedRequestId =
    String(args.selectedRequestId || "").trim() ||
    getSelectedAcpSkillRunRequestId();
  const allRuns = listAcpSkillRunSummaries({
    includeArchived: false,
  });
  const recent = allRuns.slice(0, 100);
  const selectedSummary = selectedRequestId
    ? listAcpSkillRunSummaries({
        includeArchived: false,
        requestId: selectedRequestId,
        limit: 1,
      })[0]
    : undefined;
  const runs = selectedSummary
    ? [
        selectedSummary,
        ...recent.filter(
          (entry) => entry.requestId !== selectedSummary.requestId,
        ),
      ].slice(0, 100)
    : recent;
  return {
    selectedRequestId,
    runs,
    selectedRun: selectedSummary
      ? getAcpSkillRunRecord(selectedRequestId) || undefined
      : undefined,
    transcriptRegion: readAcpSkillRunTranscriptRegionFromMemoryForTests({
      requestId: selectedRequestId,
    }),
    messageCounts: selectedRequestId
      ? snapshotAcpMessageCounts(selectedRequestId)
      : undefined,
    mcpServer: {},
    mcpHealth: {},
    drawer: {
      truncated: allRuns.length > 100,
      notice:
        allRuns.length > 100
          ? "Additional completed runs remain available in Dashboard."
          : "",
    },
  };
}

export async function prepareAcpSkillRunPanelSnapshot(
  args: {
    selectedRequestId?: string;
    transcriptReadMode?: "loading-first" | "page-first";
    transcriptPage?: { cursor?: number; limit?: number };
  } = {},
) {
  let snapshot = buildAcpSkillRunPanelSnapshot(args);
  if (!snapshot.selectedRequestId && !args.selectedRequestId) {
    const implicit = listAcpSkillRunSummaries({
      includeArchived: false,
      limit: 1,
    })[0]?.requestId;
    if (implicit) {
      await selectAcpSkillRun(implicit);
      snapshot = buildAcpSkillRunPanelSnapshot({
        ...args,
        selectedRequestId: implicit,
      });
    }
  }
  if (!snapshot.selectedRequestId) return snapshot;
  return {
    ...snapshot,
    transcriptRegion: await readAcpSkillRunTranscriptRegion({
      requestId: snapshot.selectedRequestId,
      transcriptReadMode: args.transcriptReadMode,
      transcriptPage: args.transcriptPage,
    }),
  };
}

export const subscribeAcpSkillRunSnapshots =
  subscribeAcpSkillRunWorkspaceChanges;
