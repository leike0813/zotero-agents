import {
  readRuntimeTextFile,
  runtimePathExists,
} from "../modules/runtimePersistence";
import { getWindowsPowerShellAbsoluteCandidates } from "../modules/windowsCommandResolution";
import {
  getMozillaSubprocessModule,
  runtimeRemoveFile,
} from "../utils/runtimeCompatibility";
import { getPathDelimiter } from "./path";
import { detectRuntimePlatform } from "./runtimePlatform";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

type EnvironmentSource = "current-process" | "windows-login" | "fallback";

export type RuntimeEnvironmentSnapshot = {
  initialized: boolean;
  initializedAt?: string;
  platform: string;
  source: EnvironmentSource;
  env: Record<string, string>;
  pathKey: "PATH" | "Path";
  pathEntryCount: number;
  error?: string;
  diagnostics?: RuntimeEnvironmentDiagnostic[];
};

type RuntimeEnvironmentPreflightOptions = {
  platform?: string;
  currentEnv?: Record<string, string | undefined>;
  powershellCommands?: string[];
  powershellRunner?: (command: string, args: string[]) => Promise<string>;
  now?: () => string;
};

export type RuntimeEnvironmentDiagnostic = {
  stage: "windows-login-env";
  command: string;
  ok: boolean;
  exitCode?: number;
  stdoutTail?: string;
  stderrTail?: string;
  error?: string;
};

const WINDOWS_ENV_KEYS = [
  "APPDATA",
  "LOCALAPPDATA",
  "LocalAppData",
  "ProgramData",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "COMSPEC",
  "PATHEXT",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
];

const NODE_ENV_KEYS = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "NPM_CONFIG_PREFIX",
  "npm_config_prefix",
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
];

const ACP_AGENT_ENV_KEYS = [
  "OPENCODE_CONFIG_DIR",
  "CODEX_HOME",
  "CLAUDE_CONFIG_DIR",
  "GEMINI_CLI_HOME",
  "HERMES_HOME",
  "QODER_CONFIG_DIR",
];

const AUTH_ENV_KEYS = [
  "GITHUB_TOKEN",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENROUTER_API_KEY",
  "XAI_API_KEY",
];

const KNOWN_ENV_KEYS = Array.from(
  new Set([
    "PATH",
    "Path",
    "path",
    "HOME",
    ...WINDOWS_ENV_KEYS,
    ...NODE_ENV_KEYS,
    ...ACP_AGENT_ENV_KEYS,
    ...AUTH_ENV_KEYS,
  ]),
);

const DIAGNOSTIC_ENV_VALUE_KEYS = [
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
  ...AUTH_ENV_KEYS,
];

let environmentSnapshot: RuntimeEnvironmentSnapshot = {
  initialized: false,
  platform: detectRuntimePlatform(),
  source: "current-process",
  env: {},
  pathKey: "PATH",
  pathEntryCount: 0,
};

function normalizeEnvRecord(value: unknown) {
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

function getRecordValueCaseInsensitive(
  record: Record<string, string | undefined>,
  key: string,
) {
  const direct = normalizeString(record[key]);
  if (direct) {
    return direct;
  }
  const lower = key.toLowerCase();
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if (entryKey.toLowerCase() === lower) {
      return normalizeString(entryValue);
    }
  }
  return "";
}

export function readRuntimeEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const processValue = normalizeString(runtime.process?.env?.[name]);
  if (processValue) {
    return processValue;
  }
  try {
    return normalizeString(runtime.Services?.env?.get?.(name));
  } catch {
    return "";
  }
}

export function readRuntimePathEnv() {
  return (
    readRuntimeEnv("PATH") || readRuntimeEnv("Path") || readRuntimeEnv("path")
  );
}

function readCurrentEnvRecord(currentEnv?: Record<string, string | undefined>) {
  if (currentEnv) {
    return normalizeEnvRecord(currentEnv);
  }
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const processEnv = runtime.process?.env;
  if (processEnv && Object.keys(processEnv).length > 0) {
    return normalizeEnvRecord(processEnv);
  }
  return Object.fromEntries(
    KNOWN_ENV_KEYS.map((key) => [key, readRuntimeEnv(key)] as const).filter(
      ([, value]) => value,
    ),
  );
}

