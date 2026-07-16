import { joinPath } from "../../utils/path";
import { clearPref } from "../../utils/prefs";
import { removeRuntimePath } from "../runtimePersistence";

export const RETIRED_SYNTHESIS_GIT_SYNC_PREFS = [
  "synthesisGitSyncEnabled",
  "synthesisGitSyncRemoteUrl",
  "synthesisGitSyncBranch",
  "synthesisGitSyncTokenEncryptedJson",
  "synthesisGitSyncTokenMasked",
  "synthesisGitSyncTokenUpdatedAt",
  "synthesisGitSyncAutoSyncEnabled",
  "synthesisGitSyncAutoRetryEnabled",
  "synthesisGitSyncConnectionTestJson",
] as const;

export function retiredSynthesisGitSyncRuntimePaths(runtimeRoot: string) {
  return [
    joinPath(runtimeRoot, "synthesis", "git-sync"),
    joinPath(runtimeRoot, "synthesis", "git-sync-worktree"),
  ] as const;
}

export async function cleanupRetiredSynthesisGitSyncRuntime(
  runtimeRoot: string,
) {
  const removedPaths: string[] = [];
  for (const path of retiredSynthesisGitSyncRuntimePaths(runtimeRoot)) {
    if (await removeRuntimePath(path)) {
      removedPaths.push(path);
    }
  }
  for (const pref of RETIRED_SYNTHESIS_GIT_SYNC_PREFS) {
    clearPref(pref);
  }
  return {
    removedPaths,
    clearedPrefs: [...RETIRED_SYNTHESIS_GIT_SYNC_PREFS],
  };
}
