function normalizeString(value) {
  return String(value || "").trim();
}

function toNativePath(value) {
  const text = normalizeString(value);
  if (/^[A-Za-z]:\//.test(text)) {
    return text.replace(/\//g, "\\");
  }
  return text;
}

export function dirnamePath(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  const hasDrive = /^[A-Za-z]:/.test(parts[0]);
  const prefix = normalized.startsWith("/") ? "/" : "";
  const joined = parts.slice(0, -1).join("/");
  if (hasDrive) {
    return toNativePath(joined);
  }
  return toNativePath(`${prefix}${joined}`);
}

export function basenamePath(filePath) {
  const parts = String(filePath || "")
    .split(/[\\/]+/)
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

export function joinPath(baseDir, name) {
  const left = String(baseDir || "").replace(/[\\/]+$/, "");
  const right = String(name || "").replace(/^[\\/]+/, "");
  if (!left) {
    return toNativePath(right);
  }
  if (!right) {
    return toNativePath(left);
  }
  const separator = left.includes("\\") ? "\\" : "/";
  return toNativePath(`${left}${separator}${right}`);
}

export function replaceExtensionAsHtml(filePath) {
  const normalized = normalizeString(filePath);
  if (!normalized) {
    return "";
  }
  if (/\.[^./\\]+$/.test(normalized)) {
    return normalized.replace(/\.[^./\\]+$/, ".html");
  }
  return `${normalized}.html`;
}

export function resolveDeepReadingHtmlPathFromSourcePath(sourcePath) {
  const sourceDir = dirnamePath(sourcePath);
  const htmlName = replaceExtensionAsHtml(basenamePath(sourcePath));
  if (!sourceDir || !htmlName) {
    return "";
  }
  return joinPath(sourceDir, htmlName);
}

export async function resolveAttachmentSourcePath(entry, runtime) {
  const helpers = runtime?.helpers;
  const candidates = [];
  const itemId = Number(entry?.item?.id || 0);
  if (itemId && typeof helpers?.resolveItemRef === "function") {
    try {
      const item = helpers.resolveItemRef(itemId);
      const resolved = normalizeString(await item?.getFilePathAsync?.());
      if (resolved) {
        candidates.push(resolved);
      }
    } catch {
      // Continue with selection snapshot fields.
    }
  }
  if (typeof helpers?.getAttachmentFilePath === "function") {
    candidates.push(helpers.getAttachmentFilePath(entry));
  }
  candidates.push(
    entry?.filePath,
    entry?.path,
    entry?.item?.filePath,
    entry?.item?.data?.path,
  );
  return normalizeString(
    candidates.find((candidate) => normalizeString(candidate)),
  );
}

export function resolveSourcePathFromRequest(request) {
  const root = request && typeof request === "object" ? request : {};
  const context =
    root.context && typeof root.context === "object" ? root.context : {};
  const manifest =
    context.source_manifest && typeof context.source_manifest === "object"
      ? context.source_manifest
      : {};
  const source =
    manifest.source && typeof manifest.source === "object" ? manifest.source : {};
  const fromList = Array.isArray(root.sourceAttachmentPaths)
    ? normalizeString(root.sourceAttachmentPaths[0])
    : "";
  return (
    normalizeString(source.path) ||
    normalizeString(context.source_attachment_path) ||
    fromList
  );
}

export function normalizePathForCompare(targetPath) {
  return normalizeString(targetPath)
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}
