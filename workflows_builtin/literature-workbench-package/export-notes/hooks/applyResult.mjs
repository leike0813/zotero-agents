import { exportGeneratedNoteCandidate } from "../../lib/literatureDigestNotes.mjs";
import { joinPath, sanitizeFileNameSegment } from "../../lib/path.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function writeExportedFile(host, targetPath, file) {
  if (typeof file.content === "string") {
    await host.file.writeText(targetPath, file.content);
    return;
  }
  if (file.bytes) {
    await host.file.writeBytes(targetPath, file.bytes);
    return;
  }
  if (file.sourcePath) {
    if (typeof host.file.copy === "function") {
      await host.file.copy({ sourcePath: file.sourcePath, targetPath });
      return;
    }
    await host.file.writeBytes(
      targetPath,
      await host.file.readBytes(file.sourcePath),
    );
    return;
  }
  throw new Error(
    `unsupported export file payload: ${String(file.fileName || "")}`,
  );
}

async function applyResultImpl({ request, runtime }) {
  const host = requireHostApi(runtime);
  const exportCandidates = Array.isArray(request?.exportCandidates)
    ? request.exportCandidates
    : [];
  if (exportCandidates.length === 0) {
    return {
      exportedParents: 0,
      exportedFiles: 0,
    };
  }

  const remoteOutput = host.interactionMode === "non_interactive";
  const allocatedOutput = remoteOutput
    ? await host.resources.allocateOutput({
        slotId: "notes",
        suggestedName: "notes-export.zip",
        contentType: "application/zip",
      })
    : null;
  const exportRoot = remoteOutput
    ? allocatedOutput?.path || null
    : await host.file.pickDirectory({ title: "Export Notes" });
  if (!exportRoot) {
    return {
      exportedParents: 0,
      exportedFiles: 0,
      canceled: true,
    };
  }

  let exportedFiles = 0;
  const archiveEntries = [];
  const touchedParents = new Set();
  const parentTitles = new Map();
  for (const candidate of exportCandidates) {
    const parentRef = candidate.parentRef || candidate.ref;
    if (!parentRef?.key || !candidate.ref) {
      throw new Error("export-notes candidate requires note and parent refs");
    }
    const parentKey = parentRef.key;
    let parentTitle = String(candidate.parentTitle || "").trim();
    const parentIdentity = `${parentRef.libraryId}:${parentKey}`;
    if (!parentTitle && !parentTitles.has(parentIdentity)) {
      try {
        const detail = await host.library.getItemDetail(parentRef);
        parentTitle = String(detail?.item?.title || "").trim();
      } catch {
        parentTitle = "";
      }
      parentTitles.set(parentIdentity, parentTitle);
    } else if (!parentTitle) {
      parentTitle = parentTitles.get(parentIdentity) || "";
    }
    const folderName = `${sanitizeFileNameSegment(parentTitle || parentKey)} [${parentKey}]`;
    touchedParents.add(parentKey);
    const targetDir = remoteOutput
      ? exportRoot
      : joinPath(exportRoot, folderName);
    const exported = await exportGeneratedNoteCandidate({
      ...candidate,
      noteRef: candidate.ref,
      runtime,
    });
    for (const file of exported.files) {
      try {
        if (remoteOutput) {
          archiveEntries.push({
            name: `${folderName}/${file.fileName}`,
            content:
              typeof file.content === "string"
                ? { kind: "text", text: file.content }
                : file.bytes
                  ? { kind: "bytes", bytes: file.bytes }
                  : { kind: "file", sourcePath: file.sourcePath },
          });
        } else {
          await host.file.makeDirectory({ path: targetDir });
          await writeExportedFile(
            host,
            joinPath(targetDir, file.fileName),
            file,
          );
        }
      } catch (error) {
        if (file.optional === true) {
          continue;
        }
        const reason =
          error instanceof Error
            ? error.message
            : String(error || "unknown error");
        throw new Error(
          `export-notes failed to write file noteKind=${String(candidate.noteKind || "").trim() || "unknown"} noteRef=${String(candidate.ref?.key || "")} fileName=${String(file.fileName || "")} targetDir=${targetDir}: ${reason}`,
        );
      }
      exportedFiles += 1;
    }
  }

  if (remoteOutput) {
    await host.archive.writeZipAtomic({
      targetPath: exportRoot,
      entries: archiveEntries,
    });
    const output = await host.resources.publishOutput({
      slotId: "notes",
      path: exportRoot,
      displayName: "notes-export.zip",
      contentType: "application/zip",
    });
    return {
      exportedParents: touchedParents.size,
      exportedFiles,
      resourceOutputs: [output],
    };
  }
  return {
    exportedParents: touchedParents.size,
    exportedFiles,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
