import { assert } from "chai";

declare global {
  interface Window {
    debug?: (data: unknown) => void;
  }
}

function reportHostFacts() {
  const version = String(Zotero.version || "").trim();
  const appBuildId = String(
    (globalThis as any).Services?.appinfo?.appBuildID || "",
  ).trim();
  window.debug?.({
    kind: "zotero-compatibility-host-facts",
    version,
    appBuildId,
  });
  return version;
}

reportHostFacts();

describe("compatibility host facts", function () {
  it("reports the observed Zotero runtime identity", function () {
    const version = reportHostFacts();
    assert.match(version, /^\d+\.\d+/);
  });
});
