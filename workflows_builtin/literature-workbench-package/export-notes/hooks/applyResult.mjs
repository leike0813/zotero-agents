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
      await host.file.copy(file.sourcePath, targetPath);
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

  const exportRoot = await host.file.pickDirectory({
    title: "Export Notes",
  });
  if (!exportRoot) {
    return {
      exportedParents: 0,
      exportedFiles: 0,
      canceled: true,
    };
  }

  let exportedFiles = 0;
  const touchedParents = new Set();
  for (const candidate of exportCandidates) {
    const folderName = `${sanitizeFileNameSegment(candidate.parentTitle)} [${candidate.parentItemKey}]`;
    const targetDir = joinPath(exportRoot, folderName);
    await host.file.makeDirectory(targetDir);
    touchedParents.add(targetDir);

    const exported = await exportGeneratedNoteCandidate({
      ...candidate,
      runtime,
    });
    for (const file of exported.files) {
      try {
        await writeExportedFile(host, joinPath(targetDir, file.fileName), file);
      } catch (error) {
        if (file.optional === true) {
          continue;
        }
        const reason =
          error instanceof Error
            ? error.message
            : String(error || "unknown error");
        throw new Error(
          `export-notes failed to write file kind=${String(candidate.kind || "").trim() || "unknown"} noteItemID=${String(candidate.noteItemID || "")} noteItemKey=${String(candidate.noteItemKey || "")} fileName=${String(file.fileName || "")} targetDir=${targetDir}: ${reason}`,
        );
      }
      exportedFiles += 1;
    }
  }

  return {
    exportedParents: touchedParents.size,
    exportedFiles,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
