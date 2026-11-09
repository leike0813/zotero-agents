import type { NoteImageWorker } from "../../src/platform/noteImageProcessing";
import { isZoteroRuntime } from "../zotero/workflow-test-utils";

/** Consumer tests only; real worker rendering is covered in the host suite. */
export function installNodeNoteImageWorkerStub(): () => void {
  if (isZoteroRuntime()) return () => {};
  const runtime = globalThis as unknown as { ChromeWorker?: unknown };
  const previous = runtime.ChromeWorker;
  runtime.ChromeWorker = class implements NoteImageWorker {
    onmessage: NoteImageWorker["onmessage"] = null;
    onerror: NoteImageWorker["onerror"] = null;
    onmessageerror: NoteImageWorker["onmessageerror"] = null;
    postMessage() {
      const bytes = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        ),
        (character) => character.charCodeAt(0),
      );
      queueMicrotask(() =>
        this.onmessage?.({
          data: {
            ok: true,
            result: { bytes, mimeType: "image/png", width: 1, height: 1 },
          },
        }),
      );
    }
    terminate() {}
  };
  return () => {
    runtime.ChromeWorker = previous;
  };
}
