import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";
import { getHostBridgeToken, redactHostBridgeToken } from "./hostBridgeAuth";
import { ensureHostBridgeServer } from "./hostBridgeServer";
import {
  resolveHostBridgeCliBinary,
  type HostBridgeCliResolution,
} from "./hostBridgeCliResolver";
import {
  HOST_BRIDGE_PROTOCOL_VERSION,
  type HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import {
  ensureRuntimeDirectory,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import { registerHostBridgeWriteAutoApprovalScope } from "./hostBridgeWriteAutoApprovalRegistry";

export type HostBridgeCliRunInjection = {
  available: boolean;
  endpoint: string;
  tokenMasked: string;
  profilePath: string;
  readmePath: string;
  shimDir?: string;
  cliDir?: string;
  binaryPath?: string;
  binarySource?: "env" | "bundled" | "path";
  pathInjected: boolean;
  autoApproveWrites: boolean;
  fallbackReason?: string;
  env: Record<string, string>;
  promptSnippet: string;
};

type MaterializeArgs = {
  workspaceDir: string;
  requestId: string;
  scopeKind?: "acp-chat" | "acp-skill-run";
  autoApproveWrites?: boolean;
  resolveCli?: () => Promise<HostBridgeCliResolution>;
  ensureServer?: () => Promise<HostBridgeStatusSnapshot>;
  getToken?: () => string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function pathDelimiter() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  return runtime.Zotero?.isWin || runtime.process?.platform === "win32"
    ? ";"
    : ":";
}

function resolveRuntimePathEnv() {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const processEnv = runtime.process?.env || {};
  const processPath = normalizeString(
    processEnv.PATH || processEnv.Path || processEnv.path,
  );
  if (processPath) {
    return processPath;
  }
  for (const name of ["PATH", "Path", "path"]) {
    try {
      const value = normalizeString(runtime.Services?.env?.get?.(name));
      if (value) {
        return value;
      }
    } catch {
      // Continue with the next case variant.
    }
  }
  return "";
}

function splitPathEntries(pathValue: string | undefined) {
  const delimiter = pathDelimiter();
  return String(pathValue || "")
    .split(delimiter)
    .map((part) => normalizeString(part))
    .filter(Boolean);
}

function mergePathEntries(
  pathValue: string | undefined,
  entriesRaw: Array<string | undefined>,
) {
  const delimiter = pathDelimiter();
  const parts = splitPathEntries(pathValue);
  for (const entry of entriesRaw
    .map(normalizeString)
    .filter(Boolean)
    .reverse()) {
    if (parts.some((part) => part.toLowerCase() === entry.toLowerCase())) {
      continue;
    }
    parts.unshift(entry);
  }
  return parts.join(delimiter);
}

function prependPath(pathValue: string | undefined, entryRaw: string) {
  return mergePathEntries(pathValue, [entryRaw]);
}

function formatPortablePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function formatShellPath(path: string) {
  return formatPortablePath(path).replace(/"/g, '\\"');
}

function formatBatchPath(path: string) {
  return normalizeString(path).replace(/"/g, '""');
}

function buildShellShim(binaryPath: string) {
  return `#!/usr/bin/env sh\nexec "${formatShellPath(binaryPath)}" "$@"\n`;
}

function buildCmdShim(binaryPath: string) {
  return `@echo off\r\n"${formatBatchPath(binaryPath)}" %*\r\n`;
}

function buildProfileJson(args: {
  endpoint: string;
  requestId: string;
  scopeKind?: "acp-chat" | "acp-skill-run";
  autoApproveWrites?: boolean;
}) {
  const scopeKind =
    args.scopeKind === "acp-chat" ? "acp-chat" : "acp-skill-run";
  return {
    schema: "zotero-bridge.profile.v1",
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    endpoint: args.endpoint,
    auth: {
      type: "bearer",
      tokenEnv: "ZOTERO_BRIDGE_TOKEN",
    },
    scope: {
      kind: scopeKind,
      requestId: args.requestId,
      runId: args.requestId,
      ...(args.autoApproveWrites ? { autoApproveWrites: true } : {}),
    },
  };
}

function cliAvailabilityLine(args: {
  available: boolean;
  fallbackReason?: string;
}) {
  return args.available
    ? "CLI availability: available."
    : `CLI availability: unavailable (${args.fallbackReason || "cli_binary_unavailable"}).`;
}

function cliUnavailableLine(args: {
  available: boolean;
  fallbackReason?: string;
}) {
  return args.available
    ? ""
    : `Current availability: unavailable (${args.fallbackReason || "cli_binary_unavailable"}). Continue without CLI unless the user asks for diagnostics.`;
}

async function buildReadme(args: {
  available: boolean;
  fallbackReason?: string;
  endpoint: string;
  autoApproveWrites?: boolean;
}) {
  const rendered = await renderAcpRuntimePromptTemplate({
    template: await loadAcpRuntimePromptTemplate(
      ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.host_bridge_cli_readme,
    ),
    replacements: {
      ENDPOINT: args.endpoint,
      CLI_AVAILABILITY_LINE: cliAvailabilityLine(args),
    },
    requiredPlaceholders: ["ENDPOINT", "CLI_AVAILABILITY_LINE"],
  });
  return `${rendered.trimEnd()}\n\nAuto-approve Zotero writes for this run: ${
    args.autoApproveWrites === true ? "enabled" : "disabled"
  }.\n`;
}

async function buildPromptSnippet(args: {
  available: boolean;
  profilePath: string;
  readmePath: string;
  fallbackReason?: string;
}) {
  return renderAcpRuntimePromptTemplate({
    template: await loadAcpRuntimePromptTemplate(
      ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.host_bridge_cli_prompt,
    ),
    replacements: {
      PROFILE_PATH: formatPortablePath(args.profilePath),
      README_PATH: formatPortablePath(args.readmePath),
      CLI_UNAVAILABLE_LINE: cliUnavailableLine(args),
    },
    requiredPlaceholders: [
      "PROFILE_PATH",
      "README_PATH",
      "CLI_UNAVAILABLE_LINE",
    ],
  });
}

export async function materializeHostBridgeCliRunInjection(
  args: MaterializeArgs,
): Promise<HostBridgeCliRunInjection> {
  const workspaceDir = normalizeString(args.workspaceDir);
  const requestId = normalizeString(args.requestId);
  const autoApproveWrites = args.autoApproveWrites === true;
  if (!workspaceDir) {
    throw new Error("workspaceDir is required for Host Bridge CLI injection");
  }
  if (!requestId) {
    throw new Error("requestId is required for Host Bridge CLI injection");
  }

  let server: HostBridgeStatusSnapshot | null = null;
  let bridgeUnavailable = "";
  try {
    server = await (args.ensureServer || ensureHostBridgeServer)();
  } catch (error) {
    bridgeUnavailable =
      error instanceof Error
        ? error.message
        : String(error || "Host Bridge unavailable");
  }
  let token = "";
  try {
    token = (args.getToken || getHostBridgeToken)();
  } catch {
    token = "";
  }
  const cli = await (args.resolveCli || resolveHostBridgeCliBinary)();
  const bridgeDir = joinPath(workspaceDir, ".zotero-bridge");
  const shimDir = joinPath(bridgeDir, "bin");
  const profilePath = joinPath(bridgeDir, "profile.json");
  const readmePath = joinPath(bridgeDir, "README.md");
  const endpoint = normalizeString(server?.endpoint);
  const available = cli.available && !!endpoint && !!token;
  const fallbackReason = bridgeUnavailable
    ? "host_bridge_unavailable"
    : cli.available
      ? token
        ? ""
        : "host_bridge_token_unavailable"
      : cli.code;

  await ensureRuntimeDirectory(bridgeDir);
  await ensureRuntimeDirectory(shimDir);
  await writeRuntimeTextFile(
    profilePath,
    `${JSON.stringify(
      buildProfileJson({
        endpoint,
        requestId,
        scopeKind: args.scopeKind,
        autoApproveWrites,
      }),
      null,
      2,
    )}\n`,
  );
  if (autoApproveWrites) {
    registerHostBridgeWriteAutoApprovalScope({
      requestId,
      runId: requestId,
    });
  }

  await writeRuntimeTextFile(
    readmePath,
    await buildReadme({
      available,
      fallbackReason,
      endpoint,
      autoApproveWrites,
    }),
  );
  if (cli.available) {
    await writeRuntimeTextFile(
      joinPath(shimDir, "zotero-bridge"),
      buildShellShim(cli.binaryPath),
    );
    await writeRuntimeTextFile(
      joinPath(shimDir, "zotero-bridge.cmd"),
      buildCmdShim(cli.binaryPath),
    );
  }

  const env: Record<string, string> = {
    ZOTERO_BRIDGE_PROFILE: profilePath,
  };
  if (token) {
    env.ZOTERO_BRIDGE_TOKEN = token;
  }
  if (available) {
    env.PATH = mergePathEntries(undefined, [shimDir, cli.cliDir]);
    env.Path = env.PATH;
  }

  return {
    available,
    endpoint,
    tokenMasked: redactHostBridgeToken(token),
    profilePath,
    readmePath,
    shimDir: cli.available ? shimDir : undefined,
    cliDir: cli.available ? cli.cliDir : undefined,
    binaryPath: cli.available ? cli.binaryPath : undefined,
    binarySource: cli.available ? cli.source : undefined,
    pathInjected: available,
    autoApproveWrites,
    fallbackReason: available ? undefined : fallbackReason,
    env,
    promptSnippet: await buildPromptSnippet({
      available,
      profilePath,
      readmePath,
      fallbackReason,
    }),
  };
}

export function createDisabledHostBridgeCliRunInjection(): HostBridgeCliRunInjection {
  return {
    available: false,
    endpoint: "",
    tokenMasked: "",
    profilePath: "",
    readmePath: "",
    pathInjected: false,
    autoApproveWrites: false,
    fallbackReason: "zotero_host_access_disabled",
    env: {},
    promptSnippet: "",
  };
}

export function applyHostBridgeCliEnvToBackend(args: {
  backend: BackendInstance;
  injection: HostBridgeCliRunInjection;
}) {
  const existingEnv = args.backend.env || {};
  const nextEnv = {
    ...existingEnv,
    ...args.injection.env,
  };
  if (args.injection.env.PATH) {
    const mergedPath = mergePathEntries(
      existingEnv.PATH || existingEnv.Path || resolveRuntimePathEnv(),
      splitPathEntries(args.injection.env.PATH),
    );
    nextEnv.PATH = mergedPath;
    nextEnv.Path = mergedPath;
  }
  return {
    ...args.backend,
    env: nextEnv,
  };
}

export function summarizeHostBridgeCliRunInjection(
  injection: HostBridgeCliRunInjection,
) {
  return {
    available: injection.available,
    endpoint: injection.endpoint,
    tokenMasked: injection.tokenMasked,
    profilePath: injection.profilePath,
    readmePath: injection.readmePath,
    shimDir: injection.shimDir,
    cliDir: injection.cliDir,
    binarySource: injection.binarySource,
    pathInjected: injection.pathInjected,
    autoApproveWrites: injection.autoApproveWrites,
    fallbackReason: injection.fallbackReason,
  };
}

export const hostBridgeCliInjectionInternalsForTests = {
  prependPath,
  splitPathEntries,
  mergePathEntries,
  resolveRuntimePathEnv,
  buildShellShim,
  buildCmdShim,
  buildProfileJson,
  buildReadme,
  buildPromptSnippet,
};
