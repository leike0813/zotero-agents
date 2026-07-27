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
import type { SynthesisReverseHostHandlers } from "./synthesisReverseHostBroker";

type Ports = {
  hostReadPort: SynthesisHostReadPort;
  exportDeliveryPort: SynthesisHostExportDeliveryPort;
  representativeImagePort: SynthesisHostRepresentativeImageReadPort;
  relatedItemsEffectPort: SynthesisHostRelatedItemsEffectPort;
  stagedTagBindingPort: SynthesisHostStagedTagBindingMigrationPort;
  tagEffectPort: SynthesisHostTagEffectPort;
  webDavPort: SynthesisHostWebDavSyncPort;
};

function exactPayload(
  payload: SynthesisJsonObject,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const keys = Object.keys(payload);
  if (
    required.some((key) => !(key in payload)) ||
    keys.some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
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
        exactPayload(payload, ["libraryId"], [
          "cursor",
          "limit",
        ]) as SynthesisHostPageRequest,
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
        exactPayload(payload, ["libraryId"], [
          "cursor",
          "limit",
          "paperRefs",
          "artifactTypes",
        ]) as SynthesisHostArtifactScanPageRequest,
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

export function createDefaultSynthesisReverseHostHandlers(args: {
  libraryId: number;
}) {
  return createSynthesisReverseHostHandlers({
    hostReadPort: createZoteroSynthesisHostReadPort({
      libraryId: args.libraryId,
    }),
    exportDeliveryPort: createSynthesisHostExportDeliveryPort(),
    representativeImagePort:
      createZoteroSynthesisRepresentativeImageReadPort(),
    relatedItemsEffectPort:
      createZoteroSynthesisRelatedItemsEffectPort(),
    stagedTagBindingPort:
      createZoteroSynthesisStagedTagBindingMigrationPort(),
    tagEffectPort: createZoteroSynthesisTagEffectPort(),
    webDavPort: createPrefsConfiguredSynthesisWebDavSyncPort(),
  });
}
