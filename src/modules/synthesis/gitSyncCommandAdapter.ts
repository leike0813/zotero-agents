import { ensureRuntimeDirectory } from "../runtimePersistence";
import { getMozillaSubprocessModule } from "../../utils/runtimeCompatibility";
import { getPref } from "../../utils/prefs";
import {
  readSynthesisGitSyncToken,
  type SynthesisGitSyncTokenReadResult,
} from "./gitSyncTokenPrefs";
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

export type SynthesisGitSyncAdapterConfig = {
  enabled: boolean;
  remoteUrl: string;
  branch: string;
  gitCommand: string;
  autoRetryEnabled: boolean;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
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
  return typeof reader?.readString === "function"
    ? String((await reader.readString()) || "")
    : "";
}

async function defaultCommandRunner(
  invocation: SynthesisGitCommandInvocation,
): Promise<SynthesisGitCommandResult> {
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
    const stdout = await zoteroSubprocess(invocation.command, invocation.args);
    return { exitCode: 0, stdout: String(stdout || "") };
  }
  const subprocess = getMozillaSubprocessModule();
  if (typeof subprocess?.call === "function") {
    const proc = await subprocess.call({
      command: invocation.command,
      arguments: invocation.args,
      workdir: invocation.cwd,
    });
    const [stdout, stderr] = await Promise.all([
      readPipeText(proc.stdout),
      readPipeText(proc.stderr),
    ]);
    const waited = await proc.wait?.();
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
  throw new Error("Git command subprocess is unavailable.");
}

function gitSyncConfigFromPrefs(): SynthesisGitSyncAdapterConfig {
  return {
    enabled: getPref("synthesisGitSyncEnabled") === true,
    remoteUrl: cleanString(getPref("synthesisGitSyncRemoteUrl")),
    branch: cleanString(getPref("synthesisGitSyncBranch")) || "main",
    gitCommand: cleanString(getPref("synthesisGitSyncGitCommand")) || "git",
    autoRetryEnabled: getPref("synthesisGitSyncAutoRetryEnabled") !== false,
  };
}

function remoteUrlHasCredentials(remoteUrl: string) {
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

export function createSynthesisGitCommandAdapter(args: {
  config: SynthesisGitSyncAdapterConfig;
  commandRunner?: SynthesisGitCommandRunner;
}): SynthesisGitSyncAdapter | undefined {
  const config = args.config;
  if (!config.enabled || !config.remoteUrl) {
    return undefined;
  }
  if (remoteUrlHasCredentials(config.remoteUrl)) {
    return invalidCredentialRemoteAdapter(config);
  }
  const runner = args.commandRunner || defaultCommandRunner;
  async function run(cwd: string, gitArgs: string[], allowFailure = false) {
    const result = await runner({
      command: config.gitCommand,
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
  async function ensureRepo(worktreePath: string) {
    await ensureRuntimeDirectory(worktreePath);
    await run(worktreePath, ["init"]);
    await run(worktreePath, ["checkout", "-B", config.branch]);
    await run(worktreePath, [
      "config",
      "user.email",
      "zotero-skills@example.invalid",
    ]);
    await run(worktreePath, ["config", "user.name", "Zotero Skills"]);
    await run(worktreePath, ["remote", "remove", "origin"], true);
    await run(worktreePath, ["remote", "add", "origin", config.remoteUrl]);
  }
  return {
    validateConfiguration: async () => {
      const diagnostics = tokenDiagnostics(await readToken());
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
      await ensureRepo(worktreePath);
      await run(worktreePath, [
        ...authArgs(tokenResult),
        "fetch",
        "origin",
        config.branch,
      ]);
      return { diagnostics: [] };
    },
    merge: async ({ worktreePath }) => {
      await run(worktreePath, ["add", "synthesis"]);
      await run(
        worktreePath,
        ["commit", "--allow-empty", "-m", "Sync Synthesis canonical store"],
        true,
      );
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
