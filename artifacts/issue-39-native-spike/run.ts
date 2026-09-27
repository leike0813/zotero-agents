// Isolated issue-39 native runner; never loaded by the plugin.
// Add --production after a fresh plugin build to exercise current Broker source.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  acquireZoteroHost,
  acquireZoteroMachineRunLock,
  createRunLayout,
  loadCompatibilityManifest,
  materializeZoteroHostForRun,
  runOwnedCommand,
  sha256File,
} from "../../scripts/zotero-compatibility-fixture";
import { patchGeneratedZoteroTestRunner } from "../../scripts/patch-zotero-test-runner";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const targetId = process.argv[2] || "zotero-10-linux-x64";
const production =
  process.env.ISSUE39_PRODUCTION_NATIVE === "1" ||
  process.argv.includes("--production");
if (process.env.ISSUE39_SPIKE_WORKER) {
  const runRoot = process.env.ISSUE39_SPIKE_WORKER;
  process.chdir(runRoot);
  const { Config, Test } = await import("zotero-plugin-scaffold");
  process.chdir(root);
  const context = await Config.loadConfig({
    dist: path.join(root, ".scaffold/build"),
  });
  context.test.entries = [
    path.join(
      root,
      `artifact/issue-39-native-spike/${production ? "production" : "native"}`,
    ),
  ];
  context.test.watch = false;
  if (!production) {
    context.test.waitForPlugin =
      "() => !!Zotero.getMainWindow()?.ZoteroPane?.itemsView";
  }
  context.test.mocha.timeout = 120000;
  context.test.prefs = {
    ...context.test.prefs,
    "extensions.zotero.zotero-skills.hostBridgeEnabled": false,
    "extensions.zotero.sync.autoSync": false,
    "extensions.zotero.issue39SpikeProjectRoot": root,
  };
  context.hooks.removeAllHooks();
  context.hooks.hook("test:bundleTests", async () => {
    await patchGeneratedZoteroTestRunner(runRoot);
  });
  process.chdir(runRoot);
  const test = new Test(context);
  const internals = test as unknown as {
    builder: { run: () => Promise<void> };
    ctx: { test: { headless: boolean } };
    reporter: {
      onData: (body: { type?: string; data?: any }) => Promise<void>;
    };
  };
  internals.builder.run = async () => undefined;
  internals.ctx.test.headless = true;
  const onData = internals.reporter.onData.bind(internals.reporter);
  internals.reporter.onData = async (body) => {
    if (
      body.type === "debug" &&
      (body.data?.spike === "issue39" ||
        [
          "issue39-production-native",
          "zotero-compatibility-host-facts",
          "zotero-navigation-native-capabilities",
        ].includes(body.data?.kind))
    ) {
      await fs.appendFile(
        path.join(runRoot, "diagnostics/evidence.jsonl"),
        JSON.stringify(body.data) + "\n",
      );
    }
    await onData(body);
  };
  await test.run();
} else {
  const lock = await acquireZoteroMachineRunLock(
    path.join(os.tmpdir(), "zotero-agents-compat-host"),
    10000,
  );
  try {
    const manifest = await loadCompatibilityManifest(
      path.join(root, "test/zotero/compatibility-matrix.json"),
    );
    const acquired = await acquireZoteroHost({
      manifest,
      targetId,
      cacheRoot: path.join(os.homedir(), ".cache/zotero-agents/zotero-hosts"),
    });
    const layout = await createRunLayout(
      path.join(os.tmpdir(), "issue39-native-spikes"),
      targetId,
    );
    const host = await materializeZoteroHostForRun(acquired, layout.root);
    await fs.symlink(
      path.join(root, "node_modules"),
      path.join(layout.root, "node_modules"),
      "dir",
    );
    await fs.mkdir(path.join(layout.root, ".scaffold/cache"), {
      recursive: true,
    });
    await fs.copyFile(
      path.join(root, ".scaffold/cache/chai.js"),
      path.join(layout.root, ".scaffold/cache/chai.js"),
    );
    console.log(
      JSON.stringify({
        runRoot: layout.root,
        targetId,
        binary: host.binaryPath,
        production,
        ...(production
          ? {
              artifactSha256: await sha256File(
                path.join(root, ".scaffold/build/zotero-agents.xpi"),
              ),
            }
          : {}),
      }),
    );
    const result = await runOwnedCommand({
      command: process.execPath,
      args: [
        path.join(root, "node_modules/tsx/dist/cli.mjs"),
        fileURLToPath(import.meta.url),
        targetId,
      ],
      cwd: root,
      env: {
        ...process.env,
        ISSUE39_SPIKE_WORKER: layout.root,
        ISSUE39_SPIKE_PROJECT: root,
        ...(production ? { ISSUE39_PRODUCTION_NATIVE: "1" } : {}),
        ZOTERO_COMPAT_PROJECT_ROOT: root,
        ZOTERO_PLUGIN_ZOTERO_BIN_PATH: host.binaryPath,
        ZOTERO_SKILLS_RUNTIME_ROOT: layout.runtime,
        CI: "true",
      },
      stdoutPath: path.join(layout.diagnostics, "stdout.log"),
      stderrPath: path.join(layout.diagnostics, "stderr.log"),
      timeoutMs: 240000,
    });
    console.log(JSON.stringify(result));
    console.log(
      await fs.readFile(path.join(layout.diagnostics, "stdout.log"), "utf8"),
    );
    console.log(
      await fs.readFile(path.join(layout.diagnostics, "stderr.log"), "utf8"),
    );
    if (result.exitCode !== 0 || result.timedOut) process.exitCode = 1;
  } finally {
    await lock.release();
  }
}
