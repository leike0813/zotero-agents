import { joinNativePath, isAbsolutePathLike } from "./path";
import { readRuntimePathEnv, splitPathEntries } from "./env";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

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
