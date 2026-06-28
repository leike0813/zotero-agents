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
  | "powershell"
  | "pwsh"
  | "uv"
  | "python"
  | "python3"
  | "py"
  | "node"
  | "npm"
  | "npx";

export type RuntimeCommandLaunchSpec = {
  mode: "direct" | "cmd" | "powershell";
  command: string;
  args: string[];
  environment?: Record<string, string>;
  commandLine: string;
};

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
  launch?: RuntimeCommandLaunchSpec;
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
  "pwsh",
  "powershell",
  "uv",
  "python",
  "python3",
  "py",
  "node",
  "npm",
  "npx",
];

const STARTUP_COMMAND_SET = new Set<string>(STARTUP_COMMANDS);
const WINDOWS_SHELL_COMMAND_PREFERENCE: RuntimeCommandName[] = [
  "pwsh",
  "powershell",
];

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

function quoteCommandLineToken(value: string) {
  const normalized = String(value || "");
  if (!/[\s"&()^|<>]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/(["^&|<>])/g, "^$1")}"`;
}

function formatCommandLine(command: string, args: string[]) {
  return [command, ...args]
    .map((entry) => quoteCommandLineToken(entry))
    .join(" ");
}

function quotePowerShellSingleQuoted(value: string) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function quoteCmdToken(value: string) {
  return `"${String(value || "").replace(/"/g, '\\"')}"`;
}

function buildCmdInvokeScript(command: string, args: string[]) {
  return [command, ...args].map((entry) => quoteCmdToken(entry)).join(" ");
}

function buildCmdShimArgs(command: string, args: string[]) {
  return ["/d", "/s", "/c", buildCmdInvokeScript(command, args)];
}

function buildPowerShellScriptArgs(command: string, args: string[]) {
  return [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    command,
    ...args,
  ];
}

function buildPowerShellBareCommandArgs(command: string, args: string[]) {
  return [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    [
      "&",
      quotePowerShellSingleQuoted(command),
      ...args.map((entry) => quotePowerShellSingleQuoted(entry)),
    ].join(" "),
  ];
}

function isWindowsCommandShim(command: string) {
  return /\.(cmd|bat)$/i.test(normalizeString(command));
}

function isWindowsPowerShellScript(command: string) {
  return /\.ps1$/i.test(normalizeString(command));
}

function isWindowsBareCommand(command: string) {
  const normalized = normalizeString(command);
  return (
    !!normalized &&
    !isPathLikeCommand(normalized) &&
    !/\.(cmd|bat|ps1|exe|com)$/i.test(normalized)
  );
}

export function buildRuntimeCommandLaunchSpec(args: {
  command: string;
  resolvedCommand?: string;
  commandArgs?: string[];
  platform?: string;
}): RuntimeCommandLaunchSpec {
  const command =
    normalizeString(args.resolvedCommand) || normalizeString(args.command);
  const commandArgs = Array.isArray(args.commandArgs)
    ? [...args.commandArgs]
    : [];
  const platform = normalizeString(args.platform) || detectRuntimePlatform();
  if (platform === "win32" && isWindowsCommandShim(command)) {
    const shellCommand = getWindowsCmdShellCommandForLaunch(platform);
    const shellArgs = buildCmdShimArgs(command, commandArgs);
    return {
      mode: "cmd",
      command: shellCommand,
      args: shellArgs,
      commandLine: formatCommandLine(shellCommand, shellArgs),
    };
  }
  if (platform === "win32" && isWindowsPowerShellScript(command)) {
    const shellCommand = getWindowsPowerShellCommandForLaunch(platform);
    const shellArgs = buildPowerShellScriptArgs(command, commandArgs);
    return {
      mode: "powershell",
      command: shellCommand,
      args: shellArgs,
      commandLine: formatCommandLine(shellCommand, shellArgs),
    };
  }
  return {
    mode: "direct",
    command,
    args: commandArgs,
    commandLine: formatCommandLine(command, commandArgs),
  };
}

