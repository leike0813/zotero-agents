import { getBaseName } from "../../utils/path";
import { normalizeNativeLocalPath } from "../../utils/path";
function sanitizeUploadPathSegment(value) {
    const normalized = String(value || "")
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, "-");
    return normalized || "file";
}
function normalizeUploadRelativePath(value) {
    return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/\/+/g, "/")
        .replace(/^\/+/, "");
}
export function buildSkillRunnerUploadRelativePath(fileKey, localPath) {
    const fileName = getBaseName(localPath) || "upload.bin";
    const keySegment = sanitizeUploadPathSegment(fileKey);
    return normalizeUploadRelativePath(`inputs/${keySegment}/${fileName}`);
}
function isAbsoluteLocalPath(value) {
    const normalized = String(value || "")
        .trim()
        .replace(/\\/g, "/");
    return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}
export function buildSkillRunnerUploadMapping(input) {
    const mappedInput = { ...input };
    const upload_files = [];
    for (const [key, value] of Object.entries(input)) {
        if (typeof value !== "string" || !isAbsoluteLocalPath(value)) {
            continue;
        }
        const localPath = normalizeNativeLocalPath(value);
        mappedInput[key] = buildSkillRunnerUploadRelativePath(key, localPath);
        upload_files.push({ key, path: localPath });
    }
    return {
        input: mappedInput,
        upload_files,
    };
}
function encodePortableItemRef(ref) {
    const encodedKey = Array.from(ref.key)
        .map((character) => (character.codePointAt(0) || 0).toString(16).padStart(4, "0"))
        .join("");
    return `${ref.libraryId}-${encodedKey || "key"}`;
}
export function buildHostBridgeSelectionBundlePath(ref, filename) {
    const fileName = getBaseName(String(filename || "")) || "attachment.bin";
    const safeFileName = sanitizeUploadPathSegment(fileName);
    return normalizeUploadRelativePath(`selection/files/${encodePortableItemRef(ref)}-${safeFileName}`);
}
