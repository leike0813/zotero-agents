import { assert } from "chai";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisWebDavMaintenanceSurfaceParity } from "../../scripts/check-synthesis-webdav-maintenance-surface-parity";

const OWNED = [
  "client.syncWebDavNow",
  "client.pauseWebDavSync",
  "client.resumeWebDavSync",
  "client.retryWebDavSync",
  "client.resolveWebDavSyncConflict",
  "client.getPublicMaintenanceOperation",
  "client.reconcileSynthesisRuntimeWorkStateOnStartup",
  "client.resetSynthesisDatabase",
  "client.debugSynthesisCleanInstallReset",
] as const;

describe("Synthesis native WebDAV and Maintenance surface", () => {
  it("admits exactly the complete fixture-backed WebDAV and Maintenance roster", () => {
    assert.deepEqual(inspectSynthesisWebDavMaintenanceSurfaceParity(), {
      ok: true,
      operations: 9,
      errors: [],
    });
    for (const capability of OWNED)
      assert.include(
        SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
  });
});
