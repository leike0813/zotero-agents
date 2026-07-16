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
import type {
  SynthesisGitSyncAdapter,
  SynthesisGitSyncConfigProjection,
} from "./gitSync";

export type SynthesisGitSyncRuntimeBinding = {
  adapter?: SynthesisGitSyncAdapter;
  autoSyncEnabled: boolean;
  autoRetryEnabled: boolean;
  readConfigStatus: () =>
    | SynthesisGitSyncConfigProjection
    | Promise<SynthesisGitSyncConfigProjection>;
};

export function createDisabledSynthesisGitSyncRuntimeBinding(): SynthesisGitSyncRuntimeBinding {
  return {
    autoSyncEnabled: false,
    autoRetryEnabled: false,
    readConfigStatus: () => ({ config_status: "disabled" }),
  };
}

export function createDisabledSynthesisHostWebDavSyncPort(): SynthesisHostWebDavSyncPort {
  return {
    async describe() {
      return rebuildSynthesisHostWebDavSyncDescription({
        status: "disabled",
        configStatus: "disabled",
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
