import { ACP_BACKEND_TYPE } from "../config/defaults";
import { config } from "../../package.json";
import type { BackendInstance } from "../backends/types";
import { loadBackendsRegistry } from "../backends/registry";
import { getStringOrFallback } from "../utils/locale";
import {
  resolveRuntimeAlert,
  resolveRuntimeToolkit,
} from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import { joinPath } from "../utils/path";
import { isDebugModeEnabled } from "./debugMode";
import {
  buildAcpRuntimeOptionsCache,
  computeAcpBackendConfigFingerprint,
} from "./acpBackendProbe";
import { createAcpConnectionAdapter } from "./acpConnectionAdapter";
import { launchAcpTransport } from "./acpTransport";
import { ACP_PROTOCOL_VERSION } from "./acpProtocol";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  getPreferredWindowsShellCommandsFromRegistry,
  getRuntimeCommandRegistrySnapshot,
  resolveRuntimeCommand,
} from "../platform/command";
import {
  buildSubprocessEnvironment,
  getRuntimeEnvironmentSnapshot,
  summarizeSubprocessEnvironment,
} from "../platform/env";
import { listRuntimeLogs } from "./runtimeLogManager";
import { getMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  appendAcpSkillRunTransportAuditEvent,
  resolveAcpSkillRunAuditTrailFiles,
  shouldWriteDetailedAcpAuditArtifacts,
} from "./acpSkillRunAuditTrail";

const ACP_REFRESH_DIAGNOSTIC_STAGE_TIMEOUT_MS = 60_000;
const ACP_REFRESH_DIAGNOSTIC_TOAST_CLOSE_MS = 5_000;
const ACP_REFRESH_DIAGNOSTIC_STEPS_PER_BACKEND = 11;
const ACP_REFRESH_DIAGNOSTIC_RAW_EXIT_GRACE_MS = 2_000;
const ACP_REFRESH_DIAGNOSTIC_RAW_POST_SPAWN_MS = 500;
const ACP_REFRESH_DIAGNOSTIC_FILE_CAPTURE_TIMEOUT_SECONDS = 30;
const ACP_REFRESH_DIAGNOSTIC_RESOLVED_EXE_TIMEOUT_MS = 15_000;
const ACP_REFRESH_DIAGNOSTIC_NODE_BRIDGE_TIMEOUT_MS = 15_000;
const ACP_REFRESH_DIAGNOSTIC_WEBSOCKET_BRIDGE_TIMEOUT_MS = 20_000;
const ACP_REFRESH_DIAGNOSTIC_STDIN_MATRIX_TIMEOUT_MS = 5_000;
const ACP_REFRESH_DIAGNOSTIC_TAIL_CHARS = 4_000;
const ACP_REFRESH_DIAGNOSTIC_LIST_TAIL = 12;
const ACP_REFRESH_DIAGNOSTIC_ENV_VALUE_KEYS = [
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "LocalAppData",
  "HOMEDRIVE",
  "HOMEPATH",
  "TEMP",
  "TMP",
  "ComSpec",
  "COMSPEC",
  "PATHEXT",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NPM_CONFIG_PREFIX",
  "npm_config_prefix",
  "NPM_CONFIG_CACHE",
  "npm_config_cache",
  "PNPM_HOME",
  "YARN_HOME",
  "COREPACK_HOME",
  "VOLTA_HOME",
  "NVM_HOME",
  "NVM_SYMLINK",
  "NVM_DIR",
  "UV_INSTALL_DIR",
  "UV_CACHE_DIR",
  "OPENCODE_CONFIG_DIR",
  "CODEX_HOME",
  "CLAUDE_CONFIG_DIR",
  "GEMINI_CLI_HOME",
  "HERMES_HOME",
  "QODER_CONFIG_DIR",
  "GITHUB_TOKEN",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENROUTER_API_KEY",
  "XAI_API_KEY",
];

type DiagnosticProgressUpdate = {
  text: string;
  progress: number;
  type?: "success" | "default";
};

type DiagnosticProgressReporter = (update: DiagnosticProgressUpdate) => void;

type RuntimeToolkit = {
  Menu?: {
    register: (
      scope: string,
      options: {
        tag: string;
        id: string;
        label: string;
        commandListener: () => void;
      },
    ) => unknown;
  };
  ProgressWindow?: new (
    title: string,
    options?: { closeOnClick?: boolean; closeTime?: number },
  ) => {
    createLine: (options: {
      text: string;
      type?: string;
      progress?: number;
    }) => {
      show: () => {
        changeLine?: (options: {
          text?: string;
          type?: string;
          progress?: number;
        }) => void;
        startCloseTimer?: (delayMs: number) => void;
      };
    };
  };
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(
        ([key, entry]) =>
          [normalizeString(key), normalizeString(entry)] as const,
      )
      .filter(([key, entry]) => key && entry),
  );
}

function tailText(
  value: unknown,
  maxLength = ACP_REFRESH_DIAGNOSTIC_TAIL_CHARS,
) {
  const text = String(value || "");
  return text.length > maxLength ? text.slice(-maxLength) : text;
}

function pickPathValue(env: Record<string, string>) {
  return env.Path || env.PATH || env.path || "";
}

function tailList<T>(value: T[], maxLength = ACP_REFRESH_DIAGNOSTIC_LIST_TAIL) {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}

function quotePowerShellSingleQuoted(value: unknown) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function renderPowerShellStringArray(values: unknown[]) {
  return `@(${values.map(quotePowerShellSingleQuoted).join(", ")})`;
}

function encodeUtf16LeBase64(value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (first << 16) | (second << 8) | third;
    output += alphabet[(triple >> 18) & 0x3f];
    output += alphabet[(triple >> 12) & 0x3f];
    output += index + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : "=";
    output += index + 2 < bytes.length ? alphabet[triple & 0x3f] : "=";
  }
  return output;
}

type SerializedError = {
  name: string;
  message: string;
  stack: string;
  code?: string | number;
  fileName?: string;
  lineNumber?: number;
  errorCode?: string | number;
  raw?: unknown;
  cause?: SerializedError;
};

function readErrorProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function cloneJsonValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry, seen));
  }
  const output: Record<string, unknown> = {};
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record).sort()) {
    output[key] = cloneJsonValue(record[key], seen);
  }
  return output;
}

function stringifyErrorMessage(value: unknown) {
  const direct = normalizeString(value);
  if (direct && direct !== "[object Object]") {
    return direct;
  }
  try {
    const json = JSON.stringify(cloneJsonValue(value));
    return normalizeString(json);
  } catch {
    return direct;
  }
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const cause = readErrorProperty(error, "cause");
    const raw = cloneJsonValue(error);
    return {
      name: error.name,
      message: stringifyErrorMessage(error.message) || error.name,
      stack: error.stack || "",
      code: readErrorProperty(error, "code") as string | number | undefined,
      fileName:
        stringifyErrorMessage(readErrorProperty(error, "fileName")) ||
        undefined,
      lineNumber:
        typeof readErrorProperty(error, "lineNumber") === "number"
          ? (readErrorProperty(error, "lineNumber") as number)
          : undefined,
      errorCode: readErrorProperty(error, "errorCode") as
        | string
        | number
        | undefined,
      raw,
      cause: cause === undefined ? undefined : serializeError(cause),
    };
  }
  const message = stringifyErrorMessage(readErrorProperty(error, "message"));
  const name = stringifyErrorMessage(readErrorProperty(error, "name"));
  const stack = stringifyErrorMessage(readErrorProperty(error, "stack"));
  const cause = readErrorProperty(error, "cause");
  const lineNumber = readErrorProperty(error, "lineNumber");
  return {
    name,
    message:
      message ||
      stringifyErrorMessage(error) ||
      (error === undefined ? "undefined" : "unknown error"),
    stack,
    code: readErrorProperty(error, "code") as string | number | undefined,
    fileName:
      stringifyErrorMessage(readErrorProperty(error, "fileName")) || undefined,
    lineNumber: typeof lineNumber === "number" ? lineNumber : undefined,
    errorCode: readErrorProperty(error, "errorCode") as
      | string
      | number
      | undefined,
    raw: cloneJsonValue(error),
    cause: cause === undefined ? undefined : serializeError(cause),
  };
}

function compactSerializedError(error: unknown): unknown {
  if (!error || typeof error !== "object") {
    return error;
  }
  const record = error as Record<string, unknown>;
  const cause = record.cause;
  return {
    name: normalizeString(record.name),
    message: normalizeString(record.message),
    code: record.code,
    errorCode: record.errorCode,
    fileName: normalizeString(record.fileName) || undefined,
    lineNumber: record.lineNumber,
    stackTail: tailText(record.stack),
    cause:
      cause && typeof cause === "object"
        ? compactSerializedError(cause)
        : undefined,
  };
}

function compactLifecycle(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  return {
    startedAt: record.startedAt,
    closedAt: record.closedAt,
    exitCode: record.exitCode,
    exitSource: record.exitSource,
    killedByClose: record.killedByClose,
    stdoutChars: record.stdoutChars,
    stderrChars: record.stderrChars,
    transportKind: record.transportKind,
    bridgePid: record.bridgePid,
    childPid: record.childPid,
    bridgeUrl: record.bridgeUrl,
    spawnId: record.spawnId,
    webSocketError: record.webSocketError,
    webSocketClose: record.webSocketClose,
    readError: record.readError,
    closeRequestedAt: record.closeRequestedAt,
    cleanupKillRequestedAt: record.cleanupKillRequestedAt,
  };
}

function compactTransportSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  return {
    commandLabel: normalizeString(record.commandLabel),
    commandLine: normalizeString(record.commandLine),
    exitCode: record.exitCode,
    stdoutTail: tailText(record.stdoutText),
    stderrTail: tailText(record.stderrText),
    lifecycle: compactLifecycle(record.transportLifecycle),
  };
}

function compactStage(stage: unknown) {
  if (!stage || typeof stage !== "object") {
    return stage;
  }
  const record = stage as Record<string, unknown>;
  const compact: Record<string, unknown> = {
    stage: record.stage,
    ts: record.ts,
  };
  for (const key of [
    "ok",
    "commandLabel",
    "commandLine",
    "sessionId",
    "sessionTitle",
  ]) {
    if (record[key] !== undefined) {
      compact[key] = record[key];
    }
  }
  if (record.error !== undefined) {
    compact.error = compactSerializedError(record.error);
  }
  if (record.lifecycle !== undefined) {
    compact.lifecycle = compactLifecycle(record.lifecycle);
  }
  if (record.stdoutText !== undefined) {
    compact.stdoutTail = tailText(record.stdoutText);
  }
  if (record.stderrText !== undefined) {
    compact.stderrTail = tailText(record.stderrText);
  }
  return compact;
}

function compactDiagnosticEntry(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return entry;
  }
  const record = entry as Record<string, unknown>;
  return {
    id: record.id,
    ts: record.ts,
    kind: record.kind,
    level: record.level,
    message: record.message,
    stage: record.stage,
    detail: tailText(record.detail),
    errorName: record.errorName,
    stackTail: tailText(record.stack),
    causeTail: tailText(record.cause),
  };
}

function compactRawTransportProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const initializeWrite = record.initializeWrite as
    | Record<string, unknown>
    | undefined;
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    outputFiles: record.outputFiles,
    outputFileTails: record.outputFileTails,
    outputFileWriteError: record.outputFileWriteError,
    commandLabel: record.commandLabel,
    commandLine: record.commandLine,
    environmentSummary: record.environmentSummary,
    stages: Array.isArray(record.stages) ? record.stages.map(compactStage) : [],
    exitedAfterSpawn: record.exitedAfterSpawn,
    exitedAfterInitializeWrite: record.exitedAfterInitializeWrite,
    initializeWrite: initializeWrite
      ? {
          ok: initializeWrite.ok,
          error: compactSerializedError(initializeWrite.error),
        }
      : undefined,
    lifecycleAfterSpawn: compactLifecycle(record.lifecycleAfterSpawn),
    lifecycleAfterPostSpawnWait: compactLifecycle(
      record.lifecycleAfterPostSpawnWait,
    ),
    lifecycleAfterInitializeWriteFailure: compactLifecycle(
      record.lifecycleAfterInitializeWriteFailure,
    ),
    lifecycleBeforeCleanup: compactLifecycle(record.lifecycleBeforeCleanup),
    lifecycleAfterCleanup: compactLifecycle(record.lifecycleAfterCleanup),
    stdoutTail:
      tailText(record.stdoutBeforeCleanup) ||
      tailText(record.stdoutAfterInitializeWriteFailure) ||
      tailText(record.stdoutAfterInitializeWrite),
    stderrTail:
      tailText(record.stderrBeforeCleanup) ||
      tailText(record.stderrAfterInitializeWriteFailure) ||
      tailText(record.stderrAfterInitializeWrite),
    cleanupError: compactSerializedError(record.cleanupError),
  };
}

function compactFileCaptureProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const summary = (record.summary || {}) as Record<string, unknown>;
  const shimSnippets = Array.isArray(summary.shimSnippets)
    ? summary.shimSnippets.map((entry) => {
        const shim = (entry || {}) as Record<string, unknown>;
        return {
          path: shim.path,
          extension: shim.extension,
          contentTail: tailText(shim.content),
          readError: shim.readError,
        };
      })
    : [];
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    shellCommand: record.shellCommand,
    shellExitCode: record.shellExitCode,
    shellTimedOut: record.shellTimedOut,
    shellError: compactSerializedError(record.shellError),
    outputFiles: record.outputFiles,
    shellStdoutTail: tailText(record.shellStdout),
    shellStderrTail: tailText(record.shellStderr),
    summaryParseError: record.summaryParseError,
    summary: {
      command: summary.command,
      args: summary.args,
      cwd: summary.cwd,
      timeoutSeconds: summary.timeoutSeconds,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      getCommand: summary.getCommand,
      shimSnippets,
      wrapperEnvironment: summary.wrapperEnvironment,
      jobEnvironment: summary.jobEnvironment,
      jobStarted: summary.jobStarted,
      jobCompleted: summary.jobCompleted,
      jobTimedOut: summary.jobTimedOut,
      initializeResponseObserved: summary.initializeResponseObserved,
      jobStoppedAfterInitialize: summary.jobStoppedAfterInitialize,
      jobState: summary.jobState,
      exitText: summary.exitText,
      stdoutChars: summary.stdoutChars,
      stderrChars: summary.stderrChars,
      invokeErrorTail: tailText(summary.invokeErrorText),
      jobReceiveTail: tailText(summary.jobReceiveText),
      topLevelError: summary.topLevelError,
    },
    stdoutTail: tailText(record.stdoutText),
    stderrTail: tailText(record.stderrText),
    invokeErrorTail: tailText(record.invokeErrorText),
    stdoutChars:
      typeof record.stdoutText === "string"
        ? record.stdoutText.length
        : undefined,
    stderrChars:
      typeof record.stderrText === "string"
        ? record.stderrText.length
        : undefined,
  };
}

function compactResolvedExeProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const initialize = record.initialize as Record<string, unknown> | undefined;
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    outputFiles: record.outputFiles,
    resolution: record.resolution,
    parsedLaunch: record.parsedLaunch,
    stages: Array.isArray(record.stages) ? record.stages.map(compactStage) : [],
    initialize: initialize
      ? {
          ok: initialize.ok,
          line: tailText(initialize.line),
          error: compactSerializedError(initialize.error),
        }
      : undefined,
    exitCode: record.exitCode,
    stdoutTail: tailText(record.stdoutText),
    stderrTail: tailText(record.stderrText),
    stdoutChars:
      typeof record.stdoutText === "string"
        ? record.stdoutText.length
        : undefined,
    stderrChars:
      typeof record.stderrText === "string"
        ? record.stderrText.length
        : undefined,
    error: compactSerializedError(record.error),
    cleanupError: compactSerializedError(record.cleanupError),
  };
}

function compactNodeBridgeProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const initialize = record.initialize as Record<string, unknown> | undefined;
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    bridgeScript: record.bridgeScript,
    outputFiles: record.outputFiles,
    nodeResolution: record.nodeResolution,
    targetResolution: record.targetResolution,
    parsedTargetLaunch: record.parsedTargetLaunch,
    bridgeCommandLine: record.bridgeCommandLine,
    stages: Array.isArray(record.stages) ? record.stages.map(compactStage) : [],
    initialize: initialize
      ? {
          ok: initialize.ok,
          line: tailText(initialize.line),
          error: compactSerializedError(initialize.error),
        }
      : undefined,
    exitCode: record.exitCode,
    stdoutTail: tailText(record.stdoutText),
    stderrTail: tailText(record.stderrText),
    stdoutChars:
      typeof record.stdoutText === "string"
        ? record.stdoutText.length
        : undefined,
    stderrChars:
      typeof record.stderrText === "string"
        ? record.stderrText.length
        : undefined,
    error: compactSerializedError(record.error),
    cleanupError: compactSerializedError(record.cleanupError),
  };
}

function compactWebSocketBridgeProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const initialize = record.initialize as Record<string, unknown> | undefined;
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    bridgeScript: record.bridgeScript,
    readyFile: record.readyFile,
    outputFiles: record.outputFiles,
    nodeResolution: record.nodeResolution,
    targetResolution: record.targetResolution,
    parsedTargetLaunch: record.parsedTargetLaunch,
    bridgeCommandLine: record.bridgeCommandLine,
    bridgeReady: record.bridgeReady,
    bridgeUrl: record.bridgeUrl,
    stages: Array.isArray(record.stages) ? record.stages.map(compactStage) : [],
    initialize: initialize
      ? {
          ok: initialize.ok,
          line: tailText(initialize.line),
          agentInfo: initialize.agentInfo,
          error: compactSerializedError(initialize.error),
        }
      : undefined,
    exitCode: record.exitCode,
    stdoutTail: tailText(record.stdoutText),
    stderrTail: tailText(record.stderrText),
    stdoutChars:
      typeof record.stdoutText === "string"
        ? record.stdoutText.length
        : undefined,
    stderrChars:
      typeof record.stderrText === "string"
        ? record.stderrText.length
        : undefined,
    error: compactSerializedError(record.error),
    cleanupError: compactSerializedError(record.cleanupError),
  };
}

function compactStdinCapabilityMatrixProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  const cases = Array.isArray(record.cases)
    ? record.cases.map((entry) => {
        const probeCase = (entry || {}) as Record<string, unknown>;
        const writeResult = probeCase.write as
          | Record<string, unknown>
          | undefined;
        return {
          id: probeCase.id,
          description: probeCase.description,
          ok: probeCase.ok,
          commandLine: probeCase.commandLine,
          waitReady: probeCase.waitReady,
          writeDelayMs: probeCase.writeDelayMs,
          payloadKind: probeCase.payloadKind,
          workdir: probeCase.workdir,
          environmentMode: probeCase.environmentMode,
          ready: probeCase.ready,
          write: writeResult
            ? {
                ok: writeResult.ok,
                error: compactSerializedError(writeResult.error),
              }
            : undefined,
          stdoutRead: probeCase.stdoutRead,
          inputReceived: probeCase.inputReceived,
          outputObserved: probeCase.outputObserved,
          exitCode: probeCase.exitCode,
          stdoutTail: tailText(probeCase.stdoutText),
          stderrTail: tailText(probeCase.stderrText),
          inputTail: tailText(probeCase.inputText),
          outputFileTail: tailText(probeCase.outputText),
          error: compactSerializedError(probeCase.error),
          cleanupError: compactSerializedError(probeCase.cleanupError),
        };
      })
    : [];
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    nodeResolution: record.nodeResolution,
    script: record.script,
    asciiWorkdir: record.asciiWorkdir,
    cases,
    error: compactSerializedError(record.error),
  };
}

function compactAlternativeSubprocessProbe(value: unknown) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  const record = value as Record<string, unknown>;
  return {
    kind: record.kind,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    skipped: record.skipped,
    nodeResolution: record.nodeResolution,
    zoteroInternalSubprocess: record.zoteroInternalSubprocess,
    nsIProcess: record.nsIProcess,
    processUtils: record.processUtils,
    error: compactSerializedError(record.error),
  };
}

function compactCommandRegistrySnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  const record = snapshot as Record<string, unknown>;
  const commands = record.commands as Record<string, unknown> | undefined;
  return {
    initialized: record.initialized,
    initializedAt: record.initializedAt,
    commands: Object.fromEntries(
      Object.entries(commands || {}).map(([key, value]) => {
        const command = (value || {}) as Record<string, unknown>;
        const checked = Array.isArray(command.checkedCandidates)
          ? command.checkedCandidates
          : [];
        const launch = (command.launch || {}) as Record<string, unknown>;
        return [
          key,
          {
            command: command.command,
            available: command.available,
            resolvedPath: command.resolvedPath,
            source: command.source,
            diagnostic: command.diagnostic,
            checkedCandidateCount: checked.length,
            checkedCandidatesTail: tailList(checked),
            launch: command.launch
              ? {
                  mode: launch.mode,
                  command: launch.command,
                  args: launch.args,
                  commandLine: launch.commandLine,
                }
              : undefined,
          },
        ];
      }),
    ),
  };
}

async function withTimeout<T>(
  label: string,
  promise: Promise<T>,
  timeoutMs = ACP_REFRESH_DIAGNOSTIC_STAGE_TIMEOUT_MS,
) {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

function summarizeAcpRuntimeOptionsCache(
  cache: ReturnType<typeof buildAcpRuntimeOptionsCache>,
) {
  return {
    modes: Array.isArray(cache?.modes) ? cache.modes.length : 0,
    rawModels: Array.isArray(cache?.rawModels) ? cache.rawModels.length : 0,
    displayModels: Array.isArray(cache?.displayModels)
      ? cache.displayModels.length
      : 0,
    reasoningEfforts: Array.isArray(cache?.reasoningEfforts)
      ? cache.reasoningEfforts.length
      : 0,
    refreshedAt: normalizeString(cache?.refreshedAt),
  };
}

async function summarizeBackendCommandResolution(backend: BackendInstance) {
  const command = normalizeString(backend.command);
  if (!command) {
    return {
      command,
      available: false,
      diagnostic: "Command is empty",
    };
  }
  try {
    const env = buildSubprocessEnvironment(normalizeStringMap(backend.env));
    const resolution = await resolveRuntimeCommand(command, {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    const checkedCandidates = Array.isArray(resolution.checkedCandidates)
      ? resolution.checkedCandidates
      : [];
    return {
      command: resolution.command,
      available: resolution.available,
      resolvedPath: resolution.resolvedPath,
      source: resolution.source,
      diagnostic: resolution.diagnostic,
      checkedCandidateCount: checkedCandidates.length,
      checkedCandidatesTail: tailList(checkedCandidates),
      launch: resolution.launch
        ? {
            mode: resolution.launch.mode,
            command: resolution.launch.command,
            args: resolution.launch.args,
            commandLine: resolution.launch.commandLine,
          }
        : undefined,
    };
  } catch (error) {
    return {
      command,
      available: false,
      error: compactSerializedError(serializeError(error)),
    };
  }
}

function compactBackendDiagnosticResult(value: unknown) {
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  return {
    backendId: record.backendId,
    displayName: record.displayName,
    command: record.command,
    args: record.args,
    envKeys: record.envKeys,
    environmentSummary: record.environmentSummary,
    commandResolution: record.commandResolution,
    configFingerprint: record.configFingerprint,
    directories: record.directories,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    ok: record.ok,
    error: compactSerializedError(record.error),
    stages: Array.isArray(record.stages) ? record.stages.map(compactStage) : [],
    fileCaptureProbe: compactFileCaptureProbe(record.fileCaptureProbe),
    resolvedExeProbe: compactResolvedExeProbe(record.resolvedExeProbe),
    nodeBridgeProbe: compactNodeBridgeProbe(record.nodeBridgeProbe),
    webSocketBridgeProbe: compactWebSocketBridgeProbe(
      record.webSocketBridgeProbe,
    ),
    stdinCapabilityMatrixProbe: compactStdinCapabilityMatrixProbe(
      record.stdinCapabilityMatrixProbe,
    ),
    alternativeSubprocessProbe: compactAlternativeSubprocessProbe(
      record.alternativeSubprocessProbe,
    ),
    rawTransportProbe: compactRawTransportProbe(record.rawTransportProbe),
    initialize: record.initialize,
    session: record.session,
    runtimeOptionsCacheSummary: record.runtimeOptionsCacheSummary,
    adapterTransportExitedBeforeCleanup:
      record.adapterTransportExitedBeforeCleanup,
    adapterTransportSnapshotBeforeCleanup: compactTransportSnapshot(
      record.adapterTransportSnapshotBeforeCleanup,
    ),
    runtimeLogsTail: Array.isArray(record.runtimeLogsTail)
      ? tailList(record.runtimeLogsTail, 10)
      : record.runtimeLogsTail,
    diagnostics: Array.isArray(record.diagnostics)
      ? record.diagnostics.map(compactDiagnosticEntry)
      : [],
    closeEvents: Array.isArray(record.closeEvents)
      ? record.closeEvents.map(compactTransportSnapshot)
      : [],
  };
}

function getRuntimeToolkit(): RuntimeToolkit | null {
  return (resolveRuntimeToolkit() as RuntimeToolkit | undefined) || null;
}

function createDiagnosticProgressToast(initial: DiagnosticProgressUpdate) {
  const ProgressWindow = getRuntimeToolkit()?.ProgressWindow;
  if (!ProgressWindow) {
    showAlert(initial.text);
    return {
      update: (next: DiagnosticProgressUpdate) => {
        if (next.progress >= 100) {
          showAlert(next.text);
        }
      },
      close: () => undefined,
    };
  }
  const shown = new ProgressWindow(config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: initial.text,
      type: initial.type || "default",
      progress: initial.progress,
    })
    .show();
  return {
    update: (next: DiagnosticProgressUpdate) => {
      shown.changeLine?.({
        text: next.text,
        type: next.type || "default",
        progress: Math.max(0, Math.min(100, Math.round(next.progress))),
      });
    },
    close: () => {
      shown.startCloseTimer?.(ACP_REFRESH_DIAGNOSTIC_TOAST_CLOSE_MS);
    },
  };
}

function showAlert(message: string) {
  const win = Zotero.getMainWindow?.();
  const alertFn = resolveRuntimeAlert(win);
  if (alertFn) {
    alertFn(message);
  }
}

function copyTextToClipboard(text: string) {
  copyText(text);
}

function encodeText(value: string) {
  const TextEncoderCtor = (
    globalThis as { TextEncoder?: typeof globalThis.TextEncoder }
  ).TextEncoder;
  if (typeof TextEncoderCtor !== "function") {
    throw new Error("TextEncoder is unavailable in current runtime");
  }
  return new TextEncoderCtor().encode(value);
}

function buildProbeDirectories(backend: BackendInstance) {
  const paths = getRuntimePersistencePaths();
  const safeBackendId =
    normalizeString(backend.id).replace(/[^A-Za-z0-9_.-]+/g, "-") || "backend";
  const root = joinPath(
    paths.tmpDir,
    "acp-backend-refresh-cache-diagnostic",
    safeBackendId,
  );
  return {
    root,
    workspaceDir: joinPath(root, "workspace"),
    runtimeDir: joinPath(root, "runtime"),
  };
}

async function readMozillaPipeText(
  pipe: { readString?: () => Promise<string> } | undefined,
  timeoutMs = 500,
) {
  if (!pipe || typeof pipe.readString !== "function") {
    return "";
  }
  let output = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const chunk = await Promise.race([
      pipe.readString(),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(""), Math.min(remaining, 100));
      }),
    ]);
    if (!chunk) {
      break;
    }
    output += chunk;
  }
  return output;
}

function extractSubprocessExitCode(proc: unknown, waitResult: unknown) {
  const procExitCode = readErrorProperty(proc, "exitCode");
  if (typeof procExitCode === "number" || typeof procExitCode === "string") {
    return procExitCode;
  }
  const procExitValue = readErrorProperty(proc, "exitValue");
  if (typeof procExitValue === "number" || typeof procExitValue === "string") {
    return procExitValue;
  }
  const resultExitCode = readErrorProperty(waitResult, "exitCode");
  if (
    typeof resultExitCode === "number" ||
    typeof resultExitCode === "string"
  ) {
    return resultExitCode;
  }
  const resultExitValue = readErrorProperty(waitResult, "exitValue");
  if (
    typeof resultExitValue === "number" ||
    typeof resultExitValue === "string"
  ) {
    return resultExitValue;
  }
  return null;
}