export function splitPathEntries(
  pathValue: string | undefined,
  pathHint?: string,
) {
  return String(pathValue || "")
    .split(getPathDelimiter(pathHint || pathValue))
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

export function mergePathEntries(
  pathValue: string | undefined,
  entriesRaw: Array<string | undefined>,
  pathHint?: string,
) {
  const delimiter = getPathDelimiter(pathHint || pathValue);
  const parts = splitPathEntries(pathValue, pathHint);
  for (const entry of entriesRaw
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .reverse()) {
    if (parts.some((part) => part.toLowerCase() === entry.toLowerCase())) {
      continue;
    }
    parts.unshift(entry);
  }
  return parts.join(delimiter);
}

export function prependPathEntry(pathValue: string | undefined, entry: string) {
  return mergePathEntries(pathValue, [entry], entry);
}

function mergePathValuesInOrder(
  values: Array<string | undefined>,
  pathHint?: string,
) {
  const delimiter = getPathDelimiter(
    pathHint || values.find((value) => normalizeString(value)) || "",
  );
  const entries: string[] = [];
  for (const value of values) {
    for (const entry of splitPathEntries(value, pathHint || value)) {
      if (
        entries.some(
          (existing) => existing.toLowerCase() === entry.toLowerCase(),
        )
      ) {
        continue;
      }
      entries.push(entry);
    }
  }
  return entries.join(delimiter);
}

function isWhitelistedEnvKey(keyRaw: string) {
  const key = normalizeString(keyRaw);
  if (!key) {
    return false;
  }
  if (
    KNOWN_ENV_KEYS.some((entry) => entry.toLowerCase() === key.toLowerCase())
  ) {
    return true;
  }
  return /(_API_KEY|_ACCESS_TOKEN|_AUTH_TOKEN)$/i.test(key);
}

function pickWhitelistedEnv(
  sources: Array<Record<string, string>>,
  platform: string,
) {
  const isWindows = platform === "win32";
  const output: Record<string, string> = {};
  const hasKey = (key: string) =>
    Object.keys(output).some((entry) =>
      isWindows ? entry.toLowerCase() === key.toLowerCase() : entry === key,
    );
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (!isWhitelistedEnvKey(key) || !value || hasKey(key)) {
        continue;
      }
      output[key] = value;
    }
  }
  return output;
}

function resolveWindowsHomeEnv(record: Record<string, string>) {
  return (
    getRecordValueCaseInsensitive(record, "HOME") ||
    getRecordValueCaseInsensitive(record, "USERPROFILE") ||
    joinWindowsPath(
      getRecordValueCaseInsensitive(record, "HOMEDRIVE"),
      getRecordValueCaseInsensitive(record, "HOMEPATH"),
    )
  );
}

function buildSnapshotFromSources(args: {
  platform: string;
  source: EnvironmentSource;
  currentEnv: Record<string, string>;
  machineEnv?: Record<string, string>;
  userEnv?: Record<string, string>;
  error?: string;
  now?: () => string;
}) {
  const isWindows = args.platform === "win32";
  const pathKey = isWindows ? "Path" : "PATH";
  const currentPath =
    getRecordValueCaseInsensitive(args.currentEnv, "PATH") ||
    getRecordValueCaseInsensitive(args.currentEnv, "Path") ||
    getRecordValueCaseInsensitive(args.currentEnv, "path");
  const machinePath =
    getRecordValueCaseInsensitive(args.machineEnv || {}, "PATH") ||
    getRecordValueCaseInsensitive(args.machineEnv || {}, "Path");
  const userPath =
    getRecordValueCaseInsensitive(args.userEnv || {}, "PATH") ||
    getRecordValueCaseInsensitive(args.userEnv || {}, "Path");
  const syntheticPathEntries =
    args.platform === "win32"
      ? buildWindowsSyntheticPathEntries(args.currentEnv)
      : [];
  const mergedPath = mergePathValuesInOrder(
    [currentPath, machinePath, userPath, syntheticPathEntries.join(";")],
    isWindows ? "C:\\Windows;C:\\Users" : "/usr/bin:/bin",
  );
  const env = pickWhitelistedEnv(
    [args.currentEnv, args.machineEnv || {}, args.userEnv || {}],
    args.platform,
  );
  if (isWindows && !getRecordValueCaseInsensitive(env, "HOME")) {
    const home = resolveWindowsHomeEnv(env);
    if (home) {
      env.HOME = home;
    }
  }
  if (mergedPath) {
    delete env.PATH;
    delete env.Path;
    delete env.path;
    env[pathKey] = mergedPath;
  }
  return {
    initialized: true,
    initializedAt: (args.now || (() => new Date().toISOString()))(),
    platform: args.platform,
    source: args.source,
    env,
    pathKey,
    pathEntryCount: splitPathEntries(mergedPath, mergedPath).length,
    ...(args.error ? { error: args.error } : {}),
  } satisfies RuntimeEnvironmentSnapshot;
}

