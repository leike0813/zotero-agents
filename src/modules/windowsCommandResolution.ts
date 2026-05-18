import { runtimeFileExists } from "../utils/runtimeCompatibility";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function detectWindowsHost(platform?: string) {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  if (typeof platform === "string" && platform.trim()) {
    return platform.trim().toLowerCase() === "win32";
  }
  if (typeof runtime.Zotero?.isWin === "boolean") {
    return runtime.Zotero.isWin;
  }
  return String(runtime.process?.platform || "").toLowerCase() === "win32";
}

function readProcessEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return normalizeString(runtime.process?.env?.[name]);
}

function readDirectoryServicePath(key: string) {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (name: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  if (!runtime.Services?.dirsvc?.get || !runtime.Ci?.nsIFile) {
    return "";
  }
  try {
    const file = runtime.Services.dirsvc.get(key, runtime.Ci.nsIFile);
    return normalizeString(file?.path);
  } catch {
    return "";
  }
}

function isPathLikeCommand(commandRaw: string) {
  const command = normalizeString(commandRaw);
  return (
    /[\\/]/.test(command) ||
    /^[A-Za-z]:[\\/]/.test(command) ||
    command.startsWith("/")
  );
}

function isSafeBareWindowsCommand(commandRaw: string) {
  return /^[A-Za-z0-9_.@-]+$/.test(normalizeString(commandRaw));
}

export function isAbsoluteCommandPath(commandRaw: string) {
  const command = normalizeString(commandRaw);
  if (!command) {
    return false;
  }
  return /^[A-Za-z]:[\\/]/.test(command) || /^\\\\/.test(command) || command.startsWith("/");
}

function joinWindowsPath(...segments: string[]) {
  const normalizedSegments = segments
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (normalizedSegments.length === 0) {
    return "";
  }
  const first = normalizedSegments[0];
  const driveMatch = first.match(/^([A-Za-z]:)[\\/]?/);
  const drivePrefix = driveMatch?.[1] || "";
  const flattened = normalizedSegments
    .flatMap((entry) => entry.split(/[\\/]+/))
    .filter(Boolean);
  if (drivePrefix && flattened[0]?.toLowerCase() === drivePrefix.toLowerCase()) {
    flattened.shift();
  }
  const joined = flattened.join("\\");
  if (drivePrefix) {
    return `${drivePrefix}\\${joined}`;
  }
  return joined;
}

function expandResolvedWindowsCommandCandidate(candidateRaw: string) {
  const candidate = normalizeString(candidateRaw);
  if (!candidate) {
    return [] as string[];
  }
  if (/\.ps1$/i.test(candidate)) {
    const withoutExt = candidate.replace(/\.ps1$/i, "");
    return [
      `${withoutExt}.cmd`,
      `${withoutExt}.exe`,
      `${withoutExt}.bat`,
      candidate,
    ].map((entry) => normalizeString(entry));
  }
  return [candidate];
}

async function pathExists(targetPath: string) {
  const normalized = normalizeString(targetPath);
  if (!normalized) {
    return false;
  }
  const runtimeExists = await runtimeFileExists(normalized);
  return runtimeExists;
}

export async function isTrustedResolvedCommandPath(
  candidateRaw: unknown,
  platform?: string,
) {
  const candidate = normalizeString(candidateRaw);
  if (!candidate || !isAbsoluteCommandPath(candidate)) {
    return false;
  }
  if (detectWindowsHost(platform)) {
    const expanded = expandResolvedWindowsCommandCandidate(candidate);
    for (const entry of expanded) {
      if (await pathExists(entry)) {
        return true;
      }
    }
    return false;
  }
  return pathExists(candidate);
}

export async function resolveTrustedPathSearchResult(args: {
  command: string;
  pathSearch?: ((command: string) => Promise<unknown>) | null;
  platform?: string;
}) {
  const command = normalizeString(args.command);
  if (!command || typeof args.pathSearch !== "function") {
    return "";
  }
  try {
    const resolved = await args.pathSearch(command);
    if (await isTrustedResolvedCommandPath(resolved, args.platform)) {
      return normalizeString(resolved);
    }
  } catch {
    return "";
  }
  return "";
}

export function getWindowsPowerShellAbsoluteCandidates(platform?: string) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env || {};
  const windowsRoot =
    normalizeString(env.SystemRoot) ||
    normalizeString(env.WINDIR) ||
    "C:\\Windows";
  const candidates = [
    joinWindowsPath(
      windowsRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
    joinWindowsPath(
      windowsRoot,
      "Sysnative",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    "C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe",
    "C:\\Program Files\\PowerShell\\6\\pwsh.exe",
  ];
  return Array.from(
    new Set(candidates.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

export function getWindowsExecutableCandidates(command: string, platform?: string) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const normalized = normalizeString(command);
  if (!normalized || isPathLikeCommand(normalized)) {
    return [] as string[];
  }
  if (!isSafeBareWindowsCommand(normalized)) {
    return [] as string[];
  }
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env || {};
  const windowsRoot =
    normalizeString(env.SystemRoot) ||
    normalizeString(env.WINDIR) ||
    "C:\\Windows";
  const withoutExt = normalized.replace(/\.(exe|cmd|bat)$/i, "");
  const commandVariants = [
    `${withoutExt}.exe`,
    `${withoutExt}.cmd`,
    `${withoutExt}.bat`,
    normalized,
  ];
  const candidates = commandVariants.flatMap((entry) => [
    joinWindowsPath(windowsRoot, "System32", entry),
    joinWindowsPath(windowsRoot, "Sysnative", entry),
  ]);
  return Array.from(
    new Set(candidates.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

export function getWindowsShellCommandCandidates(
  command: string,
  platform?: string,
) {
  if (!detectWindowsHost(platform)) {
    return [normalizeString(command)].filter(Boolean);
  }
  const normalized = normalizeString(command);
  if (!normalized) {
    return [] as string[];
  }
  if (isAbsoluteCommandPath(normalized) || /[\\/]/.test(normalized)) {
    return [normalized];
  }
  const lower = normalized.toLowerCase();
  const systemRoot =
    readProcessEnv("SystemRoot") ||
    readProcessEnv("WINDIR") ||
    "C:\\Windows";
  const comspec = normalizeString(
    readProcessEnv("ComSpec") || readProcessEnv("COMSPEC"),
  );
  const candidates: string[] = [normalized];
  if (lower === "cmd" || lower === "cmd.exe") {
    candidates.unshift(
      comspec,
      joinWindowsPath(systemRoot, "System32", "cmd.exe"),
      joinWindowsPath(systemRoot, "Sysnative", "cmd.exe"),
    );
  } else if (lower === "powershell" || lower === "powershell.exe") {
    candidates.unshift(
      ...getWindowsPowerShellAbsoluteCandidates(platform),
      "powershell.exe",
    );
  }
  return Array.from(
    new Set(candidates.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function getWindowsGlobalNpmRoots(platform?: string) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const home =
    readProcessEnv("USERPROFILE") || readDirectoryServicePath("Home");
  const localAppData =
    readProcessEnv("LOCALAPPDATA") ||
    readProcessEnv("LocalAppData") ||
    readDirectoryServicePath("LocalAppData");
  const roots = [
    readProcessEnv("NPM_CONFIG_PREFIX"),
    readProcessEnv("npm_config_prefix"),
    readProcessEnv("APPDATA")
      ? joinWindowsPath(readProcessEnv("APPDATA"), "npm")
      : "",
    readProcessEnv("AppData")
      ? joinWindowsPath(readProcessEnv("AppData"), "npm")
      : "",
    localAppData ? joinWindowsPath(localAppData, "npm") : "",
    home ? joinWindowsPath(home, "AppData", "Roaming", "npm") : "",
    home ? joinWindowsPath(home, "AppData", "Local", "npm") : "",
  ];
  return Array.from(
    new Set(roots.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function getWindowsNodeInstallRoots(platform?: string) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const roots = [
    readProcessEnv("ProgramFiles")
      ? joinWindowsPath(readProcessEnv("ProgramFiles"), "nodejs")
      : "",
    readProcessEnv("ProgramFiles(x86)")
      ? joinWindowsPath(readProcessEnv("ProgramFiles(x86)"), "nodejs")
      : "",
    "C:\\Program Files\\nodejs",
    "C:\\Program Files (x86)\\nodejs",
  ];
  return Array.from(
    new Set(roots.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function getWindowsUserLocalBinRoots(platform?: string) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const home =
    readProcessEnv("USERPROFILE") || readDirectoryServicePath("Home");
  const localAppData =
    readProcessEnv("LOCALAPPDATA") ||
    readProcessEnv("LocalAppData") ||
    readDirectoryServicePath("LocalAppData");
  const roots = [
    readProcessEnv("UV_INSTALL_DIR"),
    home ? joinWindowsPath(home, ".local", "bin") : "",
    localAppData ? joinWindowsPath(localAppData, "uv", "bin") : "",
    localAppData ? joinWindowsPath(localAppData, "Programs", "uv") : "",
    localAppData ? joinWindowsPath(localAppData, "Programs", "uv", "bin") : "",
  ];
  return Array.from(
    new Set(roots.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function buildWindowsCommandCandidates(command: string) {
  const withoutExt = normalizeString(command).replace(/\.(exe|cmd|bat|ps1)$/i, "");
  return [
    `${withoutExt}.cmd`,
    `${withoutExt}.exe`,
    `${withoutExt}.bat`,
    `${withoutExt}.ps1`,
    withoutExt,
  ];
}

export async function resolveWindowsCommandFromUserLocalBin(
  command: string,
  platform?: string,
) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const normalized = normalizeString(command);
  if (!normalized || isPathLikeCommand(normalized)) {
    return [] as string[];
  }
  const variants = buildWindowsCommandCandidates(normalized);
  const candidates = getWindowsUserLocalBinRoots(platform).flatMap((root) =>
    variants.map((variant) => joinWindowsPath(root, variant)),
  );
  const resolved: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      resolved.push(candidate);
    }
  }
  return Array.from(
    new Set(resolved.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

export async function resolveWindowsCommandFromGlobalNpmRoot(
  command: string,
  platform?: string,
) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const normalized = normalizeString(command);
  if (!normalized || isPathLikeCommand(normalized)) {
    return [] as string[];
  }
  const variants = buildWindowsCommandCandidates(normalized);
  const candidates = getWindowsGlobalNpmRoots(platform).flatMap((root) =>
    variants.map((variant) => joinWindowsPath(root, variant)),
  );
  const resolved: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      resolved.push(candidate);
    }
  }
  return Array.from(
    new Set(resolved.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

export async function resolveWindowsCommandFromNodeInstallRoot(
  command: string,
  platform?: string,
) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const normalized = normalizeString(command);
  if (!normalized || isPathLikeCommand(normalized)) {
    return [] as string[];
  }
  const variants = buildWindowsCommandCandidates(normalized);
  const candidates = getWindowsNodeInstallRoots(platform).flatMap((root) =>
    variants.map((variant) => joinWindowsPath(root, variant)),
  );
  const resolved: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      resolved.push(candidate);
    }
  }
  return Array.from(
    new Set(resolved.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

export async function resolveWindowsCommandFromPowerShell(
  command: string,
  platform?: string,
) {
  if (!detectWindowsHost(platform)) {
    return [] as string[];
  }
  const normalized = normalizeString(command);
  if (!normalized || isPathLikeCommand(normalized)) {
    return [] as string[];
  }
  if (!isSafeBareWindowsCommand(normalized)) {
    return [] as string[];
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
  const subprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof subprocess !== "function") {
    return [] as string[];
  }
  const escapedCommand = normalized.replace(/'/g, "''");
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    `$cmd=Get-Command '${escapedCommand}'`,
    "if ($cmd -and $cmd.Source) { Write-Output $cmd.Source; exit 0 }",
    "exit 1",
  ].join("; ");
  const powerShellCandidates = Array.from(
    new Set([
      ...getWindowsPowerShellAbsoluteCandidates(platform),
      "powershell.exe",
      "pwsh.exe",
      "pwsh",
      "powershell",
    ]),
  );
  for (const shellCommand of powerShellCandidates) {
    try {
      const output = await subprocess(shellCommand, [
        "-NoLogo",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ]);
      const lines = String(output || "")
        .split(/\r?\n/)
        .flatMap((entry) => expandResolvedWindowsCommandCandidate(entry))
        .filter(Boolean);
      if (lines.length > 0) {
        return Array.from(new Set(lines));
      }
    } catch {
      continue;
    }
  }
  return [] as string[];
}
