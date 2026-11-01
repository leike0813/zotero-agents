import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { profileSpan } from "./test-profile";
import { stageDirectSynthesisBundle } from "./run-zotero-direct";

/** The outer invocation owns a fresh cache directory and runs its hosts serially. */
export async function prepareTestBuild(args: {
  directory: string;
  dist: string;
  build: () => Promise<void>;
  stageNative: () => void | Promise<void>;
}) {
  const receipt = path.join(args.directory, "build.json");
  try {
    const saved = JSON.parse(await readFile(receipt, "utf8"));
    if (saved.dist !== args.dist)
      throw new Error("test_build_directory_changed");
    await access(path.join(saved.dist, "addon", "manifest.json"));
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await profileSpan("plugin build", args.build, { kind: "build" });
  await profileSpan("current-source sidecar preparation", args.stageNative, {
    kind: "build",
  });
  await writeFile(receipt, JSON.stringify({ dist: args.dist }));
}

async function main() {
  const directory = process.env.ZOTERO_TEST_BUILD_CACHE_DIR;
  if (!directory) throw new Error("test_build_invocation_missing");
  process.env.NODE_ENV = "test";
  const { Config, Test } = await import("zotero-plugin-scaffold");
  const context = await Config.loadConfig({});
  context.test.watch = false;
  const test = new Test(context);
  process.on("SIGINT", test.exit.bind(test));
  const builder = (test as unknown as { builder: { run(): Promise<void> } })
    .builder;
  const original = builder.run.bind(builder);
  builder.run = async () => {
    await prepareTestBuild({
      directory,
      dist: path.resolve(context.dist),
      build: original,
      stageNative: () =>
        stageDirectSynthesisBundle(path.join(context.dist, "addon")),
    });
    process.env.ZOTERO_TEST_BUILD_PREPARED = "1";
  };
  await test.run();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void main().catch((error) => {
    console.error(error);
    // Scaffold may already have opened its reporter server when a hook fails.
    process.exit(1);
  });
