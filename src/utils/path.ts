import {
  getBaseName as getPlatformBaseName,
  getPathSeparator as getPlatformPathSeparator,
  joinNativePath,
  normalizeNativeLocalPath as normalizePlatformNativeLocalPath,
} from "../platform/path";

export function getPathSeparator(pathHint?: string) {
  return getPlatformPathSeparator(pathHint);
}

export function joinPath(...segments: string[]) {
  return joinNativePath(...segments);
}

export function getBaseName(targetPath: string) {
  return getPlatformBaseName(targetPath);
}

export function normalizeNativeLocalPath(targetPath: string) {
  return normalizePlatformNativeLocalPath(targetPath);
}
