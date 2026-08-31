import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEntryPath(value) {
  const path = normalizeText(value).replace(/\\/g, "/");
  if (
    !path ||
    path.startsWith("/") ||
    /^[A-Za-z]:\//.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`unsafe bundle entry path: ${path}`);
  }
  return path;
}

function dirnamePath(value) {
  const normalized = String(value || "").replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "" : normalized.slice(0, index);
}

function joinLocalPath(base, relative) {
  const separator = String(base || "").includes("\\") ? "\\" : "/";
  const segments = `${String(base || "").replace(/[\\/]+$/, "")}/${String(relative || "")}`
    .replace(/\\/g, "/")
    .split("/");
  const output = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      output.pop();
      continue;
    }
    output.push(segment);
  }
  const drive = String(base || "").match(/^([A-Za-z]:)/)?.[1] || "";
  const absolute = String(base || "").startsWith("/");
  if (drive) {
    if (output[0]?.toLowerCase() === drive.toLowerCase()) output.shift();
    return `${drive}${separator}${output.join(separator)}`;
  }
  return `${absolute ? separator : ""}${output.join(separator)}`;
}

function splitDestinationSuffix(value) {
  const match = String(value || "").match(/^([^?#]*)([?#].*)?$/);
  return { path: match?.[1] || "", suffix: match?.[2] || "" };
}

function localDestinationPath(destination, sourcePath) {
  const raw = normalizeText(destination).replace(/^<|>$/g, "");
  if (/^(?:https?:|data:)/i.test(raw)) return null;
  const { path, suffix } = splitDestinationSuffix(raw);
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Preserve undecodable paths for the existence resolver.
  }
  if (/^file:/i.test(decoded)) {
    try {
      const url = new URL(decoded);
      let pathname = decodeURIComponent(url.pathname || "");
      if (/^\/[A-Za-z]:\//.test(pathname)) pathname = pathname.slice(1);
      return { path: pathname, suffix };
    } catch {
      return null;
    }
  }
  if (/^(?:[A-Za-z]:[\\/]|\/)/.test(decoded)) {
    return { path: decoded, suffix };
  }
  return { path: joinLocalPath(dirnamePath(sourcePath), decoded), suffix };
}

function normalizedLocalPath(value) {
  return joinLocalPath(String(value || "").replace(/\\/g, "/"), "").replace(
    /\\/g,
    "/",
  );
}

function sourceTreeRelativePath(sourcePath, candidatePath) {
  const root = normalizedLocalPath(dirnamePath(sourcePath));
  const candidate = normalizedLocalPath(candidatePath);
  const comparisonRoot = /^[A-Za-z]:\//.test(root) ? root.toLowerCase() : root;
  const comparisonCandidate = /^[A-Za-z]:\//.test(candidate)
    ? candidate.toLowerCase()
    : candidate;
  if (!comparisonRoot || comparisonCandidate === comparisonRoot) {
    return null;
  }
  if (!comparisonCandidate.startsWith(`${comparisonRoot}/`)) {
    return null;
  }
  return candidate.slice(root.length + 1);
}

function encodeMarkdownRelativePath(value) {
  return String(value || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function rewriteMarkdownLocalImages(args) {
  const source = String(args?.markdown || "");
  const resolveLocalPath = args?.resolveLocalPath;
  const preserveSourceTree =
    args?.assetPolicy?.kind === "preserve-source-tree";
  const assets = [];
  const warnings = [];
  const bySource = new Map();
  const matches = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    matches.push({
      index: match.index,
      full: match[0],
      alt: match[1],
      destination: match[2],
    });
  }
  let markdown = source;
  for (const match of matches.reverse()) {
    const local = localDestinationPath(match.destination, args?.sourcePath);
    if (!local) continue;
    const sourceRelativePath = preserveSourceTree
      ? sourceTreeRelativePath(args?.sourcePath, local.path)
      : "";
    if (preserveSourceTree && !sourceRelativePath) {
      warnings.push({
        code: "markdown_image_outside_source_tree",
        path: local.path,
      });
      continue;
    }
    let resolved;
    try {
      resolved = await resolveLocalPath?.(local.path);
    } catch {
      warnings.push({
        code: "markdown_image_missing",
        path: local.path,
        reason: "probe_failed",
      });
      continue;
    }
    if (!resolved) {
      warnings.push({ code: "markdown_image_missing", path: local.path });
      continue;
    }
    let asset = bySource.get(resolved);
    if (!asset) {
      const id = `m${assets.length + 1}`;
      const name = sanitizeFileNameSegment(getBaseName(resolved)).replace(
        /\s+/g,
        "-",
      );
      const relativePath = preserveSourceTree
        ? normalizeEntryPath(sourceRelativePath)
        : `assets/${id}/${name}`;
      asset = { id, sourcePath: resolved, relativePath };
      bySource.set(resolved, asset);
      assets.push(asset);
    }
    const markdownPath = preserveSourceTree
      ? encodeMarkdownRelativePath(asset.relativePath)
      : asset.relativePath;
    const replacement = `![${match.alt}](${markdownPath}${local.suffix})`;
    markdown = `${markdown.slice(0, match.index)}${replacement}${markdown.slice(match.index + match.full.length)}`;
  }
  return { markdown, assets, warnings };
}
