const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
);

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

async function hasLinkedAttachmentForPath(parentItem, targetPath) {
  const normalizedTargetPath = normalizePath(targetPath).toLowerCase();
  if (!normalizedTargetPath) {
    return false;
  }
  const zoteroItems = globalThis.Zotero?.Items;
  for (const attachmentId of parentItem.getAttachments?.() || []) {
    const attachment = zoteroItems?.get?.(attachmentId);
    if (!attachment) {
      continue;
    }
    let attachmentPath = "";
    try {
      attachmentPath = String((await attachment.getFilePathAsync?.()) || "");
    } catch {
      attachmentPath = "";
    }
    if (!attachmentPath) {
      attachmentPath = String(attachment.getField?.("path") || "").trim();
    }
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
  };
}

function resolveIOUtils() {
  const runtime = globalThis;
  const io = runtime.IOUtils;
  if (!io || typeof io !== "object") {
    return null;
  }
  return io;
}

async function statPath(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.stat) {
    try {
      const stat = await io.stat(nativePath);
      return {
        exists: true,
        isDir: stat.type === "directory",
      };
    } catch {
      return {
        exists: false,
        isDir: false,
      };
    }
  }
  const fs = await dynamicImport("fs/promises");
  try {
    const stat = await fs.stat(nativePath);
    return {
      exists: true,
      isDir: stat.isDirectory(),
    };
  } catch {
    return {
      exists: false,
      isDir: false,
    };
  }
}

async function ensureDirectory(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.makeDirectory) {
    await io.makeDirectory(nativePath, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(nativePath, { recursive: true });
}

async function readText(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.readUTF8) {
    return io.readUTF8(nativePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(nativePath, "utf8");
}

async function writeText(targetPath, content) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(parentDir);
  }
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.writeUTF8) {
    await io.writeUTF8(nativePath, String(content || ""));
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(nativePath, String(content || ""), "utf8");
}

async function removePath(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.remove) {
    await io.remove(nativePath, { recursive: true, ignoreAbsent: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.rm(nativePath, { recursive: true, force: true });
}

async function movePath(sourcePath, targetPath) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(parentDir);
  }
  const nativeSourcePath = toNativePath(sourcePath);
  const nativeTargetPath = toNativePath(targetPath);
  const sourceStat = await statPath(nativeSourcePath);
  if (!sourceStat.exists) {
    throw new Error(`Source path not found: ${nativeSourcePath}`);
  }
  const io = resolveIOUtils();
  if (io?.move) {
    try {
      await io.move(nativeSourcePath, nativeTargetPath);
      return;
    } catch (error) {
      if (!sourceStat.isDir) {
        throw error;
      }
      // Some Zotero runtimes fail to move directories; fall through to recursive copy.
    }
  }
  if (!sourceStat.isDir) {
    if (io?.copy) {
      try {
        await io.copy(nativeSourcePath, nativeTargetPath);
        await removePath(nativeSourcePath);
        return;
      } catch {
        // fall through
      }
    }
    if (io?.read && io?.write) {
      try {
        const bytes = await io.read(nativeSourcePath);
        await io.write(nativeTargetPath, bytes);
        await removePath(nativeSourcePath);
        return;
      } catch {
        // fall through
      }
    }
    const fs = await dynamicImport("fs/promises");
    try {
      await fs.rename(nativeSourcePath, nativeTargetPath);
      return;
    } catch {
      await fs.cp(nativeSourcePath, nativeTargetPath, {
        recursive: true,
        force: true,
      });
      await fs.rm(nativeSourcePath, { recursive: true, force: true });
      return;
    }
  }
  await ensureDirectory(nativeTargetPath);
  const children = await listChildren(nativeSourcePath);
  for (const child of children) {
    const name = basenamePath(child);
    if (!name) {
      continue;
    }
    await movePath(child, joinPath(nativeTargetPath, name));
  }
  await removePath(nativeSourcePath);
}

async function copyPath(sourcePath, targetPath) {
  const parentDir = dirnamePath(targetPath);
  if (parentDir) {
    await ensureDirectory(parentDir);
  }
  const nativeSourcePath = toNativePath(sourcePath);
  const nativeTargetPath = toNativePath(targetPath);
  const sourceStat = await statPath(nativeSourcePath);
  if (!sourceStat.exists) {
    throw new Error(`Source path not found: ${nativeSourcePath}`);
  }
  const io = resolveIOUtils();
  if (!sourceStat.isDir) {
    if (io?.copy) {
      try {
        await io.copy(nativeSourcePath, nativeTargetPath);
        return;
      } catch {
        // fall through
      }
    }
    if (io?.read && io?.write) {
      const bytes = await io.read(nativeSourcePath);
      await io.write(nativeTargetPath, bytes);
      return;
    }
    const fs = await dynamicImport("fs/promises");
    await fs.copyFile(nativeSourcePath, nativeTargetPath);
    return;
  }
  await ensureDirectory(nativeTargetPath);
  const children = await listChildren(nativeSourcePath);
  for (const child of children) {
    const name = basenamePath(child);
    if (!name) {
      continue;
    }
    await copyPath(child, joinPath(nativeTargetPath, name));
  }
}

