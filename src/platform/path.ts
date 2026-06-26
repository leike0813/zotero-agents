import { detectRuntimePlatform, type RuntimePlatform } from "./runtimePlatform";

export type PathStyle = "windows" | "posix";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function isWindowsAbsolutePath(pathRaw: unknown) {
  const path = normalizeString(pathRaw);
  return /^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path);
}

export function isPosixAbsolutePath(pathRaw: unknown) {
  return normalizeString(pathRaw).startsWith("/");
}

export function inferPathStyle(pathRaw: unknown): PathStyle | "" {
  const path = normalizeString(pathRaw);
  if (!path) {
    return "";
  }
  if (
    isWindowsAbsolutePath(path) ||
    /^[A-Za-z]:/.test(path) ||
    path.includes("\\")
  ) {
    return "windows";
  }
  if (isPosixAbsolutePath(path)) {
    return "posix";
  }
  return "";
}

export function runtimePathStyle(
  platform?: RuntimePlatform | string,
): PathStyle {
  return detectRuntimePlatform(platform) === "win32" ? "windows" : "posix";
}

export function getPathSeparator(pathHint?: unknown, platform?: string) {
  const style = inferPathStyle(pathHint) || runtimePathStyle(platform);
  return style === "windows" ? "\\" : "/";
}

export function getPathDelimiter(pathHint?: unknown, platform?: string) {
  const style = inferPathStyle(pathHint) || runtimePathStyle(platform);
  return style === "windows" ? ";" : ":";
}

export function isAbsolutePathLike(pathRaw: unknown) {
  const path = normalizeString(pathRaw);
  return isWindowsAbsolutePath(path) || isPosixAbsolutePath(path);
}

export function isNonNativeAbsolutePath(
  pathRaw: unknown,
  platform?: RuntimePlatform | string,
) {
  const path = normalizeString(pathRaw);
  if (!path || !isAbsolutePathLike(path)) {
    return false;
  }
  return (
    detectRuntimePlatform(platform) !== "win32" && isWindowsAbsolutePath(path)
  );
}

export function joinNativePath(...segments: string[]) {
  const normalizedSegments = segments
    .map((segment) => String(segment || ""))
    .filter(Boolean);
  const firstNonEmpty =
    normalizedSegments.find((segment) => segment.length > 0) || "";
  const separator = getPathSeparator(firstNonEmpty);
  const isPosixAbsolute =
    inferPathStyle(firstNonEmpty) !== "windows" &&
    firstNonEmpty.startsWith("/");
  const isUnc = /^\\\\/.test(firstNonEmpty);
  const driveMatch = firstNonEmpty.match(/^([A-Za-z]:)[\\/]?/);
  const drivePrefix = driveMatch?.[1] || "";
  const normalized = normalizedSegments
    .flatMap((segment) => segment.split(/[\\/]+/))
    .filter(Boolean);

  if (normalized.length === 0) {
    if (drivePrefix) {
      return `${drivePrefix}${separator}`;
    }
    return isPosixAbsolute ? separator : "";
  }

  if (
    drivePrefix &&
    normalized[0]?.toLowerCase() === drivePrefix.toLowerCase()
  ) {
    normalized.shift();
  }
  const joined = normalized.join(separator);
  if (drivePrefix) {
    return `${drivePrefix}${separator}${joined}`;
  }
  if (isUnc) {
    return `\\\\${joined}`;
  }
  if (isPosixAbsolute) {
    return `${separator}${joined}`;
  }
  return joined;
}

export function getBaseName(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

export function getParentPath(pathRaw: unknown) {
  const path = normalizeString(pathRaw).replace(/[\\/]+$/g, "");
  if (!path) {
    return "";
  }
  if (path === "/" || path === "\\") {
    return path;
  }
  if (/^[A-Za-z]:$/i.test(path)) {
    return `${path}\\`;
  }
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (index < 0) {
    return "";
  }
  if (index === 0) {
    return path[0];
  }
  if (index === 2 && /^[A-Za-z]:/.test(path)) {
    return `${path.slice(0, 2)}\\`;
  }
  return path.slice(0, index);
}

export function normalizeNativeLocalPath(targetPath: string) {
  const path = normalizeString(targetPath);
  if (!path) {
    return "";
  }
  if (inferPathStyle(path) === "windows" && /^[A-Za-z]:\//.test(path)) {
    return path.replace(/\//g, "\\");
  }
  return path;
}

export function normalizePortablePath(targetPath: string) {
  return normalizeString(targetPath).replace(/\\/g, "/");
}

export const platformPathInternalsForTests = {
  inferPathStyle,
  runtimePathStyle,
};