export function buildRuntimeCommandLaunchPlan(args: {
  command: string;
  resolvedCommand?: string;
  commandArgs?: string[];
  platform?: string;
  resolution?: RuntimeCommandResolution;
  preferWindowsBareCommandPowerShell?: boolean;
}): RuntimeCommandLaunchSpec {
  const commandArgs = Array.isArray(args.commandArgs)
    ? [...args.commandArgs]
    : [];
  const resolution = args.resolution;
  const requestedCommand = normalizeString(args.command);
  const platform = normalizeString(args.platform) || detectRuntimePlatform();
  if (
    args.preferWindowsBareCommandPowerShell === true &&
    platform === "win32" &&
    isWindowsBareCommand(requestedCommand)
  ) {
    const shellCommand = getWindowsPowerShellCommandForLaunch(platform);
    const shellArgs = buildPowerShellBareCommandArgs(
      requestedCommand,
      commandArgs,
    );
    return {
      mode: "powershell",
      command: shellCommand,
      args: shellArgs,
      environment: resolution?.launch?.environment
        ? { ...resolution.launch.environment }
        : undefined,
      commandLine: formatCommandLine(shellCommand, shellArgs),
    };
  }
  const resolvedCommand =
    normalizeString(resolution?.resolvedPath) ||
    normalizeString(args.resolvedCommand) ||
    requestedCommand;
  const launch =
    resolution?.launch ||
    buildRuntimeCommandLaunchSpec({
      command: args.command,
      resolvedCommand,
      platform: args.platform,
    });
  if (launch.mode === "cmd") {
    const shellArgs = buildCmdShimArgs(resolvedCommand, commandArgs);
    return {
      mode: launch.mode,
      command: launch.command,
      args: shellArgs,
      environment: launch.environment ? { ...launch.environment } : undefined,
      commandLine: formatCommandLine(launch.command, shellArgs),
    };
  }
  if (launch.mode === "powershell") {
    const shellArgs = buildPowerShellScriptArgs(resolvedCommand, commandArgs);
    return {
      mode: launch.mode,
      command: launch.command,
      args: shellArgs,
      environment: launch.environment ? { ...launch.environment } : undefined,
      commandLine: formatCommandLine(launch.command, shellArgs),
    };
  }
  return {
    mode: launch.mode,
    command: launch.command || resolvedCommand,
    args: commandArgs,
    environment: launch.environment ? { ...launch.environment } : undefined,
    commandLine: formatCommandLine(
      launch.command || resolvedCommand,
      commandArgs,
    ),
  };
}

function withLaunchSpec(
  resolution: RuntimeCommandResolution,
  platform?: string,
): RuntimeCommandResolution {
  if (!resolution.available || !resolution.resolvedPath || resolution.launch) {
    return resolution;
  }
  return {
    ...resolution,
    launch: buildRuntimeCommandLaunchSpec({
      command: resolution.command,
      resolvedCommand: resolution.resolvedPath,
      platform,
    }),
  };
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

function getWindowsCmdShellCommandForLaunch(platform?: string) {
  return getWindowsShellCommandForLaunch("cmd.exe", platform);
}

function getWindowsPowerShellCommandForLaunch(platform?: string) {
  return (
    getPreferredWindowsShellCommandsFromRegistry()[0] ||
    getWindowsShellCommandForLaunch("powershell.exe", platform)
  );
}

export function getPreferredWindowsShellCommandsFromRegistry(
  snapshot: RuntimeCommandRegistrySnapshot = commandRegistry,
) {
  const commands: string[] = [];
  for (const command of WINDOWS_SHELL_COMMAND_PREFERENCE) {
    const resolved = snapshot.commands[command];
    if (resolved?.available !== true) {
      continue;
    }
    const shellCommand = normalizeString(
      resolved.resolvedPath || resolved.launch?.command,
    );
    if (
      shellCommand &&
      !commands.some(
        (entry) => entry.toLowerCase() === shellCommand.toLowerCase(),
      )
    ) {
      commands.push(shellCommand);
    }
  }
  return commands;
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
      return withLaunchSpec(
        {
          command,
          available: true,
          resolvedPath: command,
          source: "path-like",
          checkedCandidates,
        },
        platform,
      );
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
    return withLaunchSpec(
      {
        command,
        available: true,
        resolvedPath: resolvedFromPathSearch,
        source: "pathSearch",
        checkedCandidates,
      },
      platform,
    );
  }

  for (const candidate of buildPathCommandCandidates({
    command,
    pathValue: options?.pathValue,
    platform,
  })) {
    checkedCandidates.push(candidate);
    if (await exists(candidate)) {
      return withLaunchSpec(
        {
          command,
          available: true,
          resolvedPath: candidate,
          source: "path",
          checkedCandidates,
        },
        platform,
      );
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
        return withLaunchSpec(
          {
            command,
            available: true,
            resolvedPath: normalizeString(resolved[0]),
            source: source.source,
            checkedCandidates,
          },
          platform,
        );
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
        return withLaunchSpec(
          {
            command,
            available: true,
            resolvedPath: candidate,
            source: "posix-non-interactive",
            checkedCandidates,
          },
          platform,
        );
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
    launch: value.launch
      ? {
          ...value.launch,
          args: [...value.launch.args],
          environment: value.launch.environment
            ? { ...value.launch.environment }
            : undefined,
        }
      : undefined,
  };
}

export async function preflightRuntimeCommandsOnStartup(options?: {
  commands?: RuntimeCommandName[];
  resolver?: (command: RuntimeCommandName) => Promise<RuntimeCommandResolution>;
  platform?: string;
}) {
  const commands = options?.commands || STARTUP_COMMANDS;
  const platform =
    normalizeString(options?.platform) || detectRuntimePlatform();
  const entries = await Promise.all(
    commands.map(async (command) => {
      try {
        const resolvedRaw = options?.resolver
          ? await options.resolver(command)
          : await resolveRuntimeCommand(command);
        const resolved = withLaunchSpec(resolvedRaw, platform);
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