async function listChildren(targetPath) {
  const nativePath = toNativePath(targetPath);
  const io = resolveIOUtils();
  if (io?.getChildren) {
    const children = await io.getChildren(nativePath);
    return children.map((entry) => String(entry || ""));
  }
  const fs = await dynamicImport("fs/promises");
  const names = await fs.readdir(nativePath);
  return names.map((name) => joinPath(nativePath, name));
}

async function findEntryByBaseName(args) {
  const queue = [args.rootPath];
  const expected = String(args.name || "").toLowerCase();
  while (queue.length > 0) {
    const current = queue.shift();
    const stat = await statPath(current);
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
    const children = await listChildren(current);
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
  const parentItem = args.runtime.helpers.resolveItemRef(args.parent);
  let sourceAttachment = null;
  if (source.sourceItemId > 0) {
    try {
      sourceAttachment = args.runtime.helpers.resolveItemRef(source.sourceItemId);
    } catch {
      sourceAttachment = null;
    }
  }
  if (!sourceAttachment && parentItem?.getAttachments) {
    for (const attachmentId of parentItem.getAttachments() || []) {
      const candidate = args.runtime.helpers.resolveItemRef(attachmentId);
      const candidatePath = await candidate.getFilePathAsync?.();
      if (comparePath(candidatePath, source.sourcePath)) {
        sourceAttachment = candidate;
        break;
      }
    }
  }
  const sourceItemKey = String(
    source.sourceItemKey || sourceAttachment?.key || "",
  ).trim();
  if (!sourceItemKey) {
    throw new Error("mineru applyResult cannot resolve source attachment item key");
  }
  return {
    parentItem,
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
    rootPath: extractedRoot,
    name: "images",
    isDir: true,
  });
  return {
    markdown: await readText(fullMdPath),
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

async function copyImagesIntoStage(imagesSourceDir, stagedImagesDir) {
  if (!imagesSourceDir) {
    return false;
  }
  const sourceStat = await statPath(imagesSourceDir);
  if (!sourceStat.exists || !sourceStat.isDir) {
    return false;
  }
  await ensureDirectory(stagedImagesDir);
  const children = await listChildren(imagesSourceDir);
  for (const child of children) {
    const name = basenamePath(child);
    if (!name) {
      continue;
    }
    const targetPath = joinPath(stagedImagesDir, name);
    const existing = await statPath(targetPath);
    if (existing.exists) {
      throw new Error(`mineru image name collision while merging: ${name}`);
    }
    await copyPath(child, targetPath);
  }
  return children.length > 0;
}

async function materializeParts(args) {
  const sourceDir = dirnamePath(args.source.sourcePath);
  const sourceName = basenamePath(args.source.sourcePath);
  const mdName = replaceExtensionAsMd(sourceName);
  const mdPath = joinPath(sourceDir, mdName);
  const imagesDirName = `Images_${args.source.sourceItemKey}`;
  const imagesTargetDir = joinPath(sourceDir, imagesDirName);
  const stagingDir = buildStagingDir(sourceDir, args.source.sourceItemKey);
  const stagedImagesDir = joinPath(stagingDir, imagesDirName);
  const stagedMdPath = joinPath(stagingDir, mdName);
  let hasImages = false;
  try {
    await ensureDirectory(stagingDir);
    for (const part of args.parts) {
      if (await copyImagesIntoStage(part.imagesSourceDir, stagedImagesDir)) {
        hasImages = true;
      }
    }
    const markdown = rewriteMarkdownImagePaths(
      joinMarkdownParts(args.parts.map((part) => part.markdown)),
      imagesDirName,
    );
    await writeText(stagedMdPath, markdown);

    if (hasImages) {
      const currentImages = await statPath(imagesTargetDir);
      if (currentImages.exists) {
        await removePath(imagesTargetDir);
      }
      await movePath(stagedImagesDir, imagesTargetDir);
    }

    await writeText(mdPath, markdown);
  } finally {
    await removePath(stagingDir);
  }

  if (!(await hasLinkedAttachmentForPath(args.source.parentItem, mdPath))) {
    await args.runtime.handlers.attachment.createFromPath({
      parent: args.source.parentItem.id,
      path: mdPath,
      title: mdName,
      mimeType: "text/markdown",
    });
  }

  return {
    source_attachment_path: args.source.sourcePath,
    markdown_path: mdPath,
    images_dir: hasImages ? imagesTargetDir : null,
    attached_to_parent_id: args.source.parentItem.id,
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
            bundleReader: child.bundleReader,
            label: child.unitId,
          }),
        );
      }
    } else {
      parts.push(await collectBundlePart({ bundleReader, label: "single" }));
    }

    stage = "materialize-parts";
    return await materializeParts({
      source,
      parts,
      runtime,
    });
  } catch (error) {
    throw new Error(
      `mineru applyResult failed at ${stage}: ${stringifyUnknownError(error)}`,
    );
  }
}