function parseJsonObjectOrNull(value: string) {
  const text = normalizeString(value);
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function buildPowerShellFileCaptureScript(args: {
  backend: BackendInstance;
  workspaceDir: string;
  files: Record<string, string>;
}) {
  const command = normalizeString(args.backend.command);
  const commandArgs = Array.isArray(args.backend.args)
    ? args.backend.args.map(String)
    : [];
  const initializeInput = `${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {},
    },
  })}\n`;
  return `
$ErrorActionPreference = 'Continue'
$command = ${quotePowerShellSingleQuoted(command)}
$commandArgs = ${renderPowerShellStringArray(commandArgs)}
$cwd = ${quotePowerShellSingleQuoted(args.workspaceDir)}
$summaryPath = ${quotePowerShellSingleQuoted(args.files.summary)}
$stdoutPath = ${quotePowerShellSingleQuoted(args.files.stdout)}
$stderrPath = ${quotePowerShellSingleQuoted(args.files.stderr)}
$inputPath = ${quotePowerShellSingleQuoted(args.files.input)}
$exitPath = ${quotePowerShellSingleQuoted(args.files.exit)}
$invokeErrorPath = ${quotePowerShellSingleQuoted(args.files.invokeError)}
$jobEnvPath = ${quotePowerShellSingleQuoted(args.files.jobEnvironment)}
$timeoutSeconds = ${ACP_REFRESH_DIAGNOSTIC_FILE_CAPTURE_TIMEOUT_SECONDS}
$envValueKeys = ${renderPowerShellStringArray(ACP_REFRESH_DIAGNOSTIC_ENV_VALUE_KEYS)}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Write-TextFile([string]$Path, [string]$Value) {
  [System.IO.File]::WriteAllText($Path, [string]$Value, $utf8NoBom)
}
function Read-TextFileMaybe([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return ''
  }
  $stream = $null
  $reader = $null
  try {
    $share = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, $share)
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8, $true)
    return $reader.ReadToEnd()
  } catch {
    return ''
  } finally {
    if ($null -ne $reader) {
      $reader.Dispose()
    } elseif ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}
function ConvertTo-EnvSnapshot([string[]]$Keys) {
  $values = [ordered]@{}
  foreach ($key in $Keys) {
    $value = [Environment]::GetEnvironmentVariable($key, 'Process')
    if ([string]::IsNullOrEmpty($value)) { continue }
    if ($key -match '(TOKEN|KEY|PASSWORD|SECRET)') {
      $values[$key] = '<redacted>'
    } else {
      $values[$key] = $value
    }
  }
  $pathValue = [Environment]::GetEnvironmentVariable('Path', 'Process')
  if ([string]::IsNullOrEmpty($pathValue)) {
    $pathValue = [Environment]::GetEnvironmentVariable('PATH', 'Process')
  }
  $pathEntries = @()
  if (-not [string]::IsNullOrEmpty($pathValue)) {
    $pathEntries = @($pathValue -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }
  return [ordered]@{
    selectedValues = $values
    pathValue = $pathValue
    pathEntryCount = $pathEntries.Count
    pathEntries = $pathEntries
  }
}
$meta = [ordered]@{
  command = $command
  args = $commandArgs
  cwd = $cwd
  timeoutSeconds = $timeoutSeconds
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
}
$job = $null
try {
  Write-TextFile $inputPath ${quotePowerShellSingleQuoted(initializeInput)}
  Remove-Item -LiteralPath $stdoutPath, $stderrPath, $exitPath, $invokeErrorPath, $jobEnvPath -Force -ErrorAction SilentlyContinue
  $meta.wrapperEnvironment = ConvertTo-EnvSnapshot $envValueKeys

  $commands = @(Get-Command -Name $command -All -ErrorAction SilentlyContinue)
  $meta.getCommand = @($commands | ForEach-Object {
    [ordered]@{
      commandType = [string]$_.CommandType
      name = [string]$_.Name
      source = [string]$_.Source
      path = [string]$_.Path
      definition = [string]$_.Definition
      originalExtension = [System.IO.Path]::GetExtension([string]($_.Source))
    }
  })

  $shimPaths = New-Object System.Collections.Generic.List[string]
  foreach ($entry in $meta.getCommand) {
    foreach ($candidate in @($entry.source, $entry.path, $entry.definition)) {
      $candidateText = [string]$candidate
      if (-not $candidateText) { continue }
      if (-not (Test-Path -LiteralPath $candidateText -PathType Leaf)) { continue }
      $extension = [System.IO.Path]::GetExtension($candidateText).ToLowerInvariant()
      if ($extension -in @('.cmd', '.bat', '.ps1')) {
        if (-not $shimPaths.Contains($candidateText)) {
          [void]$shimPaths.Add($candidateText)
        }
      }
    }
  }
  $meta.shimSnippets = @($shimPaths | ForEach-Object {
    $shimPath = [string]$_
    try {
      [ordered]@{
        path = $shimPath
        extension = [System.IO.Path]::GetExtension($shimPath)
        content = ((Get-Content -LiteralPath $shimPath -TotalCount 80 -ErrorAction Stop) -join [Environment]::NewLine)
      }
    } catch {
      [ordered]@{
        path = $shimPath
        extension = [System.IO.Path]::GetExtension($shimPath)
        readError = ($_ | Out-String)
      }
    }
  })

  $job = Start-Job -ScriptBlock {
    param(
      [string]$Command,
      [string[]]$CommandArgs,
      [string]$Cwd,
      [string]$InputPath,
      [string]$StdoutPath,
      [string]$StderrPath,
      [string]$ExitPath,
      [string]$InvokeErrorPath,
      [string]$JobEnvPath,
      [string[]]$EnvValueKeys
    )
    $ErrorActionPreference = 'Continue'
    function ConvertTo-EnvSnapshot([string[]]$Keys) {
      $values = [ordered]@{}
      foreach ($key in $Keys) {
        $value = [Environment]::GetEnvironmentVariable($key, 'Process')
        if ([string]::IsNullOrEmpty($value)) { continue }
        if ($key -match '(TOKEN|KEY|PASSWORD|SECRET)') {
          $values[$key] = '<redacted>'
        } else {
          $values[$key] = $value
        }
      }
      $pathValue = [Environment]::GetEnvironmentVariable('Path', 'Process')
      if ([string]::IsNullOrEmpty($pathValue)) {
        $pathValue = [Environment]::GetEnvironmentVariable('PATH', 'Process')
      }
      $pathEntries = @()
      if (-not [string]::IsNullOrEmpty($pathValue)) {
        $pathEntries = @($pathValue -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
      }
      return [ordered]@{
        selectedValues = $values
        pathValue = $pathValue
        pathEntryCount = $pathEntries.Count
        pathEntries = $pathEntries
      }
    }
    try {
      Set-Location -LiteralPath $Cwd
      [System.IO.File]::WriteAllText($JobEnvPath, ((ConvertTo-EnvSnapshot $EnvValueKeys) | ConvertTo-Json -Depth 8))
      $inputText = [System.IO.File]::ReadAllText($InputPath)
      $inputText | & $Command @CommandArgs 1> $StdoutPath 2> $StderrPath
      $exitText = if ($null -ne $global:LASTEXITCODE) { [string]$global:LASTEXITCODE } else { '' }
      [System.IO.File]::WriteAllText($ExitPath, $exitText)
    } catch {
      [System.IO.File]::WriteAllText($InvokeErrorPath, ($_ | Out-String))
      throw
    }
  } -ArgumentList $command, $commandArgs, $cwd, $inputPath, $stdoutPath, $stderrPath, $exitPath, $invokeErrorPath, $jobEnvPath, $envValueKeys

  $meta.jobStarted = $true
  $completed = $null
  $initializeResponseObserved = $false
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $completed = Wait-Job -Job $job -Timeout 1
    $stdoutText = Read-TextFileMaybe $stdoutPath
    if ($stdoutText -match '"id"\\s*:\\s*1') {
      $initializeResponseObserved = $true
      break
    }
    if ($completed) { break }
  }
  $meta.initializeResponseObserved = $initializeResponseObserved
  $meta.jobCompleted = [bool]$completed
  $meta.jobTimedOut = (-not [bool]$completed) -and (-not $initializeResponseObserved)
  if (-not $completed) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    $meta.jobStoppedAfterInitialize = $initializeResponseObserved
  }
  $meta.jobState = [string]$job.State
  $meta.jobReceiveText = (Receive-Job -Job $job -Keep -ErrorAction SilentlyContinue 2>&1 | Out-String)
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  $jobEnvironmentText = Read-TextFileMaybe $jobEnvPath
  if (-not [string]::IsNullOrEmpty($jobEnvironmentText)) {
    $meta.jobEnvironment = $jobEnvironmentText | ConvertFrom-Json
  }
  $meta.exitText = Read-TextFileMaybe $exitPath
  $meta.invokeErrorText = Read-TextFileMaybe $invokeErrorPath
  $meta.stdoutChars = (Read-TextFileMaybe $stdoutPath).Length
  $meta.stderrChars = (Read-TextFileMaybe $stderrPath).Length
} catch {
  $meta.topLevelError = ($_ | Out-String)
  if ($null -ne $job) {
    $meta.jobStateAtTopLevelError = [string]$job.State
    Stop-Job -Job $job -ErrorAction SilentlyContinue
  }
} finally {
  if ($null -ne $job) {
    $meta.jobStateBeforeFinalCleanup = [string]$job.State
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
  $meta.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
  Write-TextFile $summaryPath ($meta | ConvertTo-Json -Depth 10)
}
`;
}

async function runPowerShellFileCaptureProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const runtimeEnvironment = getRuntimeEnvironmentSnapshot();
  const files = {
    summary: joinPath(args.outputDir, "file-capture-summary.json"),
    stdout: joinPath(args.outputDir, "file-capture-stdout.log"),
    stderr: joinPath(args.outputDir, "file-capture-stderr.log"),
    input: joinPath(args.outputDir, "file-capture-input.ndjson"),
    exit: joinPath(args.outputDir, "file-capture-exit.txt"),
    invokeError: joinPath(args.outputDir, "file-capture-invoke-error.log"),
    jobEnvironment: joinPath(args.outputDir, "file-capture-job-env.json"),
    wrapperStdout: joinPath(args.outputDir, "file-capture-wrapper-stdout.log"),
    wrapperStderr: joinPath(args.outputDir, "file-capture-wrapper-stderr.log"),
  };
  const result: Record<string, unknown> = {
    kind: "powershell-file-capture-probe",
    startedAt: new Date().toISOString(),
    outputFiles: files,
  };
  if (runtimeEnvironment.platform !== "win32") {
    result.ok = true;
    result.skipped = "non-windows";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    result.ok = false;
    result.skipped = "mozilla-subprocess-unavailable";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  const shellCommand =
    getPreferredWindowsShellCommandsFromRegistry()[0] || "powershell.exe";
  result.shellCommand = shellCommand;

  const script = buildPowerShellFileCaptureScript({
    backend: args.backend,
    workspaceDir: args.workspaceDir,
    files,
  });
  let proc: Awaited<ReturnType<NonNullable<typeof subprocess.call>>> | null =
    null;
  try {
    proc = await subprocess.call({
      command: shellCommand,
      arguments: [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodeUtf16LeBase64(script),
      ],
      environment: buildSubprocessEnvironment(
        normalizeStringMap(args.backend.env),
      ),
      environmentAppend: true,
      workdir: args.workspaceDir,
    });
    const waitResult = await withTimeout(
      "PowerShell file capture probe",
      proc.wait ? proc.wait() : Promise.resolve(null),
      (ACP_REFRESH_DIAGNOSTIC_FILE_CAPTURE_TIMEOUT_SECONDS + 6) * 1000,
    ).catch((error) => {
      result.shellTimedOut = true;
      result.shellError = serializeError(error);
      try {
        proc?.kill?.(0);
      } catch {
        // ignore cleanup failure
      }
      return null;
    });
    result.shellExitCode = extractSubprocessExitCode(proc, waitResult);
    result.shellStdout = await readMozillaPipeText(proc.stdout, 1_000);
    result.shellStderr = await readMozillaPipeText(proc.stderr, 1_000);
  } catch (error) {
    result.shellError = serializeError(error);
  } finally {
    try {
      await writeRuntimeTextFile(
        files.wrapperStdout,
        normalizeString(result.shellStdout),
      );
      await writeRuntimeTextFile(
        files.wrapperStderr,
        normalizeString(result.shellStderr),
      );
    } catch {
      // The primary diagnostic artifacts are still collected below.
    }
    const summaryText = await readRuntimeTextFile(files.summary);
    const summary = parseJsonObjectOrNull(summaryText);
    result.summary = summary || undefined;
    if (summaryText && !summary) {
      result.summaryParseError = "summary JSON could not be parsed";
      result.summaryTail = tailText(summaryText);
    }
    result.stdoutText = await readRuntimeTextFile(files.stdout);
    result.stderrText = await readRuntimeTextFile(files.stderr);
    result.invokeErrorText = await readRuntimeTextFile(files.invokeError);
    result.ok =
      result.shellError === undefined &&
      result.shellTimedOut !== true &&
      Boolean(summary);
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

function getWindowsDirName(pathRaw: string) {
  const normalized = normalizeString(pathRaw).replace(/\//g, "\\");
  const index = normalized.lastIndexOf("\\");
  return index > 0 ? normalized.slice(0, index) : "";
}

function joinWindowsPathFromBase(baseRaw: string, relativeRaw: string) {
  const base = normalizeString(baseRaw)
    .replace(/\//g, "\\")
    .replace(/\\+$/, "");
  const relative = normalizeString(relativeRaw)
    .replace(/\//g, "\\")
    .replace(/^\\+/, "");
  return base && relative ? `${base}\\${relative}` : base || relative;
}

function quoteDiagnosticCommandLineArg(value: unknown) {
  const text = String(value || "");
  if (!text) {
    return '""';
  }
  return /[\s"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function buildDiagnosticCommandLine(command: string, args: string[]) {
  return [command, ...args].map(quoteDiagnosticCommandLineArg).join(" ");
}

function parseResolvedExeLaunchFromShim(args: {
  command: string;
  commandArgs: string[];
  resolvedPath: string;
  shimText: string;
}) {
  const resolvedPath = normalizeString(args.resolvedPath);
  const shimText = String(args.shimText || "");
  const extension = resolvedPath.match(/\.([^.\\/]+)$/u)?.[0]?.toLowerCase();
  const baseDir = getWindowsDirName(resolvedPath);
  if (!resolvedPath || !shimText || !baseDir) {
    return {
      ok: false,
      reason: "Resolved shim path or shim content is empty",
    };
  }

  const npmNodeCliMatch =
    shimText.match(/\$NPX_CLI_JS="\$PSScriptRoot\/([^"]+?npx-cli\.js)"/iu) ||
    shimText.match(/SET\s+"NPX_CLI_JS=%~dp0\\([^"]+?npx-cli\.js)"/iu);
  if (npmNodeCliMatch) {
    const nodeCommand = joinWindowsPathFromBase(baseDir, "node.exe");
    const npxCli = joinWindowsPathFromBase(baseDir, npmNodeCliMatch[1]);
    const launchArgs = [npxCli, ...args.commandArgs];
    return {
      ok: true,
      strategy: "npm-npx-node-cli",
      command: nodeCommand,
      args: launchArgs,
      commandLine: buildDiagnosticCommandLine(nodeCommand, launchArgs),
      sourceShim: resolvedPath,
      extension,
    };
  }

  const ps1ExeMatch =
    shimText.match(/&\s+"\$basedir\/([^"]+?\.exe)"\s+\$args/iu) ||
    shimText.match(/&\s+"\$PSScriptRoot\/([^"]+?\.exe)"\s+\$args/iu);
  if (ps1ExeMatch) {
    const exe = joinWindowsPathFromBase(baseDir, ps1ExeMatch[1]);
    return {
      ok: true,
      strategy: "npm-ps1-direct-exe",
      command: exe,
      args: args.commandArgs,
      commandLine: buildDiagnosticCommandLine(exe, args.commandArgs),
      sourceShim: resolvedPath,
      extension,
    };
  }

  const cmdExeMatch =
    shimText.match(/"%dp0%\\([^"]+?\.exe)"\s+%[*0-9]/iu) ||
    shimText.match(/"%~dp0\\([^"]+?\.exe)"\s+%[*0-9]/iu);
  if (cmdExeMatch) {
    const exe = joinWindowsPathFromBase(baseDir, cmdExeMatch[1]);
    return {
      ok: true,
      strategy: "npm-cmd-direct-exe",
      command: exe,
      args: args.commandArgs,
      commandLine: buildDiagnosticCommandLine(exe, args.commandArgs),
      sourceShim: resolvedPath,
      extension,
    };
  }

  if (/\.exe$/iu.test(resolvedPath)) {
    return {
      ok: true,
      strategy: "already-exe",
      command: resolvedPath,
      args: args.commandArgs,
      commandLine: buildDiagnosticCommandLine(resolvedPath, args.commandArgs),
      sourceShim: resolvedPath,
      extension,
    };
  }

  return {
    ok: false,
    reason: "No known npm shim executable pattern matched",
    sourceShim: resolvedPath,
    extension,
  };
}

async function readMozillaPipeOnce(
  pipe: { readString?: () => Promise<string> } | undefined,
  timeoutMs: number,
) {
  if (!pipe || typeof pipe.readString !== "function") {
    return { timeout: false, text: "" };
  }
  const timeout = { timeout: true, text: "" };
  return await Promise.race([
    pipe
      .readString()
      .then((text) => ({ timeout: false, text: String(text || "") })),
    new Promise<typeof timeout>((resolve) => {
      setTimeout(() => resolve(timeout), timeoutMs);
    }),
  ]);
}

type DiagnosticWebSocket = {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data?: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  send: (data: string) => void;
  close: () => void;
};

type DiagnosticWebSocketConstructor = new (url: string) => DiagnosticWebSocket;

function getDiagnosticWebSocketConstructor() {
  const runtime = globalThis as Record<string, unknown> & {
    window?: Record<string, unknown>;
    Zotero?: {
      getMainWindow?: () => Record<string, unknown> | null | undefined;
    };
    Services?: {
      appShell?: {
        hiddenDOMWindow?: Record<string, unknown>;
      };
    };
  };
  const targets: Array<{
    label: string;
    value: Record<string, unknown> | null | undefined;
  }> = [
    { label: "globalThis", value: runtime },
    { label: "globalThis.window", value: runtime.window },
  ];
  try {
    targets.push({
      label: "Zotero.getMainWindow()",
      value: runtime.Zotero?.getMainWindow?.() || null,
    });
  } catch {
    targets.push({ label: "Zotero.getMainWindow():error", value: null });
  }
  try {
    targets.push({
      label: "Services.appShell.hiddenDOMWindow",
      value: runtime.Services?.appShell?.hiddenDOMWindow || null,
    });
  } catch {
    targets.push({
      label: "Services.appShell.hiddenDOMWindow:error",
      value: null,
    });
  }

  const checked: string[] = [];
  for (const target of targets) {
    const candidate = target.value?.WebSocket || target.value?.MozWebSocket;
    checked.push(
      `${target.label}:${typeof candidate === "function" ? "function" : "missing"}`,
    );
    if (typeof candidate === "function") {
      return candidate as DiagnosticWebSocketConstructor;
    }
  }
  throw new Error(
    `WebSocket constructor is unavailable in current runtime; checked=${checked.join(
      " | ",
    )}`,
  );
}

function compactWebSocketEvent(event: unknown) {
  if (!event || typeof event !== "object") {
    return event;
  }
  const record = event as Record<string, unknown>;
  return {
    type: record.type,
    code: record.code,
    reason: record.reason,
    wasClean: record.wasClean,
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForRuntimeJsonFile(args: {
  path: string;
  label: string;
  timeoutMs: number;
}) {
  const deadline = Date.now() + args.timeoutMs;
  let lastText = "";
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    lastText = await readRuntimeTextFile(args.path);
    if (normalizeString(lastText)) {
      try {
        const parsed = JSON.parse(lastText);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        lastError = error;
      }
    }
    await delay(100);
  }
  const error = new Error(
    `${args.label} was not ready within ${args.timeoutMs}ms`,
  );
  (error as { cause?: unknown }).cause = {
    lastText: tailText(lastText),
    lastError: lastError ? serializeError(lastError) : null,
  };
  throw error;
}

function requestInitializeOverWebSocket(args: {
  url: string;
  timeoutMs: number;
}) {
  const WebSocketCtor = getDiagnosticWebSocketConstructor();
  const payload = `${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {},
    },
  })}\n`;

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let socket: DiagnosticWebSocket | null = null;
    let settled = false;
    let rawText = "";
    const nonJsonLines: string[] = [];
    const timer = setTimeout(() => {
      finish({
        ok: false,
        rawText,
        nonJsonLines: tailList(nonJsonLines),
        error: serializeError(
          new Error(`WebSocket initialize timed out after ${args.timeoutMs}ms`),
        ),
      });
    }, args.timeoutMs);

    const finish = (value: Record<string, unknown>) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // ignore close errors in diagnostic cleanup
      }
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // ignore close errors in diagnostic cleanup
      }
      reject(error);
    };

    try {
      socket = new WebSocketCtor(args.url);
      socket.onopen = () => {
        try {
          socket?.send(payload);
        } catch (error) {
          fail(error);
        }
      };
      socket.onmessage = (event) => {
        rawText += String(event?.data || "");
        const lines = rawText.split(/\r?\n/u);
        const completeLines = lines.slice(0, -1);
        rawText = lines[lines.length - 1] || "";
        for (const lineText of completeLines) {
          const line = normalizeString(lineText);
          if (!line) {
            continue;
          }
          try {
            const message = JSON.parse(line);
            finish({
              ok: Boolean(message?.id === 1 && message?.result),
              line,
              agentInfo: message?.result?.agentInfo,
              message,
              nonJsonLines: tailList(nonJsonLines),
            });
            return;
          } catch {
            nonJsonLines.push(line);
          }
        }
      };
      socket.onerror = (event) => {
        fail(
          new Error(
            `WebSocket error: ${stringifyErrorMessage(compactWebSocketEvent(event))}`,
          ),
        );
      };
      socket.onclose = (event) => {
        if (!settled) {
          finish({
            ok: false,
            rawText,
            nonJsonLines: tailList(nonJsonLines),
            closeEvent: compactWebSocketEvent(event),
            error: serializeError(
              new Error("WebSocket closed before initialize response"),
            ),
          });
        }
      };
    } catch (error) {
      fail(error);
    }
  });
}

