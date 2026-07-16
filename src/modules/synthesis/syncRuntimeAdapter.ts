import {
  createPrefsConfiguredSynthesisGitSyncAdapter,
  getSynthesisGitSyncPrefsConfig,
  type SynthesisGitCommandRunner,
} from "./gitSyncCommandAdapter";
import {
  getGitSyncPrefsStatus,
  getSynthesisGitSyncAutoSyncEnabled,
} from "./gitSyncPrefs";
import type { SynthesisGitSyncRuntimeBinding } from "./syncRuntime";

export function createPrefsConfiguredSynthesisGitSyncRuntimeBinding(
  options: { commandRunner?: SynthesisGitCommandRunner } = {},
): SynthesisGitSyncRuntimeBinding {
  const config = getSynthesisGitSyncPrefsConfig();
  return {
    adapter: createPrefsConfiguredSynthesisGitSyncAdapter({
      commandRunner: options.commandRunner,
    }),
    autoSyncEnabled: getSynthesisGitSyncAutoSyncEnabled(),
    autoRetryEnabled: config.autoRetryEnabled,
    readConfigStatus: getGitSyncPrefsStatus,
  };
}
