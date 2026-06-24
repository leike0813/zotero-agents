import { getBaseName } from "../../utils/path";

export function resolveTargetParentIDFromRequest(request: unknown) {
  const parsed = request as { targetParentID?: number };
  return typeof parsed.targetParentID === "number"
    ? parsed.targetParentID
    : null;
}

function resolveAttachmentPathsFromRequest(request: unknown) {
  const typed = request as {
    sourceAttachmentPaths?: unknown;
    request?: { json?: { attachment_paths?: unknown } };
    attachment_paths?: unknown;
  };
  const fromSource = Array.isArray(typed.sourceAttachmentPaths)
    ? typed.sourceAttachmentPaths
    : [];
  const fromRequestJson = Array.isArray(typed.request?.json?.attachment_paths)
    ? typed.request?.json?.attachment_paths || []
    : [];
  const fromTopLevel = Array.isArray(typed.attachment_paths)
    ? typed.attachment_paths || []
    : [];
  return [...fromSource, ...fromRequestJson, ...fromTopLevel]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function readContextValue(request: unknown, key: string) {
  const typed = request as {
    context?: Record<string, unknown>;
    request?: { json?: Record<string, unknown> };
    [k: string]: unknown;
  };
  const fromContext = typed.context?.[key];
  if (typeof fromContext === "string" || typeof fromContext === "number") {
    return String(fromContext).trim();
  }
  const fromJson = typed.request?.json?.[key];
  if (typeof fromJson === "string" || typeof fromJson === "number") {
    return String(fromJson).trim();
  }
  const fromTop = typed[key];
  if (typeof fromTop === "string" || typeof fromTop === "number") {
    return String(fromTop).trim();
  }
  return "";
}

function normalizeIdentityValue(value: string) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/");
}

function resolveParentTaskName(targetParentID: number | null) {
  if (!targetParentID) {
    return "";
  }
  const parent = Zotero.Items.get(targetParentID);
  if (!parent) {
    return "";
  }
  const title = String(parent.getField?.("title") || "").trim();
  return title || "";
}

export function resolveTaskNameFromRequest(request: unknown, index: number) {
  const fromRequest = String(
    (request as { taskName?: unknown }).taskName || "",
  ).trim();
  if (fromRequest) {
    return fromRequest;
  }
  const attachmentPaths = resolveAttachmentPathsFromRequest(request);
  if (attachmentPaths.length > 0) {
    return getBaseName(attachmentPaths[0]) || attachmentPaths[0];
  }
  const targetParentID = resolveTargetParentIDFromRequest(request);
  const parentName = resolveParentTaskName(targetParentID);
  if (parentName) {
    return parentName;
  }
  return `task-${index + 1}`;
}

export function resolveInputUnitIdentityFromRequest(request: unknown) {
  const itemKey = readContextValue(request, "source_attachment_item_key");
  if (itemKey) {
    return `attachment-key:${itemKey}`;
  }

  const itemId = readContextValue(request, "source_attachment_item_id");
  if (itemId) {
    return `attachment-id:${itemId}`;
  }

  const attachmentPaths = resolveAttachmentPathsFromRequest(request);
  if (attachmentPaths.length > 0) {
    return `attachment-path:${normalizeIdentityValue(attachmentPaths[0])}`;
  }

  const sourcePath = readContextValue(request, "source_attachment_path");
  if (sourcePath) {
    return `attachment-path:${normalizeIdentityValue(sourcePath)}`;
  }

  const targetParentID = resolveTargetParentIDFromRequest(request);
  if (targetParentID) {
    return `parent-id:${targetParentID}`;
  }

  return "";
}

export function resolveInputUnitLabelFromRequest(
  request: unknown,
  index: number,
) {
  return resolveTaskNameFromRequest(request, index);
}