function joinWindowsPath(...segments: string[]) {
  const parts = segments
    .map((entry) => normalizeString(entry))
    .filter(Boolean)
    .flatMap((entry) => entry.split(/[\\/]+/))
    .filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  const first = parts[0];
  const drive = first.match(/^([A-Za-z]:)$/)?.[1] || "";
  if (drive) {
    return `${drive}\\${parts.slice(1).join("\\")}`;
  }
  return parts.join("\\");
}

function getRuntimeTempRoot(currentEnv: Record<string, string>) {
  return (
    getRecordValueCaseInsensitive(currentEnv, "TEMP") ||
    getRecordValueCaseInsensitive(currentEnv, "TMP") ||
    joinWindowsPath(
      getRecordValueCaseInsensitive(currentEnv, "LOCALAPPDATA"),
      "Temp",
    ) ||
    joinWindowsPath(
      getRecordValueCaseInsensitive(currentEnv, "USERPROFILE"),
      "AppData",
      "Local",
      "Temp",
    ) ||
    "C:\\Windows\\Temp"
  );
}

function buildWindowsLoginEnvironmentOutputPath(
  currentEnv: Record<string, string>,
  now?: () => string,
) {
  const timestamp = normalizeString(now?.()) || new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[^A-Za-z0-9_.-]+/g, "-");
  const random = Math.random().toString(36).slice(2, 10);
  return joinWindowsPath(
    getRuntimeTempRoot(currentEnv),
    `zotero-agents-env-${safeTimestamp}-${random}.json`,
  );
}

function buildWindowsSyntheticPathEntries(currentEnv: Record<string, string>) {
  const home =
    getRecordValueCaseInsensitive(currentEnv, "USERPROFILE") ||
    joinWindowsPath(
      getRecordValueCaseInsensitive(currentEnv, "HOMEDRIVE"),
      getRecordValueCaseInsensitive(currentEnv, "HOMEPATH"),
    );
  const appData =
    getRecordValueCaseInsensitive(currentEnv, "APPDATA") ||
    (home ? joinWindowsPath(home, "AppData", "Roaming") : "");
  const localAppData =
    getRecordValueCaseInsensitive(currentEnv, "LOCALAPPDATA") ||
    getRecordValueCaseInsensitive(currentEnv, "LocalAppData") ||
    (home ? joinWindowsPath(home, "AppData", "Local") : "");
  return [
    home ? joinWindowsPath(home, ".local", "bin") : "",
    appData ? joinWindowsPath(appData, "npm") : "",
    localAppData ? joinWindowsPath(localAppData, "npm") : "",
    localAppData
      ? joinWindowsPath(localAppData, "Microsoft", "WindowsApps")
      : "",
  ].filter(Boolean);
}

function getCurrentEnvironmentSnapshot(
  options: RuntimeEnvironmentPreflightOptions = {},
  source: EnvironmentSource = "current-process",
  error?: string,
) {
  const platform = normalizeString(options.platform) || detectRuntimePlatform();
  return buildSnapshotFromSources({
    platform,
    source,
    currentEnv: readCurrentEnvRecord(options.currentEnv),
    error,
    now: options.now,
  });
}

function getWindowsLoginEnvironmentScript(outputPath: string) {
  const exactKeys = JSON.stringify(KNOWN_ENV_KEYS);
  return [
    `$exactKeys = ${quotePowerShellSingleQuoted(exactKeys)} | ConvertFrom-Json`,
    `$outputPath = ${quotePowerShellSingleQuoted(outputPath)}`,
    "function Convert-EnvDict($scope) {",
    "  $dict = [Environment]::GetEnvironmentVariables($scope);",
    "  $obj = @{};",
    "  foreach ($key in $dict.Keys) {",
    "    $keyText = [string]$key;",
    "    $include = $false;",
    "    foreach ($exactKey in $exactKeys) {",
    "      if ([string]::Equals($keyText, [string]$exactKey, [StringComparison]::OrdinalIgnoreCase)) { $include = $true; break }",
    "    }",
    "    if (-not $include -and $keyText -match '(_API_KEY|_ACCESS_TOKEN|_AUTH_TOKEN)$') { $include = $true }",
    "    if ($include) { $obj[$keyText] = [string]$dict[$key] }",
    "  }",
    "  return $obj;",
    "}",
    "[pscustomobject]@{",
    "  Machine = Convert-EnvDict 'Machine';",
    "  User = Convert-EnvDict 'User';",
    "} | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath $outputPath -Encoding UTF8",
  ].join("\n");
}

