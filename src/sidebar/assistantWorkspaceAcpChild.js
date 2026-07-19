import { projectAssistantWorkspacePanel } from "./assistantPanelModel.js";
import {
  renderAssistantMessageCounts,
  renderAssistantPanelSnapshot,
} from "./assistantPanelRenderer.js";
import {
  applyAssistantTranscriptEffects,
  applyAssistantTranscriptEffectsExact,
  renderAssistantTranscript,
  resetAssistantTranscriptVirtualState,
} from "./assistantTranscriptRenderer.js";
import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
  ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
} from "../shared/assistantWireContract.js";

function text(value) {
  return String(value || "").trim();
}

// The transcript kind carries snapshot/delta forms instead of region keys;
// every other kind is keyed in the shared payload key map.
const publicationKinds = new Set([
  ...Object.keys(ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS),
  "transcript",
]);
const forbiddenWireFields = ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS;

const publicationEnvelopeKeys = ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS;

const transcriptSnapshotKeys = ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS;

const transcriptDeltaKeys = ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS;

const publicationPayloadKeys = ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS;

const permissionRequestKeys = ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS;

// Re-exported aggregate kept for compatibility with existing consumers
// (tests); every entry aliases the shared wire contract constants.
const wireFieldRegistry = Object.freeze({
  envelopeKeys: publicationEnvelopeKeys,
  payloadKeysByKind: publicationPayloadKeys,
  transcriptSnapshotKeys: transcriptSnapshotKeys,
  transcriptDeltaKeys: transcriptDeltaKeys,
  permissionRequestKeys: permissionRequestKeys,
  forbiddenWireFields: forbiddenWireFields,
});

function hasExactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = keys.slice().sort();
  return (
    actual.length === expected.length &&
    actual.every(function (key, index) {
      return key === expected[index];
    })
  );
}

function hasForbiddenWireField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenWireField);
  return Object.keys(value).some(function (key) {
    return forbiddenWireFields.has(key) || hasForbiddenWireField(value[key]);
  });
}

function validPublicationPayload(publication) {
  const payload = publication && publication.payload;
  if (publication.publicationKind === "transcript") {
    return publication.publicationForm === "snapshot"
      ? hasExactKeys(payload, transcriptSnapshotKeys)
      : hasExactKeys(payload, transcriptDeltaKeys);
  }
  if (
    !hasExactKeys(
      payload,
      publicationPayloadKeys[publication.publicationKind] || [],
    )
  ) {
    return false;
  }
  if (publication.publicationKind === "permission" && payload.request) {
    const request = payload.request;
    return (
      hasExactKeys(request, permissionRequestKeys) &&
      (request.approvalKind === "acp-tool" ||
        request.approvalKind === "zotero-write") &&
      hasExactKeys(request.tool, ["title", "callId"]) &&
      hasExactKeys(request.review, ["requestedAt", "command", "preview"]) &&
      Array.isArray(request.options) &&
      request.options.every(function (option) {
        return hasExactKeys(option, ["optionId", "label", "description"]);
      })
    );
  }
  if (publication.publicationKind === "owner-control") {
    return (
      hasExactKeys(payload.hint, ["kind", "message"]) &&
      [
        "hidden",
        "auth",
        "running",
        "repairing",
        "waiting_user",
        "completed",
        "canceled",
        "disconnected",
        "error",
        "notice",
      ].includes(payload.hint.kind)
    );
  }
  if (publication.publicationKind === "composer") {
    return (
      hasExactKeys(payload.reply, ["status"]) &&
      hasExactKeys(payload.runtimeOptions, [
        "mode",
        "model",
        "reasoningEffort",
      ]) &&
      [
        payload.runtimeOptions.mode,
        payload.runtimeOptions.model,
        payload.runtimeOptions.reasoningEffort,
      ].every(function (group) {
        return hasExactKeys(group, ["selectedOptionId", "options", "enabled"]);
      })
    );
  }
  if (publication.publicationKind === "owner-details") {
    return (
      (payload.status === "ready" || payload.status === "failed") &&
      Array.isArray(payload.sections) &&
      payload.sections.every(function (section) {
        return (
          hasExactKeys(section, ["sectionId", "collapsed", "items"]) &&
          Array.isArray(section.items) &&
          section.items.every(function (item) {
            return hasExactKeys(item, ["fieldId", "value", "format"]);
          })
        );
      }) &&
      Array.isArray(payload.actions)
    );
  }
  return true;
}

function validPublicationEnvelope(publication, source) {
  if (
    !hasExactKeys(publication, publicationEnvelopeKeys) ||
    publication.schema !== ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA ||
    !text(publication.publicationId) ||
    !publicationKinds.has(publication.publicationKind) ||
    !Number.isInteger(publication.regionRevision) ||
    publication.regionRevision <= 0 ||
    !Number.isInteger(publication.deliverySequence) ||
    publication.deliverySequence <= 0 ||
    hasForbiddenWireField(publication) ||
    !validPublicationPayload(publication)
  ) {
    return false;
  }
  const owner = publication.owner;
  if (
    !owner ||
    owner.source !== source ||
    (owner.ownerKey !== null && !text(owner.ownerKey))
  ) {
    return false;
  }
  if (owner.ownerKey === null) {
    if (!hasExactKeys(owner, ["source", "ownerKey"])) return false;
    return (
      (publication.publicationKind === "owner-navigation" &&
        publication.publicationForm === "region") ||
      (publication.publicationKind === "service-status" &&
        publication.publicationForm === "region") ||
      (publication.publicationKind === "transcript" &&
        publication.publicationForm === "snapshot" &&
        publication.payload &&
        publication.payload.status === "idle" &&
        publication.payload.owner === null)
    );
  }
  if (
    source === "acp-chat" &&
    (!hasExactKeys(owner, [
      "source",
      "ownerKey",
      "backendId",
      "conversationId",
    ]) ||
      owner.ownerKey !==
        text(owner.backendId) + "\n" + text(owner.conversationId))
  ) {
    return false;
  }
  if (
    source === "acp-skills" &&
    (!hasExactKeys(owner, ["source", "ownerKey", "requestId"]) ||
      owner.ownerKey !== text(owner.requestId))
  ) {
    return false;
  }
  return publication.publicationKind === "transcript"
    ? publication.publicationForm === "snapshot" ||
        publication.publicationForm === "delta"
    : publication.publicationForm === "region";
}

function emptyTranscript(owner) {
  return {
    owner: owner || null,
    status: owner ? "loading" : "idle",
    error: null,
    page: null,
    transcriptRevision: 0,
  };
}

