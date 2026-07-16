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
import {
  createDefaultSynthesisWebDavHttpClient,
  webDavCredentialForRequest,
  type SynthesisWebDavHttpClient,
} from "./webDavSyncClient";
import { webDavRemoteUrl } from "./webDavSyncRemote";
import {
  getSynthesisWebDavSyncPrefsConfig,
  getWebDavSyncPrefsStatus,
} from "./webDavSyncPrefs";

type WebDavConfig = ReturnType<typeof getSynthesisWebDavSyncPrefsConfig>;
type WebDavStatus = ReturnType<typeof getWebDavSyncPrefsStatus>;

type SynthesisWebDavSyncAdapterOptions = {
  client?: SynthesisWebDavHttpClient;
  readConfig?: () => WebDavConfig;
  readStatus?: () => WebDavStatus;
  readCredential?: () => Promise<string>;
};

function descriptionUnavailable() {
  return rebuildSynthesisHostWebDavSyncDescription({
    status: "unavailable",
    configStatus: "invalid",
    autoSyncEnabled: false,
    autoRetryEnabled: false,
    baseUrl: "",
    remotePath: "",
    username: "",
    diagnostics: ["webdav_sync_host_description_failed"],
  });
}

function diagnosticCodes(status: WebDavStatus) {
  const codes = status.diagnostics
    .map((entry) => String(entry.code || "").trim())
    .filter(Boolean);
  return codes.length ? codes : ["webdav_sync_not_configured"];
}

function descriptionFromStatus(status: WebDavStatus) {
  const available = status.config_status === "configured";
  return rebuildSynthesisHostWebDavSyncDescription({
    status: available ? "available" : "disabled",
    configStatus: status.config_status,
    autoSyncEnabled: status.auto_sync_enabled,
    autoRetryEnabled: status.auto_retry_enabled,
    baseUrl: status.base_url,
    remotePath: status.remote_path,
    username: status.username,
    ...(status.credential_updated_at
      ? { credentialUpdatedAt: status.credential_updated_at }
      : {}),
    ...(status.connection_test
      ? { connectionTest: status.connection_test }
      : {}),
    diagnostics: available ? [] : diagnosticCodes(status),
  });
}

function acceptedCollectionStatus(status: number) {
  return (
    status === 200 ||
    status === 201 ||
    status === 204 ||
    status === 405 ||
    status === 409
  );
}

function pathPrefixes(value: string) {
  const parts = value.split("/").filter(Boolean);
  return parts.map((_part, index) => parts.slice(0, index + 1).join("/"));
}

