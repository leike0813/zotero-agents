import {
  SynthesisClientError,
  rebuildSynthesisHostExportDeliveryRequest,
  rebuildSynthesisHostExportDeliveryTransferRequest,
  rebuildSynthesisHostRunWorkspaceMaterializationRequest,
  rebuildSynthesisHostRunWorkspaceMaterializationTransferRequest,
  rebuildSynthesisHostRelatedItemsEffectBatchRequest,
  rebuildSynthesisHostRepresentativeImageReadRequest,
  rebuildSynthesisHostStagedTagBindingResolutionRequest,
  rebuildSynthesisHostTagEffectBatchRequest,
  rebuildSynthesisHostWebDavSyncEnsureCollectionRequest,
  rebuildSynthesisHostWebDavSyncReadRequest,
  rebuildSynthesisHostWebDavSyncWriteRequest,
  toSynthesisJsonObject,
  type SynthesisHostArtifactReadRequest,
  type SynthesisHostArtifactScanPageRequest,
  type SynthesisHostExportDeliveryPort,
  type SynthesisHostRunWorkspaceMaterializationPort,
  type SynthesisHostLibraryItemsByRefRequest,
  type SynthesisHostPageRequest,
  type SynthesisHostReadPort,
  type SynthesisHostTagAuditStateRequest,
  type SynthesisHostTagAuditStateResult,
  type SynthesisHostRelatedItemsEffectPort,
  type SynthesisHostRepresentativeImageReadPort,
  type SynthesisHostStagedTagBindingMigrationPort,
  type SynthesisHostTagEffectPort,
  type SynthesisHostWebDavSyncPort,
  type SynthesisJsonObject,
  type SynthesisReverseHostPayload,
  type SynthesisSidecarOutputTransferReference,
  type ZoteroLibrarySnapshotRequestDto,
} from "../../packages/synthesis-contracts/src";
import {
  createSynthesisHostExportDeliveryPort,
  createSynthesisHostRunWorkspaceMaterializationPort,
} from "./synthesis/exportDeliveryAdapter";
import { createZoteroSynthesisHostReadPort } from "./synthesis/libraryAdapter";
import { createZoteroSynthesisRepresentativeImageReadPort } from "./synthesis/representativeImageReadAdapter";
import { createZoteroSynthesisRelatedItemsEffectPort } from "./synthesis/relatedItemsEffectAdapter";
import {
  createZoteroSynthesisStagedTagBindingMigrationPort,
  createZoteroSynthesisTagEffectPort,
} from "./synthesis/tagEffectAdapter";
import { createPrefsConfiguredSynthesisWebDavSyncPort } from "./synthesis/webDavSyncAdapter";
import { resolveZoteroHostCapabilityBroker } from "./zoteroHostCapabilityBroker";
import type {
  SynthesisReverseHostHandler,
  SynthesisReverseHostHandlers,
} from "./synthesisReverseHostBroker";
import {
  consumeSynthesisSidecarOutputJson,
  type SynthesisSidecarTransferConnection,
  type SynthesisSidecarTransferRpcClient,
} from "./synthesisSidecarTransferClient";
import { createSynthesisSidecarRpcClient } from "./synthesisSidecarRpcClient";
import { SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS } from "./synthesisProductionRpcPolicy";

type Ports = {
  hostReadPort: SynthesisHostReadPort;
  exportDeliveryPort: SynthesisHostExportDeliveryPort;
  runWorkspaceMaterializationPort: SynthesisHostRunWorkspaceMaterializationPort;
  representativeImagePort: SynthesisHostRepresentativeImageReadPort;
  relatedItemsEffectPort: SynthesisHostRelatedItemsEffectPort;
  stagedTagBindingPort: SynthesisHostStagedTagBindingMigrationPort;
  tagEffectPort: SynthesisHostTagEffectPort;
  webDavPort: SynthesisHostWebDavSyncPort;
  tagAuditStatePort?: {
    read(
      request: SynthesisHostTagAuditStateRequest,
    ): Promise<SynthesisHostTagAuditStateResult>;
  };
  exportTransfer?: {
    rpcClient: SynthesisSidecarTransferRpcClient;
    getConnection(): SynthesisSidecarTransferConnection | null;
  };
};

