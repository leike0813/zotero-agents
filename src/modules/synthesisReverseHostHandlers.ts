import {
  SynthesisClientError,
  rebuildSynthesisHostExportDeliveryRequest,
  rebuildSynthesisHostRelatedItemsEffectBatchRequest,
  rebuildSynthesisHostRepresentativeImageReadRequest,
  rebuildSynthesisHostStagedTagBindingResolutionRequest,
  rebuildSynthesisHostTagEffectBatchRequest,
  rebuildSynthesisHostWebDavSyncEnsureCollectionRequest,
  rebuildSynthesisHostWebDavSyncReadRequest,
  rebuildSynthesisHostWebDavSyncWriteRequest,
  type SynthesisHostArtifactReadRequest,
  type SynthesisHostArtifactScanPageRequest,
  type SynthesisHostExportDeliveryPort,
  type SynthesisHostLibraryItemsByRefRequest,
  type SynthesisHostPageRequest,
  type SynthesisHostReadPort,
  type SynthesisHostRelatedItemsEffectPort,
  type SynthesisHostRepresentativeImageReadPort,
  type SynthesisHostStagedTagBindingMigrationPort,
  type SynthesisHostTagEffectPort,
  type SynthesisHostWebDavSyncPort,
  type SynthesisJsonObject,
} from "../../packages/synthesis-contracts/src";
import { createSynthesisHostExportDeliveryPort } from "./synthesis/exportDeliveryAdapter";
import { createZoteroSynthesisHostReadPort } from "./synthesis/libraryAdapter";
import { createZoteroSynthesisRepresentativeImageReadPort } from "./synthesis/representativeImageReadAdapter";
import { createZoteroSynthesisRelatedItemsEffectPort } from "./synthesis/relatedItemsEffectAdapter";
import {
  createZoteroSynthesisStagedTagBindingMigrationPort,
  createZoteroSynthesisTagEffectPort,
} from "./synthesis/tagEffectAdapter";
import { createPrefsConfiguredSynthesisWebDavSyncPort } from "./synthesis/webDavSyncAdapter";
import type {
  SynthesisReverseHostHandler,
  SynthesisReverseHostHandlers,
} from "./synthesisReverseHostBroker";

type Ports = {
  hostReadPort: SynthesisHostReadPort;
  exportDeliveryPort: SynthesisHostExportDeliveryPort;
  representativeImagePort: SynthesisHostRepresentativeImageReadPort;
  relatedItemsEffectPort: SynthesisHostRelatedItemsEffectPort;
  stagedTagBindingPort: SynthesisHostStagedTagBindingMigrationPort;
  tagEffectPort: SynthesisHostTagEffectPort;
  webDavPort: SynthesisHostWebDavSyncPort;
};

const HOST_SNAPSHOT_TTL_MS = 10_000;
const HOST_SNAPSHOT_LIMIT_BYTES = 8 * 1024 * 1024;

function exactPayload(
  payload: SynthesisJsonObject,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const keys = Object.keys(payload);
  if (
    required.some((key) => !(key in payload)) ||
    keys.some((key) => !required.includes(key) && !optional.includes(key))
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "The reverse Host payload is invalid",
      { reason: "reverse_host_payload_invalid" },
    );
  }
  return payload;
}

export function createSynthesisReverseHostHandlers(
  ports: Ports,
): SynthesisReverseHostHandlers {
  return {
    "library.items.list_page": async (payload) =>
      ports.hostReadPort.library.listItemsPage(
        exactPayload(
          payload,
          ["libraryId"],
          ["cursor", "limit"],
        ) as SynthesisHostPageRequest,
      ),
    "library.items.get_by_ref": async (payload) =>
      ports.hostReadPort.library.getItemsByRef(
        exactPayload(payload, [
          "libraryId",
          "paperRefs",
        ]) as SynthesisHostLibraryItemsByRefRequest,
      ),
    "library.artifacts.scan_page": async (payload) =>
      ports.hostReadPort.artifacts.scanPage(
        exactPayload(
          payload,
          ["libraryId"],
          ["cursor", "limit", "paperRefs", "artifactTypes"],
        ) as SynthesisHostArtifactScanPageRequest,
      ),
    "library.artifacts.read": async (payload) =>
      ports.hostReadPort.artifacts.read(
        exactPayload(payload, [
          "locator",
          "expectedHash",
        ]) as SynthesisHostArtifactReadRequest,
      ),
    "library.representative_image.read": async (payload) =>
      ports.representativeImagePort.read(
        rebuildSynthesisHostRepresentativeImageReadRequest(payload),
      ),
    "delivery.export.publish_archive": async (payload) =>
      ports.exportDeliveryPort.publishArchive(
        rebuildSynthesisHostExportDeliveryRequest(payload),
      ),
    "webdav.describe": async (payload) => {
      exactPayload(payload, []);
      return ports.webDavPort.describe();
    },
    "webdav.read_text": async (payload) =>
      ports.webDavPort.readText(
        rebuildSynthesisHostWebDavSyncReadRequest(payload),
      ),
    "webdav.write_text": async (payload) =>
      ports.webDavPort.writeText(
        rebuildSynthesisHostWebDavSyncWriteRequest(payload),
      ),
    "webdav.ensure_collection": async (payload) =>
      ports.webDavPort.ensureCollection(
        rebuildSynthesisHostWebDavSyncEnsureCollectionRequest(payload),
      ),
    "effects.related_items.apply_batch": async (payload) =>
      ports.relatedItemsEffectPort.applyBatch(
        rebuildSynthesisHostRelatedItemsEffectBatchRequest(payload),
      ),
    "effects.tags.apply_batch": async (payload) =>
      ports.tagEffectPort.applyBatch(
        rebuildSynthesisHostTagEffectBatchRequest(payload),
      ),
    "effects.staged_tag_binding.resolve": async (payload) =>
      ports.stagedTagBindingPort.resolve(
        rebuildSynthesisHostStagedTagBindingResolutionRequest(payload),
      ),
  };
}

