import {
  SynthesisClientError,
  assertSynthesisExactFields,
  rebuildSynthesisStructuredDiagnostic,
  toSynthesisJsonObject,
  type SynthesisStructuredDiagnostic,
} from "./common.js";
import {
  rebuildSynthesisHostItemRef,
  type SynthesisHostItemRef,
} from "./itemRef.js";

export const SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX = 100 as const;
export const SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX = 100 as const;
export const SYNTHESIS_HOST_TAG_EFFECT_DIAGNOSTICS_MAX = 20 as const;

const EFFECT_ID_MAX = 256;
const TAG_MAX = 120;

export type SynthesisHostStagedTagBindingResolutionRequest = {
  libraryId: number;
  itemIds: number[];
};

export type SynthesisHostStagedTagBindingResolutionResult = {
  resolved: Array<{ itemId: number; ref: SynthesisHostItemRef }>;
  missingItemIds: number[];
  diagnostics: SynthesisStructuredDiagnostic[];
};

export interface SynthesisHostStagedTagBindingMigrationPort {
  resolve(
    request: SynthesisHostStagedTagBindingResolutionRequest,
  ): Promise<SynthesisHostStagedTagBindingResolutionResult>;
}

export type SynthesisHostTagEffect = {
  effectId: string;
  action: "ensure_present";
  target: SynthesisHostItemRef;
  tag: string;
  provenance: { kind: "staged_tag_promotion" };
  precondition: { target: "exists" };
  permission: {
    scope: "synthesis.tags";
    reason: "promote_staged_tag";
  };
};

export type SynthesisHostTagEffectBatchRequest = {
  effects: SynthesisHostTagEffect[];
};

export type SynthesisHostTagEffectReceipt = {
  effectId: string;
  action: "ensure_present";
  status: "applied" | "already_satisfied" | "not_found" | "failed";
  occurredAt: string;
  diagnostics: SynthesisStructuredDiagnostic[];
};

export type SynthesisHostTagEffectBatchResult = {
  receipts: SynthesisHostTagEffectReceipt[];
};

export interface SynthesisHostTagEffectPort {
  applyBatch(
    request: SynthesisHostTagEffectBatchRequest,
  ): Promise<SynthesisHostTagEffectBatchResult>;
}

function invalidRequest(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

function positiveItemId(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    return invalidRequest(`${location} is invalid`);
  }
  return Number(value);
}

function requiredString(value: unknown, location: string, max: number) {
  if (typeof value !== "string") {
    return invalidRequest(`${location} is invalid`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    return invalidRequest(`${location} is invalid`);
  }
  return normalized;
}

function diagnostics(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_HOST_TAG_EFFECT_DIAGNOSTICS_MAX
  ) {
    return invalidRequest(`${location} is invalid`);
  }
  return value.map((entry, index) =>
    rebuildSynthesisStructuredDiagnostic(entry, `${location}[${index}]`),
  );
}

export function rebuildSynthesisHostStagedTagBindingResolutionRequest(
  value: unknown,
): SynthesisHostStagedTagBindingResolutionRequest {
  const json = toSynthesisJsonObject(
    value,
    "stagedTagBindingResolutionRequest",
  );
  assertSynthesisExactFields(
    json,
    ["libraryId", "itemIds"],
    [],
    "stagedTagBindingResolutionRequest",
  );
  if (!Number.isSafeInteger(json.libraryId) || Number(json.libraryId) <= 0) {
    return invalidRequest("Staged Tag binding resolution libraryId is invalid");
  }
  if (
    !Array.isArray(json.itemIds) ||
    json.itemIds.length < 1 ||
    json.itemIds.length > SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX
  ) {
    return invalidRequest("Staged Tag binding resolution itemIds are invalid");
  }
  const itemIds = json.itemIds.map((entry, index) =>
    positiveItemId(entry, `itemIds[${index}]`),
  );
  if (new Set(itemIds).size !== itemIds.length) {
    return invalidRequest(
      "Staged Tag binding resolution itemIds must be unique",
    );
  }
  return { libraryId: Number(json.libraryId), itemIds };
}

export function rebuildSynthesisHostStagedTagBindingResolutionResult(
  value: unknown,
  requestValue: unknown,
): SynthesisHostStagedTagBindingResolutionResult {
  const request =
    rebuildSynthesisHostStagedTagBindingResolutionRequest(requestValue);
  const json = toSynthesisJsonObject(value, "stagedTagBindingResolutionResult");
  assertSynthesisExactFields(
    json,
    ["resolved", "missingItemIds", "diagnostics"],
    [],
    "stagedTagBindingResolutionResult",
  );
  if (!Array.isArray(json.resolved) || !Array.isArray(json.missingItemIds)) {
    return invalidRequest("Staged Tag binding resolution result is invalid");
  }
  const resolved = json.resolved.map((entry, index) => {
    const record = toSynthesisJsonObject(entry, `resolved[${index}]`);
    assertSynthesisExactFields(
      record,
      ["itemId", "ref"],
      [],
      `resolved[${index}]`,
    );
    const itemId = positiveItemId(record.itemId, `resolved[${index}].itemId`);
    const ref = rebuildSynthesisHostItemRef(
      record.ref,
      `resolved[${index}].ref`,
    );
    if (ref.libraryId !== request.libraryId) {
      return invalidRequest(`resolved[${index}].ref library is invalid`);
    }
    return { itemId, ref };
  });
  const missingItemIds = json.missingItemIds.map((entry, index) =>
    positiveItemId(entry, `missingItemIds[${index}]`),
  );
  const partition = [
    ...resolved.map((entry) => entry.itemId),
    ...missingItemIds,
  ];
  if (
    new Set(partition).size !== partition.length ||
    partition.length !== request.itemIds.length ||
    partition.some((itemId) => !request.itemIds.includes(itemId))
  ) {
    return invalidRequest("Staged Tag binding resolution partition is invalid");
  }
  return {
    resolved,
    missingItemIds,
    diagnostics: diagnostics(json.diagnostics, "diagnostics"),
  };
}

