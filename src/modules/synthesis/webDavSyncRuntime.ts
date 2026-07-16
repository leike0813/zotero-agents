import {
  rebuildSynthesisHostWebDavSyncDescription,
  rebuildSynthesisHostWebDavSyncEnsureCollectionRequest,
  rebuildSynthesisHostWebDavSyncEnsureCollectionResult,
  rebuildSynthesisHostWebDavSyncReadRequest,
  rebuildSynthesisHostWebDavSyncReadResult,
  rebuildSynthesisHostWebDavSyncWriteRequest,
  rebuildSynthesisHostWebDavSyncWriteResult,
  type SynthesisHostWebDavSyncPort,
} from "../../../packages/synthesis-contracts/src/index";

export function createDisabledSynthesisHostWebDavSyncPort(): SynthesisHostWebDavSyncPort {
  return {
    async describe() {
      return rebuildSynthesisHostWebDavSyncDescription({
        status: "disabled",
        configStatus: "disabled",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "",
        remotePath: "",
        username: "",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
    async readText(rawRequest) {
      rebuildSynthesisHostWebDavSyncReadRequest(rawRequest);
      return rebuildSynthesisHostWebDavSyncReadResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
    async writeText(rawRequest) {
      rebuildSynthesisHostWebDavSyncWriteRequest(rawRequest);
      return rebuildSynthesisHostWebDavSyncWriteResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
    async ensureCollection(rawRequest) {
      rebuildSynthesisHostWebDavSyncEnsureCollectionRequest(rawRequest);
      return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
  };
}