function encodeUtf16LeBase64(value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i];
    const second = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const third = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (first << 16) | (second << 8) | third;
    output += alphabet[(triple >> 18) & 0x3f];
    output += alphabet[(triple >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : "=";
    output += i + 2 < bytes.length ? alphabet[triple & 0x3f] : "=";
  }
  return output;
}

function quotePowerShellSingleQuoted(value: string) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function textTail(value: string, maxLength = 4000) {
  const text = String(value || "");
  return text.length > maxLength ? text.slice(-maxLength) : text;
}

function redactDiagnosticText(value: string) {
  return String(value || "")
    .replace(
      /("([^"]*(?:TOKEN|KEY|PASSWORD|SECRET)[^"]*)"\s*:\s*)"[^"]*"/gi,
      '$1"<redacted>"',
    )
    .replace(
      /((?:[A-Z0-9_]*(?:TOKEN|KEY|PASSWORD|SECRET)[A-Z0-9_]*)=)[^\s;&|]+/gi,
      "$1<redacted>",
    );
}

function diagnosticTail(value: string) {
  return textTail(redactDiagnosticText(value));
}

function isSensitiveEnvKey(keyRaw: string) {
  return /TOKEN|KEY|PASSWORD|SECRET/i.test(normalizeString(keyRaw));
}

function summarizeEnvValues(record: Record<string, string | undefined>) {
  const output: Record<string, string> = {};
  for (const key of DIAGNOSTIC_ENV_VALUE_KEYS) {
    const value = getRecordValueCaseInsensitive(record, key);
    if (!value) {
      continue;
    }
    output[key] = isSensitiveEnvKey(key) ? "<redacted>" : value;
  }
  return output;
}

async function drainSubprocessPipe(pipe: unknown) {
  const reader = pipe as
    | {
        readString?: () => Promise<string>;
      }
    | null
    | undefined;
  if (typeof reader?.readString !== "function") {
    return "";
  }
  let combined = "";
  for (;;) {
    const chunk = await reader.readString();
    if (!chunk) {
      break;
    }
    combined += String(chunk);
  }
  return combined;
}

async function removeRuntimeFileIfExists(path: string) {
  if (!path || !(await runtimePathExists(path))) {
    return;
  }
  try {
    await runtimeRemoveFile(path);
  } catch {
    // Best-effort cleanup only. The file path is unique per preflight attempt.
  }
}

function extractSubprocessExitCode(proc: {
  exitCode?: unknown;
  exitValue?: unknown;
}) {
  const direct =
    typeof proc.exitCode === "number"
      ? proc.exitCode
      : typeof proc.exitValue === "number"
        ? proc.exitValue
        : null;
  return typeof direct === "number" && Number.isFinite(direct)
    ? Number(direct)
    : 0;
}

function extractWaitExitCode(waited: unknown) {
  if (typeof waited === "number" && Number.isFinite(waited)) {
    return Number(waited);
  }
  if (!waited || typeof waited !== "object") {
    return null;
  }
  const record = waited as Record<string, unknown>;
  for (const key of ["exitCode", "exitValue", "code", "status"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Number(value);
    }
  }
  return null;
}

