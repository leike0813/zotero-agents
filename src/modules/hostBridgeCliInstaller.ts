import { joinPath } from "../utils/path";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { copyPackagedBinaryAsset } from "./packagedAssetResolver";
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
    }
  | {
      ok: false;
      stage: "host-bridge-cli-install";
      code:
        | "cli_binary_unavailable"
        | "cli_install_failed"
        | "cli_path_update_declined"
        | "cli_path_update_unavailable";
      message: string;
      details?: Record<string, unknown>;
    };

export type HostBridgeCliInstallerDeps = {
  resolveCli?: () => Promise<HostBridgeCliResolution>;
  copyFile?: (sourcePath: string, targetPath: string) => Promise<void>;
  writeTextFile?: (targetPath: string, content: string) => Promise<void>;
  chmodExecutable?: (targetPath: string) => Promise<void>;
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

async function defaultChmodExecutable(targetPath: string) {
  if (resolvePlatform() === "win32") {
    return;
  }
  const fs = await dynamicImport("fs/promises").catch(() => null);
  if (fs?.chmod) {
    await fs.chmod(targetPath, 0o755);
  }
}

async function writeWindowsShellShim(args: {
  target: ReturnType<typeof resolveHostBridgeCliInstallTarget>;
  writeTextFile?: (targetPath: string, content: string) => Promise<void>;
  chmodExecutable?: (targetPath: string) => Promise<void>;
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
  let sourceUri = "";
  try {
    if (resolved.available) {
      sourcePath = resolved.binaryPath;
      await (deps.copyFile || defaultCopyFile)(
        resolved.binaryPath,
        target.targetPath,
      );
    } else {
      const copied = await copyPackagedBinaryAsset({
        relativePath: packagedCliRelativePath(),
        targetPath: target.targetPath,
      });
      if (!copied.ok) {
        return {
          ok: false,
          stage: "host-bridge-cli-install",
          code: resolved.code,
          message: resolved.message,
          details: {
            checkedPaths: [
              ...resolved.checkedPaths,
              ...copied.diagnostics.checkedPaths,
            ],
            checkedAssetPaths: copied.diagnostics.checkedPaths,
            checkedUris: copied.diagnostics.checkedUris,
            assetFailures: copied.diagnostics.failures,
            runtime: {
              rootURI: copied.diagnostics.rootURI,
              resourceURI: copied.diagnostics.resourceURI,
              rootPath: copied.diagnostics.rootPath,
              cwd: copied.diagnostics.cwd,
            },
          },
        };
      }
      sourceUri =
        copied.source.uri || copied.source.path || copied.source.source;
    }
    await (deps.chmodExecutable || defaultChmodExecutable)(target.targetPath);
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
        sourceUri,
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
    sourcePath: sourcePath || sourceUri,
    targetPath: target.targetPath,
    targetDir: target.targetDir,
    pathAlreadyConfigured,
    pathUpdated,
    terminalRestartRequired: pathUpdated,
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