function rebuildEffect(value: unknown, index: number): SynthesisHostTagEffect {
  const json = toSynthesisJsonObject(value, `effects[${index}]`);
  assertSynthesisExactFields(
    json,
    [
      "effectId",
      "action",
      "target",
      "tag",
      "provenance",
      "precondition",
      "permission",
    ],
    [],
    `effects[${index}]`,
  );
  const effectId = requiredString(
    json.effectId,
    `effects[${index}].effectId`,
    EFFECT_ID_MAX,
  );
  if (json.action !== "ensure_present") {
    return invalidRequest(`effects[${index}].action is invalid`);
  }
  const provenance = toSynthesisJsonObject(
    json.provenance,
    `effects[${index}].provenance`,
  );
  const precondition = toSynthesisJsonObject(
    json.precondition,
    `effects[${index}].precondition`,
  );
  const permission = toSynthesisJsonObject(
    json.permission,
    `effects[${index}].permission`,
  );
  assertSynthesisExactFields(
    provenance,
    ["kind"],
    [],
    `effects[${index}].provenance`,
  );
  assertSynthesisExactFields(
    precondition,
    ["target"],
    [],
    `effects[${index}].precondition`,
  );
  assertSynthesisExactFields(
    permission,
    ["scope", "reason"],
    [],
    `effects[${index}].permission`,
  );
  if (
    provenance.kind !== "staged_tag_promotion" ||
    precondition.target !== "exists" ||
    permission.scope !== "synthesis.tags" ||
    permission.reason !== "promote_staged_tag"
  ) {
    return invalidRequest(`effects[${index}] metadata is invalid`);
  }
  return {
    effectId,
    action: "ensure_present",
    target: rebuildSynthesisHostItemRef(
      json.target,
      `effects[${index}].target`,
    ),
    tag: requiredString(json.tag, `effects[${index}].tag`, TAG_MAX),
    provenance: { kind: "staged_tag_promotion" },
    precondition: { target: "exists" },
    permission: {
      scope: "synthesis.tags",
      reason: "promote_staged_tag",
    },
  };
}

export function rebuildSynthesisHostTagEffectBatchRequest(
  value: unknown,
): SynthesisHostTagEffectBatchRequest {
  const json = toSynthesisJsonObject(value, "tagEffectBatchRequest");
  assertSynthesisExactFields(json, ["effects"], [], "tagEffectBatchRequest");
  if (
    !Array.isArray(json.effects) ||
    json.effects.length < 1 ||
    json.effects.length > SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX
  ) {
    return invalidRequest("Tag effect batch size is invalid");
  }
  const effects = json.effects.map(rebuildEffect);
  const ids = new Set(effects.map((effect) => effect.effectId));
  if (ids.size !== effects.length) {
    return invalidRequest("Tag effect IDs must be unique");
  }
  return { effects };
}

function rebuildReceipt(
  value: unknown,
  index: number,
): SynthesisHostTagEffectReceipt {
  const json = toSynthesisJsonObject(value, `receipts[${index}]`);
  assertSynthesisExactFields(
    json,
    ["effectId", "action", "status", "occurredAt", "diagnostics"],
    [],
    `receipts[${index}]`,
  );
  const status = json.status;
  if (
    json.action !== "ensure_present" ||
    (status !== "applied" &&
      status !== "already_satisfied" &&
      status !== "not_found" &&
      status !== "failed")
  ) {
    return invalidRequest(`receipts[${index}] is invalid`);
  }
  const occurredAt = requiredString(
    json.occurredAt,
    `receipts[${index}].occurredAt`,
    64,
  );
  if (!Number.isFinite(Date.parse(occurredAt))) {
    return invalidRequest(`receipts[${index}].occurredAt is invalid`);
  }
  return {
    effectId: requiredString(
      json.effectId,
      `receipts[${index}].effectId`,
      EFFECT_ID_MAX,
    ),
    action: "ensure_present",
    status,
    occurredAt,
    diagnostics: diagnostics(
      json.diagnostics,
      `receipts[${index}].diagnostics`,
    ),
  };
}

export function rebuildSynthesisHostTagEffectBatchResult(
  value: unknown,
  requestValue: unknown,
): SynthesisHostTagEffectBatchResult {
  const request = rebuildSynthesisHostTagEffectBatchRequest(requestValue);
  const json = toSynthesisJsonObject(value, "tagEffectBatchResult");
  assertSynthesisExactFields(json, ["receipts"], [], "tagEffectBatchResult");
  if (
    !Array.isArray(json.receipts) ||
    json.receipts.length !== request.effects.length
  ) {
    return invalidRequest("Tag effect receipts are invalid");
  }
  const receipts = json.receipts.map(rebuildReceipt);
  const expected = new Map(
    request.effects.map((effect) => [effect.effectId, effect.action]),
  );
  if (
    new Set(receipts.map((receipt) => receipt.effectId)).size !==
      receipts.length ||
    receipts.some(
      (receipt) => expected.get(receipt.effectId) !== receipt.action,
    )
  ) {
    return invalidRequest("Tag effect receipts do not match the request");
  }
  return { receipts };
}