async function runResolvedExeSpikeProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const stdoutFile = joinPath(args.outputDir, "resolved-exe-stdout.log");
  const stderrFile = joinPath(args.outputDir, "resolved-exe-stderr.log");
  const result: Record<string, unknown> = {
    kind: "resolved-exe-spike-probe",
    startedAt: new Date().toISOString(),
    outputFiles: {
      stdout: stdoutFile,
      stderr: stderrFile,
    },
    stages: [],
  };
  const pushStage = (stage: string, details?: Record<string, unknown>) => {
    (result.stages as unknown[]).push({
      stage,
      ts: new Date().toISOString(),
      ...(details || {}),
    });
  };

  const runtimeEnvironment = getRuntimeEnvironmentSnapshot();
  if (runtimeEnvironment.platform !== "win32") {
    result.ok = true;
    result.skipped = "non-windows";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    result.ok = false;
    result.skipped = "mozilla-subprocess-unavailable";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  const command = normalizeString(args.backend.command);
  const commandArgs = Array.isArray(args.backend.args)
    ? args.backend.args.map(String)
    : [];
  let proc: Awaited<ReturnType<NonNullable<typeof subprocess.call>>> | null =
    null;
  let stdoutText = "";
  let stderrText = "";

  try {
    pushStage("resolve:start");
    const env = buildSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    );
    const resolution = await resolveRuntimeCommand(command, {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    result.resolution = {
      command: resolution.command,
      available: resolution.available,
      resolvedPath: resolution.resolvedPath,
      source: resolution.source,
      diagnostic: resolution.diagnostic,
    };
    if (!resolution.available || !resolution.resolvedPath) {
      result.ok = false;
      result.skipped = "command-not-resolved";
      return result;
    }

    const shimText = await readRuntimeTextFile(resolution.resolvedPath);
    const parsed = parseResolvedExeLaunchFromShim({
      command,
      commandArgs,
      resolvedPath: resolution.resolvedPath,
      shimText,
    });
    result.parsedLaunch = parsed;
    if (!parsed.ok || !("command" in parsed)) {
      result.ok = false;
      result.skipped = "shim-parse-failed";
      return result;
    }
    const parsedCommand = normalizeString(parsed.command);
    const parsedArgs = Array.isArray(parsed.args)
      ? parsed.args.map(String)
      : [];
    if (!parsedCommand) {
      result.ok = false;
      result.skipped = "parsed-command-empty";
      return result;
    }
    pushStage("resolve:ok", {
      resolvedPath: resolution.resolvedPath,
      parsedLaunch: parsed,
    });

    pushStage("spawn:start");
    proc = await subprocess.call({
      command: parsedCommand,
      arguments: parsedArgs,
      environment: env,
      environmentAppend: true,
      workdir: args.workspaceDir,
    });
    pushStage("spawn:ok", {
      commandLine: parsed.commandLine,
    });

    pushStage("initialize-write:start");
    await proc.stdin?.write?.(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: ACP_PROTOCOL_VERSION,
          clientCapabilities: {},
        },
      })}\n`,
    );
    pushStage("initialize-write:ok");

    const stdoutRead = await readMozillaPipeOnce(
      proc.stdout,
      ACP_REFRESH_DIAGNOSTIC_RESOLVED_EXE_TIMEOUT_MS,
    );
    stdoutText += stdoutRead.text;
    const line = stdoutText.split(/\r?\n/u).find((entry) => entry.trim());
    if (!line) {
      result.initialize = {
        ok: false,
        error: stdoutRead.timeout
          ? serializeError(new Error("initialize stdout read timed out"))
          : serializeError(new Error("initialize stdout was empty")),
      };
      result.ok = false;
    } else {
      try {
        const message = JSON.parse(line);
        result.initialize = {
          ok: Boolean(message?.id === 1 && message?.result),
          line,
          agentInfo: message?.result?.agentInfo,
        };
        result.ok = Boolean(message?.id === 1 && message?.result);
      } catch (error) {
        result.initialize = {
          ok: false,
          line,
          error: serializeError(error),
        };
        result.ok = false;
      }
    }
    pushStage("initialize-read:done", {
      initialize: result.initialize,
    });
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
    pushStage("failed", { error: result.error });
  } finally {
    if (proc) {
      try {
        await Promise.race([
          proc.wait ? proc.wait() : Promise.resolve(null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
        ]);
      } catch {
        // ignore
      }
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      try {
        const waitResult = await Promise.race([
          proc.wait ? proc.wait() : Promise.resolve(null),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 1_000),
          ),
        ]);
        result.exitCode = extractSubprocessExitCode(proc, waitResult);
      } catch (error) {
        result.cleanupError = serializeError(error);
      }
      try {
        stderrText += await readMozillaPipeText(proc.stderr, 1_000);
      } catch {
        // ignore
      }
    }
    result.stdoutText = stdoutText;
    result.stderrText = stderrText;
    await writeRuntimeTextFile(stdoutFile, stdoutText);
    await writeRuntimeTextFile(stderrFile, stderrText);
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

function renderNodeBridgeSpikeScript() {
  return String.raw`#!/usr/bin/env node
const { spawn } = require("node:child_process");

const separator = process.argv.indexOf("--");
const targetArgv = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
if (targetArgv.length === 0) {
  console.error("[node-bridge] missing target command");
  process.exit(64);
}

const [command, ...args] = targetArgv;
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  windowsHide: true,
  stdio: ["pipe", "pipe", "pipe"],
});

let childExited = false;
let parentStdinEnded = false;
let firstInputSeen = false;
console.error("[node-bridge] bridge-ready " + JSON.stringify({ command, args, cwd: process.cwd() }));

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});
child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});
child.on("error", (error) => {
  console.error("[node-bridge] child-error " + (error && error.stack || error));
});
child.on("exit", (code, signal) => {
  childExited = true;
  console.error("[node-bridge] child-exit " + JSON.stringify({ code, signal, firstInputSeen, parentStdinEnded }));
  process.exit(typeof code === "number" ? code : 1);
});

process.stdin.on("data", (chunk) => {
  firstInputSeen = true;
  if (!child.stdin.destroyed) {
    child.stdin.write(chunk);
  }
});
process.stdin.on("end", () => {
  parentStdinEnded = true;
  if (!childExited && !child.stdin.destroyed) {
    child.stdin.end();
  }
});
process.stdin.on("error", (error) => {
  console.error("[node-bridge] stdin-error " + (error && error.stack || error));
});

