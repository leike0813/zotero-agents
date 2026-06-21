export function getPathSeparator() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  if (typeof runtime.Zotero?.isWin === "boolean") {
    return runtime.Zotero.isWin ? "\\" : "/";
  }
  return runtime.process?.platform === "win32" ? "\\" : "/";
}

export function joinPath(...segments: string[]) {
  const normalizedSegments = segments
    .map((segment) => String(segment || ""))
    .filter(Boolean);
  const separator = getPathSeparator();
  const firstNonEmpty = normalizedSegments.find((segment) => segment.length > 0) || "";
  const isPosixAbsolute = firstNonEmpty.startsWith("/");
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
    normalized[0].toLowerCase() === drivePrefix.toLowerCase()
  ) {
    normalized.shift();
  }
  const joined = normalized.join(separator);
  if (drivePrefix) {
    return `${drivePrefix}${separator}${joined}`;
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

export function normalizeNativeLocalPath(targetPath: string) {
  const path = String(targetPath || "").trim();
  if (!path) {
    return "";
  }
  if (getPathSeparator() === "\\" && /^[A-Za-z]:\//.test(path)) {
    return path.replace(/\//g, "\\");
  }
  return path;
}
