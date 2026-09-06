function normalizeString(value) {
  return String(value || "").trim();
}

export function toNativePath(value) {
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

export function normalizePathForCompare(targetPath) {
  return normalizeString(targetPath)
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}