process.on("SIGTERM", () => {
  if (!childExited) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(143), 500).unref();
});
`;
}

async function resolveParsedTargetLaunch(args: {
  backend: BackendInstance;
  env: Record<string, string>;
}) {
  const command = normalizeString(args.backend.command);
  const commandArgs = Array.isArray(args.backend.args)
    ? args.backend.args.map(String)
    : [];
  const resolution = await resolveRuntimeCommand(command, {
    pathValue: pickPathValue(args.env),
    pathSearch: null,
  });
  if (!resolution.available || !resolution.resolvedPath) {
    return {
      resolution,
      parsed: {
        ok: false,
        reason: "Command was not resolved",
      },
    };
  }
  const shimText = await readRuntimeTextFile(resolution.resolvedPath);
  const parsed = parseResolvedExeLaunchFromShim({
    command,
    commandArgs,
    resolvedPath: resolution.resolvedPath,
    shimText,
  });
  return { resolution, parsed };
}

async function runNodeBridgeSpikeProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const stdoutFile = joinPath(args.outputDir, "node-bridge-stdout.log");
  const stderrFile = joinPath(args.outputDir, "node-bridge-stderr.log");
  const bridgeScript = joinPath(
    args.outputDir,
    "acp-node-stdio-bridge-spike.cjs",
  );
  const result: Record<string, unknown> = {
    kind: "node-bridge-spike-probe",
    startedAt: new Date().toISOString(),
    bridgeScript,
    outputFiles: {
      stdout: stdoutFile,
      stderr: stderrFile,
    },
    stages: [],
  };
  const pushStage = (stage: string, details?: Record<string, unknown>) => {
    (result.stages as unknown[]).push({
      stage,
      ts: new Date().toISOString(),
      ...(details || {}),
    });
  };

  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    result.ok = false;
    result.skipped = "mozilla-subprocess-unavailable";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  let proc: Awaited<ReturnType<NonNullable<typeof subprocess.call>>> | null =
    null;
  let stdoutText = "";
  let stderrText = "";

  try {
    const env = buildSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    );
    pushStage("resolve-node:start");
    const nodeResolution = await resolveRuntimeCommand("node", {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    result.nodeResolution = {
      command: nodeResolution.command,
      available: nodeResolution.available,
      resolvedPath: nodeResolution.resolvedPath,
      source: nodeResolution.source,
      diagnostic: nodeResolution.diagnostic,
    };
    if (!nodeResolution.available || !nodeResolution.resolvedPath) {
      result.ok = false;
      result.skipped = "node-not-resolved";
      return result;
    }

    const target = await resolveParsedTargetLaunch({
      backend: args.backend,
      env,
    });
    result.targetResolution = {
      command: target.resolution.command,
      available: target.resolution.available,
      resolvedPath: target.resolution.resolvedPath,
      source: target.resolution.source,
      diagnostic: target.resolution.diagnostic,
    };
    result.parsedTargetLaunch = target.parsed;
    if (!target.parsed.ok || !("command" in target.parsed)) {
      result.ok = false;
      result.skipped = "target-parse-failed";
      return result;
    }
    const targetCommand = normalizeString(target.parsed.command);
    const targetArgs = Array.isArray(target.parsed.args)
      ? target.parsed.args.map(String)
      : [];
    if (!targetCommand) {
      result.ok = false;
      result.skipped = "target-command-empty";
      return result;
    }

    await writeRuntimeTextFile(bridgeScript, renderNodeBridgeSpikeScript());
    const bridgeArgs = [bridgeScript, "--", targetCommand, ...targetArgs];
    result.bridgeCommandLine = buildDiagnosticCommandLine(
      nodeResolution.resolvedPath,
      bridgeArgs,
    );
    pushStage("resolve:ok", {
      node: nodeResolution.resolvedPath,
      target: target.parsed,
    });

    pushStage("spawn:start");
    proc = await subprocess.call({
      command: nodeResolution.resolvedPath,
      arguments: bridgeArgs,
      environment: env,
      environmentAppend: true,
      workdir: args.workspaceDir,
    });
    pushStage("spawn:ok", {
      commandLine: result.bridgeCommandLine,
    });

    pushStage("initialize-write:start");
    await proc.stdin?.write?.(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: ACP_PROTOCOL_VERSION,
          clientCapabilities: {},
        },
      })}\n`,
    );
    pushStage("initialize-write:ok");

    const stdoutRead = await readMozillaPipeOnce(
      proc.stdout,
      ACP_REFRESH_DIAGNOSTIC_NODE_BRIDGE_TIMEOUT_MS,
    );
    stdoutText += stdoutRead.text;
    const line = stdoutText.split(/\r?\n/u).find((entry) => entry.trim());
    if (!line) {
      result.initialize = {
        ok: false,
        error: stdoutRead.timeout
          ? serializeError(new Error("initialize stdout read timed out"))
          : serializeError(new Error("initialize stdout was empty")),
      };
      result.ok = false;
    } else {
      try {
        const message = JSON.parse(line);
        result.initialize = {
          ok: Boolean(message?.id === 1 && message?.result),
          line,
          agentInfo: message?.result?.agentInfo,
        };
        result.ok = Boolean(message?.id === 1 && message?.result);
      } catch (error) {
        result.initialize = {
          ok: false,
          line,
          error: serializeError(error),
        };
        result.ok = false;
      }
    }
    pushStage("initialize-read:done", {
      initialize: result.initialize,
    });
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
    pushStage("failed", { error: result.error });
  } finally {
    if (proc) {
      try {
        stderrText += await readMozillaPipeText(proc.stderr, 1_000);
      } catch {
        // ignore
      }
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      try {
        const waitResult = await Promise.race([
          proc.wait ? proc.wait() : Promise.resolve(null),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 1_000),
          ),
        ]);
        result.exitCode = extractSubprocessExitCode(proc, waitResult);
      } catch (error) {
        result.cleanupError = serializeError(error);
      }
    }
    result.stdoutText = stdoutText;
    result.stderrText = stderrText;
    await writeRuntimeTextFile(stdoutFile, stdoutText);
    await writeRuntimeTextFile(stderrFile, stderrText);
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

function renderWebSocketBridgeSpikeScript() {
  return String.raw`#!/usr/bin/env node
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");

function takeFlag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return "";
  const value = process.argv[index + 1] || "";
  process.argv.splice(index, 2);
  return value;
}

const readyPath = takeFlag("--ready");
const stdoutPath = takeFlag("--stdout");
const stderrPath = takeFlag("--stderr");
const separator = process.argv.indexOf("--");
const targetArgv = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);

function writeJson(path, value) {
  if (!path) return;
  fs.writeFileSync(path, JSON.stringify(value, null, 2), "utf8");
}

function appendText(path, value) {
  if (!path) return;
  fs.appendFileSync(path, String(value), "utf8");
}

function appendChunk(path, chunk) {
  if (!path) return;
  fs.appendFileSync(path, chunk);
}

function failStartup(error) {
  writeJson(readyPath, {
    ok: false,
    error: error && error.stack || String(error),
    finishedAt: new Date().toISOString(),
  });
  process.exit(1);
}

if (targetArgv.length === 0) {
  failStartup(new Error("missing target command"));
}

const command = targetArgv[0];
const commandArgs = targetArgv.slice(1);
let childExited = false;

const child = spawn(command, commandArgs, {
  cwd: process.cwd(),
  env: process.env,
  windowsHide: true,
  stdio: ["pipe", "pipe", "pipe"],
});

const sockets = new Set();

function sendFrame(socket, data, opcode) {
  if (socket.destroyed) return;
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  const payloadLength = payload.length;
  let header;
  if (payloadLength < 126) {
    header = Buffer.from([0x80 | opcode, payloadLength]);
  } else if (payloadLength < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function sendText(socket, chunk) {
  sendFrame(socket, Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)), 1);
}

function parseClientFrames(socket, state) {
  while (state.frames.length >= 2) {
    const first = state.frames[0];
    const second = state.frames[1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (state.frames.length < offset + 2) return;
      length = state.frames.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (state.frames.length < offset + 8) return;
      const bigLength = state.frames.readBigUInt64BE(offset);
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        socket.destroy(new Error("WebSocket frame is too large"));
        return;
      }
      length = Number(bigLength);
      offset += 8;
    }
    let mask = null;
    if (masked) {
      if (state.frames.length < offset + 4) return;
      mask = state.frames.slice(offset, offset + 4);
      offset += 4;
    }
    if (state.frames.length < offset + length) return;
    let payload = state.frames.slice(offset, offset + length);
    state.frames = state.frames.slice(offset + length);
    if (mask) {
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }
    if (opcode === 8) {
      socket.end();
      return;
    }
    if (opcode === 9) {
      sendFrame(socket, payload, 10);
      continue;
    }
    if ((opcode === 1 || opcode === 2) && !childExited && !child.stdin.destroyed) {
      child.stdin.write(payload);
    }
  }
}

function acceptWebSocket(socket, state) {
  const text = state.handshake.toString("latin1");
  const match = text.match(/Sec-WebSocket-Key:\s*([^\r\n]+)/i);
  if (!match) {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    return false;
  }
  const accept = crypto
    .createHash("sha1")
    .update(match[1].trim() + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
  );
  sockets.add(socket);
  return true;
}

const server = net.createServer((socket) => {
  const state = {
    handshaken: false,
    handshake: Buffer.alloc(0),
    frames: Buffer.alloc(0),
  };
  socket.on("data", (chunk) => {
    if (!state.handshaken) {
      state.handshake = Buffer.concat([state.handshake, chunk]);
      const headerEnd = state.handshake.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const rest = state.handshake.slice(headerEnd + 4);
      state.handshake = state.handshake.slice(0, headerEnd + 4);
      state.handshaken = acceptWebSocket(socket, state);
      if (rest.length) {
        state.frames = Buffer.concat([state.frames, rest]);
        parseClientFrames(socket, state);
      }
      return;
    }
    state.frames = Buffer.concat([state.frames, chunk]);
    parseClientFrames(socket, state);
  });
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", (error) => {
    appendText(stderrPath, "[websocket-bridge] socket-error " + (error && error.stack || error) + "\n");
  });
});

child.stdout.on("data", (chunk) => {
  appendChunk(stdoutPath, chunk);
  for (const socket of sockets) {
    sendText(socket, chunk);
  }
});

child.stderr.on("data", (chunk) => {
  appendChunk(stderrPath, chunk);
});

child.on("error", (error) => {
  appendText(stderrPath, "[websocket-bridge] child-error " + (error && error.stack || error) + "\n");
});

child.on("exit", (code, signal) => {
  childExited = true;
  appendText(stderrPath, "[websocket-bridge] child-exit " + JSON.stringify({ code, signal }) + "\n");
  for (const socket of sockets) {
    try {
      sendFrame(socket, Buffer.alloc(0), 8);
      socket.end();
    } catch {}
  }
  server.close(() => process.exit(typeof code === "number" ? code : 1));
  setTimeout(() => process.exit(typeof code === "number" ? code : 1), 500).unref();
});

server.on("error", failStartup);
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  writeJson(readyPath, {
    ok: true,
    url: "ws://127.0.0.1:" + port + "/",
    pid: process.pid,
    childPid: child.pid,
    command,
    args: commandArgs,
    cwd: process.cwd(),
    startedAt: new Date().toISOString(),
  });
});

process.on("SIGTERM", () => {
  if (!childExited) {
    child.kill("SIGTERM");
  }
  server.close(() => process.exit(143));
  setTimeout(() => process.exit(143), 500).unref();
});
`;
}

async function runWebSocketBridgeSpikeProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const stdoutFile = joinPath(args.outputDir, "websocket-bridge-stdout.log");
  const stderrFile = joinPath(args.outputDir, "websocket-bridge-stderr.log");
  const readyFile = joinPath(args.outputDir, "websocket-bridge-ready.json");
  const bridgeScript = joinPath(
    args.outputDir,
    "acp-node-websocket-bridge-spike.cjs",
  );
  const result: Record<string, unknown> = {
    kind: "websocket-bridge-spike-probe",
    startedAt: new Date().toISOString(),
    bridgeScript,
    readyFile,
    outputFiles: {
      stdout: stdoutFile,
      stderr: stderrFile,
    },
    stages: [],
  };
  const pushStage = (stage: string, details?: Record<string, unknown>) => {
    (result.stages as unknown[]).push({
      stage,
      ts: new Date().toISOString(),
      ...(details || {}),
    });
  };

  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    result.ok = false;
    result.skipped = "mozilla-subprocess-unavailable";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  let proc: Awaited<ReturnType<NonNullable<typeof subprocess.call>>> | null =
    null;

  try {
    const env = buildSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    );
    pushStage("resolve-node:start");
    const nodeResolution = await resolveRuntimeCommand("node", {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    result.nodeResolution = {
      command: nodeResolution.command,
      available: nodeResolution.available,
      resolvedPath: nodeResolution.resolvedPath,
      source: nodeResolution.source,
      diagnostic: nodeResolution.diagnostic,
    };
    if (!nodeResolution.available || !nodeResolution.resolvedPath) {
      result.ok = false;
      result.skipped = "node-not-resolved";
      return result;
    }

    const target = await resolveParsedTargetLaunch({
      backend: args.backend,
      env,
    });
    result.targetResolution = {
      command: target.resolution.command,
      available: target.resolution.available,
      resolvedPath: target.resolution.resolvedPath,
      source: target.resolution.source,
      diagnostic: target.resolution.diagnostic,
    };
    result.parsedTargetLaunch = target.parsed;
    if (!target.parsed.ok || !("command" in target.parsed)) {
      result.ok = false;
      result.skipped = "target-parse-failed";
      return result;
    }
    const targetCommand = normalizeString(target.parsed.command);
    const targetArgs = Array.isArray(target.parsed.args)
      ? target.parsed.args.map(String)
      : [];
    if (!targetCommand) {
      result.ok = false;
      result.skipped = "target-command-empty";
      return result;
    }

    await writeRuntimeTextFile(
      bridgeScript,
      renderWebSocketBridgeSpikeScript(),
    );
    await writeRuntimeTextFile(stdoutFile, "");
    await writeRuntimeTextFile(stderrFile, "");
    await writeRuntimeTextFile(readyFile, "");
    const bridgeArgs = [
      bridgeScript,
      "--ready",
      readyFile,
      "--stdout",
      stdoutFile,
      "--stderr",
      stderrFile,
      "--",
      targetCommand,
      ...targetArgs,
    ];
    result.bridgeCommandLine = buildDiagnosticCommandLine(
      nodeResolution.resolvedPath,
      bridgeArgs,
    );
    pushStage("resolve:ok", {
      node: nodeResolution.resolvedPath,
      target: target.parsed,
    });

    pushStage("spawn:start");
    proc = await subprocess.call({
      command: nodeResolution.resolvedPath,
      arguments: bridgeArgs,
      environment: env,
      environmentAppend: true,
      workdir: args.workspaceDir,
    });
    pushStage("spawn:ok", {
      commandLine: result.bridgeCommandLine,
    });

    pushStage("wait-ready:start");
    const bridgeReady = await waitForRuntimeJsonFile({
      path: readyFile,
      label: "WebSocket bridge",
      timeoutMs: 5_000,
    });
    result.bridgeReady = bridgeReady;
    if (bridgeReady.ok !== true || !normalizeString(bridgeReady.url)) {
      result.ok = false;
      result.skipped = "bridge-not-ready";
      pushStage("wait-ready:failed", { ready: bridgeReady });
      return result;
    }
    const bridgeUrl = normalizeString(bridgeReady.url);
    result.bridgeUrl = bridgeUrl;
    pushStage("wait-ready:ok", { url: bridgeUrl });

    pushStage("initialize-websocket:start");
    const initialize = await requestInitializeOverWebSocket({
      url: bridgeUrl,
      timeoutMs: ACP_REFRESH_DIAGNOSTIC_WEBSOCKET_BRIDGE_TIMEOUT_MS,
    });
    result.initialize = initialize;
    result.ok = initialize.ok === true;
    pushStage("initialize-websocket:done", { initialize });
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
    pushStage("failed", { error: result.error });
  } finally {
    if (proc) {
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      try {
        const waitResult = await Promise.race([
          proc.wait ? proc.wait() : Promise.resolve(null),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 1_000),
          ),
        ]);
        result.exitCode = extractSubprocessExitCode(proc, waitResult);
      } catch (error) {
        result.cleanupError = serializeError(error);
      }
    }
    result.stdoutText = await readRuntimeTextFile(stdoutFile);
    result.stderrText = await readRuntimeTextFile(stderrFile);
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

