import { readHostPages } from "../../literature-workbench-package/lib/runtime.mjs";

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(value) {
  return String(value || "").replace(/[\\/]+/g, "/").trim();
}

function toNativePath(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (/^[A-Za-z]:\//.test(text)) {
    return text.replace(/\//g, "\\");
  }
  return text;
}

function basenamePath(filePath) {
  const parts = String(filePath || "").split(/[\\/]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function dirnamePath(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) {
    return "";
  }
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return "";
  }
  const rawDir = normalized.slice(0, index);
  return toNativePath(rawDir);
}

function joinPath(...segments) {
  const clean = segments
    .map((entry) => String(entry || ""))
    .filter(Boolean)
    .flatMap((entry) => entry.split(/[\\/]+/))
    .filter(Boolean);
  if (clean.length === 0) {
    return "";
  }
  const first = String(segments[0] || "");
  const hasDrive = /^[A-Za-z]:/.test(first);
  const isPosixAbs = first.startsWith("/");
  const separator = hasDrive || first.includes("\\") ? "\\" : "/";
  const body = clean.join(separator);
  if (hasDrive) {
    const drive = clean[0].match(/^[A-Za-z]:$/) ? clean.shift() : null;
    return toNativePath(
      `${drive || first.slice(0, 2)}${separator}${clean.join(separator)}`,
    );
  }
  if (isPosixAbs) {
    return `${separator}${body}`;
  }
  return toNativePath(body);
}

function replaceExtensionAsMd(fileName) {
  const text = String(fileName || "").trim();
  if (!text) {
    return "";
  }
  if (/\.[^.]+$/.test(text)) {
    return text.replace(/\.[^.]+$/, ".md");
  }
  return `${text}.md`;
}

function comparePath(a, b) {
  return normalizePath(a).toLowerCase() === normalizePath(b).toLowerCase();
}

async function hasLinkedAttachmentForPath(host, parentRef, targetPath) {
  const normalizedTargetPath = normalizePath(targetPath).toLowerCase();
  if (!normalizedTargetPath) {
    return false;
  }
  const attachments = await readHostPages({
    readPage: (page) => host.library.getItemAttachments(parentRef, page),
    getItems: (page) => page.attachments,
    operation: "MinerU attachment read",
  });
  for (const attachment of attachments) {
    const attachmentPath = attachment.file?.state === "available"
      ? attachment.file.path
      : "";
    if (!attachmentPath) {
      continue;
    }
    if (normalizePath(attachmentPath).toLowerCase() === normalizedTargetPath) {
      return true;
    }
  }
  return false;
}

function resolveRequestSource(request) {
  const root = isObject(request) ? request : {};
  const context = isObject(root.context) ? root.context : {};
  const sourceFromList = Array.isArray(root.sourceAttachmentPaths)
    ? String(root.sourceAttachmentPaths[0] || "").trim()
    : "";
  const sourcePath = String(
    context.source_attachment_path || sourceFromList || "",
  ).trim();
  const sourceItemKey = String(context.source_attachment_item_key || "").trim();
  const sourceItemId = Number(context.source_attachment_item_id || 0);
  return {
    sourcePath,
    sourceItemKey,
    sourceItemId: Number.isFinite(sourceItemId) ? sourceItemId : 0,
    sourceItemRef: context.source_attachment_ref || null,
  };
}

function requireFileApi(runtime) {
  const file = runtime?.hostApi?.file;
  if (!file) {
    throw new Error("Workflow Host file API is unavailable");
  }
  return file;
}

async function statPath(file, targetPath) {
  const nativePath = toNativePath(targetPath);
  try {
    const stat = await file.stat(nativePath);
    return {
      exists: true,
      isDir: stat.kind === "directory",
    };
  } catch {
    return {
      exists: false,
      isDir: false,
    };
  }
}

async function ensureDirectory(file, targetPath) {
  const nativePath = toNativePath(targetPath);
  await file.makeDirectory({ path: nativePath });
}

async function readText(file, targetPath) {
  return file.readText(toNativePath(targetPath));
}

async function writeText(file, targetPath, content) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(file, parentDir);
  }
  await file.writeText(toNativePath(targetPath), String(content || ""));
}

