import { runtimeFileExists } from "../../utils/runtimeCompatibility";
import {
  getWindowsExecutableCandidates,
  resolveTrustedPathSearchResult,
  resolveWindowsCommandFromPowerShell,
} from "../windowsCommandResolution";

export type SynthesisGitExecutableResolution = {
  available: boolean;
  command?: string;
  source?:
    | "pathSearch"
    | "powershell"
    | "knownPath"
    | "bare"
    | "injectedRunner";
  checkedPaths: string[];
  message?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function runtimePlatform() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
    process?: { platform?: string };
  };
  if (runtime.Zotero?.isWin === true) {
    return "win32";
  }
  if (runtime.Zotero?.isMac === true) {
    return "darwin";
  }
  if (runtime.Zotero?.isLinux === true) {
    return "linux";
  }
  return cleanString(runtime.process?.platform).toLowerCase();
}

function readRuntimeEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return cleanString(runtime.process?.env?.[name]);
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
    return cleanString(
      runtime.Services.dirsvc.get(key, runtime.Ci.nsIFile)?.path,
    );
  } catch {
    return "";
  }
}

function joinWindowsPath(...segments: string[]) {
  const normalizedSegments = segments.map(cleanString).filter(Boolean);
  if (normalizedSegments.length === 0) {
    return "";
  }
  const first = normalizedSegments[0];
  const driveMatch = first.match(/^([A-Za-z]:)[\\/]?/);
  const drivePrefix = driveMatch?.[1] || "";
  const flattened = normalizedSegments
    .flatMap((entry) => entry.split(/[\\/]+/))
    .filter(Boolean);
  if (
    drivePrefix &&
    flattened[0]?.toLowerCase() === drivePrefix.toLowerCase()
  ) {
    flattened.shift();
  }
  const joined = flattened.join("\\");
  return drivePrefix ? `${drivePrefix}\\${joined}` : joined;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function windowsKnownGitCandidates() {
  const home =
    readRuntimeEnv("USERPROFILE") || readDirectoryServicePath("Home");
  const localAppData =
    readRuntimeEnv("LOCALAPPDATA") ||
    readRuntimeEnv("LocalAppData") ||
    readDirectoryServicePath("LocalAppData");
  const programFiles = readRuntimeEnv("ProgramFiles") || "C:\\Program Files";
  const programFilesX86 =
    readRuntimeEnv("ProgramFiles(x86)") || "C:\\Program Files (x86)";
  return uniqueStrings([
    ...getWindowsExecutableCandidates("git", "win32"),
    joinWindowsPath(programFiles, "Git", "cmd", "git.exe"),
    joinWindowsPath(programFiles, "Git", "bin", "git.exe"),
    joinWindowsPath(programFilesX86, "Git", "cmd", "git.exe"),
    joinWindowsPath(programFilesX86, "Git", "bin", "git.exe"),
    localAppData
      ? joinWindowsPath(localAppData, "Programs", "Git", "cmd", "git.exe")
      : "",
    localAppData
      ? joinWindowsPath(localAppData, "Programs", "Git", "bin", "git.exe")
      : "",
    home
      ? joinWindowsPath(
          home,
          "AppData",
          "Local",
          "Programs",
          "Git",
          "cmd",
          "git.exe",
        )
      : "",
    home
      ? joinWindowsPath(
          home,
          "AppData",
          "Local",
          "Programs",
          "Git",
          "bin",
          "git.exe",
        )
      : "",
  ]);
}

function nonWindowsKnownGitCandidates(platform: string) {
  const candidates = [
    "/usr/bin/git",
    "/usr/local/bin/git",
    "/opt/homebrew/bin/git",
  ];
  if (platform === "darwin") {
    candidates.push("/opt/local/bin/git");
  }
  return uniqueStrings(candidates);
}

export async function resolveSynthesisGitExecutable(
  args: {
    pathSearch?: ((command: string) => Promise<unknown>) | null;
    platform?: string;
  } = {},
): Promise<SynthesisGitExecutableResolution> {
  const platform = cleanString(args.platform) || runtimePlatform();
  const isWindows = platform === "win32";
  const checkedPaths: string[] = [];
  const resolvedFromPathSearch = await resolveTrustedPathSearchResult({
    command: "git",
    pathSearch: args.pathSearch,
    platform,
  });
  checkedPaths.push(isWindows ? "pathSearch:git" : "PATH:git");
  if (resolvedFromPathSearch) {
    return {
      available: true,
      command: resolvedFromPathSearch,
      source: "pathSearch",
      checkedPaths,
    };
  }

  if (isWindows) {
    checkedPaths.push("powershell:Get-Command git");
    const resolvedFromPowerShell = await resolveWindowsCommandFromPowerShell(
      "git",
      platform,
    );
    for (const candidate of resolvedFromPowerShell) {
      checkedPaths.push(candidate);
      if (await runtimeFileExists(candidate)) {
        return {
          available: true,
          command: candidate,
          source: "powershell",
          checkedPaths,
        };
      }
    }
    for (const candidate of windowsKnownGitCandidates()) {
      checkedPaths.push(candidate);
      if (await runtimeFileExists(candidate)) {
        return {
          available: true,
          command: candidate,
          source: "knownPath",
          checkedPaths,
        };
      }
    }
    return {
      available: false,
      checkedPaths: uniqueStrings(checkedPaths),
      message:
        "Git executable was not found. Install Git for Windows or restart Zotero after Git is added to PATH.",
    };
  }

  for (const candidate of nonWindowsKnownGitCandidates(platform)) {
    checkedPaths.push(candidate);
    if (await runtimeFileExists(candidate)) {
      return {
        available: true,
        command: candidate,
        source: "knownPath",
        checkedPaths,
      };
    }
  }
  return {
    available: true,
    command: "git",
    source: "bare",
    checkedPaths: uniqueStrings(checkedPaths),
  };
}
