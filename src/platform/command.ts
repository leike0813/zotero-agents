import {
  getWindowsShellCommandCandidates,
  resolveTrustedPathSearchResult,
  resolveWindowsCommandFromGlobalNpmRoot,
  resolveWindowsCommandFromNodeInstallRoot,
  resolveWindowsCommandFromPowerShell,
  resolveWindowsCommandFromUserLocalBin,
} from "../modules/windowsCommandResolution";
import {
  getMozillaSubprocessModule,
  runtimeFileExists,
} from "../utils/runtimeCompatibility";
import { readRuntimeEnv, readRuntimePathEnv, splitPathEntries } from "./env";
import { joinNativePath, isAbsolutePathLike } from "./path";
import { detectRuntimePlatform } from "./runtimePlatform";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export type RuntimeCommandName =
  | "uv"
  | "python"
  | "python3"
  | "py"
  | "node"
  | "npm"
  | "npx";

export type RuntimeCommandResolution = {
  command: string;
  available: boolean;
  resolvedPath?: string;
  source?:
    | "path-like"
    | "pathSearch"
    | "path"
    | "windows-powershell"
    | "windows-user-local"
    | "windows-global-npm"
    | "windows-node-install"
    | "posix-non-interactive";
  checkedCandidates: string[];
  diagnostic?: string;
};

export type RuntimeCommandRegistrySnapshot = {
  initialized: boolean;
  initializedAt?: string;
  commands: Partial<Record<RuntimeCommandName, RuntimeCommandResolution>>;
  primaryPython?: RuntimeCommandResolution;
};

type RuntimeCommandResolverOptions = {
  pathSearch?: ((command: string) => Promise<unknown>) | null;
  pathValue?: string;
  platform?: string;
  homeDir?: string;
  exists?: (path: string) => Promise<boolean>;
};

const STARTUP_COMMANDS: RuntimeCommandName[] = [
  "uv",
  "python",
  "python3",
  "py",
  "node",
  "npm",
  "npx",
];

const STARTUP_COMMAND_SET = new Set<string>(STARTUP_COMMANDS);

let commandRegistry: RuntimeCommandRegistrySnapshot = {
  initialized: false,
  commands: {},
};

export function isPathLikeCommand(commandRaw: unknown) {
  const command = normalizeString(commandRaw);
  return /[\\/]/.test(command) || isAbsolutePathLike(command);
}

export function buildPathCommandCandidates(args: {
  command: string;
  pathValue?: string;
  platform?: string;
}) {
  const command = normalizeString(args.command);
  if (!command || isPathLikeCommand(command)) {
    return command ? [command] : [];
  }
  const pathValue = args.pathValue ?? readRuntimePathEnv();
  const pathEntries = splitPathEntries(pathValue);
  const isWindows = args.platform === "win32";
  const extensions = isWindows
    ? /\.[A-Za-z0-9]+$/.test(command)
      ? [""]
      : [".cmd", ".exe", ".bat", ".com"]
    : [""];
  const candidates: string[] = [];
  for (const entry of pathEntries) {
    for (const extension of extensions) {
      candidates.push(joinNativePath(entry, `${command}${extension}`));
    }
  }
  return Array.from(new Set(candidates));
}

function summarizeMissingCommand(command: string, checkedCandidates: string[]) {
  if (checkedCandidates.length === 0) {
    return `Command "${command}" was not found in PATH`;
  }
  return `Command "${command}" was not found; checked candidates: ${checkedCandidates.join(", ")}`;
}

async function defaultPathExists(path: string) {
  return runtimeFileExists(path);
}

export function buildNonInteractiveCommandCandidates(args: {
  command: string;
  platform?: string;
  homeDir?: string;
}) {
  const command = normalizeString(args.command);
  if (!command || isPathLikeCommand(command) || args.platform === "win32") {
    return [] as string[];
  }
  const home = normalizeString(args.homeDir);
  const roots = [
    home ? joinNativePath(home, ".local", "bin") : "",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/opt/homebrew/bin",
  ].filter(Boolean);
  return roots.map((root) => joinNativePath(root, command));
}

export function getWindowsShellCommandForLaunch(
  commandRaw: string,
  platform?: string,
) {
  const candidates = getWindowsShellCommandCandidates(commandRaw, platform);
  return normalizeString(candidates[0]) || normalizeString(commandRaw);
}