async function removePath(file, targetPath) {
  await file.remove({
    path: toNativePath(targetPath),
    recursive: true,
    missing: "ignore",
  });
}

async function movePath(file, sourcePath, targetPath) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(file, parentDir);
  }
  const nativeSourcePath = toNativePath(sourcePath);
  const nativeTargetPath = toNativePath(targetPath);
  const sourceStat = await statPath(file, nativeSourcePath);
  if (!sourceStat.exists) {
    throw new Error(`Source path not found: ${nativeSourcePath}`);
  }
  await file.move({
    sourcePath: nativeSourcePath,
    targetPath: nativeTargetPath,
    overwrite: false,
  });
}

async function copyPath(file, sourcePath, targetPath) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(file, parentDir);
  }
  const nativeSourcePath = toNativePath(sourcePath);
  const nativeTargetPath = toNativePath(targetPath);
  const sourceStat = await statPath(file, nativeSourcePath);
  if (!sourceStat.exists) {
    throw new Error(`Source path not found: ${nativeSourcePath}`);
  }
  if (!sourceStat.isDir) {
    await file.copy({
      sourcePath: nativeSourcePath,
      targetPath: nativeTargetPath,
      overwrite: false,
    });
    return;
  }
  await ensureDirectory(file, nativeTargetPath);
  const children = await listChildren(file, nativeSourcePath);
  for (const child of children) {
    const name = basenamePath(child);
    if (!name) {
      continue;
    }
    await copyPath(file, child, joinPath(nativeTargetPath, name));
  }
}

async function listChildren(file, targetPath) {
  const nativePath = toNativePath(targetPath);
  const result = await file.list({ path: nativePath, recursive: false });
  return result.entries.map((entry) =>
    joinPath(nativePath, entry.relativePath),
  );
}

async function findEntryByBaseName(args) {
  const queue = [args.rootPath];
  const expected = String(args.name || "").toLowerCase();
  while (queue.length > 0) {
    const current = queue.shift();
    const stat = await statPath(args.file, current);
    if (!stat.exists) {
      continue;
    }
    const currentName = basenamePath(current).toLowerCase();
    if (currentName === expected) {
      if (typeof args.isDir !== "boolean" || args.isDir === stat.isDir) {
        return current;
      }
    }
    if (!stat.isDir) {
      continue;
    }
    const children = await listChildren(args.file, current);
    for (const child of children) {
      queue.push(child);
    }
  }
  return "";
}

