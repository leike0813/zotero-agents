import {
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "../../src/modules/zoteroHostCapabilityBroker";
import { assertWorkflowHostStrictJsonValue } from "../../src/workflows/workflowHostErrorContract";

type ZoteroHostCapabilityBrokerConfiguration = {
  [Domain in keyof ZoteroHostCapabilityBroker]?: {
    [Member in keyof ZoteroHostCapabilityBroker[Domain]]?: ZoteroHostCapabilityBroker[Domain][Member];
  };
};

export function assertStrictJsonValue(value: unknown): void {
  assertWorkflowHostStrictJsonValue(value);
}

export function createFailClosedZoteroHostCapabilityBroker(
  configuration: ZoteroHostCapabilityBrokerConfiguration = {},
): ZoteroHostCapabilityBroker {
  const unexpected = (capability: string) => () => {
    throw new ZoteroHostCapabilityError(
      "unavailable",
      `unexpected broker capability: ${capability}`,
      { reason: "capability" },
    );
  };
  const broker: ZoteroHostCapabilityBroker = {
    context: {
      getCurrentView: unexpected("context.getCurrentView"),
      getSelectedItems: unexpected("context.getSelectedItems"),
    },
    navigation: {
      openItem: unexpected("navigation.openItem"),
      openNote: unexpected("navigation.openNote"),
      openCollection: unexpected("navigation.openCollection"),
      openSelection: unexpected("navigation.openSelection"),
    },
    library: {
      listItems: unexpected("library.listItems"),
      traverseItems: unexpected("library.traverseItems"),
      listCollections: unexpected("library.listCollections"),
      syncSnapshot: unexpected("library.syncSnapshot"),
      cancelSnapshot: unexpected("library.cancelSnapshot"),
      readinessAudit: unexpected("library.readinessAudit"),
      searchItems: unexpected("library.searchItems"),
      getItemDetail: unexpected("library.getItemDetail"),
      getItemNotes: unexpected("library.getItemNotes"),
      getNoteDetail: unexpected("library.getNoteDetail"),
      listNotePayloads: unexpected("library.listNotePayloads"),
      getNotePayload: unexpected("library.getNotePayload"),
      listAnnotations: unexpected("library.listAnnotations"),
      exportPortableItems: unexpected("library.exportPortableItems"),
      exportAnnotations: unexpected("library.exportAnnotations"),
      getItemAttachments: unexpected("library.getItemAttachments"),
    },
    metadata: {
      translateIdentifier: unexpected("metadata.translateIdentifier"),
    },
    mutations: {
      preview: unexpected("mutations.preview"),
      execute: unexpected("mutations.execute"),
    },
    legacyMutations: {
      preview: unexpected("legacyMutations.preview"),
      execute: unexpected("legacyMutations.execute"),
    },
    statusTags: {
      getPolicy: unexpected("statusTags.getPolicy"),
      transition: unexpected("statusTags.transition"),
    },
    notes: {
      create: unexpected("notes.create"),
      updateContent: unexpected("notes.updateContent"),
      remove: unexpected("notes.remove"),
      upsertPayload: unexpected("notes.upsertPayload"),
    },
    attachments: {
      create: unexpected("attachments.create"),
      updateMetadata: unexpected("attachments.updateMetadata"),
      replaceFile: unexpected("attachments.replaceFile"),
      move: unexpected("attachments.move"),
      remove: unexpected("attachments.remove"),
    },
  };
  return {
    ...broker,
    context: { ...broker.context, ...configuration.context },
    navigation: { ...broker.navigation, ...configuration.navigation },
    library: { ...broker.library, ...configuration.library },
    metadata: { ...broker.metadata, ...configuration.metadata },
    mutations: { ...broker.mutations, ...configuration.mutations },
    legacyMutations: {
      ...broker.legacyMutations,
      ...configuration.legacyMutations,
    },
    statusTags: { ...broker.statusTags, ...configuration.statusTags },
    notes: { ...broker.notes, ...configuration.notes },
    attachments: { ...broker.attachments, ...configuration.attachments },
  };
}