async function runPowerShellForOutput(
  runner: RuntimeEnvironmentPreflightOptions["powershellRunner"],
  command: string,
  args: string[],
  outputPath: string,
) {
  if (runner) {
    return {
      stdout: await runner(command, args),
      stderr: "",
      exitCode: 0,
      outputText: "",
    };
  }
  const subprocess = getMozillaSubprocessModule();
  if (typeof subprocess?.call === "function") {
    const proc = await subprocess.call({
      command,
      arguments: args,
      environmentAppend: true,
    });
    let waited: unknown = 0;
    let waitError: unknown = null;
    try {
      waited = await proc.wait?.();
    } catch (error) {
      waitError = error;
    }
    const stdout = await drainSubprocessPipe(proc.stdout);
    const stderr = await drainSubprocessPipe(proc.stderr);
    const exitCode =
      extractWaitExitCode(waited) ?? extractSubprocessExitCode(proc);
    const outputText = await readRuntimeTextFile(outputPath);
    if (waitError) {
      throw new Error(
        [
          `PowerShell environment preflight wait failed: ${waitError instanceof Error ? waitError.message : String(waitError)}`,
          normalizeString(stderr) ? `stderr: ${diagnosticTail(stderr)}` : "",
          normalizeString(stdout) ? `stdout: ${diagnosticTail(stdout)}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
    return {
      stdout,
      stderr,
      exitCode: Number(exitCode),
      outputText,
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
  const internalSubprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof internalSubprocess === "function") {
    return {
      stdout: await internalSubprocess(command, args),
      stderr: "",
      exitCode: 0,
      outputText: "",
    };
  }
  throw new Error("No subprocess API is available for environment preflight");
}

async function readWindowsLoginEnvironment(
  options: RuntimeEnvironmentPreflightOptions,
) {
  const currentEnv = readCurrentEnvRecord(options.currentEnv);
  const args = [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
  ];
  const resolvedCandidates = (options.powershellCommands || [])
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
  const candidates = Array.from(
    new Set(
      resolvedCandidates.length > 0
        ? resolvedCandidates
        : [
            ...getWindowsPowerShellAbsoluteCandidates("win32"),
            "powershell.exe",
            "powershell",
          ],
    ),
  );
  let lastError = "";
  const errors: string[] = [];
  const diagnostics: RuntimeEnvironmentDiagnostic[] = [];
  for (const command of candidates) {
    const outputPath = buildWindowsLoginEnvironmentOutputPath(
      currentEnv,
      options.now,
    );
    const encodedScript = encodeUtf16LeBase64(
      getWindowsLoginEnvironmentScript(outputPath),
    );
    try {
      const output = await runPowerShellForOutput(
        options.powershellRunner,
        command,
        [...args, encodedScript],
        outputPath,
      );
      const outputText = normalizeString(output.outputText);
      const stdout = normalizeString(outputText || output.stdout);
      const stderr = normalizeString(output.stderr);
      const exitCode = Number(output.exitCode);
      if (exitCode !== 0) {
        diagnostics.push({
          stage: "windows-login-env",
          command,
          ok: false,
          exitCode,
          stdoutTail: diagnosticTail(stdout),
          stderrTail: diagnosticTail(stderr),
          error:
            diagnosticTail(stderr) ||
            `PowerShell environment preflight exited with ${exitCode}`,
        });
        throw new Error(
          diagnosticTail(stderr) ||
            `PowerShell environment preflight exited with ${exitCode}`,
        );
      }
      if (!stdout) {
        diagnostics.push({
          stage: "windows-login-env",
          command,
          ok: false,
          exitCode,
          stdoutTail: "",
          stderrTail: diagnosticTail(stderr),
          error:
            diagnosticTail(stderr) ||
            "PowerShell environment preflight was empty",
        });
        throw new Error(
          diagnosticTail(stderr) ||
            "PowerShell environment preflight was empty",
        );
      }
      let parsed: { Machine?: unknown; User?: unknown };
      try {
        parsed = JSON.parse(stdout);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        diagnostics.push({
          stage: "windows-login-env",
          command,
          ok: false,
          exitCode,
          stdoutTail: diagnosticTail(stdout),
          stderrTail: diagnosticTail(stderr),
          error: `PowerShell environment preflight returned invalid JSON: ${message}`,
        });
        throw new Error(
          `PowerShell environment preflight returned invalid JSON: ${message}`,
        );
      }
      diagnostics.push({
        stage: "windows-login-env",
        command,
        ok: true,
        exitCode,
        stdoutTail: diagnosticTail(stdout),
        stderrTail: diagnosticTail(stderr),
      });
      return {
        machineEnv: normalizeEnvRecord(parsed?.Machine),
        userEnv: normalizeEnvRecord(parsed?.User),
        diagnostics,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      errors.push(`${command}: ${lastError}`);
      if (!diagnostics.some((entry) => entry.command === command)) {
        diagnostics.push({
          stage: "windows-login-env",
          command,
          ok: false,
          error: lastError,
        });
      }
    } finally {
      await removeRuntimeFileIfExists(outputPath);
    }
  }
  const failure = new Error(
    errors.join(" | ") ||
      lastError ||
      "Windows login environment preflight failed",
  ) as Error & { diagnostics?: RuntimeEnvironmentDiagnostic[] };
  failure.diagnostics = diagnostics;
  throw failure;
}

export async function preflightRuntimeEnvironmentOnStartup(
  options: RuntimeEnvironmentPreflightOptions = {},
) {
  const platform = normalizeString(options.platform) || detectRuntimePlatform();
  if (platform !== "win32") {
    environmentSnapshot = getCurrentEnvironmentSnapshot(options);
    return getRuntimeEnvironmentSnapshot();
  }
  try {
    const currentEnv = readCurrentEnvRecord(options.currentEnv);
    const login = await readWindowsLoginEnvironment({ ...options, platform });
    environmentSnapshot = buildSnapshotFromSources({
      platform,
      source: "windows-login",
      currentEnv,
      machineEnv: login.machineEnv,
      userEnv: login.userEnv,
      now: options.now,
    });
    environmentSnapshot.diagnostics = login.diagnostics;
  } catch (error) {
    environmentSnapshot = getCurrentEnvironmentSnapshot(
      { ...options, platform },
      "fallback",
      error instanceof Error ? error.message : String(error),
    );
    environmentSnapshot.diagnostics =
      error && typeof error === "object" && "diagnostics" in error
        ? [
            ...(((error as { diagnostics?: RuntimeEnvironmentDiagnostic[] })
              .diagnostics || []) as RuntimeEnvironmentDiagnostic[]),
          ]
        : undefined;
  }
  return getRuntimeEnvironmentSnapshot();
}

function findEnvironmentKey(
  record: Record<string, string>,
  key: string,
  caseInsensitive: boolean,
) {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return key;
  }
  if (!caseInsensitive) {
    return "";
  }
  const lower = key.toLowerCase();
  return (
    Object.keys(record).find((entry) => entry.toLowerCase() === lower) || ""
  );
}

function cloneEnvironmentSnapshot(value: RuntimeEnvironmentSnapshot) {
  return {
    ...value,
    env: { ...value.env },
    diagnostics: value.diagnostics
      ? value.diagnostics.map((entry) => ({ ...entry }))
      : undefined,
  } satisfies RuntimeEnvironmentSnapshot;
}

export function getRuntimeEnvironmentSnapshot() {
  return cloneEnvironmentSnapshot(environmentSnapshot);
}

export function buildSubprocessEnvironment(
  overrides: Record<string, string> = {},
) {
  const snapshot = environmentSnapshot.initialized
    ? environmentSnapshot
    : getCurrentEnvironmentSnapshot();
  const isWindows = snapshot.platform === "win32";
  const output: Record<string, string> = {};
  const normalizedOverrides = normalizeEnvRecord(overrides);
  for (const [key, value] of Object.entries(snapshot.env)) {
    if (findEnvironmentKey(normalizedOverrides, key, isWindows)) {
      continue;
    }
    output[key] = value;
  }
  for (const [key, value] of Object.entries(normalizedOverrides)) {
    const existing = findEnvironmentKey(output, key, isWindows);
    if (existing && existing !== key) {
      delete output[existing];
    }
    output[key] = value;
  }
  return output;
}

export function summarizeSubprocessEnvironment(
  overrides: Record<string, string> = {},
) {
  const env = buildSubprocessEnvironment(overrides);
  const snapshot = getRuntimeEnvironmentSnapshot();
  const isWindows = snapshot.platform === "win32";
  const normalizedOverrides = normalizeEnvRecord(overrides);
  const explicitKeys = Object.keys(normalizedOverrides).sort();
  const injectedKeys = Object.keys(env)
    .filter((key) => !findEnvironmentKey(normalizedOverrides, key, isWindows))
    .sort();
  const pathValue =
    getRecordValueCaseInsensitive(env, "PATH") ||
    getRecordValueCaseInsensitive(env, "Path");
  const pathEntries = splitPathEntries(pathValue, pathValue);
  return {
    snapshotInitialized: snapshot.initialized,
    snapshotSource: snapshot.source,
    snapshotError: snapshot.error,
    platform: snapshot.platform,
    pathKey: snapshot.pathKey,
    pathValue,
    pathEntries,
    pathEntryCount: pathEntries.length,
    injectedKeys,
    explicitKeys,
    selectedValues: summarizeEnvValues(env),
    snapshotSelectedValues: summarizeEnvValues(snapshot.env),
    explicitValues: summarizeEnvValues(normalizedOverrides),
  };
}

export function seedRuntimeEnvironmentSnapshotForTests(
  snapshot: RuntimeEnvironmentSnapshot,
) {
  environmentSnapshot = cloneEnvironmentSnapshot(snapshot);
}

export function resetRuntimeEnvironmentSnapshotForTests() {
  environmentSnapshot = {
    initialized: false,
    platform: detectRuntimePlatform(),
    source: "current-process",
    env: {},
    pathKey: "PATH",
    pathEntryCount: 0,
  };
}
