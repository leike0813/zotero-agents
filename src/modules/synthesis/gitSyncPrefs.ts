import { getPref, setPref } from "../../utils/prefs";
import {
  defaultSynthesisGitCommandRunner,
  gitSyncRemoteUrlHasCredentials,
  getSynthesisGitSyncPrefsConfig,
  type SynthesisGitCommandRunner,
  type SynthesisGitSyncAdapterConfig,
} from "./gitSyncCommandAdapter";
import { getMozillaSubprocessModule } from "../../utils/runtimeCompatibility";
import {
  resolveSynthesisGitExecutable,
  type SynthesisGitExecutableResolution,
} from "./gitExecutableResolver";
import {
  readSynthesisGitSyncToken,
  storeSynthesisGitSyncToken,
} from "./gitSyncTokenPrefs";
import {
  sanitizeGitSyncRemoteUrl,
  type SynthesisGitSyncDiagnostic,
} from "./gitSync";

export type SynthesisGitSyncConfigStatus =
  | "disabled"
  | "incomplete"
  | "configured"
  | "invalid";

export type SynthesisGitSyncRemoteBranchState =
  | "exists"
  | "missing_initializable"
  | "unknown";

export type SynthesisGitSyncConnectionTestResult = {
  ok: boolean;
  tested_at: string;
  config_status: SynthesisGitSyncConfigStatus;
  remote_branch_state?: SynthesisGitSyncRemoteBranchState;
  git_executable?: string;
  git_executable_source?: string;
  diagnostics: SynthesisGitSyncDiagnostic[];
};

export type SynthesisGitSyncPrefsStatus = {
  enabled: boolean;
  remote_url: string;
  branch: string;
  auto_sync_enabled: boolean;
  auto_retry_enabled: boolean;
  token_configured: boolean;
  token_masked?: string;
  token_updated_at?: string;
  config_status: SynthesisGitSyncConfigStatus;
  diagnostics: SynthesisGitSyncDiagnostic[];
  connection_test?: SynthesisGitSyncConnectionTestResult;
};

