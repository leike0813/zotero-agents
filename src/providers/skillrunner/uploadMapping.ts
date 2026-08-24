import { getBaseName } from "../../utils/path";

function sanitizeUploadPathSegment(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-");
  return normalized || "file";
}

function normalizeUploadRelativePath(value: string) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

export function buildSkillRunnerUploadRelativePath(
  fileKey: string,
  localPath: string,
) {
  const fileName = getBaseName(localPath) || "upload.bin";
  const keySegment = sanitizeUploadPathSegment(fileKey);
  return normalizeUploadRelativePath(`inputs/${keySegment}/${fileName}`);
}
