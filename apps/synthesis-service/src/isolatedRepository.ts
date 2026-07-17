import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
  createSynthesisRepositoryFoundationStore,
  type SynthesisRepositoryFoundationStore,
} from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarRepositorySnapshot } from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import { openSynthesisNodeSqliteAdapter } from "./repositoryNodeSqlite.js";

const MARKER_SCHEMA = "synthesis-sidecar-isolated-repository.v1" as const;

type RepositoryMarker = {
  schema: typeof MARKER_SCHEMA;
  profileId: string;
  dataRootId: string;
  schemaVersion: typeof SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION;
  repositoryId: string;
};

function repositoryId(profileId: string, dataRootId: string) {
  return crypto
    .createHash("sha256")
    .update(MARKER_SCHEMA)
    .update("\0")
    .update(profileId)
    .update("\0")
    .update(dataRootId)
    .update("\0")
    .update(SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION)
    .digest("hex");
}

function expectedMarker(
  profileId: string,
  dataRootId: string,
): RepositoryMarker {
  return {
    schema: MARKER_SCHEMA,
    profileId,
    dataRootId,
    schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    repositoryId: repositoryId(profileId, dataRootId),
  };
}

function strictMarker(value: unknown): RepositoryMarker {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("repository_identity_invalid");
  }
  const marker = value as Record<string, unknown>;
  if (
    Object.keys(marker).sort().join("\n") !==
      [
        "dataRootId",
        "profileId",
        "repositoryId",
        "schema",
        "schemaVersion",
      ].join("\n") ||
    marker.schema !== MARKER_SCHEMA ||
    typeof marker.profileId !== "string" ||
    typeof marker.dataRootId !== "string" ||
    marker.schemaVersion !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION ||
    typeof marker.repositoryId !== "string"
  ) {
    throw new Error("repository_identity_invalid");
  }
  return marker as RepositoryMarker;
}

function writeMarker(markerPath: string, marker: RepositoryMarker) {
  const temporaryPath = `${markerPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(marker)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  fs.renameSync(temporaryPath, markerPath);
}

export type SynthesisSidecarIsolatedRepository = {
  store: SynthesisRepositoryFoundationStore;
  paths: { root: string; databasePath: string; markerPath: string };
  snapshot: () => SynthesisSidecarRepositorySnapshot;
  close: () => void;
};

export function openSynthesisSidecarIsolatedRepository(options: {
  profileRuntimeRoot: string;
  profileId: string;
  dataRootId: string;
  now?: () => string;
}): SynthesisSidecarIsolatedRepository {
  const expected = expectedMarker(options.profileId, options.dataRootId);
  const root = path.join(
    options.profileRuntimeRoot,
    "shadow-repository",
    options.dataRootId,
  );
  const databasePath = path.join(root, "synthesis.db");
  const markerPath = path.join(root, "identity.json");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") fs.chmodSync(root, 0o700);

  if (fs.existsSync(markerPath)) {
    let persisted: RepositoryMarker;
    try {
      persisted = strictMarker(JSON.parse(fs.readFileSync(markerPath, "utf8")));
    } catch {
      throw new Error("repository_identity_invalid");
    }
    if (
      persisted.schema !== expected.schema ||
      persisted.profileId !== expected.profileId ||
      persisted.dataRootId !== expected.dataRootId ||
      persisted.schemaVersion !== expected.schemaVersion ||
      persisted.repositoryId !== expected.repositoryId
    ) {
      throw new Error("repository_identity_invalid");
    }
  } else {
    writeMarker(markerPath, expected);
  }
  if (process.platform !== "win32") fs.chmodSync(markerPath, 0o600);

  const connection = openSynthesisNodeSqliteAdapter(databasePath);
  const store = createSynthesisRepositoryFoundationStore({
    db: connection.adapter,
    now: options.now,
  });
  try {
    store.initialize();
    store.initializeTopicApplication();
    store.initializeCitationGraphApplication();
    store.initializeReferenceRefreshApplication();
    store.initializeReferenceMatchingReviewApplication();
    store.reconcileReferenceMatchingPreparations();
    store.reconcileRunningOperations();
  } catch (error) {
    connection.close();
    throw error;
  }
  let state: SynthesisSidecarRepositorySnapshot["state"] = "ready";
  let closed = false;
  return {
    store,
    paths: { root, databasePath, markerPath },
    snapshot: () => ({
      mode: "isolated_shadow",
      state,
      schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
      repositoryId: expected.repositoryId,
    }),
    close() {
      if (closed) return;
      state = "stopping";
      connection.close();
      closed = true;
    },
  };
}