function renderStdinMatrixEchoScript() {
  return String.raw`#!/usr/bin/env node
const fs = require("node:fs");

function takeFlag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return "";
  const value = process.argv[index + 1] || "";
  process.argv.splice(index, 2);
  return value;
}

const readyPath = takeFlag("--ready");
const inputPath = takeFlag("--input");
const outputPath = takeFlag("--output");
const stderrPath = takeFlag("--stderr");
const caseId = takeFlag("--case") || "case";

function writeJson(path, value) {
  if (!path) return;
  fs.writeFileSync(path, JSON.stringify(value, null, 2), "utf8");
}

function appendChunk(path, chunk) {
  if (!path) return;
  fs.appendFileSync(path, chunk);
}

function appendText(path, value) {
  if (!path) return;
  fs.appendFileSync(path, String(value), "utf8");
}

writeJson(readyPath, {
  ok: true,
  caseId,
  pid: process.pid,
  cwd: process.cwd(),
  startedAt: new Date().toISOString(),
  stdinIsTTY: Boolean(process.stdin.isTTY),
  stdoutIsTTY: Boolean(process.stdout.isTTY),
});
appendText(stderrPath, "[stdin-matrix] ready " + caseId + "\n");

process.stdin.on("data", (chunk) => {
  appendChunk(inputPath, chunk);
  const output = Buffer.concat([Buffer.from("echo:"), Buffer.from(chunk)]);
  appendChunk(outputPath, output);
  process.stdout.write(output);
  appendText(stderrPath, "[stdin-matrix] data " + caseId + " " + chunk.length + "\n");
});

process.stdin.on("end", () => {
  appendText(stderrPath, "[stdin-matrix] stdin-end " + caseId + "\n");
});

process.stdin.on("error", (error) => {
  appendText(stderrPath, "[stdin-matrix] stdin-error " + caseId + " " + (error && error.stack || error) + "\n");
});

process.on("SIGTERM", () => {
  appendText(stderrPath, "[stdin-matrix] sigterm " + caseId + "\n");
  process.exit(143);
});

setInterval(() => {}, 1000);
`;
}

type StdinCapabilityMatrixCase = {
  id: string;
  description: string;
  command: string;
  args: string[];
  workdir?: string;
  environment?: Record<string, string>;
  environmentAppend?: boolean;
  waitReady: boolean;
  writeDelayMs: number;
  payloadKind: "string" | "uint8array" | "arraybuffer";
  environmentMode: string;
};

function buildPowerShellCommandInvocation(command: string, args: string[]) {
  return [
    "&",
    quotePowerShellSingleQuoted(command),
    ...args.map(quotePowerShellSingleQuoted),
  ].join(" ");
}

async function runSingleStdinCapabilityCase(args: {
  probeCase: StdinCapabilityMatrixCase;
  readyFile: string;
  inputFile: string;
  outputFile: string;
  stderrFile: string;
}) {
  const probeCase = args.probeCase;
  const payload = `stdin-matrix:${probeCase.id}:${Date.now()}\n`;
  const result: Record<string, unknown> = {
    id: probeCase.id,
    description: probeCase.description,
    commandLine: buildDiagnosticCommandLine(probeCase.command, probeCase.args),
    waitReady: probeCase.waitReady,
    writeDelayMs: probeCase.writeDelayMs,
    payloadKind: probeCase.payloadKind,
    workdir: probeCase.workdir,
    environmentMode: probeCase.environmentMode,
    files: {
      ready: args.readyFile,
      input: args.inputFile,
      output: args.outputFile,
      stderr: args.stderrFile,
    },
  };
  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    throw new Error("mozilla subprocess unavailable");
  }
  let proc: Awaited<
    ReturnType<NonNullable<NonNullable<typeof subprocess>["call"]>>
  > | null = null;

  try {
    await writeRuntimeTextFile(args.readyFile, "");
    await writeRuntimeTextFile(args.inputFile, "");
    await writeRuntimeTextFile(args.outputFile, "");
    await writeRuntimeTextFile(args.stderrFile, "");

    const callArgs: {
      command: string;
      arguments: string[];
      environment?: Record<string, string>;
      environmentAppend?: boolean;
      workdir?: string;
    } = {
      command: probeCase.command,
      arguments: probeCase.args,
    };
    if (probeCase.environment) {
      callArgs.environment = probeCase.environment;
      callArgs.environmentAppend = probeCase.environmentAppend !== false;
    }
    if (probeCase.workdir) {
      callArgs.workdir = probeCase.workdir;
    }

    proc = await subprocess.call(callArgs);
    if (!proc) {
      throw new Error("mozilla subprocess call returned no process");
    }

    if (probeCase.waitReady) {
      result.ready = await waitForRuntimeJsonFile({
        path: args.readyFile,
        label: `stdin matrix ${probeCase.id}`,
        timeoutMs: ACP_REFRESH_DIAGNOSTIC_STDIN_MATRIX_TIMEOUT_MS,
      });
    }
    if (probeCase.writeDelayMs > 0) {
      await delay(probeCase.writeDelayMs);
    }

    const stdin = proc.stdin as
      | { write?: (data: unknown) => Promise<void> }
      | undefined;
    const encoded = encodeText(payload);
    const writePayload =
      probeCase.payloadKind === "uint8array"
        ? encoded
        : probeCase.payloadKind === "arraybuffer"
          ? encoded.buffer
          : payload;
    try {
      await stdin?.write?.(writePayload);
      result.write = { ok: true };
    } catch (error) {
      result.write = { ok: false, error: serializeError(error) };
    }

    if ((result.write as { ok?: unknown } | undefined)?.ok === true) {
      const stdoutRead = await readMozillaPipeOnce(
        proc.stdout,
        ACP_REFRESH_DIAGNOSTIC_STDIN_MATRIX_TIMEOUT_MS,
      );
      result.stdoutRead = stdoutRead;
      result.stdoutText = stdoutRead.text;
    }

    await delay(300);
    result.inputText = await readRuntimeTextFile(args.inputFile);
    result.outputText = await readRuntimeTextFile(args.outputFile);
    result.stderrText = await readRuntimeTextFile(args.stderrFile);
    result.inputReceived = String(result.inputText || "").includes(
      payload.trim(),
    );
    result.outputObserved =
      String(result.stdoutText || "").includes(payload.trim()) ||
      String(result.outputText || "").includes(payload.trim());
    result.ok =
      (result.write as { ok?: unknown } | undefined)?.ok === true &&
      result.inputReceived === true &&
      result.outputObserved === true;
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
  } finally {
    if (proc) {
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      try {
        const waitResult = await Promise.race([
          proc.wait ? proc.wait() : Promise.resolve(null),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 1_000),
          ),
        ]);
        result.exitCode = extractSubprocessExitCode(proc, waitResult);
      } catch (error) {
        result.cleanupError = serializeError(error);
      }
    }
    result.inputText =
      result.inputText || (await readRuntimeTextFile(args.inputFile));
    result.outputText =
      result.outputText || (await readRuntimeTextFile(args.outputFile));
    result.stderrText =
      result.stderrText || (await readRuntimeTextFile(args.stderrFile));
  }

  return result;
}

async function runStdinCapabilityMatrixProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const result: Record<string, unknown> = {
    kind: "stdin-capability-matrix-probe",
    startedAt: new Date().toISOString(),
    cases: [],
  };
  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    result.ok = false;
    result.skipped = "mozilla-subprocess-unavailable";
    result.finishedAt = new Date().toISOString();
    return result;
  }

  try {
    const env = buildSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    );
    const nodeResolution = await resolveRuntimeCommand("node", {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    result.nodeResolution = {
      command: nodeResolution.command,
      available: nodeResolution.available,
      resolvedPath: nodeResolution.resolvedPath,
      source: nodeResolution.source,
      diagnostic: nodeResolution.diagnostic,
    };
    if (!nodeResolution.available || !nodeResolution.resolvedPath) {
      result.ok = false;
      result.skipped = "node-not-resolved";
      return result;
    }

    const script = joinPath(args.outputDir, "stdin-capability-matrix-echo.cjs");
    result.script = script;
    await writeRuntimeTextFile(script, renderStdinMatrixEchoScript());

    const safeBackendId =
      normalizeString(args.backend.id).replace(/[^A-Za-z0-9_.-]+/g, "-") ||
      "backend";
    const asciiRoot = joinPath(
      env.TEMP || env.TMP || "C:\\Windows\\Temp",
      "zotero-agents-acp-stdin-matrix",
      safeBackendId,
    );
    await ensureRuntimeDirectory(asciiRoot);
    result.asciiWorkdir = asciiRoot;

    const baseScriptArgs = (caseId: string) => [
      script,
      "--ready",
      joinPath(args.outputDir, `stdin-matrix-${caseId}-ready.json`),
      "--input",
      joinPath(args.outputDir, `stdin-matrix-${caseId}-input.log`),
      "--output",
      joinPath(args.outputDir, `stdin-matrix-${caseId}-output.log`),
      "--stderr",
      joinPath(args.outputDir, `stdin-matrix-${caseId}-stderr.log`),
      "--case",
      caseId,
    ];
    const makeCase = (entry: {
      id: string;
      description: string;
      command: string;
      args: string[];
      workdir?: string;
      environment?: Record<string, string>;
      waitReady?: boolean;
      writeDelayMs?: number;
      payloadKind?: "string" | "uint8array" | "arraybuffer";
      environmentMode?: string;
    }): StdinCapabilityMatrixCase => ({
      id: entry.id,
      description: entry.description,
      command: entry.command,
      args: entry.args,
      workdir: entry.workdir,
      environment: entry.environment,
      environmentAppend: true,
      waitReady: entry.waitReady !== false,
      writeDelayMs: entry.writeDelayMs || 0,
      payloadKind: entry.payloadKind || "string",
      environmentMode: entry.environmentMode || "overlay",
    });

    const nodeCommand = nodeResolution.resolvedPath;
    const cmdCommand =
      env.ComSpec ||
      env.COMSPEC ||
      env.ComSpec ||
      "C:\\Windows\\System32\\cmd.exe";
    const powershellCommand =
      getPreferredWindowsShellCommandsFromRegistry()[0] || "powershell.exe";
    const cmdScriptArgs = baseScriptArgs("cmd-ready");
    const powershellScriptArgs = baseScriptArgs("powershell-ready");
    const cases = [
      makeCase({
        id: "node-immediate-string",
        description:
          "Direct node, immediate string write, hydrated env and current workspace",
        command: nodeCommand,
        args: baseScriptArgs("node-immediate-string"),
        workdir: args.workspaceDir,
        environment: env,
        waitReady: false,
        environmentMode: "overlay",
      }),
      makeCase({
        id: "node-ready-string",
        description: "Direct node, wait for ready file before string write",
        command: nodeCommand,
        args: baseScriptArgs("node-ready-string"),
        workdir: args.workspaceDir,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "overlay",
      }),
      makeCase({
        id: "node-ready-uint8array",
        description: "Direct node, wait ready, write Uint8Array payload",
        command: nodeCommand,
        args: baseScriptArgs("node-ready-uint8array"),
        workdir: args.workspaceDir,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        payloadKind: "uint8array",
        environmentMode: "overlay",
      }),
      makeCase({
        id: "node-ready-arraybuffer",
        description: "Direct node, wait ready, write ArrayBuffer payload",
        command: nodeCommand,
        args: baseScriptArgs("node-ready-arraybuffer"),
        workdir: args.workspaceDir,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        payloadKind: "arraybuffer",
        environmentMode: "overlay",
      }),
      makeCase({
        id: "node-ascii-workdir",
        description: "Direct node with ASCII workdir",
        command: nodeCommand,
        args: baseScriptArgs("node-ascii-workdir"),
        workdir: asciiRoot,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "overlay",
      }),
      makeCase({
        id: "node-no-env-overlay",
        description: "Direct node without explicit environment overlay",
        command: nodeCommand,
        args: baseScriptArgs("node-no-env-overlay"),
        workdir: args.workspaceDir,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "none",
      }),
      makeCase({
        id: "node-no-workdir",
        description: "Direct node without explicit workdir",
        command: nodeCommand,
        args: baseScriptArgs("node-no-workdir"),
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "overlay",
      }),
      makeCase({
        id: "cmd-ready",
        description: "cmd.exe wrapper around node echo script",
        command: cmdCommand,
        args: [
          "/d",
          "/s",
          "/c",
          buildDiagnosticCommandLine(nodeCommand, cmdScriptArgs),
        ],
        workdir: args.workspaceDir,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "overlay",
      }),
      makeCase({
        id: "powershell-ready",
        description: "PowerShell wrapper around node echo script",
        command: powershellCommand,
        args: [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          buildPowerShellCommandInvocation(nodeCommand, powershellScriptArgs),
        ],
        workdir: args.workspaceDir,
        environment: env,
        waitReady: true,
        writeDelayMs: 100,
        environmentMode: "overlay",
      }),
    ];

    const caseResults = [];
    for (const probeCase of cases) {
      const caseArgs = baseScriptArgs(probeCase.id);
      caseResults.push(
        await runSingleStdinCapabilityCase({
          probeCase,
          readyFile: caseArgs[caseArgs.indexOf("--ready") + 1],
          inputFile: caseArgs[caseArgs.indexOf("--input") + 1],
          outputFile: caseArgs[caseArgs.indexOf("--output") + 1],
          stderrFile: caseArgs[caseArgs.indexOf("--stderr") + 1],
        }),
      );
    }
    result.cases = caseResults;
    result.ok = caseResults.some((entry) => entry.ok === true);
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
  } finally {
    result.finishedAt = new Date().toISOString();
  }

  return result;
}

function listObjectKeysSafe(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }
  try {
    return Object.keys(value as Record<string, unknown>).sort();
  } catch {
    return [];
  }
}

function getZoteroInternalSubprocessForDiagnostic() {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: unknown;
        };
      };
    };
  };
  const subprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  return typeof subprocess === "function"
    ? (subprocess as (command: string, args?: string[]) => Promise<unknown>)
    : null;
}

