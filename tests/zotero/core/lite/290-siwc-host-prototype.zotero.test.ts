// THROWAWAY Wayfinder capability probe; not a production regression suite.
import { assert } from "chai";
import {
  probeCrypto,
  probeLoopback,
} from "../../../../artifacts/pi-agent-runtime/siwc-host-prototype/probe";

describe("Wayfinder69 prototype", function () {
  this.timeout(60000);
  it("checks native crypto, callbacks and system browser without real credentials", async function () {
    const g = globalThis as any;
    const Cc = g.Components?.classes || g.Cc;
    const Ci = g.Components?.interfaces || g.Ci;
    const environment = Cc["@mozilla.org/process/environment;1"].getService(
      Ci.nsIEnvironment,
    );
    if (environment.get("ZOTERO_SIWC_HOST_PROTOTYPE") !== "1") this.skip();
    const zotero = g.Zotero;
    const hostCrypto = g.crypto?.subtle
      ? g.crypto
      : zotero.getMainWindow().crypto;
    const crypto = await probeCrypto(hostCrypto);
    const loopback = await probeLoopback(hostCrypto, zotero);
    const receipt = {
      kind: "siwc-host-capability-prototype",
      host: {
        version: zotero.version,
        platform: g.Services.appinfo.OS,
        gecko: g.Services.appinfo.platformVersion,
      },
      realAccountAccessed: false,
      crypto,
      loopback,
      passed: [...crypto, ...loopback].every((step) => step.passed),
    };
    await g.IOUtils.writeUTF8(
      g.PathUtils.join(zotero.DataDirectory.dir, "siwc-host-prototype.json"),
      JSON.stringify(receipt, null, 2),
    );
    console.log("[SIWC-HOST-PROTOTYPE] " + JSON.stringify(receipt));
    assert.isTrue(
      receipt.passed,
      "failed steps: " +
        [...crypto, ...loopback]
          .filter((step) => !step.passed)
          .map((step) => step.name)
          .join(", "),
    );
  });
});