type ReverseHostHandlerContext = Parameters<SynthesisReverseHostHandler>[1];
type UnscopedSynthesisReverseHostHandlers = Omit<
  SynthesisReverseHostHandlers,
  | "library.items.sync_snapshot"
  | "library.items.list_page"
  | "library.items.get_by_ref"
  | "library.artifacts.scan_page"
> & {
  "library.items.sync_snapshot": (
    payload: ZoteroLibrarySnapshotRequestDto,
    context: ReverseHostHandlerContext,
  ) => ReturnType<SynthesisHostReadPort["library"]["syncSnapshot"]>;
  "library.items.list_page": (
    payload: SynthesisHostPageRequest,
    context: ReverseHostHandlerContext,
  ) => ReturnType<SynthesisHostReadPort["library"]["listItemsPage"]>;
  "library.items.get_by_ref": (
    payload: SynthesisHostLibraryItemsByRefRequest,
    context: ReverseHostHandlerContext,
  ) => ReturnType<SynthesisHostReadPort["library"]["getItemsByRef"]>;
  "library.artifacts.scan_page": (
    payload: SynthesisHostArtifactScanPageRequest,
    context: ReverseHostHandlerContext,
  ) => ReturnType<SynthesisHostReadPort["artifacts"]["scanPage"]>;
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
): UnscopedSynthesisReverseHostHandlers {
  const consumeExportEntries = async (
    capability: string,
    contentTransfer: SynthesisSidecarOutputTransferReference,
  ) => {
    const source = ports.exportTransfer;
    const connection = source?.getConnection();
    if (!source || !connection) {
      throw new SynthesisClientError(
        "unavailable",
        "The Synthesis export transfer connection is unavailable",
      );
    }
    const content = toSynthesisJsonObject(
      await consumeSynthesisSidecarOutputJson({
        rpcClient: source.rpcClient,
        connection,
        reference: contentTransfer,
        target: "host_export_entries",
        capability,
        cancelAfterRead: false,
      }),
      "$.hostExportTransfer",
    );
    exactPayload(content, ["entries"]);
    return content.entries;
  };
  return {
    "library.items.sync_snapshot": async (payload) =>
      ports.hostReadPort.library.syncSnapshot(
        exactPayload(
          payload,
          ["libraryId"],
          ["batchSize", "snapshotId", "cursor"],
        ) as ZoteroLibrarySnapshotRequestDto,
      ),
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
    "library.items.get_audit_state": async (payload) => {
      const request = exactPayload(payload, ["targets"]);
      if (!ports.tagAuditStatePort) {
        throw new SynthesisClientError(
          "unavailable",
          "The tag-audit Host state port is unavailable",
        );
      }
      return ports.tagAuditStatePort.read(
        request as SynthesisHostTagAuditStateRequest,
      );
    },
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
    "delivery.export.publish_archive": async (payload) => {
      const request = rebuildSynthesisHostExportDeliveryTransferRequest(
        exactPayload(payload, ["capability", "displayName", "contentTransfer"]),
      );
      const entries = await consumeExportEntries(
        request.capability,
        request.contentTransfer,
      );
      return ports.exportDeliveryPort.publishArchive(
        rebuildSynthesisHostExportDeliveryRequest({
          capability: request.capability,
          displayName: request.displayName,
          entries,
        }),
      );
    },
    "delivery.export.materialize_run_workspace": async (payload) => {
      const request =
        rebuildSynthesisHostRunWorkspaceMaterializationTransferRequest(
          exactPayload(payload, ["capability", "runRoot", "contentTransfer"]),
        );
      const entries = await consumeExportEntries(
        request.capability,
        request.contentTransfer,
      );
      return ports.runWorkspaceMaterializationPort.materialize(
        rebuildSynthesisHostRunWorkspaceMaterializationRequest({
          capability: request.capability,
          runRoot: request.runRoot,
          entries,
        }),
      );
    },
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
    {
      kind: "items" | "artifacts";
      sourceCursor: string;
      revision: string;
      expiresAt: number;
    }
  >();
  let snapshotCounter = 0;
  let revisionCounter = 0;
  const injectLibraryScope = <T extends object>(
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
  const nextSnapshot = (
    kind: "items" | "artifacts",
    sourceCursor: string,
    revision: string,
  ) => {
    expireSnapshots();
    const token = `host-snapshot-${++snapshotCounter}-${Math.random()
      .toString(36)
      .slice(2)}`;
    snapshots.set(token, {
      kind,
      sourceCursor,
      revision,
      expiresAt: Date.now() + HOST_SNAPSHOT_TTL_MS,
    });
    return token;
  };
  const resolveSnapshot = (
    kind: "items" | "artifacts",
    payload: { cursor?: string },
  ) => {
    expireSnapshots();
    const token = typeof payload.cursor === "string" ? payload.cursor : "";
    if (!token) {
      return {
        sourceCursor: "",
        revision: `host-revision-${++revisionCounter}`,
      };
    }
    const snapshot = snapshots.get(token);
    if (!snapshot || snapshot.kind !== kind) {
      throw new SynthesisClientError(
        "invalid_request",
        "The reverse Host snapshot token is unavailable",
      );
    }
    snapshots.delete(token);
    return {
      sourceCursor: snapshot.sourceCursor,
      revision: snapshot.revision,
    };
  };
  const page = async <
    P extends { cursor?: string },
    T extends { nextCursor: string; hasMore: boolean },
  >(
    kind: "items" | "artifacts",
    payload: P,
    read: (scoped: P & { libraryId: number }) => Promise<T>,
  ) => {
    const snapshot = resolveSnapshot(kind, payload);
    const result = await read({
      ...injectLibraryScope(payload),
      cursor: snapshot.sourceCursor,
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
      ? nextSnapshot(kind, result.nextCursor, snapshot.revision)
      : "";
    return {
      ...result,
      cursor: typeof payload.cursor === "string" ? payload.cursor : "",
      nextCursor,
      snapshotRevision: snapshot.revision,
    };
  };
  return {
    ...handlers,
    "library.items.sync_snapshot": (
      payload: SynthesisReverseHostPayload<"library.items.sync_snapshot">,
      context: ReverseHostHandlerContext,
    ) =>
      handlers["library.items.sync_snapshot"](
        injectLibraryScope(payload),
        context,
      ),
    "library.items.list_page": (
      payload: SynthesisReverseHostPayload<"library.items.list_page">,
      context: ReverseHostHandlerContext,
    ) =>
      page("items", payload, async (scoped) =>
        handlers["library.items.list_page"](scoped, context),
      ),
    "library.items.get_by_ref": (
      payload: SynthesisReverseHostPayload<"library.items.get_by_ref">,
      context: ReverseHostHandlerContext,
    ) =>
      handlers["library.items.get_by_ref"](
        injectLibraryScope(payload),
        context,
      ),
    "library.artifacts.scan_page": (
      payload: SynthesisReverseHostPayload<"library.artifacts.scan_page">,
      context: ReverseHostHandlerContext,
    ) =>
      page("artifacts", payload, async (scoped) =>
        handlers["library.artifacts.scan_page"](scoped, context),
      ),
  };
}

export function createDefaultSynthesisReverseHostHandlers(args: {
  libraryId: number;
  getTransferConnection(): SynthesisSidecarTransferConnection | null;
}) {
  return createScopedSynthesisReverseHostHandlers({
    libraryId: args.libraryId,
    hostReadPort: createZoteroSynthesisHostReadPort({
      libraryId: args.libraryId,
    }),
    exportDeliveryPort: createSynthesisHostExportDeliveryPort(),
    runWorkspaceMaterializationPort:
      createSynthesisHostRunWorkspaceMaterializationPort(),
    representativeImagePort: createZoteroSynthesisRepresentativeImageReadPort(),
    relatedItemsEffectPort: createZoteroSynthesisRelatedItemsEffectPort(),
    stagedTagBindingPort: createZoteroSynthesisStagedTagBindingMigrationPort(),
    tagEffectPort: createZoteroSynthesisTagEffectPort(),
    tagAuditStatePort: {
      async read(request) {
        const broker = resolveZoteroHostCapabilityBroker();
        return {
          states: await Promise.all(
            request.targets.map(async (target) => {
              const state = await broker.library.getItemAuditState({
                libraryId: target.libraryId,
                key: target.itemKey,
              });
              return {
                target: state.target,
                revision: state.revision,
                tagDigest: state.tagDigest,
              };
            }),
          ),
        };
      },
    },
    webDavPort: createPrefsConfiguredSynthesisWebDavSyncPort(),
    exportTransfer: {
      rpcClient: createSynthesisSidecarRpcClient({
        transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      }),
      getConnection: args.getTransferConnection,
    },
  });
}