export type SynthesisGitSyncPrefsSaveInput = {
  enabled?: boolean;
  remoteUrl?: string;
  branch?: string;
  autoSyncEnabled?: boolean;
  autoRetryEnabled?: boolean;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function diagnostic(args: {
  code: string;
  severity?: "info" | "warning" | "error";
  message: unknown;
  details?: unknown;
}): SynthesisGitSyncDiagnostic {
  return {
    code: cleanString(args.code),
    severity: args.severity || "warning",
    message: sanitizeGitSyncRemoteUrl(String(args.message || "")),
    details:
      args.details === undefined
        ? undefined
        : JSON.parse(
            JSON.stringify(args.details, (_key, value) =>
              typeof value === "string"
                ? sanitizeGitSyncRemoteUrl(value)
                : value,
            ),
          ),
  };
}

function configStatus(
  config: SynthesisGitSyncAdapterConfig,
): Pick<SynthesisGitSyncPrefsStatus, "config_status" | "diagnostics"> {
  if (!config.enabled) {
    return {
      config_status: "disabled",
      diagnostics: [
        diagnostic({
          code: "git_sync_disabled",
          severity: "info",
          message: "Git Sync is disabled.",
        }),
      ],
    };
  }
  if (!config.remoteUrl) {
    return {
      config_status: "incomplete",
      diagnostics: [
        diagnostic({
          code: "git_sync_remote_missing",
          severity: "warning",
          message: "Git Sync remote URL is required.",
        }),
      ],
    };
  }
  if (gitSyncRemoteUrlHasCredentials(config.remoteUrl)) {
    return {
      config_status: "invalid",
      diagnostics: [
        diagnostic({
          code: "git_sync_remote_url_credentials_rejected",
          severity: "error",
          message:
            "Git Sync remote URL must not contain credentials; store tokens in encrypted prefs instead.",
          details: { remote_url: config.remoteUrl },
        }),
      ],
    };
  }
  return { config_status: "configured", diagnostics: [] };
}

function readConnectionTestPref() {
  const raw = cleanString(getPref("synthesisGitSyncConnectionTestJson"));
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as SynthesisGitSyncConnectionTestResult;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeConnectionTestPref(result: SynthesisGitSyncConnectionTestResult) {
  setPref("synthesisGitSyncConnectionTestJson", JSON.stringify(result));
}

function clearConnectionTestPref() {
  setPref("synthesisGitSyncConnectionTestJson", "");
}

export function getGitSyncPrefsStatus(): SynthesisGitSyncPrefsStatus {
  const config = getSynthesisGitSyncPrefsConfig();
  const status = configStatus(config);
  const tokenMasked = cleanString(getPref("synthesisGitSyncTokenMasked"));
  const tokenUpdatedAt = cleanString(getPref("synthesisGitSyncTokenUpdatedAt"));
  return {
    enabled: config.enabled,
    remote_url: sanitizeGitSyncRemoteUrl(config.remoteUrl),
    branch: config.branch,
    auto_sync_enabled: getSynthesisGitSyncAutoSyncEnabled(),
    auto_retry_enabled: config.autoRetryEnabled,
    token_configured: Boolean(cleanString(getPref("synthesisGitSyncTokenEncryptedJson"))),
    token_masked: tokenMasked || undefined,
    token_updated_at: tokenUpdatedAt || undefined,
    config_status: status.config_status,
    diagnostics: status.diagnostics,
    connection_test: readConnectionTestPref(),
  };
}

export function saveGitSyncPrefs(input: SynthesisGitSyncPrefsSaveInput) {
  const remoteUrl = cleanString(input.remoteUrl);
  if (remoteUrl && gitSyncRemoteUrlHasCredentials(remoteUrl)) {
    return {
      ok: false as const,
      status: getGitSyncPrefsStatus(),
      diagnostics: configStatus({
        ...getSynthesisGitSyncPrefsConfig(),
        remoteUrl,
      }).diagnostics,
    };
  }
  if (input.enabled !== undefined) {
    setPref("synthesisGitSyncEnabled", input.enabled === true);
  }
  if (input.remoteUrl !== undefined) {
    setPref("synthesisGitSyncRemoteUrl", remoteUrl);
  }
  if (input.branch !== undefined) {
    setPref("synthesisGitSyncBranch", cleanString(input.branch) || "main");
  }
  if (input.autoSyncEnabled !== undefined) {
    setPref("synthesisGitSyncAutoSyncEnabled", input.autoSyncEnabled === true);
  }
  if (input.autoRetryEnabled !== undefined) {
    setPref("synthesisGitSyncAutoRetryEnabled", input.autoRetryEnabled !== false);
  }
  clearConnectionTestPref();
  return {
    ok: true as const,
    status: getGitSyncPrefsStatus(),
    diagnostics: [] as SynthesisGitSyncDiagnostic[],
  };
}

export function getSynthesisGitSyncAutoSyncEnabled() {
  return getPref("synthesisGitSyncAutoSyncEnabled") === true;
}

export async function saveGitSyncToken(token: string) {
  const result = await storeSynthesisGitSyncToken(token);
  clearConnectionTestPref();
  return { ok: true as const, result, status: getGitSyncPrefsStatus() };
}

export async function clearGitSyncToken() {
  const result = await storeSynthesisGitSyncToken("");
  clearConnectionTestPref();
  return { ok: true as const, result, status: getGitSyncPrefsStatus() };
}

function commandFailureDiagnostic(args: {
  code: string;
  message: string;
  result?: { exitCode: number; stdout?: string; stderr?: string };
}) {
  return diagnostic({
    code: args.code,
    severity: "error",
    message: args.message,
    details: args.result
      ? {
          exit_code: args.result.exitCode,
          stdout: args.result.stdout,
          stderr: args.result.stderr,
        }
      : undefined,
  });
}

function gitResolutionDiagnostic(resolution: SynthesisGitExecutableResolution) {
  return diagnostic({
    code: "git_sync_git_executable_unavailable",
    severity: "error",
    message: resolution.message || "Git executable was not found.",
    details: { checkedPaths: resolution.checkedPaths },
  });
}

function remoteBranchMissingInitializableDiagnostic(args: {
  result?: { exitCode: number; stdout?: string; stderr?: string };
}) {
  return diagnostic({
    code: "git_sync_remote_branch_missing_initializable",
    severity: "info",
    message:
      "Git Sync remote is reachable; the configured branch will be initialized on first sync.",
    details: args.result
      ? {
          exit_code: args.result.exitCode,
          stdout: args.result.stdout,
          stderr: args.result.stderr,
        }
      : undefined,
  });
}

export async function testGitSyncConfiguration(args: {
  commandRunner?: SynthesisGitCommandRunner;
  cwd?: string;
} = {}) {
  const timestamp = nowIso();
  const config = getSynthesisGitSyncPrefsConfig();
  const status = configStatus(config);
  const diagnostics = [...status.diagnostics];
  let remoteBranchState: SynthesisGitSyncRemoteBranchState = "unknown";
  if (status.config_status !== "configured") {
    const result: SynthesisGitSyncConnectionTestResult = {
      ok: false,
      tested_at: timestamp,
      config_status: status.config_status,
      remote_branch_state: remoteBranchState,
      diagnostics,
    };
    writeConnectionTestPref(result);
    return result;
  }
  const token = await readSynthesisGitSyncToken();
  if (!token.ok && token.code !== "git_sync_token_missing") {
    diagnostics.push(
      diagnostic({
        code: token.code,
        severity: "error",
        message: token.message,
      }),
    );
  } else if (!token.ok) {
    diagnostics.push(
      diagnostic({
        code: token.code,
        severity: "info",
        message: token.message,
      }),
    );
  }
  const runner = args.commandRunner || defaultSynthesisGitCommandRunner;
  const cwd = args.cwd || ".";
  const gitResolution = await (async () => {
    if (args.commandRunner) {
      return {
        available: true as const,
        command: "git",
        source: "injectedRunner" as const,
        checkedPaths: [] as string[],
      };
    }
    const subprocess = getMozillaSubprocessModule();
    return resolveSynthesisGitExecutable({
      pathSearch: subprocess?.pathSearch,
    });
  })();
  if (!gitResolution.available || !gitResolution.command) {
    diagnostics.push(gitResolutionDiagnostic(gitResolution));
  }
  try {
    if (gitResolution.available && gitResolution.command) {
      const version = await runner({
        command: gitResolution.command,
        args: ["--version"],
        cwd,
      });
      if (version.exitCode !== 0) {
        diagnostics.push(
          commandFailureDiagnostic({
            code: "git_sync_git_command_failed",
            message: "Git command is not available.",
            result: version,
          }),
        );
      }
    }
  } catch (error) {
    diagnostics.push(
      diagnostic({
        code: "git_sync_git_command_unavailable",
        severity: "error",
        message: error instanceof Error ? error.message : error,
      }),
    );
  }
  if (!diagnostics.some((entry) => entry.severity === "error")) {
    const authArgs = token.ok
      ? ["-c", `http.extraHeader=Authorization: Bearer ${token.token}`]
      : [];
    try {
      const remote = await runner({
        command: gitResolution.command || "git",
        args: [
          ...authArgs,
          "ls-remote",
          "--heads",
          config.remoteUrl,
          config.branch,
        ],
        cwd,
      });
      if (remote.exitCode !== 0) {
        diagnostics.push(
          commandFailureDiagnostic({
            code: "git_sync_remote_branch_unavailable",
            message: "Git Sync remote branch is not reachable.",
            result: remote,
          }),
        );
      } else if (cleanString(remote.stdout)) {
        remoteBranchState = "exists";
      } else {
        remoteBranchState = "missing_initializable";
        diagnostics.push(
          remoteBranchMissingInitializableDiagnostic({ result: remote }),
        );
      }
    } catch (error) {
      diagnostics.push(
        diagnostic({
          code: "git_sync_remote_test_failed",
          severity: "error",
          message: error instanceof Error ? error.message : error,
        }),
      );
    }
  }
  const result: SynthesisGitSyncConnectionTestResult = {
    ok: !diagnostics.some((entry) => entry.severity === "error"),
    tested_at: timestamp,
    config_status: status.config_status,
    remote_branch_state: remoteBranchState,
    git_executable: gitResolution.available
      ? sanitizeGitSyncRemoteUrl(gitResolution.command || "")
      : undefined,
    git_executable_source: gitResolution.available
      ? gitResolution.source
      : undefined,
    diagnostics,
  };
  writeConnectionTestPref(result);
  return result;
}