export function createPrefsConfiguredSynthesisWebDavSyncPort(
  options: SynthesisWebDavSyncAdapterOptions = {},
): SynthesisHostWebDavSyncPort {
  const client = options.client || createDefaultSynthesisWebDavHttpClient();
  const readConfig = options.readConfig || getSynthesisWebDavSyncPrefsConfig;
  const readStatus = options.readStatus || getWebDavSyncPrefsStatus;
  const readCredential = options.readCredential || webDavCredentialForRequest;

  async function currentRemote() {
    const config = readConfig();
    const description = descriptionFromStatus(readStatus());
    if (
      description.status !== "available" ||
      !config.enabled ||
      !config.baseUrl ||
      !config.remotePath
    ) {
      return null;
    }
    return { config, credential: await readCredential() };
  }

  return {
    async describe() {
      try {
        return descriptionFromStatus(readStatus());
      } catch {
        return descriptionUnavailable();
      }
    },

    async readText(rawRequest) {
      const request = rebuildSynthesisHostWebDavSyncReadRequest(rawRequest);
      try {
        const remote = await currentRemote();
        if (!remote) {
          return rebuildSynthesisHostWebDavSyncReadResult({
            status: "unavailable",
            diagnostics: ["webdav_sync_host_unavailable"],
          });
        }
        const response = await client.request({
          method: "GET",
          url: webDavRemoteUrl({
            baseUrl: remote.config.baseUrl,
            remotePath: remote.config.remotePath,
            relativePath: request.path,
          }),
          username: remote.config.username,
          credential: remote.credential,
        });
        if (response.status === 404) {
          return rebuildSynthesisHostWebDavSyncReadResult({
            status: "missing",
            diagnostics: [],
          });
        }
        if (!response.ok) {
          return rebuildSynthesisHostWebDavSyncReadResult({
            status: "unavailable",
            diagnostics: ["webdav_sync_host_read_failed"],
          });
        }
        return rebuildSynthesisHostWebDavSyncReadResult({
          status: "available",
          text: response.text || "",
          ...(response.etag ? { etag: response.etag } : {}),
          diagnostics: [],
        });
      } catch {
        return rebuildSynthesisHostWebDavSyncReadResult({
          status: "unavailable",
          diagnostics: ["webdav_sync_host_read_failed"],
        });
      }
    },

    async writeText(rawRequest) {
      const request = rebuildSynthesisHostWebDavSyncWriteRequest(rawRequest);
      try {
        const remote = await currentRemote();
        if (!remote) {
          return rebuildSynthesisHostWebDavSyncWriteResult({
            status: "unavailable",
            diagnostics: ["webdav_sync_host_unavailable"],
          });
        }
        const response = await client.request({
          method: "PUT",
          url: webDavRemoteUrl({
            baseUrl: remote.config.baseUrl,
            remotePath: remote.config.remotePath,
            relativePath: request.path,
          }),
          body: request.text,
          headers: request.ifMatch
            ? { "If-Match": request.ifMatch }
            : undefined,
          username: remote.config.username,
          credential: remote.credential,
        });
        if (response.status === 409 || response.status === 412) {
          return rebuildSynthesisHostWebDavSyncWriteResult({
            status: "conflict",
            diagnostics: ["webdav_sync_remote_changed_during_sync"],
          });
        }
        if (!response.ok) {
          return rebuildSynthesisHostWebDavSyncWriteResult({
            status: "unavailable",
            diagnostics: ["webdav_sync_host_write_failed"],
          });
        }
        return rebuildSynthesisHostWebDavSyncWriteResult({
          status: "written",
          ...(response.etag ? { etag: response.etag } : {}),
          diagnostics: [],
        });
      } catch {
        return rebuildSynthesisHostWebDavSyncWriteResult({
          status: "unavailable",
          diagnostics: ["webdav_sync_host_write_failed"],
        });
      }
    },

    async ensureCollection(rawRequest) {
      const request =
        rebuildSynthesisHostWebDavSyncEnsureCollectionRequest(rawRequest);
      try {
        const remote = await currentRemote();
        if (!remote) {
          return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
            status: "unavailable",
            diagnostics: ["webdav_sync_host_unavailable"],
          });
        }
        const urls = [
          ...pathPrefixes(remote.config.remotePath).map((relativePath) =>
            webDavRemoteUrl({
              baseUrl: remote.config.baseUrl,
              remotePath: "",
              relativePath,
            }),
          ),
          ...pathPrefixes(request.path).map((relativePath) =>
            webDavRemoteUrl({
              baseUrl: remote.config.baseUrl,
              remotePath: remote.config.remotePath,
              relativePath,
            }),
          ),
        ];
        for (const url of Array.from(new Set(urls))) {
          const response = await client.request({
            method: "MKCOL",
            url,
            username: remote.config.username,
            credential: remote.credential,
          });
          if (!response.ok && !acceptedCollectionStatus(response.status)) {
            return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
              status: "unavailable",
              diagnostics: ["webdav_sync_host_collection_failed"],
            });
          }
        }
        return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
          status: "ready",
          diagnostics: [],
        });
      } catch {
        return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
          status: "unavailable",
          diagnostics: ["webdav_sync_host_collection_failed"],
        });
      }
    },
  };
}