function emptySelection(owner) {
  return {
    owner: owner || null,
    phase: owner ? "loading" : "idle",
    control: null,
    messageCounts: null,
    transcript: emptyTranscript(owner),
    plan: null,
    permission: null,
    composer: null,
    presentation: null,
    details: null,
  };
}

function transcriptPhase(transcript) {
  const status = text(transcript && transcript.status);
  return status === "ready" || status === "failed" || status === "loading"
    ? status
    : "idle";
}

function ownerMatches(owner, source, ownerKey) {
  return (
    owner &&
    typeof owner === "object" &&
    owner.source === source &&
    text(owner.ownerKey) === text(ownerKey)
  );
}

const regionStateKeys = {
  "owner-control": "control",
  "message-counts": "messageCounts",
  "owner-navigation": "ownerNavigation",
  "service-status": "services",
  transcript: "transcript",
  plan: "plan",
  permission: "permission",
  composer: "composer",
  "owner-presentation": "presentation",
  "owner-details": "details",
};

function readStateRegion(snapshot, kind) {
  const key = regionStateKeys[kind];
  if (!key || !snapshot || typeof snapshot !== "object") return null;
  if (kind === "owner-navigation") {
    return snapshot.navigation && typeof snapshot.navigation === "object"
      ? snapshot.navigation
      : null;
  }
  if (kind === "service-status") {
    return snapshot.services && typeof snapshot.services === "object"
      ? snapshot.services
      : null;
  }
  const selection =
    snapshot.selection && typeof snapshot.selection === "object"
      ? snapshot.selection
      : null;
  return selection && selection[key] && typeof selection[key] === "object"
    ? selection[key]
    : null;
}

function readRegion(snapshot, source, ownerKey) {
  const region = readStateRegion(snapshot, "transcript");
  if (!region) return null;
  if (region.status === "idle") return ownerKey ? null : region;
  return ownerMatches(region.owner, source, ownerKey) ? region : null;
}

function rendererPage(region) {
  const page =
    region && region.status === "ready" && region.page ? region.page : null;
  if (!page || !Array.isArray(page.items)) return null;
  return {
    ownerKey: text(region.owner && region.owner.ownerKey),
    pageKey: text(page.pageKey),
    startCursor: Math.max(0, Number(page.startCursor) || 0),
    limit: Math.max(1, Number(page.limit) || 80),
    totalVisibleItemCount: Math.max(0, Number(page.totalVisibleItemCount) || 0),
    previousCursor:
      typeof page.previousCursor === "number" ? page.previousCursor : null,
    nextCursor: typeof page.nextCursor === "number" ? page.nextCursor : null,
    sourceEventSeq: Math.max(0, Number(page.sourceEventSeq) || 0),
    transcriptRevision: Math.max(0, Number(region.transcriptRevision) || 0),
    items: page.items,
  };
}

function errorMessage(region) {
  return text(region && region.error && region.error.message);
}