async function runZoteroInternalSubprocessProbe(args: {
  nodeCommand: string;
  workspaceDir: string;
}) {
  const subprocess = getZoteroInternalSubprocessForDiagnostic();
  const result: Record<string, unknown> = {
    available: Boolean(subprocess),
  };
  if (!subprocess) {
    result.skipped = "Zotero.Utilities.Internal.subprocess unavailable";
    return result;
  }
  const script = [
    "console.log(JSON.stringify({",
    "ok:true,",
    "pid:process.pid,",
    "cwd:process.cwd(),",
    "argv:process.argv.slice(1),",
    "stdinIsTTY:Boolean(process.stdin.isTTY),",
    "stdoutIsTTY:Boolean(process.stdout.isTTY)",
    "}));",
  ].join("");
  try {
    const output = await withTimeout(
      "Zotero.Utilities.Internal.subprocess one-shot probe",
      subprocess(args.nodeCommand, [
        "-e",
        script,
        "zotero-internal-subprocess",
      ]),
      ACP_REFRESH_DIAGNOSTIC_STDIN_MATRIX_TIMEOUT_MS,
    );
    const text = String(output || "");
    result.ok = /"ok"\s*:\s*true/u.test(text);
    result.stdoutTail = tailText(text);
    result.parsed = parseJsonObjectOrNull(text);
  } catch (error) {
    result.ok = false;
    result.error = compactSerializedError(serializeError(error));
  }
  result.note =
    "This API is one-shot output capture; no writable stdin surface is exposed.";
  return result;
}

function getNsIProcessFactoriesForDiagnostic() {
  const runtime = globalThis as {
    Components?: {
      classes?: Record<
        string,
        { createInstance?: (iface: unknown) => unknown }
      >;
      interfaces?: Record<string, unknown>;
    };
    Cc?: Record<string, { createInstance?: (iface: unknown) => unknown }>;
    Ci?: Record<string, unknown>;
  };
  const classes = runtime.Components?.classes || runtime.Cc;
  const interfaces = runtime.Components?.interfaces || runtime.Ci;
  return {
    classes,
    interfaces,
    localFileFactory: classes?.["@mozilla.org/file/local;1"],
    processFactory: classes?.["@mozilla.org/process/util;1"],
    nsIFile: interfaces?.nsIFile,
    nsIProcess: interfaces?.nsIProcess,
  };
}

function renderNsIProcessNodeScript(outputFile: string) {
  return [
    "const fs=require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(outputFile)}, JSON.stringify({`,
    "ok:true,",
    "pid:process.pid,",
    "cwd:process.cwd(),",
    "argv:process.argv.slice(1),",
    "stdinIsTTY:Boolean(process.stdin.isTTY),",
    "stdoutIsTTY:Boolean(process.stdout.isTTY)",
    "}, null, 2), 'utf8');",
  ].join("");
}

async function runNsIProcessProbe(args: {
  nodeCommand: string;
  outputFile: string;
}) {
  const factories = getNsIProcessFactoriesForDiagnostic();
  const result: Record<string, unknown> = {
    available: Boolean(
      factories.localFileFactory?.createInstance &&
      factories.processFactory?.createInstance &&
      factories.nsIFile &&
      factories.nsIProcess,
    ),
    hasLocalFileFactory: Boolean(factories.localFileFactory?.createInstance),
    hasProcessFactory: Boolean(factories.processFactory?.createInstance),
    hasNsIFile: Boolean(factories.nsIFile),
    hasNsIProcess: Boolean(factories.nsIProcess),
    outputFile: args.outputFile,
  };
  if (!result.available) {
    result.skipped = "XPCOM nsIProcess APIs unavailable";
    return result;
  }
  try {
    await writeRuntimeTextFile(args.outputFile, "");
    const executable = factories.localFileFactory?.createInstance?.(
      factories.nsIFile,
    ) as
      | {
          initWithPath?: (path: string) => void;
        }
      | undefined;
    executable?.initWithPath?.(args.nodeCommand);
    const proc = factories.processFactory?.createInstance?.(
      factories.nsIProcess,
    ) as
      | {
          init?: (file: unknown) => void;
          runwAsync?: (
            args: string[],
            count: number,
            observer: unknown,
          ) => void;
          runAsync?: (args: string[], count: number, observer: unknown) => void;
          runw?: (blocking: boolean, args: string[], count: number) => void;
          run?: (blocking: boolean, args: string[], count: number) => void;
          startHidden?: boolean;
          noShell?: boolean;
          exitValue?: number;
        }
      | undefined;
    result.processSurface = {
      keys: listObjectKeysSafe(proc),
      hasRunwAsync: typeof proc?.runwAsync === "function",
      hasRunAsync: typeof proc?.runAsync === "function",
      hasRunw: typeof proc?.runw === "function",
      hasRun: typeof proc?.run === "function",
      hasStdin: "stdin" in ((proc || {}) as Record<string, unknown>),
      hasStdout: "stdout" in ((proc || {}) as Record<string, unknown>),
      hasStderr: "stderr" in ((proc || {}) as Record<string, unknown>),
      hasWrite:
        typeof (proc as unknown as { write?: unknown } | undefined)?.write ===
        "function",
    };
    if (!executable?.initWithPath || !proc?.init) {
      throw new Error("nsIProcess executable/init surface unavailable");
    }
    proc.init(executable);
    try {
      proc.startHidden = true;
    } catch {
      // ignore
    }
    try {
      proc.noShell = true;
    } catch {
      // ignore
    }
    const argv = [
      "-e",
      renderNsIProcessNodeScript(args.outputFile),
      "nsi-process-probe",
    ];
    const runAsync =
      typeof proc.runwAsync === "function"
        ? proc.runwAsync.bind(proc)
        : typeof proc.runAsync === "function"
          ? proc.runAsync.bind(proc)
          : null;
    if (!runAsync) {
      throw new Error("nsIProcess async execution is unavailable");
    }
    await withTimeout(
      "nsIProcess one-shot probe",
      new Promise<void>((resolve, reject) => {
        try {
          runAsync(argv, argv.length, {
            observe: (_subject: unknown, topic: string) => {
              if (topic === "process-finished" || topic === "process-failed") {
                resolve();
                return;
              }
              reject(new Error(`unexpected nsIProcess topic: ${topic}`));
            },
          });
        } catch (error) {
          reject(error);
        }
      }),
      ACP_REFRESH_DIAGNOSTIC_STDIN_MATRIX_TIMEOUT_MS,
    );
    result.exitCode =
      typeof proc.exitValue === "number" && Number.isFinite(proc.exitValue)
        ? Math.floor(proc.exitValue)
        : null;
    const outputText = await readRuntimeTextFile(args.outputFile);
    result.outputTail = tailText(outputText);
    result.parsed = parseJsonObjectOrNull(outputText);
    result.ok =
      result.exitCode === 0 &&
      Boolean((result.parsed as Record<string, unknown> | null)?.ok);
  } catch (error) {
    result.ok = false;
    result.error = compactSerializedError(serializeError(error));
    result.outputTail = tailText(await readRuntimeTextFile(args.outputFile));
  }
  result.note =
    "nsIProcess can launch a process, but this surface does not expose async stdin/stdout pipes.";
  return result;
}

function probeProcessUtilsForDiagnostic() {
  const result: Record<string, unknown> = {
    candidates: [],
  };
  const runtime = globalThis as {
    ChromeUtils?: {
      importESModule?: (specifier: string) => unknown;
      import?: (specifier: string) => unknown;
    };
  };
  const candidates = [
    "resource://gre/modules/ProcessUtils.sys.mjs",
    "resource://gre/modules/ProcessUtils.jsm",
  ];
  for (const specifier of candidates) {
    const entry: Record<string, unknown> = { specifier };
    try {
      const imported =
        specifier.endsWith(".sys.mjs") &&
        typeof runtime.ChromeUtils?.importESModule === "function"
          ? runtime.ChromeUtils.importESModule(specifier)
          : typeof runtime.ChromeUtils?.import === "function"
            ? runtime.ChromeUtils.import(specifier)
            : null;
      entry.ok = Boolean(imported);
      entry.keys = listObjectKeysSafe(imported);
    } catch (error) {
      entry.ok = false;
      entry.error = compactSerializedError(serializeError(error));
    }
    (result.candidates as unknown[]).push(entry);
  }
  result.ok = (result.candidates as Array<{ ok?: unknown }>).some(
    (entry) => entry.ok === true,
  );
  result.note =
    "ProcessUtils, when present, is not a documented bidirectional stdio transport for ACP.";
  return result;
}

