import { getBaseName as getPlatformBaseName, getPathSeparator as getPlatformPathSeparator, joinNativePath, normalizeNativeLocalPath as normalizePlatformNativeLocalPath, } from "../platform/path";
export function getPathSeparator(pathHint) {
    return getPlatformPathSeparator(pathHint);
}
export function joinPath(...segments) {
    return joinNativePath(...segments);
}
export function getBaseName(targetPath) {
    return getPlatformBaseName(targetPath);
}
export function normalizeNativeLocalPath(targetPath) {
    return normalizePlatformNativeLocalPath(targetPath);
}
