function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value || "").trim();
}

function sanitizeFileName(value) {
  return normalizeString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "debug-apply-artifact";
}

function resolvePathSeparator(segments) {
  const first = segments.map(normalizeString).find(Boolean) || "";
  if (/^[A-Za-z]:[\\/]/.test(first) || first.includes("\\")) {
    return "\\";
  }
  return "/";
}

function joinPath(...segments) {
  const normalizedSegments = segments.map(normalizeString).filter(Boolean);
  const separator = resolvePathSeparator(normalizedSegments);
  const first = normalizedSegments[0] || "";
  const isPosixAbsolute = first.startsWith("/");
  const driveMatch = first.match(/^([A-Za-z]:)[\\/]?/);
  const drivePrefix = driveMatch?.[1] || "";
  const parts = normalizedSegments
    .flatMap((segment) => segment.split(/[\\/]+/))
    .filter(Boolean);

  if (drivePrefix && parts[0]?.toLowerCase() === drivePrefix.toLowerCase()) {
    parts.shift();
  }
  if (parts.length === 0) {
    return drivePrefix ? `${drivePrefix}${separator}` : isPosixAbsolute ? separator : "";
  }
  const joined = parts.join(separator);
  if (drivePrefix) {
    return `${drivePrefix}${separator}${joined}`;
  }
  return isPosixAbsolute ? `${separator}${joined}` : joined;
}

function getCanonicalResult(args) {
  if (isRecord(args?.resultContext?.resultJson)) {
    return args.resultContext.resultJson;
  }
  if (isRecord(args?.runResult?.resultJson)) {
    return args.runResult.resultJson;
  }
  return {};
}

function resolveParentRef(args, result) {
  return (
    args?.parent ||
    args?.request?.targetParentID ||
    result.parent_item_id ||
    result.target_parent_id ||
    null
  );
}

async function resolveParent(args, result) {
  const ref = resolveParentRef(args, result);
  if (ref && args?.runtime?.helpers?.resolveItemRef) {
    return args.runtime.helpers.resolveItemRef(ref);
  }
  if (ref) {
    return ref;
  }
  const workflowId =
    normalizeString(result.workflow_id) ||
    normalizeString(args?.manifest?.id) ||
    "debug-apply-contract";
  const runKey = normalizeString(result.run_key) || Math.random().toString(36).slice(2, 8);
  return args.runtime.handlers.item.create({
    itemType: "journalArticle",
    fields: { title: `${workflowId} ${runKey}` },
  });
}

async function readBundleArtifact(args, result) {
  const artifactPath = normalizeString(result.artifact_path);
  const fallbackPath = "result/debug-apply-artifact.txt";
  if (args?.resultContext?.readArtifactText) {
    return args.resultContext.readArtifactText({
      fieldName: "artifact_path",
      rawPath: artifactPath,
      fallbackPath,
    });
  }
  const entryPath = artifactPath || fallbackPath;
  const text = await args.bundleReader.readText(entryPath);
  return {
    text,
    entryPath,
    candidates: [entryPath],
  };
}

async function writeAttachmentSource(args, result, text) {
  const fileApi = args?.runtime?.hostApi?.file;
  if (!fileApi?.getTempDirectoryPath || !fileApi?.writeText) {
    throw new Error("debug apply contract bundle apply requires host file api");
  }
  const workflowId =
    normalizeString(result.workflow_id) ||
    normalizeString(args?.manifest?.id) ||
    "debug-apply-contract";
  const stepId = normalizeString(result.step_id) || "bundle";
  const runKey = normalizeString(result.run_key) || "run";
  const fileName = `${sanitizeFileName(workflowId)}-${sanitizeFileName(stepId)}-${sanitizeFileName(runKey)}.txt`;
  const filePath = joinPath(fileApi.getTempDirectoryPath(), fileName);
  await fileApi.writeText(filePath, text);
  return filePath;
}

async function applyBundle(args, parent, result) {
  const artifact = await readBundleArtifact(args, result);
  const filePath = await writeAttachmentSource(args, result, artifact.text);
  const attachment = await args.runtime.handlers.attachment.createFromPath({
    parent: parent.id || parent,
    path: filePath,
    title: `${normalizeString(result.step_id) || "bundle"} debug bundle artifact`,
    mimeType: "text/plain",
  });
  return {
    applied: true,
    mode: "bundle",
    parentItemId: parent.id || null,
    attachmentId: attachment?.id || null,
    artifactEntryPath: artifact.entryPath,
    artifactText: artifact.text,
  };
}

async function applyResultMode(args, parent, result) {
  const workflowId =
    normalizeString(result.workflow_id) ||
    normalizeString(args?.manifest?.id) ||
    "debug-apply-contract";
  const stepId = normalizeString(result.step_id) || "result";
  const runKey = normalizeString(result.run_key) || "run";
  const tag = normalizeString(result.tag) || `debug-result:${runKey}`;
  const tags = [
    "debug-apply",
    `debug-workflow:${workflowId}`,
    `debug-step:${stepId}`,
    tag,
  ];
  await args.runtime.handlers.tag.add(parent.id || parent, tags);
  return {
    applied: true,
    mode: "result",
    parentItemId: parent.id || null,
    tags,
  };
}

export async function applyResult(args) {
  if (!args?.runtime?.handlers?.item || !args?.runtime?.handlers?.tag) {
    throw new Error("debug apply contract applyResult requires runtime handlers");
  }
  const result = getCanonicalResult(args);
  const parent = await resolveParent(args, result);
  const mode = normalizeString(result.apply_mode);
  const output =
    mode === "bundle"
      ? await applyBundle(args, parent, result)
      : await applyResultMode(args, parent, result);
  return {
    ...output,
    workflowId:
      normalizeString(result.workflow_id) ||
      normalizeString(args?.manifest?.id) ||
      "",
    stepId: normalizeString(result.step_id),
    runKey: normalizeString(result.run_key),
  };
}
