import type {
  AcpSkillRunRequestV1,
  SkillRunnerJobRequestV1,
} from "../providers/contracts";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function cloneRecord(value: unknown) {
  return isRecord(value) ? { ...value } : {};
}

function isAbsoluteLocalPath(value: string) {
  const normalized = normalizeString(value).replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}

function isUploadRelativePath(value: string) {
  const normalized = normalizeString(value)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "");
  return (
    normalized === "inputs" ||
    normalized.startsWith("inputs/") ||
    normalized.startsWith("uploads/")
  );
}

export function adaptSkillRunnerJobToAcpSkillRun(
  request: SkillRunnerJobRequestV1,
): AcpSkillRunRequestV1 {
  if (!request || request.kind !== "skillrunner.job.v1") {
    throw new Error("ACP skill run adapter requires skillrunner.job.v1 request");
  }
  const input = cloneRecord(request.input);
  const uploadFiles = Array.isArray(request.upload_files)
    ? request.upload_files
    : [];

  for (const entry of uploadFiles) {
    const key = normalizeString(entry?.key);
    const localPath = normalizeString(entry?.path);
    if (!key) {
      throw new Error("ACP skill run adapter requires upload_files[].key");
    }
    if (!localPath) {
      throw new Error(`ACP skill run adapter requires upload_files[${key}].path`);
    }
    if (!isAbsoluteLocalPath(localPath)) {
      throw new Error(
        `ACP skill run adapter requires upload_files[${key}].path to be an absolute local path`,
      );
    }
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      throw new Error(
        `ACP skill run adapter requires input.${key} for upload file mapping`,
      );
    }
    input[key] = localPath;
  }

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && isUploadRelativePath(value)) {
      throw new Error(
        `ACP skill run adapter cannot use upload-relative input.${key}: ${value}`,
      );
    }
  }

  return {
    kind: ACP_SKILL_RUN_REQUEST_KIND,
    skill_id: request.skill_id,
    ...(request.taskName ? { taskName: request.taskName } : {}),
    ...(Array.isArray(request.sourceAttachmentPaths)
      ? { sourceAttachmentPaths: [...request.sourceAttachmentPaths] }
      : {}),
    ...(typeof request.targetParentID !== "undefined"
      ? { targetParentID: request.targetParentID }
      : {}),
    ...(Object.keys(input).length > 0 ? { input } : {}),
    ...(request.parameter ? { parameter: { ...request.parameter } } : {}),
    ...(request.runtime_options
      ? { runtime_options: { ...request.runtime_options } }
      : {}),
    ...(request.poll ? { poll: { ...request.poll } } : {}),
    ...(request.fetch_type ? { fetch_type: request.fetch_type } : {}),
  };
}
