import { portableItemRef, readHostPages, requireHostApi } from "./runtime.mjs";

export async function resolveDigestMarkdownForParent(parentItem, runtime) {
  const host = requireHostApi(runtime);
  const notes = await readHostPages({
    readPage: (page) =>
      host.library.getItemNotes(portableItemRef(parentItem), page),
    getItems: (page) => page.notes,
    operation: "digest payload note read",
  });
  let digest = null;
  for (const note of notes) {
    const detail = await host.library.getNoteDetail(note.ref, {
      format: "html",
    });
    if (detail.kind !== "managed" || detail.noteKind !== "digest") continue;
    if (digest) {
      const error = new Error(
        "Multiple digest notes require explicit resolution",
      );
      error.code = "conflict";
      throw error;
    }
    digest = detail;
  }
  return digest?.payload.markdown ?? null;
}
