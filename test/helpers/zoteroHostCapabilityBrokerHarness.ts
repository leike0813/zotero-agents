import type { ZoteroHostCapabilityBroker } from "../../src/modules/zoteroHostCapabilityBroker";

type ZoteroHostCapabilityBrokerOverrides = {
  [Domain in keyof ZoteroHostCapabilityBroker]?: Partial<
    ZoteroHostCapabilityBroker[Domain]
  >;
};

export function assertStrictJsonValue(
  value: unknown,
  path = "$",
  seen = new WeakSet<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} contains a non-finite number`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`${path} contains ${typeof value}`);
  }
  if (seen.has(value)) {
    throw new Error(`${path} contains a cycle`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertStrictJsonValue(entry, `${path}[${index}]`, seen),
    );
    seen.delete(value);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${path} is not a plain object`);
  }
  for (const [key, entry] of Object.entries(value)) {
    assertStrictJsonValue(entry, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

export function createFailClosedZoteroHostCapabilityBroker(
  overrides: ZoteroHostCapabilityBrokerOverrides = {},
): ZoteroHostCapabilityBroker {
  const unexpected = (capability: string) => () => {
    throw new Error(`unexpected broker capability: ${capability}`);
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
    ...overrides,
    context: { ...broker.context, ...overrides.context },
    navigation: { ...broker.navigation, ...overrides.navigation },
    library: { ...broker.library, ...overrides.library },
    metadata: { ...broker.metadata, ...overrides.metadata },
    mutations: { ...broker.mutations, ...overrides.mutations },
  };
}