export async function resolveRuntimeCommand(
  commandRaw: string,
  options?: RuntimeCommandResolverOptions,
): Promise<RuntimeCommandResolution> {
  const command = normalizeString(commandRaw);
  const cached = getCachedRuntimeCommand(command);
  if (cached) {
    return cached;
  }
  const checkedCandidates: string[] = [];
  const platform =
    normalizeString(options?.platform) || detectRuntimePlatform();
  const exists = options?.exists || defaultPathExists;
  if (!command) {
    return {
      command,
      available: false,
      checkedCandidates,
      diagnostic: "Command is required",
    };
  }
  if (isPathLikeCommand(command)) {
    checkedCandidates.push(command);
    if (await exists(command)) {
      return {
        command,
        available: true,
        resolvedPath: command,
        source: "path-like",
        checkedCandidates,
      };
    }
    return {
      command,
      available: false,
      checkedCandidates,
      diagnostic: `Command "${command}" is not executable`,
    };
  }

  const pathSearch =
    options?.pathSearch ?? getMozillaSubprocessModule()?.pathSearch;
  const resolvedFromPathSearch = await resolveTrustedPathSearchResult({
    command,
    pathSearch,
    platform,
  });
  if (resolvedFromPathSearch) {
    checkedCandidates.push(`pathSearch:${command}`);
    return {
      command,
      available: true,
      resolvedPath: resolvedFromPathSearch,
      source: "pathSearch",
      checkedCandidates,
    };
  }

  for (const candidate of buildPathCommandCandidates({
    command,
    pathValue: options?.pathValue,
    platform,
  })) {
    checkedCandidates.push(candidate);
    if (await exists(candidate)) {
      return {
        command,
        available: true,
        resolvedPath: candidate,
        source: "path",
        checkedCandidates,
      };
    }
  }

  if (platform === "win32") {
    const windowsSources: Array<{
      source: NonNullable<RuntimeCommandResolution["source"]>;
      resolve: () => Promise<string[]>;
    }> = [
      {
        source: "windows-powershell",
        resolve: () => resolveWindowsCommandFromPowerShell(command, platform),
      },
      {
        source: "windows-user-local",
        resolve: () => resolveWindowsCommandFromUserLocalBin(command, platform),
      },
      {
        source: "windows-global-npm",
        resolve: () =>
          resolveWindowsCommandFromGlobalNpmRoot(command, platform),
      },
      {
        source: "windows-node-install",
        resolve: () =>
          resolveWindowsCommandFromNodeInstallRoot(command, platform),
      },
    ];
    for (const source of windowsSources) {
      const resolved = await source.resolve();
      checkedCandidates.push(
        ...resolved.map((entry) => `${source.source}:${entry}`),
      );
      if (resolved.length > 0) {
        return {
          command,
          available: true,
          resolvedPath: normalizeString(resolved[0]),
          source: source.source,
          checkedCandidates,
        };
      }
    }
  } else {
    for (const candidate of buildNonInteractiveCommandCandidates({
      command,
      platform,
      homeDir: options?.homeDir ?? readRuntimeEnv("HOME"),
    })) {
      checkedCandidates.push(candidate);
      if (await exists(candidate)) {
        return {
          command,
          available: true,
          resolvedPath: candidate,
          source: "posix-non-interactive",
          checkedCandidates,
        };
      }
    }
  }

  return {
    command,
    available: false,
    checkedCandidates,
    diagnostic: summarizeMissingCommand(command, checkedCandidates),
  };
}

function cloneResolution(value: RuntimeCommandResolution) {
  return {
    ...value,
    checkedCandidates: [...value.checkedCandidates],
  };
}

export async function preflightRuntimeCommandsOnStartup(options?: {
  commands?: RuntimeCommandName[];
  resolver?: (command: RuntimeCommandName) => Promise<RuntimeCommandResolution>;
}) {
  const commands = options?.commands || STARTUP_COMMANDS;
  const entries = await Promise.all(
    commands.map(async (command) => {
      try {
        const resolved = options?.resolver
          ? await options.resolver(command)
          : await resolveRuntimeCommand(command);
        return [command, resolved] as const;
      } catch (error) {
        return [
          command,
          {
            command,
            available: false,
            checkedCandidates: [],
            diagnostic: error instanceof Error ? error.message : String(error),
          } satisfies RuntimeCommandResolution,
        ] as const;
      }
    }),
  );
  commandRegistry = {
    initialized: true,
    initializedAt: new Date().toISOString(),
    commands: Object.fromEntries(entries) as Partial<
      Record<RuntimeCommandName, RuntimeCommandResolution>
    >,
  };
  commandRegistry.primaryPython = getPrimaryPythonCommand(commandRegistry);
  return getRuntimeCommandRegistrySnapshot();
}

export function seedRuntimeCommandRegistryForTests(
  snapshot: RuntimeCommandRegistrySnapshot,
) {
  commandRegistry = {
    initialized: snapshot.initialized,
    initializedAt: snapshot.initializedAt,
    commands: Object.fromEntries(
      Object.entries(snapshot.commands).map(([key, value]) => [
        key,
        value ? cloneResolution(value) : value,
      ]),
    ) as Partial<Record<RuntimeCommandName, RuntimeCommandResolution>>,
    primaryPython: snapshot.primaryPython
      ? cloneResolution(snapshot.primaryPython)
      : undefined,
  };
}

export function resetRuntimeCommandRegistryForTests() {
  commandRegistry = {
    initialized: false,
    commands: {},
  };
}

export function getRuntimeCommandRegistrySnapshot() {
  return {
    initialized: commandRegistry.initialized,
    initializedAt: commandRegistry.initializedAt,
    commands: Object.fromEntries(
      Object.entries(commandRegistry.commands).map(([key, value]) => [
        key,
        value ? cloneResolution(value) : value,
      ]),
    ) as Partial<Record<RuntimeCommandName, RuntimeCommandResolution>>,
    primaryPython: commandRegistry.primaryPython
      ? cloneResolution(commandRegistry.primaryPython)
      : undefined,
  } satisfies RuntimeCommandRegistrySnapshot;
}

export function getCachedRuntimeCommand(commandRaw: string) {
  const command = normalizeString(commandRaw) as RuntimeCommandName;
  if (!STARTUP_COMMAND_SET.has(command)) {
    return undefined;
  }
  const cached = commandRegistry.commands[command];
  return cached ? cloneResolution(cached) : undefined;
}

export function getPrimaryPythonCommand(
  snapshot: RuntimeCommandRegistrySnapshot = commandRegistry,
) {
  for (const command of ["python", "python3", "py"] as RuntimeCommandName[]) {
    const resolved = snapshot.commands[command];
    if (resolved?.available && resolved.resolvedPath) {
      return cloneResolution(resolved);
    }
  }
  return undefined;
}

export async function resolveRuntimeCommandForLaunch(commandRaw: string) {
  const command = normalizeString(commandRaw);
  const cached = getCachedRuntimeCommand(command);
  if (cached) {
    return cached.available && cached.resolvedPath
      ? cached.resolvedPath
      : command;
  }
  return (await resolveRuntimeCommand(command)).resolvedPath || command;
}
