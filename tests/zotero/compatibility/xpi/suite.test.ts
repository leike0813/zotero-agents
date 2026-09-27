import { assert } from "chai";

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
  const file = Components.classes["@mozilla.org/file/local;1"].createInstance(
    Components.interfaces.nsIFile,
  );
  file.initWithPath(filePath);
  return file;
}

describe("formal XPI compatibility smoke", function () {
  this.timeout(60_000);

  it("installs and starts the canonical XPI", async function () {
    const xpiPath = Services.prefs.getStringPref(XPI_PREF, "").trim();
    assert.isNotEmpty(xpiPath);
    const addonManager = getAddonManager();

    const temporaryAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(temporaryAddon);
    await temporaryAddon.uninstall();
    await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);

    const previousPath = Services.prefs
      .getStringPref(PREVIOUS_XPI_PREF, "")
      .trim();
    let previousVersion = "";
    const marker = PathUtils.join(
      Services.dirsvc.get("ProfD", Components.interfaces.nsIFile).path,
      "compatibility-upgrade-preserve.txt",
    );
    if (previousPath) {
      const previousInstall = await addonManager.getInstallForFile(
        localFile(previousPath),
      );
      assert.exists(previousInstall);
      await previousInstall.install();
      const previousAddon = await addonManager.getAddonByID(ADDON_ID);
      assert.exists(previousAddon);
      assert.isTrue(Boolean(previousAddon.isActive));
      previousVersion = String(previousAddon.version);
      await IOUtils.writeUTF8(marker, "unrelated-profile-data\n");
    }

    const install = await addonManager.getInstallForFile(localFile(xpiPath));
    assert.exists(install);
    const candidateVersion = String(install.addon?.version || "");
    await install.install();
    await waitUntil(
      () =>
        (Zotero as any).ZoteroSkills?.data?.alive === true &&
        (Zotero as any).ZoteroSkills?.data?.initialized === true,
    );

    const installedAddon = await addonManager.getAddonByID(ADDON_ID);
    assert.exists(installedAddon);
    if (previousPath) {
      assert.notEqual(previousVersion, candidateVersion);
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

    if (!Services.prefs.getBoolPref(KEEP_XPI_PREF, false)) {
      await installedAddon.uninstall();
      await waitUntil(() => (Zotero as any).ZoteroSkills === undefined);
    }
  });
});
