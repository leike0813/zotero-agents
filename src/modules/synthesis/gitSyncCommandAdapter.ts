import {
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../runtimePersistence";

/**
 * @deprecated Git command transport is retained as hidden service code. It is
 * not exposed by Preferences or Synthesis Home sync UI.
 */
import { joinPath } from "../../utils/path";
import { getMozillaSubprocessModule } from "../../utils/runtimeCompatibility";
import { getPref } from "../../utils/prefs";
import {
  readSynthesisGitSyncToken,
  type SynthesisGitSyncTokenReadResult,
} from "./gitSyncTokenPrefs";
import {
  resolveSynthesisGitExecutable,
  type SynthesisGitExecutableResolution,
} from "./gitExecutableResolver";
import {
  sanitizeGitSyncRemoteUrl,
  type SynthesisGitSyncAdapter,
  type SynthesisGitSyncDiagnostic,
} from "./gitSync";

export type SynthesisGitCommandInvocation = {
  command: string;
  args: string[];
  cwd: string;
};

export type SynthesisGitCommandResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

export type SynthesisGitCommandRunner = (
  invocation: SynthesisGitCommandInvocation,
) => Promise<SynthesisGitCommandResult>;

type SynthesisGitRemoteBranchState =
  | "exists"
  | "missing_initializable"
  | "unknown";

export type SynthesisGitSyncAdapterConfig = {
  enabled: boolean;
  remoteUrl: string;
  branch: string;
  autoRetryEnabled: boolean;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

const GIT_SYNC_WORKTREE_SENTINEL = ".zotero-skills-git-sync-worktree.json";
const GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_ID =
  "synthesis.git_sync_worktree_sentinel";
const GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_VERSION = "1.0.0";
const GIT_SYNC_WORKTREE_SOURCE = "zotero-skills-git-sync";
const GIT_SYNC_PIPE_MAX_CHARS = 1024 * 1024;
const GIT_SYNC_PIPE_MAX_READS = 256;

function normalizePathForCompare(value: unknown) {
  return cleanString(value).replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function sentinelPath(worktreePath: string) {
  return joinPath(worktreePath, GIT_SYNC_WORKTREE_SENTINEL);
}

function parseJsonObject(text: string) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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

async function readPipeText(pipe: unknown) {
  const reader = pipe as { readString?: () => Promise<string> } | null;
  if (typeof reader?.readString !== "function") {
    return "";
  }
  let combined = "";
  for (let index = 0; index < GIT_SYNC_PIPE_MAX_READS; index += 1) {
    const chunk = String((await reader.readString()) || "");
    if (!chunk) {
      break;
    }
    combined += chunk;
    if (combined.length > GIT_SYNC_PIPE_MAX_CHARS) {
      return combined.slice(0, GIT_SYNC_PIPE_MAX_CHARS);
    }
  }
  return combined;
}

export async function defaultSynthesisGitCommandRunner(
  invocation: SynthesisGitCommandInvocation,
): Promise<SynthesisGitCommandResult> {
  const subprocess = getMozillaSubprocessModule();
  if (typeof subprocess?.call === "function") {
    const proc = await subprocess.call({
      command: invocation.command,
      arguments: invocation.args,
      workdir: invocation.cwd,
    });
    const waited = await proc.wait?.();
    const [stdout, stderr] = await Promise.all([
      readPipeText(proc.stdout),
      readPipeText(proc.stderr),
    ]);
    const exitCodeRaw =
      typeof waited === "number"
        ? waited
        : typeof proc.exitCode === "number"
          ? proc.exitCode
          : typeof proc.exitValue === "number"
            ? proc.exitValue
            : 0;
    return {
      exitCode: Number.isFinite(Number(exitCodeRaw))
        ? Math.floor(Number(exitCodeRaw))
        : 0,
      stdout,
      stderr,
    };
  }
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
  };
  const zoteroSubprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof zoteroSubprocess === "function") {
    try {
      const args = invocation.cwd
        ? ["-C", invocation.cwd, ...invocation.args]
        : invocation.args;
      const stdout = await zoteroSubprocess(invocation.command, args);
      return { exitCode: 0, stdout: String(stdout || "") };
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : String(error || "");
      return { exitCode: 1, stderr: message };
    }
  }
  throw new Error("Git command subprocess is unavailable.");
}

function gitSyncConfigFromPrefs(): SynthesisGitSyncAdapterConfig {
  return {
    enabled: getPref("synthesisGitSyncEnabled") === true,
    remoteUrl: cleanString(getPref("synthesisGitSyncRemoteUrl")),
    branch: cleanString(getPref("synthesisGitSyncBranch")) || "main",
    autoRetryEnabled: getPref("synthesisGitSyncAutoRetryEnabled") === true,
  };
}

export function gitSyncRemoteUrlHasCredentials(remoteUrl: string) {
  const value = cleanString(remoteUrl);
  if (!value) {
    return false;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]*:[^/?#\s]*@/i.test(value)) {
    return true;
  }
  return /[?&](?:token|password|secret|access_token)=/i.test(value);
}

function invalidCredentialRemoteAdapter(
  config: SynthesisGitSyncAdapterConfig,
): SynthesisGitSyncAdapter {
  const diag = diagnostic({
    code: "git_sync_remote_url_credentials_rejected",
    severity: "error",
    message:
      "Git Sync remote URL must not contain credentials; store tokens in encrypted prefs instead.",
    details: { remote_url: config.remoteUrl },
  });
  return {
    validateConfiguration: async () => ({
      ok: false,
      diagnostics: [diag],
    }),
    describeRemote: () => ({
      remoteUrl: config.remoteUrl,
      branch: config.branch,
    }),
  };
}

function authArgs(tokenResult: SynthesisGitSyncTokenReadResult) {
  return tokenResult.ok
    ? ["-c", `http.extraHeader=Authorization: Bearer ${tokenResult.token}`]
    : [];
}

function tokenDiagnostics(tokenResult: SynthesisGitSyncTokenReadResult) {
  if (tokenResult.ok || tokenResult.code === "git_sync_token_missing") {
    return [];
  }
  return [
    diagnostic({
      code: tokenResult.code,
      severity: "error",
      message: tokenResult.message,
    }),
  ];
}

function gitResolutionDiagnostic(
  resolution: SynthesisGitExecutableResolution,
): SynthesisGitSyncDiagnostic {
  return diagnostic({
    code: "git_sync_git_executable_unavailable",
    severity: "error",
    message: resolution.message || "Git executable was not found.",
    details: { checkedPaths: resolution.checkedPaths },
  });
}

function commandError(args: {
  gitArgs: string[];
  result: SynthesisGitCommandResult;
}) {
  return new Error(
    sanitizeGitSyncRemoteUrl(
      `git command failed: ${args.gitArgs.join(" ")} ${
        args.result.stderr ||
        args.result.stdout ||
        `exit ${args.result.exitCode}`
      }`,
    ),
  );
}

function worktreeGuardError(args: {
  code: string;
  message: string;
  details?: unknown;
}) {
  const error = new Error(args.message) as Error & {
    gitSyncDiagnostic?: SynthesisGitSyncDiagnostic;
  };
  error.gitSyncDiagnostic = diagnostic({
    code: args.code,
    severity: "error",
    message: args.message,
    details: args.details,
  });
  return error;
}

function diagnosticFromError(error: unknown) {
  const typed = error as { gitSyncDiagnostic?: SynthesisGitSyncDiagnostic };
  return typed?.gitSyncDiagnostic;
}

export function isMissingRemoteBranchResult(
  result: SynthesisGitCommandResult,
) {
  if (result.exitCode === 0) {
    return false;
  }
  const output = `${result.stderr || ""}\n${result.stdout || ""}`;
  return /(?:couldn['’]?t|could not|cannot)\s+find\s+remote\s+ref\b/i.test(
    output,
  );
}

function remoteBranchMissingInitializableDiagnostic(
  result?: SynthesisGitCommandResult,
): SynthesisGitSyncDiagnostic {
  return diagnostic({
    code: "git_sync_remote_branch_missing_initializable",
    severity: "info",
    message:
      "Git Sync remote branch is missing and will be initialized on first sync.",
    details: result
      ? {
          exit_code: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        }
      : undefined,
  });
}

export function createSynthesisGitCommandAdapter(args: {
  config: SynthesisGitSyncAdapterConfig;
  commandRunner?: SynthesisGitCommandRunner;
}): SynthesisGitSyncAdapter | undefined {
  const config = args.config;
  if (!config.enabled || !config.remoteUrl) {
    return undefined;
  }
  if (gitSyncRemoteUrlHasCredentials(config.remoteUrl)) {
    return invalidCredentialRemoteAdapter(config);
  }
  const runner = args.commandRunner || defaultSynthesisGitCommandRunner;
  const useInjectedRunner = typeof args.commandRunner === "function";
  let remoteBranchState: SynthesisGitRemoteBranchState = "unknown";
  let cachedGitResolution:
    | { available: true; command: string; source?: string; checkedPaths: string[] }
    | { available: false; diagnostics: SynthesisGitSyncDiagnostic[] }
    | undefined;
  async function resolveGitCommand() {
    if (useInjectedRunner) {
      return {
        available: true as const,
        command: "git",
        source: "injectedRunner",
        checkedPaths: [],
      };
    }
    if (cachedGitResolution) {
      return cachedGitResolution;
    }
    const subprocess = getMozillaSubprocessModule();
    const resolution = await resolveSynthesisGitExecutable({
      pathSearch: subprocess?.pathSearch,
    });
    cachedGitResolution = resolution.available && resolution.command
      ? {
          available: true,
          command: resolution.command,
          source: resolution.source,
          checkedPaths: resolution.checkedPaths,
        }
      : {
          available: false,
          diagnostics: [gitResolutionDiagnostic(resolution)],
        };
    return cachedGitResolution;
  }
  async function run(cwd: string, gitArgs: string[], allowFailure = false) {
    const gitCommand = await resolveGitCommand();
    if (!gitCommand.available) {
      throw new Error(gitCommand.diagnostics[0]?.message || "Git unavailable");
    }
    const result = await runner({
      command: gitCommand.command,
      args: gitArgs,
      cwd,
    });
    if (!allowFailure && result.exitCode !== 0) {
      throw commandError({ gitArgs, result });
    }
    return result;
  }
  async function readToken() {
    return readSynthesisGitSyncToken();
  }
  function sentinelPayload() {
    return {
      schema_id: GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_ID,
      schema_version: GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_VERSION,
      source: GIT_SYNC_WORKTREE_SOURCE,
      remote_url: config.remoteUrl,
      branch: config.branch,
    };
  }
  async function readSentinel(worktreePath: string) {
    const path = sentinelPath(worktreePath);
    if (!(await runtimePathExists(path))) {
      return null;
    }
    return parseJsonObject(await readRuntimeTextFile(path));
  }
  function sentinelMatches(sentinel: Record<string, unknown> | null) {
    return (
      sentinel?.schema_id === GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_ID &&
      sentinel?.schema_version === GIT_SYNC_WORKTREE_SENTINEL_SCHEMA_VERSION &&
      sentinel?.source === GIT_SYNC_WORKTREE_SOURCE &&
      cleanString(sentinel?.remote_url) === config.remoteUrl &&
      cleanString(sentinel?.branch) === config.branch
    );
  }
  async function guardManagedWorktree(worktreePath: string) {
    await ensureRuntimeDirectory(worktreePath);
    const sentinel = await readSentinel(worktreePath);
    const top = await run(
      worktreePath,
      ["rev-parse", "--show-toplevel"],
      true,
    );
    if (top.exitCode === 0) {
      const repoRoot = cleanString(top.stdout).split(/\r?\n/)[0] || "";
      const repoRootNormalized = normalizePathForCompare(repoRoot);
      const worktreeNormalized = normalizePathForCompare(worktreePath);
      if (repoRootNormalized && repoRootNormalized !== worktreeNormalized) {
        throw worktreeGuardError({
          code: "git_sync_worktree_unsafe_parent_repo",
          message:
            "Git Sync worktree is inside an existing Git repository and will not be used.",
          details: {
            worktree_path: worktreePath,
            git_root: repoRoot,
          },
        });
      }
      if (repoRootNormalized === worktreeNormalized && !sentinel) {
        throw worktreeGuardError({
          code: "git_sync_worktree_sentinel_missing",
          message:
            "Git Sync worktree is an existing Git repository without the Git Sync sentinel.",
          details: { worktree_path: worktreePath },
        });
      }
    }
    if (sentinel && !sentinelMatches(sentinel)) {
      throw worktreeGuardError({
        code: "git_sync_worktree_sentinel_mismatch",
        message:
          "Git Sync worktree sentinel does not match the current remote configuration.",
        details: { worktree_path: worktreePath },
      });
    }
    await writeRuntimeTextFile(
      sentinelPath(worktreePath),
      `${JSON.stringify(sentinelPayload(), null, 2)}\n`,
    );
  }
  async function ensureRepo(worktreePath: string) {
    await guardManagedWorktree(worktreePath);
    await run(worktreePath, ["init"]);
    await run(worktreePath, ["checkout", "-B", config.branch]);
    await run(worktreePath, [
      "config",
      "user.email",
      "zotero-skills@example.invalid",
    ]);
    await run(worktreePath, ["config", "user.name", "Zotero Agents"]);
    await run(worktreePath, ["remote", "remove", "origin"], true);
    await run(worktreePath, ["remote", "add", "origin", config.remoteUrl]);
  }
  return {
    validateConfiguration: async () => {
      const diagnostics = tokenDiagnostics(await readToken());
      const gitCommand = await resolveGitCommand();
      if (!gitCommand.available) {
        diagnostics.push(...gitCommand.diagnostics);
      }
      return { ok: diagnostics.length === 0, diagnostics };
    },
    describeRemote: () => ({
      remoteUrl: config.remoteUrl,
      branch: config.branch,
    }),
    fetch: async ({ worktreePath }) => {
      const tokenResult = await readToken();
      const diagnostics = tokenDiagnostics(tokenResult);
      if (diagnostics.length) {
        return { diagnostics };
      }
      try {
        await ensureRepo(worktreePath);
      } catch (error) {
        const diagnostic = diagnosticFromError(error);
        if (diagnostic) {
          return { diagnostics: [diagnostic] };
        }
        throw error;
      }
      const fetch = await run(
        worktreePath,
        [...authArgs(tokenResult), "fetch", "origin", config.branch],
        true,
      );
      if (fetch.exitCode !== 0) {
        if (isMissingRemoteBranchResult(fetch)) {
          remoteBranchState = "missing_initializable";
          return {
            diagnostics: [remoteBranchMissingInitializableDiagnostic(fetch)],
          };
        }
        const branchProbe = await run(
          worktreePath,
          [
            ...authArgs(tokenResult),
            "ls-remote",
            "--heads",
            "origin",
            config.branch,
          ],
          true,
        );
        if (branchProbe.exitCode === 0 && !cleanString(branchProbe.stdout)) {
          remoteBranchState = "missing_initializable";
          return {
            diagnostics: [
              remoteBranchMissingInitializableDiagnostic(branchProbe),
            ],
          };
        }
        remoteBranchState = "unknown";
        throw commandError({
          gitArgs: ["fetch", "origin", config.branch],
          result: fetch,
        });
      }
      remoteBranchState = "exists";
      return { diagnostics: [] };
    },
    merge: async ({ worktreePath }) => {
      await run(worktreePath, ["add", "-A", "synthesis"]);
      await run(
        worktreePath,
        ["commit", "--allow-empty", "-m", "Sync Synthesis canonical store"],
        true,
      );
      if (remoteBranchState === "missing_initializable") {
        return {
          status: "clean",
          diagnostics: [remoteBranchMissingInitializableDiagnostic()],
        };
      }
      const merge = await run(
        worktreePath,
        ["merge", "--no-edit", `origin/${config.branch}`],
        true,
      );
      if (merge.exitCode === 0) {
        return { status: "clean" };
      }
      const conflicted = await run(
        worktreePath,
        ["diff", "--name-only", "--diff-filter=U"],
        true,
      );
      const files = String(conflicted.stdout || "")
        .split(/\r?\n/)
        .map((entry) => cleanString(entry).replace(/^synthesis[\\/]/, ""))
        .filter(Boolean);
      if (files.length) {
        return {
          status: "conflict",
          conflicts: files.map((file) => ({
            asset_path: file,
            reason: "both_changed" as const,
          })),
        };
      }
      throw commandError({
        gitArgs: ["merge", `origin/${config.branch}`],
        result: merge,
      });
    },
    push: async ({ worktreePath }) => {
      const tokenResult = await readToken();
      const diagnostics = tokenDiagnostics(tokenResult);
      if (diagnostics.length) {
        return { diagnostics };
      }
      await run(worktreePath, [
        ...authArgs(tokenResult),
        "push",
        "origin",
        `HEAD:${config.branch}`,
      ]);
      return { diagnostics: [] };
    },
  };
}

export function createPrefsConfiguredSynthesisGitSyncAdapter(
  args: {
    commandRunner?: SynthesisGitCommandRunner;
  } = {},
) {
  return createSynthesisGitCommandAdapter({
    config: gitSyncConfigFromPrefs(),
    commandRunner: args.commandRunner,
  });
}

export function getSynthesisGitSyncPrefsConfig() {
  return gitSyncConfigFromPrefs();
}