function rewriteMarkdownImagePaths(markdown, imagesDirName) {
  const name = String(imagesDirName || "").trim();
  if (!name) {
    return String(markdown || "");
  }
  const source = String(markdown || "");
  const replacedMarkdownLinks = source.replace(
    /(\]\()\s*\.?\/?images\//gi,
    `$1${name}/`,
  );
  const replacedHtmlAttributes = replacedMarkdownLinks.replace(
    /((?:src|href)\s*=\s*["'])\s*\.?\/?images\//gi,
    `$1${name}/`,
  );
  return replacedHtmlAttributes.replace(
    /(^|[\s(])\.?\/?images\//gi,
    `$1${name}/`,
  );
}

async function resolveSourceAttachmentMetadata(args) {
  const source = resolveRequestSource(args.request);
  if (!source.sourcePath) {
    throw new Error("mineru applyResult requires request.source_attachment_path");
  }
  const host = args.runtime.hostApi;
  const sourceDetail = source.sourceItemRef
    ? await host.library.getItemDetail(source.sourceItemRef)
    : null;
  const parentRef = sourceDetail?.kind === "attachment"
    ? sourceDetail.item.parentRef
    : null;
  if (!parentRef) throw new Error("mineru applyResult cannot resolve source parent ref");
  const sourceItemKey = String(
    source.sourceItemKey || source.sourceItemRef?.key || "",
  ).trim();
  if (!sourceItemKey) {
    throw new Error("mineru applyResult cannot resolve source attachment item key");
  }
  return {
    parentRef,
    sourcePath: source.sourcePath,
    sourceItemKey,
  };
}

function resolveBundleExtractedDir(bundleReader) {
  if (typeof bundleReader?.getExtractedDir !== "function") {
    throw new Error("mineru applyResult requires bundleReader.getExtractedDir()");
  }
  return bundleReader.getExtractedDir();
}

async function collectBundlePart(args) {
  const extractedRoot = await resolveBundleExtractedDir(args.bundleReader);
  const fullMdPath = await findEntryByBaseName({
    file: args.file,
    rootPath: extractedRoot,
    name: "full.md",
    isDir: false,
  });
  if (!fullMdPath) {
    throw new Error(
      `mineru bundle ${args.label || ""} missing required entry: full.md`,
    );
  }
  const imagesSourceDir = await findEntryByBaseName({
    file: args.file,
    rootPath: extractedRoot,
    name: "images",
    isDir: true,
  });
  return {
    markdown: await readText(args.file, fullMdPath),
    imagesSourceDir,
  };
}

function getAggregateChildren(resultContext) {
  const children = resultContext?.aggregate?.children;
  return Array.isArray(children) && children.length > 0
    ? [...children].sort((left, right) => {
        const leftOrder = Number(left?.order || 0);
        const rightOrder = Number(right?.order || 0);
        return leftOrder - rightOrder;
      })
    : [];
}

function joinMarkdownParts(parts) {
  const joined = parts
    .map((part) =>
      String(part || "")
        .replace(/^\s+/, "")
        .replace(/\s+$/, ""),
    )
    .join("\n\n");
  return joined ? `${joined}\n` : "";
}

function buildStagingDir(sourceDir, sourceItemKey) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return joinPath(sourceDir, `.mineru-${sourceItemKey || "output"}-${suffix}`);
}

async function copyImagesIntoStage(file, imagesSourceDir, stagedImagesDir) {
  if (!imagesSourceDir) {
    return false;
  }
  const sourceStat = await statPath(file, imagesSourceDir);
  if (!sourceStat.exists || !sourceStat.isDir) {
    return false;
  }
  await ensureDirectory(file, stagedImagesDir);
  const children = await listChildren(file, imagesSourceDir);
  for (const child of children) {
    const name = basenamePath(child);
    if (!name) {
      continue;
    }
    const targetPath = joinPath(stagedImagesDir, name);
    const existing = await statPath(file, targetPath);
    if (existing.exists) {
      throw new Error(`mineru image name collision while merging: ${name}`);
    }
    await copyPath(file, child, targetPath);
  }
  return children.length > 0;
}

async function materializeParts(args) {
  const file = requireFileApi(args.runtime);
  const sourceDir = dirnamePath(args.source.sourcePath);
  const sourceName = basenamePath(args.source.sourcePath);
  const mdName = replaceExtensionAsMd(sourceName);
  const mdPath = joinPath(sourceDir, mdName);
  const imagesDirName = `Images_${args.source.sourceItemKey}`;
  const imagesTargetDir = joinPath(sourceDir, imagesDirName);
  const stagingDir = buildStagingDir(sourceDir, args.source.sourceItemKey);
  const stagedImagesDir = joinPath(stagingDir, imagesDirName);
  const stagedMdPath = joinPath(stagingDir, "_merged.md");
  let hasImages = false;
  try {
    await ensureDirectory(file, stagingDir);
    for (const part of args.parts) {
      if (
        await copyImagesIntoStage(
          file,
          part.imagesSourceDir,
          stagedImagesDir,
        )
      ) {
        hasImages = true;
      }
    }
    const markdown = rewriteMarkdownImagePaths(
      joinMarkdownParts(args.parts.map((part) => part.markdown)),
      imagesDirName,
    );
    await writeText(file, stagedMdPath, markdown);

    if (hasImages) {
      const currentImages = await statPath(file, imagesTargetDir);
      if (currentImages.exists) {
        await removePath(file, imagesTargetDir);
      }
      await movePath(file, stagedImagesDir, imagesTargetDir);
    }

    await writeText(file, mdPath, markdown);
  } finally {
    await removePath(file, stagingDir);
  }

  if (!(await hasLinkedAttachmentForPath(args.runtime.hostApi, args.source.parentRef, mdPath))) {
    const targetIdentity = encodeURIComponent(normalizePath(mdPath)).slice(-64);
    const created = await args.runtime.hostApi.attachments.create({
      operationId: `mineru:attachment:${args.source.parentRef.libraryId}:${args.source.parentRef.key}:${targetIdentity}`,
      placement: { kind: "child", parentRef: args.source.parentRef },
      source: { kind: "linked_file", path: mdPath },
      metadata: { title: mdName, contentType: "text/markdown" },
    });
    if (created.outcome !== "committed" && created.outcome !== "unchanged") {
      throw new Error(created.attempt?.error?.message || "mineru attachment creation failed");
    }
  }

  return {
    source_attachment_path: args.source.sourcePath,
    markdown_path: mdPath,
    images_dir: hasImages ? imagesTargetDir : null,
    attached_to_parent_ref: args.source.parentRef,
    part_count: args.parts.length,
  };
}

function stringifyUnknownError(error) {
  if (error instanceof Error) {
    return error.message || error.name || "unknown error";
  }
  if (!error || typeof error !== "object") {
    return String(error || "unknown error");
  }
  const record = error;
  const parts = [];
  if (record.name) {
    parts.push(`name=${String(record.name)}`);
  }
  if (record.message) {
    parts.push(`message=${String(record.message)}`);
  }
  if (typeof record.result !== "undefined") {
    parts.push(`result=${String(record.result)}`);
  }
  if (record.fileName) {
    parts.push(`file=${String(record.fileName)}`);
  }
  if (typeof record.lineNumber !== "undefined") {
    parts.push(`line=${String(record.lineNumber)}`);
  }
  if (typeof record.columnNumber !== "undefined") {
    parts.push(`column=${String(record.columnNumber)}`);
  }
  try {
    const asText = String(error);
    if (asText && asText !== "[object Object]") {
      parts.push(`text=${asText}`);
    }
  } catch {
    // ignore
  }
  if (parts.length > 0) {
    return parts.join(", ");
  }
  try {
    const serialized = JSON.stringify(error);
    if (serialized === "{}") return "unknown object error";
    return serialized;
  } catch {
    return "unknown object error";
  }
}

export async function applyResult({
  parent,
  bundleReader,
  request,
  runtime,
  resultContext,
}) {
  let stage = "resolve-source";
  try {
    const file = requireFileApi(runtime);
    const aggregateChildren = getAggregateChildren(resultContext);
    const sourceRequest =
      aggregateChildren.length > 0 ? aggregateChildren[0].request : request;
    const source = await resolveSourceAttachmentMetadata({
      parent,
      request: sourceRequest,
      runtime,
    });

    stage = "collect-bundle-parts";
    const parts = [];
    if (aggregateChildren.length > 0) {
      for (const child of aggregateChildren) {
        parts.push(
          await collectBundlePart({
            file,
            bundleReader: child.bundleReader,
            label: child.unitId,
          }),
        );
      }
    } else {
      parts.push(
        await collectBundlePart({ file, bundleReader, label: "single" }),
      );
    }

    stage = "materialize-parts";
    const materialized = await materializeParts({
      source,
      parts,
      runtime,
    });
    const statusWarnings = [];
    let statusTransition;
    try {
      if (typeof runtime?.hostApi?.statusTags?.transition !== "function") {
        throw new Error("mineru statusTags API is unavailable");
      }
      statusTransition = await runtime.hostApi.statusTags.transition({
        operationId: `mineru:status:${source.parentRef.libraryId}:${source.parentRef.key}:${source.sourceItemKey}`,
        itemRef: source.parentRef,
        remove: ["need-fulltext", "need-markdown"],
      });
      if (
        statusTransition?.outcome !== "committed" &&
        statusTransition?.outcome !== "unchanged"
      ) {
        statusWarnings.push({
          code: "mineru_status_transition_failed",
          outcome: String(statusTransition?.outcome || "failed"),
          attempt: statusTransition?.attempt || null,
        });
      }
    } catch (error) {
      statusWarnings.push({
        code: "mineru_status_transition_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ...materialized,
      partial: statusWarnings.length > 0,
      statusTransition,
      statusWarnings,
    };
  } catch (error) {
    throw new Error(
      `mineru applyResult failed at ${stage}: ${stringifyUnknownError(error)}`,
    );
  }
}
