import { assert } from "chai";
import { loadBackendsRegistry } from "../../../../src/backends/registry";
import { runInstalledPiChains } from "../../../helpers/piInstalledPluginDriver";
import {
  seedInstalledLegacyHistory,
  verifyInstalledLegacyHistory,
} from "../../../helpers/piInstalledLegacySeedDriver";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

declare global {
  interface Window {
    debug?: (data: unknown) => void;
  }
}

const ADDON_ID = "zotero-skills@leike0813@gmail.com";
const XPI_PREF = "extensions.zotero.zotero-skills.compatibilityTestXpiPath";
const KEEP_XPI_PREF =
  "extensions.zotero.zotero-skills.compatibilityKeepXpiInstalled";
const PREVIOUS_XPI_PREF =
  "extensions.zotero.zotero-skills.compatibilityPreviousXpiPath";

function waitUntil(check: () => boolean, timeoutMs = 20_000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      try {
        if (check()) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - startedAt >= timeoutMs) {
          clearInterval(timer);
          reject(new Error("compatibility lifecycle marker timeout"));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, 100);
  });
}

function getAddonManager() {
  const runtime = globalThis as any;
  return runtime.ChromeUtils.importESModule(
    "resource://gre/modules/AddonManager.sys.mjs",
  ).AddonManager;
}

function localFile(filePath: string) {
  const file = (Components.classes as any)[
    "@mozilla.org/file/local;1"
  ].createInstance(Components.interfaces.nsIFile);
  file.initWithPath(filePath);
  return file;
}

async function lifecycleStep<T>(stage: string, action: () => Promise<T>) {
  window.debug?.({ kind: "zotero-compatibility-xpi-step", stage });
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`xpi_${stage}_timeout`)),
          60_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

type XpiPhase = "pi-xpi-fresh" | "pi-xpi-upgrade";

function emitXpiPhase(
  phase: XpiPhase,
  status: "passed" | "failed" | "skipped",
) {
  window.debug?.({ kind: "zotero-compatibility-xpi-phase", phase, status });
}

describe("formal XPI compatibility smoke", function () {
  this.timeout(240_000);

  it("installs and starts the canonical XPI", async function () {
    const xpiPath = Services.prefs.getStringPref(XPI_PREF, "").trim();
    assert.isNotEmpty(xpiPath);
    const addonManager = getAddonManager();

    const temporaryAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(temporaryAddon);
    await lifecycleStep("temporary-uninstall", () =>
      temporaryAddon.uninstall(),
    );
    await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);

    const previousPath = Services.prefs
      .getStringPref(PREVIOUS_XPI_PREF, "")
      .trim();
    let previousVersion = "";
    let legacySeed:
      | Awaited<ReturnType<typeof seedInstalledLegacyHistory>>
      | undefined;
    const marker = PathUtils.join(
      Services.dirsvc.get("ProfD", Components.interfaces.nsIFile).path,
      "compatibility-upgrade-preserve.txt",
    );
    if (previousPath) {
      const previousInstall = await addonManager.getInstallForFile(
        localFile(previousPath),
      );
      assert.exists(previousInstall);
      await lifecycleStep("baseline-install", () => previousInstall.install());
      const previousAddon = await addonManager.getAddonByID(ADDON_ID);
      assert.exists(previousAddon);
      assert.isTrue(Boolean(previousAddon.isActive));
      await waitUntil(
        () => (Zotero as any).ZoteroSkills?.data?.initialized === true,
      );
      previousVersion = String(previousAddon.version);
      await IOUtils.writeUTF8(marker, "unrelated-profile-data\n");
      window.debug?.({
        kind: "zotero-compatibility-xpi-step",
        stage: "baseline-seed",
      });
      legacySeed = await seedInstalledLegacyHistory();
    }

    const install = await addonManager.getInstallForFile(localFile(xpiPath));
    assert.exists(install);
    const candidateVersion = String(install.addon?.version || "");
    await lifecycleStep("candidate-install", () => install.install());
    await waitUntil(
      () =>
        (Zotero as any).ZoteroSkills?.data?.alive === true &&
        (Zotero as any).ZoteroSkills?.data?.initialized === true,
    );

    const installedAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(installedAddon);
    if (previousPath) {
      assert.equal(installedAddon.version, candidateVersion);
      assert.equal(await IOUtils.readUTF8(marker), "unrelated-profile-data\n");
    }
    assert.isFalse(Boolean(installedAddon.appDisabled));
    assert.isTrue(Boolean(installedAddon.isActive));
    window.debug?.({
      kind: "zotero-compatibility-host-facts",
      version: String(Zotero.version || "").trim(),
      appBuildId: String(Services.appinfo?.appBuildID || "").trim(),
      xpiActive: true,
      ...(previousPath
        ? { previousVersion, installedVersion: String(installedAddon.version) }
        : {}),
    });
    try {
      window.debug?.({
        kind: "zotero-compatibility-xpi-step",
        stage: "installed-chains",
      });
      await runInstalledPiChains();
      emitXpiPhase("pi-xpi-fresh", "passed");
    } catch (error) {
      emitXpiPhase("pi-xpi-fresh", "failed");
      throw error;
    }
    if (previousPath) {
      const registry = await loadBackendsRegistry();
      assert.isTrue(
        registry.backends.some(
          (backend) => backend.id === legacySeed!.acp.backendId,
        ) &&
          registry.backends.some(
            (backend) => backend.id === legacySeed!.skillrunner.backendId,
          ),
        "seeded ACP configuration must survive the upgrade",
      );
      await verifyInstalledLegacyHistory(legacySeed!);
      assert.equal(await IOUtils.readUTF8(marker), "unrelated-profile-data\n");
      window.debug?.({
        kind: "zotero-compatibility-pi-upgrade",
        upgrade: {
          baselineCommit: readDiagnosticsEnv(
            "ZOTERO_PI_UPGRADE_BASELINE_COMMIT",
          ),
          baselineVersion: previousVersion,
          baselineXpiSha256: readDiagnosticsEnv(
            "ZOTERO_PI_UPGRADE_BASELINE_SHA256",
          ),
          seededWithInstalledBaseline: true,
          legacyPreserved: true,
        },
      });
      emitXpiPhase("pi-xpi-upgrade", "passed");
    } else {
      emitXpiPhase("pi-xpi-upgrade", "skipped");
    }
    if (!Services.prefs.getBoolPref(KEEP_XPI_PREF, false)) {
      await installedAddon.uninstall();
      await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);
    }
  });
});