async function runAlternativeSubprocessProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const result: Record<string, unknown> = {
    kind: "alternative-subprocess-probe",
    startedAt: new Date().toISOString(),
  };
  try {
    const env = buildSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    );
    const nodeResolution = await resolveRuntimeCommand("node", {
      pathValue: pickPathValue(env),
      pathSearch: null,
    });
    result.nodeResolution = {
      command: nodeResolution.command,
      available: nodeResolution.available,
      resolvedPath: nodeResolution.resolvedPath,
      source: nodeResolution.source,
      diagnostic: nodeResolution.diagnostic,
    };
    if (!nodeResolution.available || !nodeResolution.resolvedPath) {
      result.ok = false;
      result.skipped = "node-not-resolved";
      return result;
    }
    result.zoteroInternalSubprocess = await runZoteroInternalSubprocessProbe({
      nodeCommand: nodeResolution.resolvedPath,
      workspaceDir: args.workspaceDir,
    });
    result.nsIProcess = await runNsIProcessProbe({
      nodeCommand: nodeResolution.resolvedPath,
      outputFile: joinPath(
        args.outputDir,
        "alternative-nsiprocess-output.json",
      ),
    });
    result.processUtils = probeProcessUtilsForDiagnostic();
    result.ok = Boolean(
      (result.zoteroInternalSubprocess as { ok?: unknown }).ok === true ||
      (result.nsIProcess as { ok?: unknown }).ok === true,
    );
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
  } finally {
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

async function runRawAcpTransportProbe(args: {
  backend: BackendInstance;
  workspaceDir: string;
  outputDir: string;
}) {
  const stdoutFile = joinPath(args.outputDir, "raw-transport-stdout.log");
  const stderrFile = joinPath(args.outputDir, "raw-transport-stderr.log");
  const auditRuntimeDir = joinPath(args.outputDir, ".acp");
  const auditFiles = resolveAcpSkillRunAuditTrailFiles(auditRuntimeDir);
  const detailedAuditEnabled = shouldWriteDetailedAcpAuditArtifacts();
  let stdoutCaptureText = "";
  let stderrCaptureText = "";
  const result: Record<string, unknown> = {
    kind: "raw-acp-transport-probe",
    startedAt: new Date().toISOString(),
    outputFiles: {
      stdout: stdoutFile,
      stderr: stderrFile,
      bridge: auditFiles.bridge,
      transport: auditFiles.transport,
    },
    environmentSummary: summarizeSubprocessEnvironment(
      normalizeStringMap(args.backend.env),
    ),
    stages: [],
  };
  const pushStage = (stage: string, details?: Record<string, unknown>) => {
    (result.stages as unknown[]).push({
      stage,
      ts: new Date().toISOString(),
      ...(details || {}),
    });
  };
  let transport: Awaited<ReturnType<typeof launchAcpTransport>> | null = null;
  let writer: {
    write: (chunk: Uint8Array) => Promise<void>;
    releaseLock: () => void;
  } | null = null;

  try {
    pushStage("spawn:start");
    transport = await launchAcpTransport({
      backend: args.backend,
      cwd: args.workspaceDir,
      diagnosticCapture: {
        captureStdout: true,
        ...(detailedAuditEnabled
          ? {
              bridgeAuditFile: auditFiles.bridge,
              onAuditEvent: (event) =>
                appendAcpSkillRunTransportAuditEvent({
                  requestId:
                    normalizeString(args.backend.id) || "raw-acp-probe",
                  runtimeDir: auditRuntimeDir,
                  event,
                }),
            }
          : {}),
        onStdoutChunk: (chunk) => {
          stdoutCaptureText += chunk;
        },
        onStderrChunk: (chunk) => {
          stderrCaptureText += chunk;
        },
      },
    });
    result.commandLabel = transport.getCommandLabel();
    result.commandLine = transport.getCommandLine();
    result.launch = {
      commandLabel: transport.getCommandLabel(),
      commandLine: transport.getCommandLine(),
    };
    result.lifecycleAfterSpawn = transport.getLifecycle();
    pushStage("spawn:ok", {
      commandLabel: transport.getCommandLabel(),
      commandLine: transport.getCommandLine(),
    });

    const exitedAfterSpawn = await transport.waitForExit(
      ACP_REFRESH_DIAGNOSTIC_RAW_POST_SPAWN_MS,
    );
    result.exitedAfterSpawn = exitedAfterSpawn;
    result.lifecycleAfterPostSpawnWait = transport.getLifecycle();
    if (exitedAfterSpawn) {
      pushStage("post-spawn-exit", {
        lifecycle: transport.getLifecycle(),
        stdoutText: transport.getStdoutText(),
        stderrText: transport.getStderrText(),
      });
      result.ok = false;
      return result;
    }

    pushStage("initialize-write:start");
    writer = transport.stdin.getWriter();
    try {
      await writer.write(
        encodeText(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: ACP_PROTOCOL_VERSION,
              clientCapabilities: {},
            },
          })}\n`,
        ),
      );
      result.initializeWrite = { ok: true };
      pushStage("initialize-write:ok");
    } catch (error) {
      result.initializeWrite = {
        ok: false,
        error: serializeError(error),
      };
      pushStage("initialize-write:failed", {
        error: result.initializeWrite,
      });
      await transport.waitForExit(ACP_REFRESH_DIAGNOSTIC_RAW_EXIT_GRACE_MS);
      result.lifecycleAfterInitializeWriteFailure = transport.getLifecycle();
      result.stdoutAfterInitializeWriteFailure = transport.getStdoutText();
      result.stderrAfterInitializeWriteFailure = transport.getStderrText();
      result.ok = false;
      return result;
    } finally {
      try {
        writer?.releaseLock();
      } catch {
        // ignore
      }
    }

    const exitedAfterInitialize = await transport.waitForExit(
      ACP_REFRESH_DIAGNOSTIC_RAW_EXIT_GRACE_MS,
    );
    result.exitedAfterInitializeWrite = exitedAfterInitialize;
    result.lifecycleAfterInitializeWrite = transport.getLifecycle();
    result.stdoutAfterInitializeWrite = transport.getStdoutText();
    result.stderrAfterInitializeWrite = transport.getStderrText();
    result.ok = true;
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
    pushStage("failed", { error: result.error });
  } finally {
    if (transport) {
      result.lifecycleBeforeCleanup = transport.getLifecycle();
      result.stdoutBeforeCleanup = transport.getStdoutText();
      result.stderrBeforeCleanup = transport.getStderrText();
      try {
        const exitedBeforeKill = await transport.waitForExit(
          ACP_REFRESH_DIAGNOSTIC_RAW_EXIT_GRACE_MS,
        );
        result.exitedBeforeCleanupKill = exitedBeforeKill;
        if (!exitedBeforeKill) {
          await transport.close({ graceMs: 0, kill: true });
        }
        result.lifecycleAfterCleanup = transport.getLifecycle();
      } catch (error) {
        result.cleanupError = serializeError(error);
      }
    }
    try {
      await writeRuntimeTextFile(stdoutFile, stdoutCaptureText);
      await writeRuntimeTextFile(stderrFile, stderrCaptureText);
      result.outputFileTails = {
        stdoutTail: tailText(stdoutCaptureText),
        stderrTail: tailText(stderrCaptureText),
        stdoutChars: stdoutCaptureText.length,
        stderrChars: stderrCaptureText.length,
      };
    } catch (error) {
      result.outputFileWriteError = compactSerializedError(
        serializeError(error),
      );
    }
    result.finishedAt = new Date().toISOString();
  }
  return result;
}

async function runSingleBackendDiagnostic(args: {
  backend: BackendInstance;
  reportProgress?: DiagnosticProgressReporter;
  progressBase: number;
  progressStep: number;
}) {
  const backend = args.backend;
  const startedAt = new Date().toISOString();
  const fingerprint = computeAcpBackendConfigFingerprint(backend);
  const dirs = buildProbeDirectories(backend);
  const auditRuntimeDir = joinPath(dirs.runtimeDir, ".acp");
  const auditFiles = resolveAcpSkillRunAuditTrailFiles(auditRuntimeDir);
  const detailedAuditEnabled = shouldWriteDetailedAcpAuditArtifacts();
  const diagnostics: unknown[] = [];
  const closeEvents: unknown[] = [];
  const result: Record<string, unknown> = {
    backendId: backend.id,
    displayName: backend.displayName,
    command: backend.command,
    args: backend.args || [],
    envKeys: Object.keys(normalizeStringMap(backend.env)).sort(),
    environmentSummary: summarizeSubprocessEnvironment(
      normalizeStringMap(backend.env),
    ),
    configFingerprint: fingerprint,
    auditFiles,
    startedAt,
    directories: dirs,
    stages: [],
  };
  let adapter: Awaited<ReturnType<typeof createAcpConnectionAdapter>> | null =
    null;

  const pushStage = (stage: string, details?: Record<string, unknown>) => {
    (result.stages as unknown[]).push({
      stage,
      ts: new Date().toISOString(),
      ...(details || {}),
    });
  };
  const reportStep = (stepIndex: number, text: string) => {
    args.reportProgress?.({
      text,
      progress: args.progressBase + args.progressStep * stepIndex,
    });
  };

  try {
    result.commandResolution = await summarizeBackendCommandResolution(backend);

    reportStep(
      0,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-directories",
        "Preparing ACP diagnostic workspace...",
      ),
    );
    pushStage("ensure-runtime-directories:start");
    await ensureRuntimeDirectory(dirs.root);
    await ensureRuntimeDirectory(dirs.workspaceDir);
    await ensureRuntimeDirectory(dirs.runtimeDir);
    pushStage("ensure-runtime-directories:ok");

    reportStep(
      1,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-file-capture-probe",
        "Capturing ACP backend process output to files...",
      ),
    );
    pushStage("file-capture-probe:start");
    result.fileCaptureProbe = await runPowerShellFileCaptureProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("file-capture-probe:ok", {
      ok:
        typeof result.fileCaptureProbe === "object" &&
        result.fileCaptureProbe !== null
          ? (result.fileCaptureProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      2,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-resolved-exe-probe",
        "Probing ACP backend through resolved executable...",
      ),
    );
    pushStage("resolved-exe-probe:start");
    result.resolvedExeProbe = await runResolvedExeSpikeProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("resolved-exe-probe:ok", {
      ok:
        typeof result.resolvedExeProbe === "object" &&
        result.resolvedExeProbe !== null
          ? (result.resolvedExeProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      3,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-node-bridge-probe",
        "Probing ACP backend through Node stdio bridge...",
      ),
    );
    pushStage("node-bridge-probe:start");
    result.nodeBridgeProbe = await runNodeBridgeSpikeProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("node-bridge-probe:ok", {
      ok:
        typeof result.nodeBridgeProbe === "object" &&
        result.nodeBridgeProbe !== null
          ? (result.nodeBridgeProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      4,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-websocket-bridge-probe",
        "Probing ACP backend through WebSocket bridge...",
      ),
    );
    pushStage("websocket-bridge-probe:start");
    result.webSocketBridgeProbe = await runWebSocketBridgeSpikeProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("websocket-bridge-probe:ok", {
      ok:
        typeof result.webSocketBridgeProbe === "object" &&
        result.webSocketBridgeProbe !== null
          ? (result.webSocketBridgeProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      5,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-stdin-matrix-probe",
        "Probing Mozilla subprocess stdin capability...",
      ),
    );
    pushStage("stdin-capability-matrix-probe:start");
    result.stdinCapabilityMatrixProbe = await runStdinCapabilityMatrixProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("stdin-capability-matrix-probe:ok", {
      ok:
        typeof result.stdinCapabilityMatrixProbe === "object" &&
        result.stdinCapabilityMatrixProbe !== null
          ? (result.stdinCapabilityMatrixProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      6,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-alternative-subprocess-probe",
        "Probing alternative Zotero subprocess APIs...",
      ),
    );
    pushStage("alternative-subprocess-probe:start");
    result.alternativeSubprocessProbe = await runAlternativeSubprocessProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("alternative-subprocess-probe:ok", {
      ok:
        typeof result.alternativeSubprocessProbe === "object" &&
        result.alternativeSubprocessProbe !== null
          ? (result.alternativeSubprocessProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      7,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-raw-probe",
        "Probing raw ACP backend process...",
      ),
    );
    pushStage("raw-transport-probe:start");
    result.rawTransportProbe = await runRawAcpTransportProbe({
      backend,
      workspaceDir: dirs.workspaceDir,
      outputDir: dirs.runtimeDir,
    });
    pushStage("raw-transport-probe:ok", {
      ok:
        typeof result.rawTransportProbe === "object" &&
        result.rawTransportProbe !== null
          ? (result.rawTransportProbe as { ok?: unknown }).ok
          : undefined,
    });

    reportStep(
      8,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-adapter",
        "Creating ACP diagnostic connection...",
      ),
    );
    pushStage("create-adapter:start");
    adapter = await createAcpConnectionAdapter({
      backend,
      agentWorkspaceDir: dirs.workspaceDir,
      sessionCwd: dirs.workspaceDir,
      workspaceDir: dirs.workspaceDir,
      runtimeDir: dirs.runtimeDir,
      diagnosticCapture: detailedAuditEnabled
        ? {
            bridgeAuditFile: auditFiles.bridge,
            onAuditEvent: (event) =>
              appendAcpSkillRunTransportAuditEvent({
                requestId:
                  normalizeString(backend.id) || "acp-refresh-diagnostic",
                runtimeDir: auditRuntimeDir,
                event,
              }),
          }
        : undefined,
    });
    adapter.onDiagnostics((entry) => {
      diagnostics.push(entry);
    });
    adapter.onClose((entry) => {
      closeEvents.push(entry);
    });
    pushStage("create-adapter:ok");

    reportStep(
      9,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-initialize",
        "Initializing ACP backend...",
      ),
    );
    pushStage("initialize:start");
    const initialize = await withTimeout(
      "ACP initialize",
      adapter.initialize(),
    );
    result.initialize = initialize;
    pushStage("initialize:ok", {
      commandLabel: initialize.commandLabel,
      commandLine: initialize.commandLine,
    });

    reportStep(
      10,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-session",
        "Creating ACP diagnostic session...",
      ),
    );
    pushStage("session-new:start");
    const session = await withTimeout("ACP session/new", adapter.newSession());
    result.session = {
      sessionId: session.sessionId,
      sessionTitle: session.sessionTitle,
      sessionUpdatedAt: session.sessionUpdatedAt,
      configOptions: Array.isArray(session.configOptions)
        ? session.configOptions.length
        : 0,
      modes: session.modes || null,
      models: session.models
        ? {
            availableModels: Array.isArray(session.models.availableModels)
              ? session.models.availableModels.length
              : 0,
            currentModelId: normalizeString(session.models.currentModelId),
          }
        : null,
    };
    const cache = buildAcpRuntimeOptionsCache({
      configOptions: session.configOptions,
      modes: session.modes,
      models: session.models,
      refreshedAt: new Date().toISOString(),
    });
    result.runtimeOptionsCacheSummary = summarizeAcpRuntimeOptionsCache(cache);
    pushStage("session-new:ok");

    result.ok = true;
  } catch (error) {
    result.ok = false;
    result.error = serializeError(error);
    if (adapter?.waitForTransportExit) {
      const exited = await adapter.waitForTransportExit(
        ACP_REFRESH_DIAGNOSTIC_RAW_EXIT_GRACE_MS,
      );
      result.adapterTransportExitedBeforeCleanup = exited;
    }
    result.adapterTransportSnapshotBeforeCleanup =
      adapter?.getTransportSnapshot?.() || null;
    pushStage("failed", { error: result.error });
  } finally {
    result.runtimeLogsTail = listRuntimeLogs({
      backendId: backend.id,
      component: "acp-backend-probe",
      order: "desc",
      limit: 20,
    });
    if (adapter) {
      pushStage("adapter-close:start");
      try {
        await adapter.close();
        pushStage("adapter-close:ok");
      } catch (error) {
        pushStage("adapter-close:failed", { error: serializeError(error) });
      }
    }
    result.diagnostics = diagnostics;
    result.closeEvents = closeEvents;
    result.finishedAt = new Date().toISOString();
    reportStep(
      ACP_REFRESH_DIAGNOSTIC_STEPS_PER_BACKEND,
      getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-backend-done",
        "ACP backend diagnostic finished.",
      ),
    );
  }

  return result;
}

export async function runAcpBackendRefreshCacheDiagnostic(
  args: {
    reportProgress?: DiagnosticProgressReporter;
  } = {},
) {
  const startedAt = new Date().toISOString();
  const loaded = await loadBackendsRegistry();
  const runtimeEnvironmentSnapshot = getRuntimeEnvironmentSnapshot();
  const acpBackends = loaded.backends.filter(
    (backend) => normalizeString(backend.type) === ACP_BACKEND_TYPE,
  );
  const results = [];
  const totalSteps = Math.max(
    acpBackends.length * ACP_REFRESH_DIAGNOSTIC_STEPS_PER_BACKEND,
    1,
  );
  for (const [index, backend] of acpBackends.entries()) {
    const backendLabel =
      normalizeString(backend.displayName) || normalizeString(backend.id);
    args.reportProgress?.({
      text: getStringOrFallback(
        "acp-refresh-cache-diagnostic-stage-backend-start",
        `Diagnosing ACP backend: ${backendLabel}`,
        { args: { backend: backendLabel } },
      ),
      progress:
        (index * ACP_REFRESH_DIAGNOSTIC_STEPS_PER_BACKEND * 100) / totalSteps,
    });
    results.push(
      await runSingleBackendDiagnostic({
        backend,
        reportProgress: args.reportProgress,
        progressBase:
          (index * ACP_REFRESH_DIAGNOSTIC_STEPS_PER_BACKEND * 100) / totalSteps,
        progressStep: 100 / totalSteps,
      }),
    );
  }
  const output = {
    ok: results.every((entry) => entry.ok === true),
    probeKind: "acp-backend-refresh-cache-diagnostic",
    startedAt,
    finishedAt: new Date().toISOString(),
    backendCount: acpBackends.length,
    registry: {
      warnings: loaded.warnings,
      errors: loaded.errors,
      fatalError: loaded.fatalError,
      invalidBackends: loaded.invalidBackends,
    },
    runtimeCommandRegistry: compactCommandRegistrySnapshot(
      getRuntimeCommandRegistrySnapshot(),
    ),
    runtimeEnvironment: {
      initialized: runtimeEnvironmentSnapshot.initialized,
      initializedAt: runtimeEnvironmentSnapshot.initializedAt,
      platform: runtimeEnvironmentSnapshot.platform,
      source: runtimeEnvironmentSnapshot.source,
      pathKey: runtimeEnvironmentSnapshot.pathKey,
      pathEntryCount: runtimeEnvironmentSnapshot.pathEntryCount,
      error: runtimeEnvironmentSnapshot.error,
      diagnostics: runtimeEnvironmentSnapshot.diagnostics || [],
    },
    results: results.map(compactBackendDiagnosticResult),
  };
  const text = JSON.stringify(output, null, 2);
  copyTextToClipboard(text);
  return output;
}

export function registerAcpBackendRefreshCacheDiagnosticMenu() {
  if (!isDebugModeEnabled()) {
    return;
  }
  const menu = getRuntimeToolkit()?.Menu;
  if (!menu?.register) {
    return;
  }
  menu.register("item", {
    tag: "menuitem",
    id: `${config.addonRef}-diagnose-acp-refresh-cache`,
    label: getStringOrFallback(
      "menuitem-diagnose-acp-refresh-cache",
      "Diagnose ACP Runtime Options Refresh",
    ),
    commandListener: () => {
      void (async () => {
        const progressToast = createDiagnosticProgressToast({
          text: getStringOrFallback(
            "acp-refresh-cache-diagnostic-running",
            "Running ACP refresh diagnostic...",
          ),
          progress: 0,
          type: "default",
        });
        try {
          const output = await runAcpBackendRefreshCacheDiagnostic({
            reportProgress: progressToast.update,
          });
          progressToast.update({
            text: getStringOrFallback(
              "acp-refresh-cache-diagnostic-copied",
              "ACP refresh diagnostic copied to clipboard.",
              { args: { count: output.backendCount } },
            ),
            progress: 100,
            type: output.ok ? "success" : "default",
          });
          progressToast.close();
        } catch (error) {
          const serialized = {
            ok: false,
            probeKind: "acp-backend-refresh-cache-diagnostic",
            error: serializeError(error),
          };
          copyTextToClipboard(JSON.stringify(serialized, null, 2));
          progressToast.update({
            text: `${config.addonName} ACP diagnostic failed: ${
              serializeError(error).message
            }`,
            progress: 100,
            type: "default",
          });
          progressToast.close();
        }
      })();
    },
  });
}
