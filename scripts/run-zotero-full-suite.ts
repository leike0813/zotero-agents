import { runTestSubstages, ZOTERO_FULL_STEPS } from "./run-test-substages";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

void (async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "zs-zotero-build-"));
  return runTestSubstages(ZOTERO_FULL_STEPS, {
    env: { ...process.env, ZOTERO_TEST_BUILD_CACHE_DIR: directory },
  });
})().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
