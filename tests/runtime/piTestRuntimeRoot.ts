import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  removeRuntimePath,
} from "../../src/modules/runtimePersistence";
import { joinNativePath } from "../../src/platform/path";

/**
 * Isolated runtime root for owner-scoped cases. Uses the host temp directory
 * so the same helper works under the Node test mock and the real Zotero
 * runtime, and avoids `node:fs` / `node:os`, which the browser build rejects
 * inside the plugin host.
 */
export async function createTestRuntimeRoot(prefix: string): Promise<string> {
  const root = joinNativePath(
    getRuntimePersistencePaths().tmpDir,
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  );
  await ensureRuntimeDirectoryStrict(root);
  return root;
}

export async function removeTestRuntimeRoot(root: string | undefined) {
  if (!root) return;
  await removeRuntimePath(root).catch(() => false);
}
