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
  };
  return {
    ...broker,
    context: { ...broker.context, ...configuration.context },
    navigation: { ...broker.navigation, ...configuration.navigation },
    library: { ...broker.library, ...configuration.library },
    metadata: { ...broker.metadata, ...configuration.metadata },
    mutations: { ...broker.mutations, ...configuration.mutations },
  };
}
