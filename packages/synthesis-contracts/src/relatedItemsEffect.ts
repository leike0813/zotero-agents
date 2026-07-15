import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common";

export const SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX = 50 as const;
export const SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_DIAGNOSTICS_MAX = 20 as const;

const SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_ID_MAX = 256;
const SYNTHESIS_HOST_RELATED_ITEMS_ITEM_KEY_MAX = 128;

export type SynthesisHostRelatedItemRef = {
  libraryId: number;
  itemKey: string;
};

export type SynthesisHostRelatedItemsEffectAction =
  | "ensure_present"
  | "ensure_absent";

export type SynthesisHostRelatedItemsEffect = {
  effectId: string;
  action: SynthesisHostRelatedItemsEffectAction;
  source: SynthesisHostRelatedItemRef;
  target: SynthesisHostRelatedItemRef;
  provenance: {
    citationEdgeId: string;
    kind: "accepted_citation" | "synthesis_created_relation";
  };
  permission: {
    scope: "synthesis.related_items";
    reason: "accepted_citation" | "revoke_synthesis_effect";
  };
};

export type SynthesisHostRelatedItemsEffectBatchRequest = {
  effects: SynthesisHostRelatedItemsEffect[];
};

export type SynthesisHostRelatedItemsEffectReceipt = {
  effectId: string;
  action: SynthesisHostRelatedItemsEffectAction;
  status: "applied" | "already_satisfied" | "not_found" | "failed";
  occurredAt: string;
  diagnostics: SynthesisJsonObject[];
};

export type SynthesisHostRelatedItemsEffectBatchResult = {
  receipts: SynthesisHostRelatedItemsEffectReceipt[];
};

export interface SynthesisHostRelatedItemsEffectPort {
  applyBatch(
    request: SynthesisHostRelatedItemsEffectBatchRequest,
  ): Promise<SynthesisHostRelatedItemsEffectBatchResult>;
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function invalidRequest(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

function rebuildItemRef(
  value: unknown,
  location: string,
): SynthesisHostRelatedItemRef {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    invalidRequest(`${location} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const libraryId = Number(record.libraryId);
  const itemKey = cleanString(record.itemKey);
  if (
    !Number.isInteger(libraryId) ||
    libraryId <= 0 ||
    !itemKey ||
    itemKey.length > SYNTHESIS_HOST_RELATED_ITEMS_ITEM_KEY_MAX
  ) {
    invalidRequest(`${location} is invalid`);
  }
  return { libraryId, itemKey };
}

function rebuildAction(value: unknown): SynthesisHostRelatedItemsEffectAction {
  if (value === "ensure_present" || value === "ensure_absent") {
    return value;
  }
  return invalidRequest("Related Items effect action is invalid");
}

function rebuildEffect(
  value: unknown,
  index: number,
): SynthesisHostRelatedItemsEffect {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    invalidRequest(`effects[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  const effectId = cleanString(record.effectId);
  const action = rebuildAction(record.action);
  const source = rebuildItemRef(record.source, `effects[${index}].source`);
  const target = rebuildItemRef(record.target, `effects[${index}].target`);
  const provenance = record.provenance as Record<string, unknown> | undefined;
  const permission = record.permission as Record<string, unknown> | undefined;
  const citationEdgeId = cleanString(provenance?.citationEdgeId);
  const provenanceKind = cleanString(provenance?.kind);
  const permissionScope = cleanString(permission?.scope);
  const permissionReason = cleanString(permission?.reason);
  const expectedProvenance =
    action === "ensure_present"
      ? "accepted_citation"
      : "synthesis_created_relation";
  const expectedReason =
    action === "ensure_present"
      ? "accepted_citation"
      : "revoke_synthesis_effect";
  if (
    !effectId ||
    effectId.length > SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_ID_MAX ||
    !citationEdgeId ||
    citationEdgeId.length > SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_ID_MAX ||
    provenanceKind !== expectedProvenance ||
    permissionScope !== "synthesis.related_items" ||
    permissionReason !== expectedReason
  ) {
    invalidRequest(`effects[${index}] metadata is invalid`);
  }
  if (
    source.libraryId === target.libraryId &&
    source.itemKey === target.itemKey
  ) {
    invalidRequest(`effects[${index}] cannot target itself`);
  }
  return {
    effectId,
    action,
    source,
    target,
    provenance: {
      citationEdgeId,
      kind: expectedProvenance,
    },
    permission: {
      scope: "synthesis.related_items",
      reason: expectedReason,
    },
  };
}

export function rebuildSynthesisHostRelatedItemsEffectBatchRequest(
  value: unknown,
): SynthesisHostRelatedItemsEffectBatchRequest {
  const json = toSynthesisJsonObject(value, "relatedItemsEffectBatch");
  if (!Array.isArray(json.effects)) {
    invalidRequest("Related Items effects must be an array");
  }
  if (
    json.effects.length < 1 ||
    json.effects.length > SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX
  ) {
    invalidRequest("Related Items effect batch size is invalid");
  }
  const effects = json.effects.map(rebuildEffect);
  const ids = new Set<string>();
  for (const effect of effects) {
    if (ids.has(effect.effectId)) {
      invalidRequest("Related Items effect IDs must be unique");
    }
    ids.add(effect.effectId);
  }
  return { effects };
}

function rebuildReceipt(
  value: unknown,
  index: number,
): SynthesisHostRelatedItemsEffectReceipt {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    invalidRequest(`receipts[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  const effectId = cleanString(record.effectId);
  const action = rebuildAction(record.action);
  const status = record.status;
  const occurredAt = cleanString(record.occurredAt);
  if (
    !effectId ||
    effectId.length > SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_ID_MAX ||
    (status !== "applied" &&
      status !== "already_satisfied" &&
      status !== "not_found" &&
      status !== "failed") ||
    !occurredAt ||
    !Number.isFinite(Date.parse(occurredAt)) ||
    !Array.isArray(record.diagnostics) ||
    record.diagnostics.length >
      SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_DIAGNOSTICS_MAX
  ) {
    invalidRequest(`receipts[${index}] is invalid`);
  }
  return {
    effectId,
    action,
    status,
    occurredAt,
    diagnostics: record.diagnostics.map((diagnostic, diagnosticIndex) =>
      toSynthesisJsonObject(
        diagnostic,
        `receipts[${index}].diagnostics[${diagnosticIndex}]`,
      ),
    ),
  };
}

export function rebuildSynthesisHostRelatedItemsEffectBatchResult(
  value: unknown,
): SynthesisHostRelatedItemsEffectBatchResult {
  const json = toSynthesisJsonObject(value, "relatedItemsEffectBatchResult");
  if (
    !Array.isArray(json.receipts) ||
    json.receipts.length < 1 ||
    json.receipts.length > SYNTHESIS_HOST_RELATED_ITEMS_EFFECT_BATCH_MAX
  ) {
    invalidRequest("Related Items effect receipts are invalid");
  }
  const receipts = json.receipts.map(rebuildReceipt);
  const ids = new Set<string>();
  for (const receipt of receipts) {
    if (ids.has(receipt.effectId)) {
      invalidRequest("Related Items effect receipt IDs must be unique");
    }
    ids.add(receipt.effectId);
  }
  return { receipts };
}