export function createScopedSynthesisReverseHostHandlers(
  args: Ports & { libraryId: number },
) {
  const { libraryId, ...ports } = args;
  const handlers = createSynthesisReverseHostHandlers(ports);
  const snapshots = new Map<
    string,
    { kind: "items" | "artifacts"; sourceCursor: string; expiresAt: number }
  >();
  let snapshotCounter = 0;
  const injectLibraryScope = <T extends SynthesisJsonObject>(
    payload: T,
  ): T & { libraryId: number } => {
    if ("libraryId" in payload || "library_id" in payload) {
      throw new SynthesisClientError(
        "invalid_request",
        "The reverse Host library scope is injected by the plugin",
      );
    }
    return { ...payload, libraryId };
  };
  const expireSnapshots = () => {
    const now = Date.now();
    for (const [token, snapshot] of snapshots) {
      if (snapshot.expiresAt <= now) snapshots.delete(token);
    }
  };
  const nextSnapshot = (kind: "items" | "artifacts", sourceCursor: string) => {
    expireSnapshots();
    const token = `host-snapshot-${++snapshotCounter}-${Math.random()
      .toString(36)
      .slice(2)}`;
    snapshots.set(token, {
      kind,
      sourceCursor,
      expiresAt: Date.now() + HOST_SNAPSHOT_TTL_MS,
    });
    return token;
  };
  const resolveSnapshot = (
    kind: "items" | "artifacts",
    payload: SynthesisJsonObject,
  ) => {
    expireSnapshots();
    const token = typeof payload.cursor === "string" ? payload.cursor : "";
    if (!token) return "";
    const snapshot = snapshots.get(token);
    if (!snapshot || snapshot.kind !== kind) {
      throw new SynthesisClientError(
        "invalid_request",
        "The reverse Host snapshot token is unavailable",
      );
    }
    snapshots.delete(token);
    return snapshot.sourceCursor;
  };
  const page = async <T extends { nextCursor: string; hasMore: boolean }>(
    kind: "items" | "artifacts",
    payload: SynthesisJsonObject,
    read: (scoped: SynthesisJsonObject) => Promise<T>,
  ) => {
    const sourceCursor = resolveSnapshot(kind, payload);
    const result = await read({
      ...injectLibraryScope(payload),
      cursor: sourceCursor,
    });
    const resultBytes = new TextEncoder().encode(
      JSON.stringify(result),
    ).byteLength;
    if (resultBytes > HOST_SNAPSHOT_LIMIT_BYTES) {
      throw new SynthesisClientError(
        "invalid_request",
        "The reverse Host snapshot page exceeds its byte limit",
      );
    }
    const nextCursor = result.hasMore
      ? nextSnapshot(kind, result.nextCursor)
      : "";
    return {
      ...result,
      cursor: typeof payload.cursor === "string" ? payload.cursor : "",
      nextCursor,
    };
  };
  return {
    ...handlers,
    "library.items.list_page": ((
      payload: SynthesisJsonObject,
      context: Parameters<SynthesisReverseHostHandler>[1],
    ) =>
      page(
        "items",
        payload,
        async (scoped) =>
          handlers["library.items.list_page"](scoped, context) as never,
      )) as SynthesisReverseHostHandler,
    "library.items.get_by_ref": ((
      payload: SynthesisJsonObject,
      context: Parameters<SynthesisReverseHostHandler>[1],
    ) =>
      handlers["library.items.get_by_ref"](
        injectLibraryScope(payload),
        context,
      )) as SynthesisReverseHostHandler,
    "library.artifacts.scan_page": ((
      payload: SynthesisJsonObject,
      context: Parameters<SynthesisReverseHostHandler>[1],
    ) =>
      page(
        "artifacts",
        payload,
        async (scoped) =>
          handlers["library.artifacts.scan_page"](scoped, context) as never,
      )) as SynthesisReverseHostHandler,
  };
}

export function createDefaultSynthesisReverseHostHandlers(args: {
  libraryId: number;
}) {
  return createScopedSynthesisReverseHostHandlers({
    libraryId: args.libraryId,
    hostReadPort: createZoteroSynthesisHostReadPort({
      libraryId: args.libraryId,
    }),
    exportDeliveryPort: createSynthesisHostExportDeliveryPort(),
    representativeImagePort: createZoteroSynthesisRepresentativeImageReadPort(),
    relatedItemsEffectPort: createZoteroSynthesisRelatedItemsEffectPort(),
    stagedTagBindingPort: createZoteroSynthesisStagedTagBindingMigrationPort(),
    tagEffectPort: createZoteroSynthesisTagEffectPort(),
    webDavPort: createPrefsConfiguredSynthesisWebDavSyncPort(),
  });
}