function createPageRequest(owner, cursor, limit) {
  if (!owner || typeof owner !== "object" || !text(owner.ownerKey)) {
    return null;
  }
  let canonicalOwner = null;
  if (
    owner.source === "acp-chat" &&
    text(owner.backendId) &&
    text(owner.conversationId) &&
    text(owner.ownerKey) ===
      text(owner.backendId) + "\n" + text(owner.conversationId)
  ) {
    canonicalOwner = {
      source: "acp-chat",
      ownerKey: text(owner.ownerKey),
      backendId: text(owner.backendId),
      conversationId: text(owner.conversationId),
    };
  } else if (
    owner.source === "acp-skills" &&
    text(owner.requestId) &&
    text(owner.ownerKey) === text(owner.requestId)
  ) {
    canonicalOwner = {
      source: "acp-skills",
      ownerKey: text(owner.ownerKey),
      requestId: text(owner.requestId),
    };
  }
  if (!canonicalOwner) return null;
  const numericCursor = Number(cursor);
  const numericLimit = Number(limit);
  return {
    owner: canonicalOwner,
    request: {
      cursor:
        cursor === null || cursor === undefined
          ? null
          : Number.isFinite(numericCursor)
            ? Math.max(0, Math.floor(numericCursor))
            : null,
      limit: Number.isFinite(numericLimit)
        ? Math.max(1, Math.floor(numericLimit))
        : 80,
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPageModel(page) {
  const items = page && Array.isArray(page.items) ? page.items : [];
  const itemsById = new Map();
  const itemOrder = [];
  items.forEach(function (item) {
    const itemId = text(item && item.itemId);
    if (!itemId || itemsById.has(itemId)) return;
    itemsById.set(itemId, item);
    itemOrder.push(itemId);
  });
  return { page: page || null, itemsById, itemOrder };
}

function validatePageMetadata(page) {
  if (!page || typeof page !== "object" || !text(page.pageKey)) return null;
  const startCursor = Number(page.startCursor);
  const limit = Number(page.limit);
  const totalVisibleItemCount = Number(page.totalVisibleItemCount);
  const sourceEventSeq = Number(page.sourceEventSeq);
  if (
    !Number.isInteger(startCursor) ||
    startCursor < 0 ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    !Number.isInteger(totalVisibleItemCount) ||
    totalVisibleItemCount < 0 ||
    !Number.isInteger(sourceEventSeq) ||
    sourceEventSeq < 0
  ) {
    return null;
  }
  return {
    pageKey: text(page.pageKey),
    startCursor,
    limit,
    totalVisibleItemCount,
    previousCursor:
      typeof page.previousCursor === "number" ? page.previousCursor : null,
    nextCursor: typeof page.nextCursor === "number" ? page.nextCursor : null,
    sourceEventSeq,
  };
}

function isTailPageKey(pageKey) {
  return /\ntail:\d+$/.test(text(pageKey));
}

function planMutationBatch(model, mutations) {
  if (!model || !model.page || !Array.isArray(mutations)) return null;
  const knownItemIds = new Set(model.itemOrder);
  const replacements = new Map();
  const appendedItemIds = [];
  const deletedItemIds = new Set();
  const affectedItemIds = new Set();

  function currentItem(itemId) {
    return replacements.has(itemId)
      ? replacements.get(itemId)
      : model.itemsById.get(itemId);
  }

  for (const mutation of mutations) {
    if (!mutation || typeof mutation !== "object") return null;
    if (mutation.op === "upsert_item") {
      const item = mutation.item;
      const itemId = text(item && item.itemId);
      if (!itemId || !text(item && item.itemKind)) return null;
      if (!knownItemIds.has(itemId)) {
        knownItemIds.add(itemId);
        appendedItemIds.push(itemId);
      }
      deletedItemIds.delete(itemId);
      replacements.set(itemId, clone(item));
      affectedItemIds.add(itemId);
      continue;
    }
    const itemId = text(mutation.itemId);
    if (!itemId || !knownItemIds.has(itemId) || deletedItemIds.has(itemId)) {
      return null;
    }
    const item = currentItem(itemId);
    if (!item) return null;
    if (mutation.op === "append_text") {
      if (
        (item.itemKind !== "message" && item.itemKind !== "thought") ||
        typeof mutation.text !== "string"
      ) {
        return null;
      }
      replacements.set(
        itemId,
        Object.assign({}, item, {
          text: String(item.text || "") + mutation.text,
        }),
      );
      affectedItemIds.add(itemId);
    } else if (mutation.op === "patch_item") {
      if (
        !mutation.patch ||
        typeof mutation.patch !== "object" ||
        Object.prototype.hasOwnProperty.call(mutation.patch, "itemId") ||
        Object.prototype.hasOwnProperty.call(mutation.patch, "itemKind")
      ) {
        return null;
      }
      replacements.set(itemId, Object.assign({}, item, clone(mutation.patch)));
      affectedItemIds.add(itemId);
    } else if (mutation.op === "delete_item") {
      deletedItemIds.add(itemId);
      replacements.delete(itemId);
      affectedItemIds.delete(itemId);
    } else {
      return null;
    }
  }

  return {
    replacements,
    appendedItemIds,
    deletedItemIds,
    affectedItemIds,
  };
}

function commitMutationBatch(page, model, pageMetadata, transaction) {
  const startAdvance = pageMetadata.startCursor - Number(page.startCursor);
  if (startAdvance < 0) return null;
  let order = model.itemOrder
    .filter(function (itemId) {
      return !transaction.deletedItemIds.has(itemId);
    })
    .concat(transaction.appendedItemIds);
  if (startAdvance > order.length) return null;
  if (startAdvance > 0) order = order.slice(startAdvance);
  if (order.length > pageMetadata.limit) {
    order = order.slice(order.length - pageMetadata.limit);
  }
  const expectedLength = Math.min(
    pageMetadata.limit,
    Math.max(0, pageMetadata.totalVisibleItemCount - pageMetadata.startCursor),
  );
  if (order.length !== expectedLength) return null;
  const items = [];
  for (const itemId of order) {
    const item = transaction.replacements.has(itemId)
      ? transaction.replacements.get(itemId)
      : model.itemsById.get(itemId);
    if (!item) return null;
    items.push(item);
  }
  const affectedItems = [];
  transaction.affectedItemIds.forEach(function (itemId) {
    if (order.indexOf(itemId) < 0) return;
    const item = transaction.replacements.has(itemId)
      ? transaction.replacements.get(itemId)
      : model.itemsById.get(itemId);
    if (item) affectedItems.push(item);
  });
  return {
    items,
    affectedItems,
    evictedItemIds: model.itemOrder.filter(function (itemId) {
      return (
        order.indexOf(itemId) < 0 && !transaction.deletedItemIds.has(itemId)
      );
    }),
  };
}

function createReceiver(options) {
  const source = options && options.source;
  const revisions = new Map();
  const terminalResults = new Map();
  let deliverySequence = 0;
  let activeOwnerKey = "";
  let selectedPageModel = createPageModel(null);
  function rememberTerminal(publicationId, result) {
    if (terminalResults.has(publicationId)) return;
    terminalResults.delete(publicationId);
    terminalResults.set(publicationId, {
      accepted: result.accepted,
      reason: result.reason,
    });
    while (terminalResults.size > 512) {
      terminalResults.delete(terminalResults.keys().next().value);
    }
  }
  function rejected(publication, reason, snapshot) {
    const result = {
      accepted: false,
      reason,
      snapshot,
    };
    const publicationId = text(publication && publication.publicationId);
    if (publicationId) rememberTerminal(publicationId, result);
    return result;
  }
  function plan(snapshot, publication, currentOwnerKey) {
    const publicationId = text(publication && publication.publicationId);
    const previousTerminal = terminalResults.get(publicationId);
    if (publicationId && previousTerminal) {
      return Object.assign({}, previousTerminal, {
        snapshot,
        duplicate: true,
        effect: { kind: "none" },
      });
    }
    const bootstrapSnapshot =
      publication &&
      publication.publicationKind === "transcript" &&
      publication.publicationForm === "snapshot" &&
      !text(currentOwnerKey) &&
      ((publication.owner &&
        publication.owner.source === source &&
        publication.owner.ownerKey === null &&
        publication.payload &&
        publication.payload.status === "idle" &&
        publication.payload.owner === null) ||
        ownerMatches(
          publication.payload && publication.payload.owner,
          source,
          publication.owner && publication.owner.ownerKey,
        ));
    const unownedNavigation =
      publication &&
      publication.publicationKind === "owner-navigation" &&
      publication.publicationForm === "region" &&
      publication.owner &&
      publication.owner.source === source &&
      publication.owner.ownerKey === null;
    const unownedService =
      publication &&
      publication.publicationKind === "service-status" &&
      publication.publicationForm === "region" &&
      publication.owner &&
      publication.owner.source === source &&
      publication.owner.ownerKey === null;
    if (
      !validPublicationEnvelope(publication, source) ||
      (!bootstrapSnapshot &&
        !unownedNavigation &&
        !unownedService &&
        !ownerMatches(publication.owner, source, currentOwnerKey))
    ) {
      return rejected(
        publication,
        publication && publication.owner ? "old-owner" : "invalid",
        snapshot,
      );
    }
    const sequence = Math.max(0, Number(publication.deliverySequence) || 0);
    if (sequence <= deliverySequence) {
      return rejected(publication, "superseded", snapshot);
    }
    const navigationOwner =
      unownedNavigation &&
      publication.payload &&
      publication.payload.selectedOwner &&
      publication.payload.selectedOwner.source === source
        ? publication.payload.selectedOwner
        : null;
    const nextOwnerKey = unownedNavigation
      ? text(navigationOwner && navigationOwner.ownerKey)
      : unownedService
        ? activeOwnerKey
        : text(publication.owner.ownerKey);
    const ownerChanged = !unownedService && activeOwnerKey !== nextOwnerKey;
    const revisionKey = nextOwnerKey + "\n" + publication.publicationKind;
    const revision = Math.max(0, Number(publication.regionRevision) || 0);
    const previousRevision = ownerChanged ? 0 : revisions.get(revisionKey) || 0;
    if (revision <= previousRevision) {
      return rejected(publication, "stale", snapshot);
    }
    const next = Object.assign(
      {
        source,
        navigation: {
          selectedOwner: null,
          selectedGroupId: null,
          groups: [],
          entries: [],
          canCreateOwner: false,
        },
        services: { items: [] },
        selection: emptySelection(null),
      },
      snapshot || {},
    );
    if (ownerChanged) {
      next.selection = emptySelection(
        navigationOwner ||
          (publication.owner && publication.owner.ownerKey !== null
            ? clone(publication.owner)
            : null),
      );
    }
    let effect = { kind: "region" };
    let nextPageModel = ownerChanged
      ? createPageModel(null)
      : selectedPageModel;
    if (publication.publicationKind === "transcript") {
      const current = readStateRegion(next, "transcript");
      if (publication.publicationForm === "snapshot") {
        if (
          publication.payload &&
          publication.payload.status !== "idle" &&
          !ownerMatches(
            publication.payload.owner,
            source,
            publication.owner && publication.owner.ownerKey,
          )
        ) {
          return rejected(publication, "invalid", snapshot);
        }
        const transcript = clone(publication.payload);
        next.selection = Object.assign({}, next.selection, {
          owner: transcript.owner || next.selection.owner,
          phase: transcriptPhase(transcript),
          transcript,
        });
        nextPageModel = createPageModel(transcript.page);
        effect = { kind: "snapshot" };
      } else if (publication.publicationForm === "delta") {
        const payload = publication.payload || {};
        if (
          !current ||
          current.status !== "ready" ||
          !current.page ||
          Number(current.transcriptRevision) !==
            Number(payload.baseTranscriptRevision)
        ) {
          return rejected(publication, "gap", snapshot);
        }
        const pageMetadata = validatePageMetadata(payload.page);
        if (!pageMetadata) {
          return rejected(publication, "invalid", snapshot);
        }
        const samePageKey =
          text(current.page.pageKey) === text(pageMetadata.pageKey);
        const onSelectedPage =
          samePageKey &&
          (isTailPageKey(pageMetadata.pageKey) ||
            Number(current.page.startCursor) === pageMetadata.startCursor);
        const currentPageModel =
          nextPageModel.page === current.page
            ? nextPageModel
            : createPageModel(current.page);
        const transaction = onSelectedPage
          ? planMutationBatch(currentPageModel, payload.mutations)
          : null;
        const applied =
          onSelectedPage && transaction
            ? commitMutationBatch(
                current.page,
                currentPageModel,
                pageMetadata,
                transaction,
              )
            : null;
        if (onSelectedPage && !applied) {
          return rejected(publication, "gap", snapshot);
        }
        const nextPage = onSelectedPage
          ? Object.assign({}, current.page, pageMetadata, {
              items: applied.items,
            })
          : Object.assign({}, current.page, {
              totalVisibleItemCount: pageMetadata.totalVisibleItemCount,
              sourceEventSeq: pageMetadata.sourceEventSeq,
            });
        const transcript = Object.assign({}, current, {
          transcriptRevision: Number(payload.transcriptRevision) || 0,
          page: nextPage,
        });
        next.selection = Object.assign({}, next.selection, {
          phase: transcriptPhase(transcript),
          transcript,
        });
        nextPageModel = createPageModel(nextPage);
        effect = {
          kind: "mutations",
          onSelectedPage,
          mutations: onSelectedPage ? (payload.mutations || []).map(clone) : [],
          affectedItems: applied ? applied.affectedItems : [],
          pageItems: applied ? applied.items : [],
          evictedItemIds: applied ? applied.evictedItemIds : [],
        };
      } else {
        return rejected(publication, "invalid", snapshot);
      }
    } else {
      const regionKey = regionStateKeys[publication.publicationKind];
      if (!regionKey) {
        return rejected(publication, "invalid", snapshot);
      }
      if (publication.publicationKind === "owner-navigation") {
        next.navigation = clone(publication.payload || {});
      } else if (publication.publicationKind === "service-status") {
        next.services = clone(publication.payload || {});
      } else {
        next.selection = Object.assign({}, next.selection, {
          [regionKey]: clone(publication.payload || {}),
        });
      }
    }
    if (publication.publicationKind === "owner-navigation") {
      next.selection = Object.assign({}, next.selection, {
        owner: navigationOwner ? clone(navigationOwner) : null,
      });
    } else if (publication.owner.ownerKey !== null) {
      next.selection = Object.assign({}, next.selection, {
        owner: clone(publication.owner),
      });
    }
    const result = {
      accepted: true,
      reason: null,
      snapshot: next,
      publicationKind: publication.publicationKind,
      effect,
      commit: function () {
        if (ownerChanged) revisions.clear();
        activeOwnerKey = nextOwnerKey;
        deliverySequence = sequence;
        revisions.set(revisionKey, revision);
        selectedPageModel = nextPageModel;
        rememberTerminal(publicationId, result);
      },
    };
    return result;
  }
  return {
    complete: function (publicationId, outcome, reason) {
      const id = text(publicationId);
      if (!id) return;
      rememberTerminal(id, {
        accepted: outcome === "accepted",
        reason: reason || null,
      });
    },
    plan,
    apply: function (snapshot, publication, currentOwnerKey) {
      const result = plan(snapshot, publication, currentOwnerKey);
      if (result.accepted && typeof result.commit === "function") {
        result.commit();
        delete result.commit;
      }
      return result;
    },
  };
}

function createClient(options) {
  const receiver = createReceiver({ source: options && options.source });
  function normalizedRenderOutcome(value) {
    if (value && typeof value === "object" && typeof value.ok === "boolean") {
      return {
        ok: value.ok,
        failure:
          value.failure && typeof value.failure === "object"
            ? value.failure
            : null,
      };
    }
    return { ok: value !== false, failure: null };
  }
  return {
    apply: function (publication) {
      const snapshot = options.getSnapshot() || {};
      const result = receiver.plan(
        snapshot,
        publication,
        options.getOwnerKey(snapshot),
      );
      options.ack(
        publication,
        "child-apply",
        result.accepted ? "accepted" : "rejected",
        result.reason,
      );
      if (!result.accepted) {
        receiver.complete(
          publication && publication.publicationId,
          "rejected",
          result.reason,
        );
        return result;
      }
      try {
        const rendered = normalizedRenderOutcome(
          options.render(result, publication),
        );
        if (!rendered.ok) {
          if (typeof options.recoverRenderFailure === "function") {
            try {
              options.recoverRenderFailure(
                result,
                publication,
                rendered.failure,
              );
            } catch (_recoveryError) {
              // The original bounded renderer failure remains authoritative.
            }
          }
          receiver.complete(
            publication && publication.publicationId,
            "rejected",
            "render-failed",
          );
          options.ack(
            publication,
            "render-complete",
            "rejected",
            "render-failed",
            rendered.failure,
          );
          return result;
        }
        options.setSnapshot(result.snapshot);
        if (typeof result.commit === "function") {
          result.commit();
          delete result.commit;
        }
        receiver.complete(
          publication && publication.publicationId,
          "accepted",
          null,
        );
        options.ack(publication, "render-complete", "accepted", null, null);
      } catch (_error) {
        if (typeof options.recoverRenderFailure === "function") {
          try {
            options.recoverRenderFailure(result, publication, null);
          } catch (_recoveryError) {
            // The bounded generic render failure remains authoritative.
          }
        }
        receiver.complete(
          publication && publication.publicationId,
          "rejected",
          "render-failed",
        );
        options.ack(
          publication,
          "render-complete",
          "rejected",
          "render-failed",
          null,
        );
      }
      return result;
    },
  };
}

function createController(options) {
  const client = createClient(options || {});
  const pendingPublications = [];
  let applying = false;

  function applyPublication(publication) {
    pendingPublications.push(publication);
    if (applying) return;
    applying = true;
    try {
      while (pendingPublications.length > 0) {
        client.apply(pendingPublications.shift());
      }
    } finally {
      applying = false;
    }
  }

  return { applyPublication };
}

function renderResult(result, options) {
  const opts = options || {};
  const snapshot = (result && result.snapshot) || {};
  const kind = result && result.publicationKind;
  const reportEffect = function (observation) {
    if (typeof opts.onEffectRendered !== "function") return;
    try {
      opts.onEffectRendered(observation);
    } catch (_error) {
      return;
    }
  };
  const labels =
    typeof opts.getLabels === "function" ? opts.getLabels(snapshot) || {} : {};
  if (kind === "message-counts") {
    const countsRegion = readStateRegion(snapshot, "message-counts");
    return !!(
      opts.panelRenderer &&
      typeof opts.panelRenderer.renderAssistantMessageCounts === "function" &&
      opts.panelRenderer.renderAssistantMessageCounts(
        opts.messageCountContainer,
        countsRegion ? countsRegion.counts : null,
        labels,
      )
    );
  }
  if (kind !== "transcript") {
    return typeof opts.renderRegion === "function"
      ? opts.renderRegion(result)
      : true;
  }
  const ownerKey =
    typeof opts.getOwnerKey === "function"
      ? text(opts.getOwnerKey(snapshot))
      : "";
  const region = readRegion(snapshot, opts.source, ownerKey);
  const page = rendererPage(region);
  const effect = result.effect || {};
  if (effect.kind === "none") return true;
  if (effect.kind === "snapshot") {
    if (typeof opts.renderSnapshot !== "function") return false;
    const rendered = opts.renderSnapshot(result);
    if (rendered !== false) {
      reportEffect({
        renderPath: "snapshot",
        insertedRows: 0,
        updatedRows: 0,
        removedRows: 0,
        measuredRows: 0,
      });
    }
    return rendered;
  }
  const mode = typeof opts.getMode === "function" ? opts.getMode() : opts.mode;
  return !!(
    opts.transcriptRenderer &&
    typeof opts.transcriptRenderer.applyAssistantTranscriptEffects ===
      "function" &&
    opts.transcriptRenderer.applyAssistantTranscriptEffects({
      container: opts.transcriptContainer,
      nodeMap: opts.rowNodesByKey,
      effect,
      affectedItems: effect.affectedItems || [],
      virtualized:
        !!page &&
        (typeof opts.isVirtualized === "function"
          ? opts.isVirtualized(snapshot, region)
          : true),
      ownerKey: page ? page.ownerKey : undefined,
      page: page || undefined,
      mode: mode === "bubble" ? "bubble" : "plain",
      variant: opts.variant,
      expandedIds: opts.expandedRowKeys,
      renderMarkdown: opts.renderMarkdown,
      formatTime: opts.formatTime,
      labels,
      onEffectRendered: reportEffect,
    })
  );
}

const BRIDGE_KEY = ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY;

function childSource() {
  const source = text(
    (document.body && document.body.getAttribute("data-source")) ||
      (document.documentElement &&
        document.documentElement.getAttribute("data-source")),
  );
  return source === "acp-chat" || source === "acp-skills" ? source : "";
}

function childBridge() {
  const direct =
    window[BRIDGE_KEY] ||
    (window.wrappedJSObject && window.wrappedJSObject[BRIDGE_KEY]);
  return direct && typeof direct.sendAction === "function" ? direct : null;
}

function canonicalActionOwner(source, value) {
  const owner = value && typeof value === "object" ? value : null;
  if (!owner || owner.source !== source) return null;
  if (
    source === "acp-chat" &&
    hasExactKeys(owner, [
      "source",
      "ownerKey",
      "backendId",
      "conversationId",
    ]) &&
    text(owner.ownerKey) ===
      text(owner.backendId) + "\n" + text(owner.conversationId)
  ) {
    return clone(owner);
  }
  if (
    source === "acp-skills" &&
    hasExactKeys(owner, ["source", "ownerKey", "requestId"]) &&
    text(owner.ownerKey) === text(owner.requestId)
  ) {
    return clone(owner);
  }
  return null;
}

function resolvePanelActionEnvelope(
  action,
  data,
  selectedOwner,
  actionRegistry,
  source,
) {
  const route =
    actionRegistry &&
    typeof actionRegistry === "object" &&
    actionRegistry[action] &&
    typeof actionRegistry[action] === "object"
      ? actionRegistry[action]
      : null;
  if (!route || route.scope === "local") return null;
  const payloadSource =
    source ||
    text(selectedOwner && selectedOwner.source) ||
    text(data && data.owner && data.owner.source) ||
    text(data && data.option && data.option.owner && data.option.owner.source);
  if (
    !Array.isArray(route.sources) ||
    route.sources.indexOf(payloadSource) < 0 ||
    !Array.isArray(route.payloadKeys)
  ) {
    return null;
  }
  const input = data && typeof data === "object" ? data : {};
  const payload = {};
  route.payloadKeys.forEach(function (key) {
    if (key === "groupId") {
      const groupId = text(
        input.groupId || (input.option && input.option.value) || input.value,
      );
      if (groupId) payload.groupId = groupId;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      payload[key] = input[key];
    }
  });
  if (
    route.payloadKeys.some(function (key) {
      return !Object.prototype.hasOwnProperty.call(payload, key);
    })
  ) {
    return null;
  }
  if (route.scope === "target-owner") {
    const target = canonicalActionOwner(
      payloadSource,
      input.owner || (input.option && input.option.owner),
    );
    return target ? { owner: target, payload } : null;
  }
  if (route.scope === "selected-owner") {
    const selected = canonicalActionOwner(payloadSource, selectedOwner);
    return selected ? { owner: selected, payload } : null;
  }
  if (route.scope === "navigation-group" || route.scope === "global") {
    return { owner: null, payload };
  }
  return null;
}

function createChildRuntime(source) {
  const model = {
    projectAssistantWorkspacePanel,
  };
  const panelRenderer = {
    renderAssistantMessageCounts,
    renderAssistantPanelSnapshot,
  };
  const transcriptRenderer = {
    applyAssistantTranscriptEffects,
    applyAssistantTranscriptEffectsExact,
    renderAssistantTranscript,
    resetAssistantTranscriptVirtualState,
  };
  if (!model || !panelRenderer || !transcriptRenderer) {
    document.body.setAttribute("data-acp-child-failure", "module-missing");
    return null;
  }

  const generation =
    source +
    "-" +
    String(Date.now()) +
    "-" +
    Math.random().toString(36).slice(2);
  const elements = {
    root: document.querySelector('[data-role="root"]'),
    toolbar: document.querySelector('[data-role="toolbar"]'),
    banner: document.querySelector('[data-role="banner"]'),
    messageCounts: document.querySelector('[data-role="message-counts"]'),
    drawer: document.querySelector('[data-role="context-drawer"]'),
    empty: document.querySelector('[data-role="empty"]'),
    main: document.querySelector('[data-role="main"]'),
    conversation: document.querySelector('[data-role="conversation"]'),
    transcript: document.querySelector('[data-role="transcript"]'),
    plan: document.querySelector('[data-role="plan"]'),
    interaction: document.querySelector('[data-role="interaction"]'),
    composer: document.querySelector('[data-role="composer"]'),
    details: document.querySelector('[data-role="details-drawer"]'),
    plain: document.querySelector('[data-assistant-view-mode="plain"]'),
    bubble: document.querySelector('[data-assistant-view-mode="bubble"]'),
  };
  if (
    !elements.root ||
    !elements.transcript ||
    !elements.main ||
    !elements.empty
  ) {
    document.body.setAttribute("data-acp-child-failure", "module-missing");
    return null;
  }

  let snapshot = {
    source,
    navigation: {
      selectedOwner: null,
      selectedGroupId: null,
      groups: [],
      entries: [],
      canCreateOwner: false,
    },
    services: { items: [] },
    selection: emptySelection(null),
  };
  const ui = {
    chatDisplayMode: "plain",
    contextDrawerOpen: false,
    detailsDrawerOpen: false,
    permissionRequestOpen: false,
    completedCollapsed: true,
    drawerGroupCollapsed: new Map(),
    expandedTranscriptRows: new Set(),
    replyDraft: "",
    replyDraftByOwner: new Map(),
    executionDisplayMode: "live",
    transcriptPaginationVirtualizationEnabled: true,
  };
  let labels = {};
  let actionRegistry = {};
  let actionSequence = 0;

  function selectedOwner(state) {
    const owner = state && state.selection && state.selection.owner;
    return canonicalActionOwner(source, owner);
  }

  function nextActionId(action) {
    actionSequence += 1;
    return [
      "assistant-workspace",
      source,
      text(action) || "unknown",
      String(actionSequence),
    ].join("-");
  }

  function fail(reason) {
    document.body.setAttribute("data-acp-child-failure", reason);
    return false;
  }

  function sendAction(action, payload, owner) {
    const bridge = childBridge();
    if (!bridge) return fail("bridge-missing");
    const envelope = {
      source,
      owner: canonicalActionOwner(source, owner),
      action: text(action),
      payload:
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload
          : {},
      actionId: nextActionId(action),
    };
    bridge.sendAction(envelope);
    return true;
  }

  function ack(publication, stage, outcome, reason, failure) {
    sendAction(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_ACK,
      {
        publicationId: text(publication && publication.publicationId),
        documentGeneration: generation,
        stage,
        outcome,
        reason: reason || null,
        failure: failure || null,
      },
      publication && publication.owner,
    );
  }

  function captureReplyDraft() {
    const input =
      elements.composer &&
      elements.composer.querySelector(".assistant-panel-reply-input");
    ui.replyDraft = input ? String(input.value || "") : ui.replyDraft;
    const owner = selectedOwner(snapshot);
    if (owner) ui.replyDraftByOwner.set(owner.ownerKey, ui.replyDraft);
  }

  function currentTranscript() {
    const region = snapshot.selection && snapshot.selection.transcript;
    const owner = selectedOwner(snapshot);
    if (!region || typeof region !== "object") return null;
    if (region.status === "idle") return owner ? null : region;
    return ownerMatches(region.owner, source, owner && owner.ownerKey)
      ? region
      : null;
  }

  function markdown(value) {
    const input = String(value == null ? "" : value);
    if (!window.markdownit) {
      return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    }
    try {
      const parser = window.markdownit({
        html: false,
        breaks: true,
        linkify: false,
      });
      if (window.texmath && window.katex) {
        parser.use(window.texmath, {
          engine: window.katex,
          delimiters: "dollars",
          katexOptions: { throwOnError: false },
        });
      }
      return parser.render(input);
    } catch (_error) {
      return input;
    }
  }

  function formatTime(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : text(value);
  }

  function showTranscriptState(kind, message) {
    const existing =
      elements.transcript.firstElementChild &&
      elements.transcript.firstElementChild.getAttribute(
        "data-assistant-transcript-state",
      );
    if (
      existing === kind &&
      text(elements.transcript.firstElementChild.textContent) === text(message)
    ) {
      return true;
    }
    const owner = selectedOwner(snapshot);
    transcriptRenderer.resetAssistantTranscriptVirtualState(
      elements.transcript,
      owner ? owner.ownerKey : "",
    );
    elements.transcript.removeAttribute("data-assistant-transcript-order-key");
    elements.transcript.removeAttribute("data-assistant-transcript-mode-key");
    while (elements.transcript.firstChild) {
      elements.transcript.removeChild(elements.transcript.firstChild);
    }
    const node = document.createElement("div");
    node.className =
      kind === "loading"
        ? "assistant-transcript-loading asst-spinner"
        : "assistant-transcript-empty";
    node.setAttribute("data-assistant-transcript-state", kind);
    node.textContent = message || "";
    elements.transcript.appendChild(node);
    return true;
  }

  function updateViewModeButtons() {
    const bubble = ui.chatDisplayMode === "bubble";
    elements.transcript.classList.toggle("bubble-mode", bubble);
    elements.transcript.classList.toggle("plain-mode", !bubble);
    if (elements.plain)
      elements.plain.setAttribute("aria-pressed", bubble ? "false" : "true");
    if (elements.bubble)
      elements.bubble.setAttribute("aria-pressed", bubble ? "true" : "false");
  }

  function renderTranscript() {
    const owner = selectedOwner(snapshot);
    const region = currentTranscript();
    updateViewModeButtons();
    if (!owner) {
      return showTranscriptState("idle", "");
    }
    if (!region || region.status === "loading") {
      return showTranscriptState("loading", "");
    }
    if (region.status === "failed") {
      return showTranscriptState("failed", errorMessage(region));
    }
    const page = rendererPage(region);
    if (!page) return showTranscriptState("loading", "");
    transcriptRenderer.renderAssistantTranscript({
      container: elements.transcript,
      items: page.items,
      virtualized: ui.transcriptPaginationVirtualizationEnabled !== false,
      ownerKey: owner.ownerKey,
      page,
      transcriptRevision: region.transcriptRevision,
      mode: ui.chatDisplayMode,
      variant: source === "acp-chat" ? "acp-chat" : "skillrunner",
      expandedIds: ui.expandedTranscriptRows,
      renderMarkdown: markdown,
      formatTime,
      labels:
        labels && labels.assistantPanel && labels.assistantPanel.transcript
          ? labels.assistantPanel.transcript
          : labels.transcript || {},
      emptyText:
        text(
          labels &&
            labels.assistantPanel &&
            labels.assistantPanel.transcript &&
            labels.assistantPanel.transcript.empty,
        ) || "",
      onRequestPage: function (request) {
        const cursor = Number(request && request.cursor);
        if (!Number.isFinite(cursor)) return;
        sendAction(
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.LOAD_TRANSCRIPT_PAGE,
          {
            request: {
              cursor: Math.max(0, Math.floor(cursor)),
              limit: Math.max(1, Math.floor(Number(request.limit) || 80)),
            },
          },
          owner,
        );
      },
      onToggleExpanded: function (id) {
        if (ui.expandedTranscriptRows.has(id)) {
          ui.expandedTranscriptRows.delete(id);
        } else {
          ui.expandedTranscriptRows.add(id);
        }
        renderTranscript();
      },
    });
    return true;
  }

  function handlePanelAction(action, data) {
    const payload = data && typeof data === "object" ? data : {};
    if (action === "open-context-drawer") {
      ui.contextDrawerOpen = true;
      renderPanel();
      return;
    }
    if (action === "close-context-drawer") {
      ui.contextDrawerOpen = false;
      renderPanel();
      return;
    }
    if (action === "open-details-drawer") {
      ui.detailsDrawerOpen = true;
      renderPanel();
      const owner = selectedOwner(snapshot);
      if (owner)
        sendAction(
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.REQUEST_OWNER_DETAILS,
          {},
          owner,
        );
      return;
    }
    if (action === "close-details-drawer") {
      ui.detailsDrawerOpen = false;
      renderPanel();
      return;
    }
    if (action === "open-permission-request") {
      const request =
        snapshot.selection &&
        snapshot.selection.permission &&
        snapshot.selection.permission.request;
      ui.permissionRequestOpen = Boolean(request);
      renderPanel();
      return;
    }
    if (action === "close-permission-request") {
      ui.permissionRequestOpen = false;
      renderPanel();
      return;
    }
    if (action === "toggle-drawer-section") {
      if (text(payload.sectionId) === "completed") {
        ui.completedCollapsed = !ui.completedCollapsed;
        renderPanel();
      }
      return;
    }
    if (action === "toggle-drawer-group") {
      const key = text(payload.groupKey || payload.backendId);
      if (key) {
        ui.drawerGroupCollapsed.set(
          key,
          ui.drawerGroupCollapsed.get(key) !== true,
        );
        renderPanel();
      }
      return;
    }
    if (action === "set-chat-display-mode") {
      ui.chatDisplayMode = payload.mode === "bubble" ? "bubble" : "plain";
      renderTranscript();
      return;
    }
    if (
      action === "set-active-conversation" &&
      payload.option &&
      payload.option.sentinel === "show-more"
    ) {
      ui.contextDrawerOpen = true;
      renderPanel();
      return;
    }
    if (action === "set-active-conversation" || action === "select-run") {
      ui.contextDrawerOpen = false;
      renderPanel();
    }
    captureReplyDraft();
    const routed = resolvePanelActionEnvelope(
      action,
      payload,
      selectedOwner(snapshot),
      actionRegistry,
      source,
    );
    if (!routed) {
      fail("invalid-action-route");
      return;
    }
    sendAction(action, routed.payload, routed.owner);
  }

  function renderPanel() {
    captureReplyDraft();
    const permission =
      snapshot.selection &&
      snapshot.selection.permission &&
      snapshot.selection.permission.request;
    if (!permission) {
      ui.permissionRequestOpen = false;
    }
    const panel = model.projectAssistantWorkspacePanel(snapshot, ui, labels);
    panelRenderer.renderAssistantPanelSnapshot(panel, {
      managed: true,
      root: elements.root,
      onAction: handlePanelAction,
      regions: {
        toolbar: elements.toolbar,
        banner: elements.banner,
        messageCounter: elements.messageCounts,
        conversation: elements.conversation,
        plan: elements.plan,
        hint: elements.interaction,
        reply: elements.composer,
        drawer: elements.drawer,
        details: elements.details,
      },
    });
    const owner = selectedOwner(snapshot);
    elements.empty.classList.toggle("hidden", Boolean(owner));
    elements.main.classList.remove("hidden");
    elements.drawer.classList.toggle("hidden", !ui.contextDrawerOpen);
    elements.details.classList.toggle("hidden", !ui.detailsDrawerOpen);
    document.title =
      text(panel && panel.context && panel.context.title) ||
      text(labels && labels.title);
    return true;
  }

  function renderMutationEffect(result, publication) {
    const effect = result.effect || {};
    const owner = selectedOwner(result.snapshot);
    const region =
      result.snapshot &&
      result.snapshot.selection &&
      result.snapshot.selection.transcript;
    const page = rendererPage(region);
    return transcriptRenderer.applyAssistantTranscriptEffectsExact({
      container: elements.transcript,
      effect,
      affectedItems: effect.affectedItems || [],
      virtualized:
        !!page && ui.transcriptPaginationVirtualizationEnabled !== false,
      ownerKey: owner ? owner.ownerKey : undefined,
      page: page || undefined,
      mode: ui.chatDisplayMode,
      variant: source === "acp-chat" ? "acp-chat" : "skillrunner",
      expandedIds: ui.expandedTranscriptRows,
      renderMarkdown: markdown,
      formatTime,
      labels:
        labels && labels.assistantPanel && labels.assistantPanel.transcript
          ? labels.assistantPanel.transcript
          : labels.transcript || {},
      onEffectRendered: function (observation) {
        sendAction(
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_RENDER_OBSERVATION,
          Object.assign(
            {
              publicationId: text(publication && publication.publicationId),
            },
            observation || {},
          ),
          publication && publication.owner,
        );
      },
    });
  }

  function recoverRenderFailure(result, publication) {
    let rendered = true;
    if (result && result.publicationKind === "transcript") {
      const owner = selectedOwner(snapshot);
      transcriptRenderer.resetAssistantTranscriptVirtualState(
        elements.transcript,
        owner ? owner.ownerKey : "",
      );
      elements.transcript.removeAttribute(
        "data-assistant-transcript-order-key",
      );
      elements.transcript.removeAttribute("data-assistant-transcript-mode-key");
      while (elements.transcript.firstChild) {
        elements.transcript.removeChild(elements.transcript.firstChild);
      }
      rendered = renderTranscript();
    } else {
      rendered = renderPanel();
      if (result && result.publicationKind === "owner-navigation") {
        renderTranscript();
      }
    }
    sendAction(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_RENDER_OBSERVATION,
      {
        publicationId: text(publication && publication.publicationId),
        renderPath: "recovery-full",
        insertedRows: 0,
        updatedRows: 0,
        removedRows: 0,
        measuredRows: 0,
      },
      publication && publication.owner,
    );
    return rendered;
  }

  const controller = createController({
    source,
    getSnapshot: function () {
      return snapshot;
    },
    setSnapshot: function (next) {
      snapshot = next;
    },
    getOwnerKey: function (state) {
      return text(
        state &&
          state.selection &&
          state.selection.owner &&
          state.selection.owner.ownerKey,
      );
    },
    ack: function (publication, stage, outcome, reason, renderFailure) {
      const failureStage = {
        "owner-navigation": "projection",
        "service-status": "banner",
        "owner-control": "banner",
        "message-counts": "message-counts",
        transcript: "transcript",
        plan: "plan",
        permission: "permission",
        composer: "composer",
        "owner-presentation": "banner",
        "owner-details": "details-drawer",
      }[publication.publicationKind];
      ack(
        publication,
        stage,
        outcome,
        reason,
        renderFailure ||
          (reason === "render-failed"
            ? {
                stage: failureStage || "projection",
                code: "render-failed",
              }
            : null),
      );
    },
    recoverRenderFailure,
    render: function (result, publication) {
      if (result.publicationKind === "transcript") {
        return result.effect && result.effect.kind === "mutations"
          ? renderMutationEffect(result, publication)
          : (function () {
              const previous = snapshot;
              snapshot = result.snapshot;
              try {
                return renderTranscript();
              } finally {
                snapshot = previous;
              }
            })();
      }
      if (result.publicationKind === "owner-navigation") {
        captureReplyDraft();
        const nextOwner = selectedOwner(result.snapshot);
        ui.replyDraft = nextOwner
          ? ui.replyDraftByOwner.get(nextOwner.ownerKey) || ""
          : "";
        ui.contextDrawerOpen = false;
        ui.detailsDrawerOpen = false;
        ui.permissionRequestOpen = false;
      }
      const previous = snapshot;
      snapshot = result.snapshot;
      try {
        renderPanel();
        if (result.publicationKind === "owner-navigation") {
          renderTranscript();
        }
        return true;
      } finally {
        snapshot = previous;
      }
    },
  });

  function configure(payload) {
    const config =
      payload &&
      payload.configuration &&
      typeof payload.configuration === "object"
        ? payload.configuration
        : {};
    const mode = text(config.executionDisplayMode);
    ui.executionDisplayMode =
      mode === "boundary" || mode === "silent" ? mode : "live";
    ui.transcriptPaginationVirtualizationEnabled =
      config.transcriptPaginationVirtualizationEnabled !== false;
    actionRegistry =
      config.actionRegistry &&
      typeof config.actionRegistry === "object" &&
      !Array.isArray(config.actionRegistry)
        ? config.actionRegistry
        : {};
    labels =
      payload && payload.labels && typeof payload.labels === "object"
        ? payload.labels
        : {};
    const viewLabel = text(labels.view) || "";
    const plainLabel = text(labels.plain) || "";
    const bubbleLabel = text(labels.bubble) || "";
    elements.empty.textContent = text(labels.emptySelection);
    const viewGroup = document.querySelector(".asst-conversation-overlay-menu");
    if (viewGroup) viewGroup.setAttribute("aria-label", viewLabel);
    [
      [elements.plain, plainLabel],
      [elements.bubble, bubbleLabel],
    ].forEach(function (entry) {
      const button = entry[0];
      const label = entry[1];
      if (!button) return;
      button.setAttribute("aria-label", label);
      const node = button.querySelector(".asst-view-mode-label");
      if (node) node.textContent = label;
    });
    renderPanel();
  }

  function ready() {
    return sendAction(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY,
      { documentGeneration: generation },
      null,
    );
  }

  if (elements.plain) {
    elements.plain.addEventListener("click", function () {
      ui.chatDisplayMode = "plain";
      renderTranscript();
    });
  }
  if (elements.bubble) {
    elements.bubble.addEventListener("click", function () {
      ui.chatDisplayMode = "bubble";
      renderTranscript();
    });
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_READY_REQUEST) {
      ready();
      return;
    }
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CLOSE_DRAWERS) {
      ui.contextDrawerOpen = false;
      ui.detailsDrawerOpen = false;
      ui.permissionRequestOpen = false;
      renderPanel();
      return;
    }
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_BOOTSTRAP) {
      configure(data.payload || {});
      return;
    }
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACP_PUBLICATION) {
      controller.applyPublication(data.payload || {});
    }
  });

  renderPanel();
  renderTranscript();
  ready();
  return { applyPublication: controller.applyPublication };
}

function boot() {
  const source = childSource();
  if (!source) {
    document.body.setAttribute("data-acp-child-failure", "invalid-source");
    return null;
  }
  return createChildRuntime(source);
}

export {
  boot,
  createClient,
  createController,
  createPageRequest,
  errorMessage,
  createReceiver,
  ownerMatches,
  readRegion,
  readStateRegion,
  renderResult,
  rendererPage,
  resolvePanelActionEnvelope,
  wireFieldRegistry,
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
