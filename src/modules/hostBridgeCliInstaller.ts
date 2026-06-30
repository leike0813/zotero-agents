import { joinPath } from "../utils/path";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  readRuntimeBytes,
  runtimePathExists,
  setRuntimeExecutablePermissions,
  type RuntimeWriteBytesOptions,
  writeRuntimeBytes,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { readPackagedBinaryAsset } from "./packagedAssetResolver";
import { getMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import { getWindowsPowerShellAbsoluteCandidates } from "./windowsCommandResolution";
import {
  readRuntimeEnv,
  readRuntimePathEnv,
  splitPathEntries,
} from "../platform/env";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import {
  resolveHostBridgeCliBinary,
  resolveHostBridgeCliPlatform,
  type HostBridgeCliResolution,
} from "./hostBridgeCliResolver";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type HostBridgeCliInstallResult =
  | {
      ok: true;
      stage: "host-bridge-cli-install";
      message: string;
      sourcePath: string;
      targetPath: string;
      targetDir: string;
      pathAlreadyConfigured: boolean;
      pathUpdated: boolean;
      terminalRestartRequired: boolean;
      changed: boolean;
      sourceSha256: string;
      targetSha256: string;
      permissionFixed: boolean;
    }
  | {
      ok: false;
      stage: "host-bridge-cli-install";
      code:
        | "cli_binary_unavailable"
        | "cli_install_failed"
        | "cli_install_target_busy"
        | "cli_permission_update_failed"
        | "cli_path_update_declined"
        | "cli_path_update_unavailable";
      message: string;
      details?: Record<string, unknown>;
    };

export type HostBridgeCliInstallerDeps = {
  resolveCli?: () => Promise<HostBridgeCliResolution>;
  copyFile?: (sourcePath: string, targetPath: string) => Promise<void>;
  readFile?: (path: string) => Promise<Uint8Array>;
  writeFile?: (
    targetPath: string,
    bytes: Uint8Array,
    options?: RuntimeWriteBytesOptions,
  ) => Promise<void>;
  writeTextFile?: (targetPath: string, content: string) => Promise<void>;
  chmodExecutable?: (targetPath: string) => Promise<void | boolean>;
  pathExists?: (targetPath: string) => Promise<boolean>;
  hashBytes?: (bytes: Uint8Array) => Promise<string>;
  pathIncludes?: (dir: string) => boolean;
  setWindowsUserPath?: (dir: string) => Promise<boolean>;
  confirmAddToPath?: (dir: string) => Promise<boolean> | boolean;
  platform?: () => "win32" | "darwin" | "linux" | string;
  homeDir?: () => string;
  localAppDataDir?: () => string;
  pathEnv?: () => string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function dirname(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function joinForInstallPlatform(platform: string, ...segments: string[]) {
  const filtered = segments
    .map((segment) => normalizeString(segment))
    .filter(Boolean);
  const separator = platform === "win32" ? "\\" : "/";
  if (filtered.length === 0) {
    return "";
  }
  const first = filtered[0];
  const absolutePrefix =
    platform === "win32"
      ? first.match(/^[A-Za-z]:[\\/]?/)?.[0]?.replace(/[\\/]?$/, separator) ||
        ""
      : first.startsWith("/")
        ? separator
        : "";
  const normalized = filtered
    .flatMap((segment) => segment.split(/[\\/]+/))
    .filter(Boolean);
  if (
    absolutePrefix &&
    platform === "win32" &&
    normalized[0]?.toLowerCase() === absolutePrefix.slice(0, 2).toLowerCase()
  ) {
    normalized.shift();
  }
  if (absolutePrefix === separator && normalized[0] === "") {
    normalized.shift();
  }
  return `${absolutePrefix}${normalized.join(separator)}`;
}

function formatPortablePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function formatShellPath(path: string) {
  return formatPortablePath(path).replace(/"/g, '\\"');
}

function buildWindowsShellShim(binaryPath: string) {
  return `#!/usr/bin/env sh\nexec "${formatShellPath(binaryPath)}" "$@"\n`;
}

function resolveWindowsShellShimPath(target: {
  platform: string;
  targetDir: string;
}) {
  if (target.platform !== "win32") {
    return "";
  }
  return joinForInstallPlatform(
    target.platform,
    target.targetDir,
    "zotero-bridge",
  );
}

function resolvePlatform() {
  return detectRuntimePlatform();
}

function resolveArch() {
  const runtime = globalThis as {
    process?: { arch?: string };
  };
  return normalizeString(runtime.process?.arch) || "x64";
}

function readEnv(name: string) {
  return readRuntimeEnv(name);
}

function resolveHomeDir() {
  return (
    readEnv("HOME") ||
    readEnv("USERPROFILE") ||
    readEnv("HOMEDRIVE") + readEnv("HOMEPATH")
  );
}

function resolveLocalAppDataDir() {
  return (
    readEnv("LOCALAPPDATA") || joinPath(resolveHomeDir(), "AppData", "Local")
  );
}

function resolvePathEnv() {
  return readEnv("PATH");
}

function packagedCliRelativePath() {
  const platform = resolveHostBridgeCliPlatform({
    platform: resolvePlatform(),
    arch: resolveArch(),
  });
  return `bin/${platform.dir}/${platform.binary}`;
}

export function resolveHostBridgeCliInstallTarget(
  deps: Pick<
    HostBridgeCliInstallerDeps,
    "platform" | "homeDir" | "localAppDataDir" | "pathEnv"
  > = {},
) {
  const platform = deps.platform?.() || resolvePlatform();
  const home = normalizeString(deps.homeDir?.() || resolveHomeDir());
  if (platform === "win32") {
    const root = normalizeString(
      deps.localAppDataDir?.() || resolveLocalAppDataDir(),
    );
    const targetDir = joinForInstallPlatform(
      platform,
      root,
      "zotero-agents",
      "bin",
    );
    return {
      platform,
      targetDir,
      targetPath: joinForInstallPlatform(
        platform,
        targetDir,
        "zotero-bridge.exe",
      ),
    };
  }
  if (platform === "darwin") {
    const targetDir = resolvePreferredPosixInstallDir({
      platform,
      home,
      pathEnv: deps.pathEnv ? deps.pathEnv() : resolvePathEnv(),
      candidates: ["bin", ".local/bin", "/usr/local/bin", "/opt/homebrew/bin"],
    });
    return {
      platform,
      targetDir,
      targetPath: joinForInstallPlatform(platform, targetDir, "zotero-bridge"),
    };
  }
  const targetDir = resolvePreferredPosixInstallDir({
    platform,
    home,
    pathEnv: deps.pathEnv ? deps.pathEnv() : resolvePathEnv(),
    candidates: [".local/bin", "bin", "/usr/local/bin"],
  });
  return {
    platform,
    targetDir,
    targetPath: joinForInstallPlatform(platform, targetDir, "zotero-bridge"),
  };
}

function resolvePreferredPosixInstallDir(args: {
  platform: string;
  home: string;
  pathEnv: string;
  candidates: string[];
}) {
  const resolvedCandidates = args.candidates.map((candidate) =>
    candidate.startsWith("/")
      ? joinForInstallPlatform(args.platform, candidate)
      : joinForInstallPlatform(args.platform, args.home, candidate),
  );
  const pathEntries = new Set(
    splitPathEntries(args.pathEnv)
      .map((entry) => formatPortablePath(entry).replace(/\/+$/, ""))
      .filter(Boolean),
  );
  return (
    resolvedCandidates.find((candidate) =>
      pathEntries.has(formatPortablePath(candidate).replace(/\/+$/, "")),
    ) || resolvedCandidates[0]
  );
}

function defaultPathIncludes(dirRaw: string) {
  const dir = normalizeString(dirRaw).toLowerCase();
  if (!dir) {
    return false;
  }
  return splitPathEntries(readRuntimePathEnv(), dirRaw)
    .map((entry) => normalizeString(entry).toLowerCase())
    .some((entry) => entry === dir);
}

function quotePowerShellSingle(value: string) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function buildWindowsUserPathUpdateScript(dirRaw: string) {
  const dir = normalizeString(dirRaw);
  const literal = quotePowerShellSingle(dir);
  return [
    "$ErrorActionPreference='Stop'",
    `$dir=${literal}`,
    "$current=[Environment]::GetEnvironmentVariable('Path','User')",
    "$entries=if([string]::IsNullOrWhiteSpace($current)){@()}else{$current -split ';'}",
    "$exists=$false",
    "foreach($entry in $entries){if($entry.TrimEnd('\\') -ieq $dir.TrimEnd('\\')){$exists=$true;break}}",
    "if(-not $exists){$next=(@($entries|Where-Object{$_ -and $_.Trim()})+$dir)-join ';';[Environment]::SetEnvironmentVariable('Path',$next,'User');Write-Output 'updated'}else{Write-Output 'present'}",
  ].join("; ");
}

function getPowerShellCandidates() {
  return Array.from(
    new Set(
      [
        ...getWindowsPowerShellAbsoluteCandidates("win32"),
        "powershell.exe",
        "pwsh.exe",
        "pwsh",
        "powershell",
      ]
        .map(normalizeString)
        .filter(Boolean),
    ),
  );
}

function buildPowerShellArgs(script: string) {
  return [
    "-NoLogo",
    "-NonInteractive",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ];
}

async function runWithZoteroSubprocess(command: string, argv: string[]) {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
  };
  const subprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof subprocess !== "function") {
    return false;
  }
  await subprocess(command, argv);
  return true;
}

async function readPipeText(pipe: unknown) {
  const reader = pipe as
    | {
        readString?: () => Promise<string>;
      }
    | null
    | undefined;
  if (typeof reader?.readString !== "function") {
    return "";
  }
  return String((await reader.readString()) || "");
}

async function runWithMozillaSubprocess(command: string, argv: string[]) {
  const subprocess = getMozillaSubprocessModule();
  if (typeof subprocess?.call !== "function") {
    return false;
  }
  const proc = await subprocess.call({
    command,
    arguments: argv,
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
  const exitCode = Number.isFinite(Number(exitCodeRaw))
    ? Math.floor(Number(exitCodeRaw))
    : 0;
  if (exitCode !== 0) {
    throw new Error(
      normalizeString(stderr) || normalizeString(stdout) || `exit ${exitCode}`,
    );
  }
  return true;
}

async function runWithNodeChildProcess(command: string, argv: string[]) {
  const runtime = globalThis as {
    ChromeUtils?: unknown;
    Zotero?: unknown;
    process?: unknown;
  };
  if (!runtime.process || runtime.Zotero || runtime.ChromeUtils) {
    return false;
  }
  const childProcess = await dynamicImport("child_process").catch(() => null);
  if (!childProcess?.execFile) {
    return false;
  }
  await new Promise<void>((resolve, reject) => {
    childProcess.execFile(
      command,
      argv,
      { windowsHide: true },
      (error: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
  return true;
}

async function defaultCopyFile(sourcePath: string, targetPath: string) {
  await copyRuntimeFile({ sourcePath, targetPath });
}

async function defaultReadFile(path: string) {
  return readRuntimeBytes(path);
}

async function defaultWriteFile(
  targetPath: string,
  bytes: Uint8Array,
  options?: RuntimeWriteBytesOptions,
) {
  await writeRuntimeBytes(targetPath, bytes, options);
}

async function defaultPathExists(targetPath: string) {
  return runtimePathExists(targetPath);
}

async function sha256Bytes(bytes: Uint8Array) {
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
      };
    };
    process?: unknown;
  };
  if (typeof runtime.crypto?.subtle?.digest === "function") {
    const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }
  if (runtime.process) {
    const crypto = await dynamicImport("crypto").catch(() => null);
    if (typeof crypto?.createHash === "function") {
      return crypto.createHash("sha256").update(bytes).digest("hex");
    }
  }
  throw new Error("No SHA-256 digest API is available");
}

async function defaultChmodExecutable(targetPath: string) {
  if (resolvePlatform() === "win32") {
    return false;
  }
  return setRuntimeExecutablePermissions(targetPath, 0o755);
}

async function ensureExecutablePermission(args: {
  targetPath: string;
  platform: string;
  chmodExecutable?: (targetPath: string) => Promise<void | boolean>;
}) {
  if (args.platform === "win32") {
    return false;
  }
  if (args.chmodExecutable) {
    const result = await args.chmodExecutable(args.targetPath);
    return result === false ? false : true;
  }
  return defaultChmodExecutable(args.targetPath);
}

function isBusyInstallError(error: unknown) {
  const code = normalizeString((error as { code?: unknown })?.code);
  const message = normalizeString(
    error instanceof Error ? error.message : String(error || ""),
  ).toLowerCase();
  return (
    ["EBUSY", "EPERM", "EACCES"].includes(code) ||
    message.includes("busy") ||
    message.includes("locked") ||
    message.includes("access") ||
    message.includes("permission")
  );
}

async function readBundledInstallSource(args: {
  resolved: HostBridgeCliResolution;
  readFile: (path: string) => Promise<Uint8Array>;
}) {
  if (args.resolved.available && args.resolved.source !== "path") {
    return {
      ok: true as const,
      bytes: await args.readFile(args.resolved.binaryPath),
      sourcePath: args.resolved.binaryPath,
      diagnostics: {
        checkedPaths: [] as string[],
        checkedUris: [] as string[],
        failures: [] as unknown[],
      },
    };
  }
  const read = await readPackagedBinaryAsset(packagedCliRelativePath());
  if (read.ok) {
    return {
      ok: true as const,
      bytes: read.bytes,
      sourcePath: read.source.uri || read.source.path || read.source.source,
      diagnostics: read.diagnostics,
    };
  }
  const checkedPaths = args.resolved.available
    ? [args.resolved.binaryPath, ...read.diagnostics.checkedPaths]
    : [...args.resolved.checkedPaths, ...read.diagnostics.checkedPaths];
  return {
    ok: false as const,
    diagnostics: {
      ...read.diagnostics,
      checkedPaths,
    },
  };
}

async function writeWindowsShellShim(args: {
  target: ReturnType<typeof resolveHostBridgeCliInstallTarget>;
  writeTextFile?: (targetPath: string, content: string) => Promise<void>;
  chmodExecutable?: (targetPath: string) => Promise<void | boolean>;
}) {
  const shimPath = resolveWindowsShellShimPath(args.target);
  if (!shimPath) {
    return;
  }
  await (args.writeTextFile || writeRuntimeTextFile)(
    shimPath,
    buildWindowsShellShim(args.target.targetPath),
  );
  await (args.chmodExecutable || defaultChmodExecutable)(shimPath);
}

async function defaultSetWindowsUserPath(_dir: string) {
  const script = buildWindowsUserPathUpdateScript(_dir);
  const argv = buildPowerShellArgs(script);
  try {
    for (const command of getPowerShellCandidates()) {
      try {
        if (await runWithZoteroSubprocess(command, argv)) {
          return true;
        }
        if (await runWithMozillaSubprocess(command, argv)) {
          return true;
        }
        if (await runWithNodeChildProcess(command, argv)) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function installHostBridgeCli(
  deps: HostBridgeCliInstallerDeps = {},
): Promise<HostBridgeCliInstallResult> {
  const resolved = await (deps.resolveCli || resolveHostBridgeCliBinary)();
  const target = resolveHostBridgeCliInstallTarget(deps);
  let sourcePath = "";
  let sourceSha256 = "";
  let targetSha256 = "";
  let changed = false;
  let permissionFixed = false;
  try {
    const legacyInjectedCopy =
      resolved.available &&
      resolved.source !== "path" &&
      !!deps.copyFile &&
      !deps.readFile &&
      !deps.writeFile &&
      !deps.hashBytes;
    if (legacyInjectedCopy) {
      sourcePath = resolved.binaryPath;
      await (deps.copyFile || defaultCopyFile)(
        resolved.binaryPath,
        target.targetPath,
      );
      changed = true;
    } else {
      const readFile = deps.readFile || defaultReadFile;
      const writeFile = deps.writeFile || defaultWriteFile;
      const pathExists = deps.pathExists || defaultPathExists;
      const hashBytes = deps.hashBytes || sha256Bytes;
      const source = await readBundledInstallSource({ resolved, readFile });
      if (!source.ok) {
        return {
          ok: false,
          stage: "host-bridge-cli-install",
          code: "cli_binary_unavailable",
          message: resolved.available
            ? "Bundled zotero-bridge CLI binary is unavailable for installation."
            : resolved.message,
          details: {
            checkedPaths: source.diagnostics.checkedPaths,
            checkedAssetPaths: source.diagnostics.checkedPaths,
            checkedUris: source.diagnostics.checkedUris,
            assetFailures: source.diagnostics.failures,
            pathResolvedSource:
              resolved.available && resolved.source === "path"
                ? resolved.binaryPath
                : "",
            runtime: {
              rootURI: source.diagnostics.rootURI,
              resourceURI: source.diagnostics.resourceURI,
              rootPath: source.diagnostics.rootPath,
              cwd: source.diagnostics.cwd,
            },
          },
        };
      }
      sourcePath = source.sourcePath;
      sourceSha256 = await hashBytes(source.bytes);
      const targetExists = await pathExists(target.targetPath);
      if (targetExists) {
        try {
          targetSha256 = await hashBytes(await readFile(target.targetPath));
        } catch {
          targetSha256 = "";
        }
      }
      changed = sourceSha256 !== targetSha256;
      if (changed) {
        try {
          await writeFile(target.targetPath, source.bytes, { overwrite: true });
        } catch (error) {
          return {
            ok: false,
            stage: "host-bridge-cli-install",
            code: isBusyInstallError(error)
              ? "cli_install_target_busy"
              : "cli_install_failed",
            message: isBusyInstallError(error)
              ? "Failed to replace the existing zotero-bridge CLI binary because the target file is busy or locked."
              : "Failed to install zotero-bridge CLI binary.",
            details: {
              sourcePath,
              targetPath: target.targetPath,
              sourceSha256,
              targetSha256,
              message:
                error instanceof Error ? error.message : String(error || ""),
            },
          };
        }
        targetSha256 = sourceSha256;
      }
    }
    permissionFixed = await ensureExecutablePermission({
      targetPath: target.targetPath,
      platform: target.platform,
      chmodExecutable: deps.chmodExecutable,
    });
    if (target.platform !== "win32" && !permissionFixed) {
      return {
        ok: false,
        stage: "host-bridge-cli-install",
        code: "cli_permission_update_failed",
        message:
          "Failed to restore executable permissions on the installed zotero-bridge CLI binary.",
        details: {
          sourcePath,
          targetPath: target.targetPath,
          sourceSha256,
          targetSha256,
        },
      };
    }
    await writeWindowsShellShim({
      target,
      writeTextFile: deps.writeTextFile,
      chmodExecutable: deps.chmodExecutable,
    });
  } catch (error) {
    return {
      ok: false,
      stage: "host-bridge-cli-install",
      code: "cli_install_failed",
      message: "Failed to install zotero-bridge CLI binary.",
      details: {
        sourcePath,
        targetPath: target.targetPath,
        message: error instanceof Error ? error.message : String(error || ""),
      },
    };
  }

  const pathIncludes = deps.pathIncludes || defaultPathIncludes;
  const pathAlreadyConfigured = pathIncludes(target.targetDir);
  let pathUpdated = false;
  if (!pathAlreadyConfigured && target.platform === "win32") {
    const confirmed = await (deps.confirmAddToPath
      ? deps.confirmAddToPath(target.targetDir)
      : false);
    if (!confirmed) {
      return {
        ok: false,
        stage: "host-bridge-cli-install",
        code: "cli_path_update_declined",
        message:
          "CLI installed, but the user declined adding the install directory to PATH.",
        details: {
          targetPath: target.targetPath,
          targetDir: target.targetDir,
        },
      };
    }
    pathUpdated = await (deps.setWindowsUserPath || defaultSetWindowsUserPath)(
      target.targetDir,
    );
    if (!pathUpdated) {
      return {
        ok: false,
        stage: "host-bridge-cli-install",
        code: "cli_path_update_unavailable",
        message:
          "CLI installed, but the install directory could not be added to the user PATH automatically.",
        details: {
          targetPath: target.targetPath,
          targetDir: target.targetDir,
        },
      };
    }
  }

  return {
    ok: true,
    stage: "host-bridge-cli-install",
    message: pathAlreadyConfigured
      ? "zotero-bridge CLI installed and PATH is already configured."
      : pathUpdated
        ? "zotero-bridge CLI installed and user PATH updated. Restart terminals before using bare zotero-bridge."
        : "zotero-bridge CLI installed. Add the install directory to PATH if needed.",
    sourcePath,
    targetPath: target.targetPath,
    targetDir: target.targetDir,
    pathAlreadyConfigured,
    pathUpdated,
    terminalRestartRequired: pathUpdated,
    changed,
    sourceSha256,
    targetSha256,
    permissionFixed,
  };
}

export const hostBridgeCliInstallerInternalsForTests = {
  dirname,
  resolvePlatform,
  resolveHomeDir,
  resolveLocalAppDataDir,
  resolvePreferredPosixInstallDir,
  defaultPathIncludes,
  defaultSetWindowsUserPath,
  joinForInstallPlatform,
  packagedCliRelativePath,
  buildWindowsUserPathUpdateScript,
  buildWindowsShellShim,
  resolveWindowsShellShimPath,
};
