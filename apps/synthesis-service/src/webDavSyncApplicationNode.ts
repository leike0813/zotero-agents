import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  rebuildSynthesisHostWebDavSyncDescription,
  rebuildSynthesisHostWebDavSyncEnsureCollectionRequest,
  rebuildSynthesisHostWebDavSyncEnsureCollectionResult,
  rebuildSynthesisHostWebDavSyncReadRequest,
  rebuildSynthesisHostWebDavSyncReadResult,
  rebuildSynthesisHostWebDavSyncWriteRequest,
  rebuildSynthesisHostWebDavSyncWriteResult,
  type SynthesisHostWebDavSyncPort,
} from "../../../packages/synthesis-contracts/src/webDavSyncPort.js";
import type {
  SynthesisWebDavSyncDurablePort,
  SynthesisWebDavSyncState,
  SynthesisWebDavSyncStateStore,
} from "../../../packages/synthesis-contracts/src/webDavSync.js";
import { createSynthesisWebDavSyncApplication } from "../../../packages/synthesis-application/src/webDavSyncApplication.js";

const IDENTITY_SCHEMA = "synthesis-sidecar-webdav-sync-identity.v1" as const;

type Identity = {
  schema: typeof IDENTITY_SCHEMA;
  profileId: string;
  dataRootId: string;
  storeId: string;
};

function exactIdentity(value: unknown): Identity {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("webdav_sync_identity_invalid");
  }
  const record = value as Record<string, unknown>;
  const fields = Object.keys(record).sort();
  const expected = ["dataRootId", "profileId", "schema", "storeId"];
  if (
    fields.length !== expected.length ||
    fields.some((field, index) => field !== expected[index]) ||
    record.schema !== IDENTITY_SCHEMA ||
    typeof record.profileId !== "string" ||
    typeof record.dataRootId !== "string" ||
    typeof record.storeId !== "string"
  ) {
    throw new Error("webdav_sync_identity_invalid");
  }
  return record as Identity;
}

function identity(profileId: string, dataRootId: string): Identity {
  return {
    schema: IDENTITY_SCHEMA,
    profileId,
    dataRootId,
    storeId: crypto
      .createHash("sha256")
      .update(IDENTITY_SCHEMA)
      .update("\0")
      .update(profileId)
      .update("\0")
      .update(dataRootId)
      .digest("hex"),
  };
}

function atomicWrite(filePath: string, text: string) {
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  const descriptor = fs.openSync(temporaryPath, "w", 0o600);
  try {
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporaryPath, filePath);
  const directory = fs.openSync(path.dirname(filePath), "r");
  try {
    fs.fsyncSync(directory);
  } finally {
    fs.closeSync(directory);
  }
}

export function createDisabledSynthesisSidecarWebDavSyncPort(): SynthesisHostWebDavSyncPort {
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
    async readText(request) {
      rebuildSynthesisHostWebDavSyncReadRequest(request);
      return rebuildSynthesisHostWebDavSyncReadResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
    async writeText(request) {
      rebuildSynthesisHostWebDavSyncWriteRequest(request);
      return rebuildSynthesisHostWebDavSyncWriteResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
    async ensureCollection(request) {
      rebuildSynthesisHostWebDavSyncEnsureCollectionRequest(request);
      return rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
        status: "unavailable",
        diagnostics: ["webdav_sync_disabled"],
      });
    },
  };
}

export function openSynthesisSidecarWebDavSyncStateStore(options: {
  profileRuntimeRoot: string;
  profileId: string;
  dataRootId: string;
}): SynthesisWebDavSyncStateStore & { root: string } {
  const root = path.join(
    options.profileRuntimeRoot,
    "shadow-webdav-sync",
    options.dataRootId,
  );
  const markerPath = path.join(root, "identity.json");
  const statePath = path.join(root, "state.json");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const expected = identity(options.profileId, options.dataRootId);
  if (fs.existsSync(markerPath)) {
    const actual = exactIdentity(
      JSON.parse(fs.readFileSync(markerPath, "utf8")) as unknown,
    );
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error("webdav_sync_identity_mismatch");
    }
  } else {
    atomicWrite(markerPath, `${JSON.stringify(expected, null, 2)}\n`);
  }
  return {
    root,
    load() {
      if (!fs.existsSync(statePath)) return null;
      const stat = fs.lstatSync(statePath);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 256 * 1024) {
        throw new Error("webdav_sync_state_invalid");
      }
      return JSON.parse(fs.readFileSync(statePath, "utf8")) as unknown;
    },
    save(state: SynthesisWebDavSyncState) {
      atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
    },
  };
}

export function createSynthesisSidecarWebDavSyncApplication(options: {
  profileRuntimeRoot: string;
  profileId: string;
  dataRootId: string;
  durable: SynthesisWebDavSyncDurablePort;
  hostPort?: SynthesisHostWebDavSyncPort;
  now?: () => string;
}) {
  const stateStore = openSynthesisSidecarWebDavSyncStateStore(options);
  const application = createSynthesisWebDavSyncApplication({
    hostPort:
      options.hostPort ?? createDisabledSynthesisSidecarWebDavSyncPort(),
    durable: options.durable,
    stateStore,
    now: options.now,
    acknowledgeUnbasedUpdates: false,
  });
  return { ...application, stateStore };
}
