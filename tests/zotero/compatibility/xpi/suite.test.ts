import { assert } from "chai";

declare global {
  interface Window {
    debug?: (data: unknown) => void;
  }
}

const ADDON_ID = "zotero-skills@leike0813@gmail.com";
const XPI_PREF = "extensions.zotero.zotero-skills.compatibilityTestXpiPath";

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
  const file = Components.classes["@mozilla.org/file/local;1"].createInstance(
    Components.interfaces.nsIFile,
  );
  file.initWithPath(filePath);
  return file;
}

describe("formal XPI compatibility smoke", function () {
  this.timeout(60_000);

  it("installs, starts, and uninstalls the canonical XPI", async function () {
    const xpiPath = Services.prefs.getStringPref(XPI_PREF, "").trim();
    assert.isNotEmpty(xpiPath);
    const addonManager = getAddonManager();

    const temporaryAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(temporaryAddon);
    await temporaryAddon.uninstall();
    await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);

    const install = await addonManager.getInstallForFile(localFile(xpiPath));
    assert.exists(install);
    await install.install();
    await waitUntil(
      () =>
        (Zotero as any).ZoteroSkills?.data?.alive === true &&
        (Zotero as any).ZoteroSkills?.data?.initialized === true,
    );

    const installedAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(installedAddon);
    assert.isFalse(Boolean(installedAddon.appDisabled));
    assert.isTrue(Boolean(installedAddon.isActive));
    window.debug?.({
      kind: "zotero-compatibility-host-facts",
      version: String(Zotero.version || "").trim(),
      appBuildId: String(Services.appinfo?.appBuildID || "").trim(),
      xpiActive: true,
    });

    await installedAddon.uninstall();
    await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);
  });
});
