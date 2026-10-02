import { getWindowsShellCommandCandidates, resolveTrustedPathSearchResult, resolveWindowsCommandFromGlobalNpmRoot, resolveWindowsCommandFromNodeInstallRoot, resolveWindowsCommandFromPowerShell, resolveWindowsCommandFromUserLocalBin, } from "../modules/windowsCommandResolution";
import { readRuntimeTextFile, runtimePathExists, } from "../modules/runtimePersistence";
import { readRuntimeEnv, readRuntimePathEnv, splitPathEntries } from "./env";
import { joinNativePath, isAbsolutePathLike } from "./path";
import { detectRuntimePlatform } from "./runtimePlatform";
import { getMozillaSubprocessModule } from "./subprocess";
function normalizeString(value) {
    return String(value || "").trim();
}
const STARTUP_COMMANDS = [
    "pwsh",
    "powershell",
    "sh",
    "setsid",
    "kill",
    "ps",
    "uv",
    "python",
    "python3",
    "py",
    "node",
    "npm",
    "npx",
];
const STARTUP_COMMAND_SET = new Set(STARTUP_COMMANDS);
const WINDOWS_SHELL_COMMAND_PREFERENCE = [
    "pwsh",
    "powershell",
];
const WINDOWS_COMMAND_EXTENSION_PRIORITY = [
    ".exe",
    ".ps1",
    ".cmd",
    ".bat",
    ".com",
    "",
];
let commandRegistry = {
    initialized: false,
    commands: {},
};
export function isPathLikeCommand(commandRaw) {
    const command = normalizeString(commandRaw);
    return /[\\/]/.test(command) || isAbsolutePathLike(command);
}
export function buildPathCommandCandidates(args) {
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
            : WINDOWS_COMMAND_EXTENSION_PRIORITY
        : [""];
    const candidates = [];
    for (const extension of extensions) {
        for (const entry of pathEntries) {
            candidates.push(joinNativePath(entry, `${command}${extension}`));
        }
    }
    return Array.from(new Set(candidates));
}
function summarizeMissingCommand(command, checkedCandidates) {
    if (checkedCandidates.length === 0) {
        return `Command "${command}" was not found in PATH`;
    }
    return `Command "${command}" was not found; checked candidates: ${checkedCandidates.join(", ")}`;
}
async function defaultPathExists(path) {
    return runtimePathExists(path);
}
async function defaultReadTextFile(pathRaw) {
    const path = normalizeString(pathRaw);
    if (!path) {
        return "";
    }
    return readRuntimeTextFile(path);
}
function getWindowsCommandExtension(pathRaw) {
    const match = normalizeString(pathRaw).match(/(\.[^.\\/]+)$/);
    return (match?.[1] || "").toLowerCase();
}
function replaceWindowsCommandExtension(pathRaw, extension) {
    const path = normalizeString(pathRaw);
    if (!path) {
        return "";
    }
    if (/\.[^.\\/]+$/.test(path)) {
        return path.replace(/\.[^.\\/]+$/, extension);
    }
    return `${path}${extension}`;
}
function isWindowsCommandExecutable(pathRaw) {
    return /\.exe$/i.test(normalizeString(pathRaw));
}
function isWindowsCommandLaunchShim(pathRaw) {
    return /\.(ps1|cmd|bat)$/i.test(normalizeString(pathRaw));
}
function buildWindowsCommandFamily(pathRaw) {
    const path = normalizeString(pathRaw);
    if (!path || !/\.(exe|ps1|cmd|bat|com)$/i.test(path)) {
        return [path].filter(Boolean);
    }
    const candidates = WINDOWS_COMMAND_EXTENSION_PRIORITY.map((extension) => replaceWindowsCommandExtension(path, extension));
    return Array.from(new Set(candidates.filter(Boolean)));
}
function rankWindowsCommandPath(pathRaw) {
    const extension = getWindowsCommandExtension(pathRaw);
    const index = WINDOWS_COMMAND_EXTENSION_PRIORITY.indexOf(extension);
    return index >= 0 ? index : WINDOWS_COMMAND_EXTENSION_PRIORITY.length;
}
function joinWindowsPathFromBase(baseDir, relativePath) {
    const cleanedRelative = normalizeString(relativePath).replace(/^[/\\]+/, "");
    if (!cleanedRelative) {
        return "";
    }
    return `${baseDir.replace(/[\\/]+$/, "")}\\${cleanedRelative.replace(/[\\/]+/g, "\\")}`;
}
function getWindowsDirName(pathRaw) {
    const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function parseDirectExecutableFromWindowsShim(args) {
    const shimPath = normalizeString(args.shimPath);
    const shimText = String(args.shimText || "");
    const baseDir = getWindowsDirName(shimPath);
    if (!shimPath || !shimText || !baseDir) {
        return "";
    }
    const ps1Match = shimText.match(/&\s+"\$(?:basedir|PSScriptRoot)[\\/]+([^"]+?\.exe)"\s+(?:\$args|@args)/iu) ||
        shimText.match(/&\s+'\$(?:basedir|PSScriptRoot)[\\/]+([^']+?\.exe)'\s+(?:\$args|@args)/iu);
    if (ps1Match?.[1]) {
        return joinWindowsPathFromBase(baseDir, ps1Match[1]);
    }
    const cmdMatch = shimText.match(/"%~?dp0[\\/]+([^"]+?\.exe)"\s+%[*0-9]/iu) ||
        shimText.match(/"%~?dp0%[\\/]+([^"]+?\.exe)"\s+%[*0-9]/iu);
    if (cmdMatch?.[1]) {
        return joinWindowsPathFromBase(baseDir, cmdMatch[1]);
    }
    return "";
}
async function resolveWindowsShimExecutable(args) {
    const shimPath = normalizeString(args.shimPath);
    if (!isWindowsCommandLaunchShim(shimPath)) {
        return "";
    }
    const sameStemExe = replaceWindowsCommandExtension(shimPath, ".exe");
    if (sameStemExe &&
        sameStemExe.toLowerCase() !== shimPath.toLowerCase() &&
        (await args.exists(sameStemExe))) {
        return sameStemExe;
    }
    let shimText = "";
    try {
        shimText = await args.readText(shimPath);
    }
    catch {
        shimText = "";
    }
    const parsedExe = parseDirectExecutableFromWindowsShim({
        shimPath,
        shimText,
    });
    if (parsedExe && (await args.exists(parsedExe))) {
        return parsedExe;
    }
    return "";
}
async function normalizeWindowsResolvedCommandPath(args) {
    const candidate = normalizeString(args.candidate);
    if (!candidate || !/\.(exe|ps1|cmd|bat)$/i.test(candidate)) {
        return candidate;
    }
    if (isWindowsCommandExecutable(candidate)) {
        return candidate;
    }
    const candidateRank = rankWindowsCommandPath(candidate);
    const family = buildWindowsCommandFamily(candidate);
    for (const familyCandidate of family) {
        if (familyCandidate.toLowerCase() === candidate.toLowerCase()) {
            break;
        }
        if (rankWindowsCommandPath(familyCandidate) >= candidateRank) {
            continue;
        }
        if (!(await args.exists(familyCandidate))) {
            continue;
        }
        if (isWindowsCommandLaunchShim(candidate) &&
            isWindowsCommandExecutable(familyCandidate)) {
            args.checkedCandidates.push(`windows-shim-exe:${candidate}->${familyCandidate}`);
            return familyCandidate;
        }
        const resolvedExe = await resolveWindowsShimExecutable({
            shimPath: familyCandidate,
            exists: args.exists,
            readText: args.readText,
        });
        if (resolvedExe) {
            args.checkedCandidates.push(`windows-shim-exe:${familyCandidate}->${resolvedExe}`);
            return resolvedExe;
        }
        args.checkedCandidates.push(`windows-priority:${familyCandidate}`);
        return familyCandidate;
    }
    const resolvedExe = await resolveWindowsShimExecutable({
        shimPath: candidate,
        exists: args.exists,
        readText: args.readText,
    });
    if (resolvedExe) {
        args.checkedCandidates.push(`windows-shim-exe:${candidate}->${resolvedExe}`);
        return resolvedExe;
    }
    return candidate;
}
function quoteCommandLineToken(value) {
    const normalized = String(value || "");
    if (!/[\s"&()^|<>]/.test(normalized)) {
        return normalized;
    }
    return `"${normalized.replace(/(["^&|<>])/g, "^$1")}"`;
}
function formatCommandLine(command, args) {
    return [command, ...args]
        .map((entry) => quoteCommandLineToken(entry))
        .join(" ");
}
function quotePowerShellSingleQuoted(value) {
    return `'${String(value || "").replace(/'/g, "''")}'`;
}
function quoteCmdToken(value) {
    return `"${String(value || "").replace(/"/g, '""')}"`;
}
function buildCmdInvokeScript(command, args) {
    const commandLine = [command, ...args]
        .map((entry) => quoteCmdToken(entry))
        .join(" ");
    return `"${commandLine}"`;
}
function buildCmdShimArgs(command, args) {
    return ["/d", "/s", "/c", buildCmdInvokeScript(command, args)];
}
function buildPowerShellScriptArgs(command, args) {
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
function buildPowerShellBareCommandArgs(command, args) {
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
function isWindowsCommandShim(command) {
    return /\.(cmd|bat)$/i.test(normalizeString(command));
}
function isWindowsPowerShellScript(command) {
    return /\.ps1$/i.test(normalizeString(command));
}
function isWindowsBareCommand(command) {
    const normalized = normalizeString(command);
    return (!!normalized &&
        !isPathLikeCommand(normalized) &&
        !/\.(cmd|bat|ps1|exe|com)$/i.test(normalized));
}
export function buildRuntimeCommandLaunchSpec(args) {
    const command = normalizeString(args.resolvedCommand) || normalizeString(args.command);
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
export function buildRuntimeCommandLaunchPlan(args) {
    const commandArgs = Array.isArray(args.commandArgs)
        ? [...args.commandArgs]
        : [];
    const resolution = args.resolution;
    const requestedCommand = normalizeString(args.command);
    const platform = normalizeString(args.platform) || detectRuntimePlatform();
    if (args.preferWindowsBareCommandPowerShell === true &&
        platform === "win32" &&
        isWindowsBareCommand(requestedCommand)) {
        const shellCommand = getWindowsPowerShellCommandForLaunch(platform);
        const shellArgs = buildPowerShellBareCommandArgs(requestedCommand, commandArgs);
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
    const resolvedCommand = normalizeString(resolution?.resolvedPath) ||
        normalizeString(args.resolvedCommand) ||
        requestedCommand;
    const launch = resolution?.launch ||
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
        commandLine: formatCommandLine(launch.command || resolvedCommand, commandArgs),
    };
}
export function buildRuntimeCommandNestedArgs(args) {
    const resolvedCommand = normalizeString(args.resolution?.resolvedPath) ||
        normalizeString(args.resolvedCommand);
    const launchPlan = buildRuntimeCommandLaunchPlan({
        ...args,
        preferWindowsBareCommandPowerShell: args.preferWindowsBareCommandPowerShell ?? !resolvedCommand,
    });
    return [launchPlan.command, ...launchPlan.args];
}
function withLaunchSpec(resolution, platform) {
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
export function buildNonInteractiveCommandCandidates(args) {
    const command = normalizeString(args.command);
    if (!command || isPathLikeCommand(command) || args.platform === "win32") {
        return [];
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
export function getWindowsShellCommandForLaunch(commandRaw, platform) {
    const candidates = getWindowsShellCommandCandidates(commandRaw, platform);
    return normalizeString(candidates[0]) || normalizeString(commandRaw);
}
function getWindowsCmdShellCommandForLaunch(platform) {
    return getWindowsShellCommandForLaunch("cmd.exe", platform);
}
function getWindowsPowerShellCommandForLaunch(platform) {
    return (getPreferredWindowsShellCommandsFromRegistry()[0] ||
        getWindowsShellCommandForLaunch("powershell.exe", platform));
}
export function getPreferredWindowsShellCommandsFromRegistry(snapshot = commandRegistry) {
    const commands = [];
    for (const command of WINDOWS_SHELL_COMMAND_PREFERENCE) {
        const resolved = snapshot.commands[command];
        if (resolved?.available !== true) {
            continue;
        }
        const shellCommand = normalizeString(resolved.resolvedPath || resolved.launch?.command);
        if (shellCommand &&
            !commands.some((entry) => entry.toLowerCase() === shellCommand.toLowerCase())) {
            commands.push(shellCommand);
        }
    }
    return commands;
}
export async function resolveRuntimeCommand(commandRaw, options) {
    const command = normalizeString(commandRaw);
    const cached = getCachedRuntimeCommand(command);
    if (cached) {
        return cached;
    }
    const checkedCandidates = [];
    const platform = normalizeString(options?.platform) || detectRuntimePlatform();
    const exists = options?.exists || defaultPathExists;
    const readText = options?.readText || defaultReadTextFile;
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
            const resolvedPath = platform === "win32"
                ? await normalizeWindowsResolvedCommandPath({
                    candidate: command,
                    exists,
                    readText,
                    checkedCandidates,
                })
                : command;
            return withLaunchSpec({
                command,
                available: true,
                resolvedPath,
                source: "path-like",
                checkedCandidates,
            }, platform);
        }
        return {
            command,
            available: false,
            checkedCandidates,
            diagnostic: `Command "${command}" is not executable`,
        };
    }
    const pathSearch = options?.pathSearch ?? getMozillaSubprocessModule()?.pathSearch;
    const resolvedFromPathSearch = await resolveTrustedPathSearchResult({
        command,
        pathSearch,
        platform,
    });
    if (resolvedFromPathSearch) {
        checkedCandidates.push(`pathSearch:${command}`);
        const resolvedPath = platform === "win32"
            ? await normalizeWindowsResolvedCommandPath({
                candidate: resolvedFromPathSearch,
                exists,
                readText,
                checkedCandidates,
            })
            : resolvedFromPathSearch;
        return withLaunchSpec({
            command,
            available: true,
            resolvedPath,
            source: "pathSearch",
            checkedCandidates,
        }, platform);
    }
    for (const candidate of buildPathCommandCandidates({
        command,
        pathValue: options?.pathValue,
        platform,
    })) {
        checkedCandidates.push(candidate);
        if (await exists(candidate)) {
            const resolvedPath = platform === "win32"
                ? await normalizeWindowsResolvedCommandPath({
                    candidate,
                    exists,
                    readText,
                    checkedCandidates,
                })
                : candidate;
            return withLaunchSpec({
                command,
                available: true,
                resolvedPath,
                source: "path",
                checkedCandidates,
            }, platform);
        }
    }
    if (platform === "win32") {
        const windowsSources = [
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
                resolve: () => resolveWindowsCommandFromGlobalNpmRoot(command, platform),
            },
            {
                source: "windows-node-install",
                resolve: () => resolveWindowsCommandFromNodeInstallRoot(command, platform),
            },
        ];
        for (const source of windowsSources) {
            const resolved = await source.resolve();
            checkedCandidates.push(...resolved.map((entry) => `${source.source}:${entry}`));
            if (resolved.length > 0) {
                const resolvedPath = await normalizeWindowsResolvedCommandPath({
                    candidate: normalizeString(resolved[0]),
                    exists,
                    readText,
                    checkedCandidates,
                });
                return withLaunchSpec({
                    command,
                    available: true,
                    resolvedPath,
                    source: source.source,
                    checkedCandidates,
                }, platform);
            }
        }
    }
    else {
        for (const candidate of buildNonInteractiveCommandCandidates({
            command,
            platform,
            homeDir: options?.homeDir ?? readRuntimeEnv("HOME"),
        })) {
            checkedCandidates.push(candidate);
            if (await exists(candidate)) {
                return withLaunchSpec({
                    command,
                    available: true,
                    resolvedPath: candidate,
                    source: "posix-non-interactive",
                    checkedCandidates,
                }, platform);
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
function cloneResolution(value) {
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
export async function preflightRuntimeCommandsOnStartup(options) {
    const commands = options?.commands || STARTUP_COMMANDS;
    const platform = normalizeString(options?.platform) || detectRuntimePlatform();
    const entries = await Promise.all(commands.map(async (command) => {
        try {
            const resolvedRaw = options?.resolver
                ? await options.resolver(command)
                : await resolveRuntimeCommand(command);
            const resolved = withLaunchSpec(resolvedRaw, platform);
            return [command, resolved];
        }
        catch (error) {
            return [
                command,
                {
                    command,
                    available: false,
                    checkedCandidates: [],
                    diagnostic: error instanceof Error ? error.message : String(error),
                },
            ];
        }
    }));
    commandRegistry = {
        initialized: true,
        initializedAt: new Date().toISOString(),
        commands: Object.fromEntries(entries),
    };
    commandRegistry.primaryPython = getPrimaryPythonCommand(commandRegistry);
    return getRuntimeCommandRegistrySnapshot();
}
export function seedRuntimeCommandRegistryForTests(snapshot) {
    commandRegistry = {
        initialized: snapshot.initialized,
        initializedAt: snapshot.initializedAt,
        commands: Object.fromEntries(Object.entries(snapshot.commands).map(([key, value]) => [
            key,
            value ? cloneResolution(value) : value,
        ])),
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
        commands: Object.fromEntries(Object.entries(commandRegistry.commands).map(([key, value]) => [
            key,
            value ? cloneResolution(value) : value,
        ])),
        primaryPython: commandRegistry.primaryPython
            ? cloneResolution(commandRegistry.primaryPython)
            : undefined,
    };
}
export function getCachedRuntimeCommand(commandRaw) {
    const command = normalizeString(commandRaw);
    if (!STARTUP_COMMAND_SET.has(command)) {
        return undefined;
    }
    const cached = commandRegistry.commands[command];
    return cached ? cloneResolution(cached) : undefined;
}
export function getPrimaryPythonCommand(snapshot = commandRegistry) {
    for (const command of ["python", "python3", "py"]) {
        const resolved = snapshot.commands[command];
        if (resolved?.available && resolved.resolvedPath) {
            return cloneResolution(resolved);
        }
    }
    return undefined;
}
export async function resolveRuntimeCommandForLaunch(commandRaw) {
    const command = normalizeString(commandRaw);
    const cached = getCachedRuntimeCommand(command);
    if (cached) {
        return cached.available && cached.resolvedPath
            ? cached.resolvedPath
            : command;
    }
    return (await resolveRuntimeCommand(command)).resolvedPath || command;
}
