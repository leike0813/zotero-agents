import type { HookHelpers } from "./types";
import { evaluateGeneratedNoteReadiness } from "../modules/zoteroHost/libraryArtifactReadiness";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getBaseName(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

export function createHookHelpers(zotero: typeof Zotero): HookHelpers {
  const helpers: HookHelpers = {
    resolveItemRef: (ref) => {
      if (typeof ref === "object") {
        return ref;
      }
      if (typeof ref === "number") {
        const item = zotero.Items.get(ref);
        if (!item) {
          throw new Error(`Item not found: ${ref}`);
        }
        return item;
      }
      const item = zotero.Items.getByLibraryAndKey(
        zotero.Libraries.userLibraryID,
        ref,
      );
      if (!item) {
        throw new Error(`Item not found: ${ref}`);
      }
      return item;
    },
    basenameOrFallback: (targetPath, fallback) =>
      targetPath ? getBaseName(targetPath) : fallback,
    toHtmlNote: (title, body) =>
      `<div><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(body)}</pre></div>`,
    inspectGeneratedNoteReadiness: async (parentRef, spec) => {
      const parent = helpers.resolveItemRef(parentRef);
      return evaluateGeneratedNoteReadiness(parent, spec);
    },
  };

  return helpers;
}
