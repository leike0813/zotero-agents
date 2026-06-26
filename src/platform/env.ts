import { getPathDelimiter } from "./path";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function readRuntimeEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const processValue = normalizeString(runtime.process?.env?.[name]);
  if (processValue) {
    return processValue;
  }
  try {
    return normalizeString(runtime.Services?.env?.get?.(name));
  } catch {
    return "";
  }
}

export function readRuntimePathEnv() {
  return (
    readRuntimeEnv("PATH") || readRuntimeEnv("Path") || readRuntimeEnv("path")
  );
}

export function splitPathEntries(
  pathValue: string | undefined,
  pathHint?: string,
) {
  return String(pathValue || "")
    .split(getPathDelimiter(pathHint || pathValue))
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

export function mergePathEntries(
  pathValue: string | undefined,
  entriesRaw: Array<string | undefined>,
  pathHint?: string,
) {
  const delimiter = getPathDelimiter(pathHint || pathValue);
  const parts = splitPathEntries(pathValue, pathHint);
  for (const entry of entriesRaw
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .reverse()) {
    if (parts.some((part) => part.toLowerCase() === entry.toLowerCase())) {
      continue;
    }
    parts.unshift(entry);
  }
  return parts.join(delimiter);
}

export function prependPathEntry(pathValue: string | undefined, entry: string) {
  return mergePathEntries(pathValue, [entry], entry);
}
