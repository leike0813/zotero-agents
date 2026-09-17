import { assert } from "chai";
import { config } from "../../../../../package.json";
import { rebuildSynthesisProductionDiscovery } from "../../../../../packages/synthesis-contracts/src";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarRuntimePaths,
  listRuntimeChildDirectories,
  readRuntimeTextFile,
  runtimePathExists,
} from "../../../../../src/modules/runtimePersistence";
import { detectRuntimePlatform } from "../../../../../src/platform/runtimePlatform";
import { executeOneShotSubprocess } from "../../../../../src/platform/subprocess";
import { joinPath } from "../../../../../src/utils/path";
import { readDiagnosticsEnv } from "../../../testDiagnosticsOutput";

async function waitUntil<Value>(
  read: () => Value | null | undefined | Promise<Value | null | undefined>,
  timeoutMs = 120_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await Zotero.Promise.delay(50);
  }
  throw new Error("sidecar_fault_prototype_condition_not_reached");
}

async function findDiscovery(excludedServiceInstanceId?: string) {
  const runtime = getSynthesisSidecarRuntimePaths(
    getRuntimePersistencePaths().runtimeRoot,
  );
  for (const profileRoot of await listRuntimeChildDirectories(
    runtime.profilesDir,
  )) {
    for (const sessionRoot of await listRuntimeChildDirectories(
      joinPath(profileRoot, "sessions"),
    )) {
      const path = joinPath(sessionRoot, "discovery.json");
      try {
        const source = await readRuntimeTextFile(path);
        if (!source) continue;
        const discovery = rebuildSynthesisProductionDiscovery(
          JSON.parse(source),
        );
        if (discovery.serviceInstanceId !== excludedServiceInstanceId) {
          return { discovery, path };
        }
      } catch {
        // Session cleanup may win between listing and reading.
      }
    }
  }
  return null;
}

const prototypeEnabled =
  readDiagnosticsEnv("ZOTERO_E2E_FAULT_PROTOTYPE") === "1";

(prototypeEnabled ? describe : describe.skip)(
  "Sidecar runner fault-control prototype",
  function () {
    this.timeout(180_000);

    afterEach(async function () {
      const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
      await Promise.resolve(
        (mainWindow as any)?.Zotero_Tabs?.close?.("zotero-skills-workspace"),
      );
    });

    it("kills the discovered sidecar and observes a clean new generation", async function () {
      if (detectRuntimePlatform() !== "linux") this.skip();

      const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
      const plugin = (Zotero as any)[config.addonInstance];
      assert.isFunction(plugin?.hooks?.onPrefsEvent);
      await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
        window: mainWindow,
      });

      const initial = await waitUntil(() => findDiscovery());

      const killed = await executeOneShotSubprocess({
        command: "/bin/kill",
        args: ["-KILL", String(initial.discovery.pid)],
        timeoutMs: 10_000,
      });
      assert.equal(killed.outcome, "exited");
      assert.equal(killed.exitCode, 0);

      const recovered = await waitUntil(() =>
        findDiscovery(initial.discovery.serviceInstanceId),
      );

      assert.notEqual(
        recovered.discovery.supervisorInstanceId,
        initial.discovery.supervisorInstanceId,
      );
      assert.isFalse(await runtimePathExists(initial.path));

      const oldProcess = await executeOneShotSubprocess({
        command: "/bin/kill",
        args: ["-0", String(initial.discovery.pid)],
        timeoutMs: 10_000,
      });
      assert.notEqual(oldProcess.exitCode, 0);
    });
  },
);
