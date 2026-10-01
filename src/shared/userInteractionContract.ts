/**
 * Versioned multi-question user-interaction contract (C17 \`ask_user\`).
 *
 * Browser-safe single source of truth for the built-in Pi Skill Run
 * interaction protocol, resolved in issue #21 ("Define workflow and Pi Skill
 * Run integration") with the later Q199/Q201/Q202 amendments:
 *
 * - \`AskUserModelInputV1\` — the model-authored question content;
 * - \`UserInteractionBatchV1\` — the host-persisted batch/owner/turn/call/
 *   question identity, durable draft and status
 *   (schema \`zotero-agents.user-interaction-batch.v1\`);
 * - \`AskUserToolResultV1\` — the typed answer(s) returned per original
 *   \`ask_user\` tool call (schema \`zotero-agents.ask-user-result.v1\`).
 *
 * Host identity (\`batchId\`/\`questionId\`/\`optionId\`/\`slotId\`) is generated and
 * persisted by the host; array position and display text are never identity.
 * The singular \`AssistantPendingInteraction\` DTO and the v1 publication
 * envelope stay unchanged: a legacy single-call/single-question projection may
 * be derived from a batch, but multi-question batches are never downgraded.
 *
 * Like assistantWireContract.ts this file must stay free of imports from
 * src/modules/** so sidebar page bundles never pull in privileged code.
 */

import type { AssistantInteractionJson } from "./assistantInteractionContract";

export const USER_INTERACTION_CONTRACT_VERSION = 1 as const;
export const USER_INTERACTION_BATCH_SCHEMA =
  "zotero-agents.user-interaction-batch.v1" as const;
export const ASK_USER_RESULT_SCHEMA =
  "zotero-agents.ask-user-result.v1" as const;
/**
 * Wire id for the model-authored input. The model input itself carries no
 * in-band version field; the batch/result schemas carry the contract identity.
 */
export const ASK_USER_MODEL_INPUT_SCHEMA_ID =
  "zotero-agents.ask-user-input.v1" as const;

/** Question kinds; \`single_select\`/\`multi_select\` carry 2..8 options. */
export type UserInteractionQuestionKind =
  | "text"
  | "single_select"
  | "multi_select"
  | "confirm"
  | "files";

export const USER_INTERACTION_QUESTION_KINDS: readonly UserInteractionQuestionKind[] =
  ["text", "single_select", "multi_select", "confirm", "files"];

/** One \`ask_user\` call carries 1..4 questions. */
export const ASK_USER_MIN_QUESTIONS_PER_CALL = 1;
export const ASK_USER_MAX_QUESTIONS_PER_CALL = 4;

/** One persisted batch aggregates every ask call in the tool batch. */
export const USER_INTERACTION_MAX_QUESTIONS_PER_BATCH = 16;

export const USER_INTERACTION_SELECT_MIN_OPTIONS = 2;
export const USER_INTERACTION_SELECT_MAX_OPTIONS = 8;

/**
 * Q201 shared managed user-file admission bounds, applied across one
 * interaction batch (files reuse the owner managed-file path).
 */
export const USER_INTERACTION_BATCH_FILE_LIMIT = 20;
export const USER_INTERACTION_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const USER_INTERACTION_BATCH_FILE_TOTAL_MAX_BYTES = 50 * 1024 * 1024;
/** Shared per-owner Workspace quota (interaction files count toward it). */
export const USER_INTERACTION_OWNER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * JSON Schema for the `ask_user` model input, exported so the Tool Gateway
 * definition, the model-visible projection and this contract cannot drift.
 *
 * `parseAskUserModelInputV1` stays the authority: it additionally enforces the
 * select 2..8 option bound, the per-kind field rules (options only for select
 * kinds, files only for the files kind), unique canonical option values and
 * the batch-wide file caps, which JSON Schema cannot express without
 * per-kind conditionals.
 */
export const ASK_USER_MODEL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: ASK_USER_MIN_QUESTIONS_PER_CALL,
      maxItems: ASK_USER_MAX_QUESTIONS_PER_CALL,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "prompt"],
        properties: {
          kind: {
            enum: [...USER_INTERACTION_QUESTION_KINDS],
            description:
              "text | single_select | multi_select | confirm | files.",
          },
          prompt: {
            type: "string",
            minLength: 1,
            maxLength: 12_000,
            description: "The question text shown to the user.",
          },
          header: {
            type: ["string", "null"],
            maxLength: 512,
            description: "Short label for the question.",
          },
          hint: {
            type: ["string", "null"],
            maxLength: 4_000,
            description: "Optional guidance shown under the question.",
          },
          required: {
            type: "boolean",
            default: true,
            description: "Defaults to true when omitted.",
          },
          options: {
            type: "array",
            description:
              "single_select/multi_select only; 2..8 entries with unique values. Omit for every other kind.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "value"],
              properties: {
                label: {
                  type: "string",
                  minLength: 1,
                  maxLength: 512,
                  description: "Option text shown to the user.",
                },
                value: {
                  description:
                    "Bounded JSON value returned to you when this option is chosen; must be unique across the options.",
                },
                description: {
                  type: ["string", "null"],
                  maxLength: 2_000,
                  description: "Optional option detail.",
                },
              },
            },
          },
          files: {
            type: "array",
            minItems: 1,
            description:
              "files questions only; omit for every other kind. File bytes never reach the model, only opaque managed-file references.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name"],
              properties: {
                name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 512,
                  description: "Slot name, e.g. the expected attachment.",
                },
                required: {
                  type: "boolean",
                  default: true,
                  description: "Defaults to true when omitted.",
                },
                hint: {
                  type: ["string", "null"],
                  maxLength: 4_000,
                  description: "Optional slot guidance.",
                },
                accept: {
                  type: ["string", "null"],
                  maxLength: 512,
                  description:
                    "Picker hint only (never an allowlist or an authority).",
                },
              },
            },
          },
        },
      },
    },
  },
};

export type UserInteractionBatchStatusV1 =
  | "collecting"
  | "submitted"
  | "declined"
  | "canceled";

/** Opaque Tool Gateway file reference: host identity + bounded metadata only. */
export type ToolGatewayFileRef = {
  refId: string;
  name: string | null;
  mediaType: string | null;
  byteLength: number | null;
};

// ---------------------------------------------------------------------------
// Model-authored content (\`AskUserModelInputV1\`)
// ---------------------------------------------------------------------------

export type AskUserModelOptionV1 = {
  label: string;
  value: AssistantInteractionJson;
  description?: string | null;
};

export type AskUserModelFileSlotV1 = {
  name: string;
  required?: boolean;
  hint?: string | null;
  accept?: string | null;
};

export type AskUserModelQuestionV1 = {
  kind: UserInteractionQuestionKind;
  prompt: string;
  header?: string | null;
  hint?: string | null;
  /** Defaults to true when absent. */
  required?: boolean;
  /** Select kinds only; 2..8 entries with unique values. */
  options?: AskUserModelOptionV1[];
  /** Files kind only. */
  files?: AskUserModelFileSlotV1[];
};

export type AskUserModelInputV1 = {
  questions: AskUserModelQuestionV1[];
};

// ---------------------------------------------------------------------------
// Host-persisted batch (\`UserInteractionBatchV1\`)
// ---------------------------------------------------------------------------

export type UserInteractionOptionV1 = {
  optionId: string;
  label: string;
  value: AssistantInteractionJson;
  description: string | null;
};

export type UserInteractionFileSlotV1 = {
  slotId: string;
  name: string;
  required: boolean;
  hint: string | null;
  accept: string | null;
};

export type UserInteractionQuestionV1 = {
  questionId: string;
  toolCallId: string;
  callIndex: number;
  /** Position within the originating call; identity stays \`questionId\`. */
  questionIndex: number;
  kind: UserInteractionQuestionKind;
  prompt: string;
  header: string | null;
  hint: string | null;
  required: boolean;
  /** Empty for non-select kinds. */
  options: UserInteractionOptionV1[];
  /** Empty for non-files kinds. */
  files: UserInteractionFileSlotV1[];
};

export type UserInteractionCallV1 = {
  toolCallId: string;
  callIndex: number;
  questionIds: string[];
};

/**
 * Typed answer. Selection answers carry both the host \`optionId\` and the
 * model-defined \`value\`; a validator must confirm the mapping and reject
 * duplicate canonical values. \`unanswered\` is the explicit optional-empty
 * form; the model result may also omit an optional answer in the draft.
 */
export type UserInteractionAnswerV1 =
  | { kind: "text"; text: string }
  | { kind: "single_select"; optionId: string; value: AssistantInteractionJson }
  | {
      kind: "multi_select";
      selections: Array<{ optionId: string; value: AssistantInteractionJson }>;
    }
  | { kind: "confirm"; confirmed: boolean }
  | {
      kind: "files";
      slots: Array<{ slotId: string; files: ToolGatewayFileRef[] }>;
    }
  | { kind: "unanswered"; reason: "optional" };

/** Draft answers keyed by host questionId. */
export type UserInteractionDraftAnswersV1 = Record<
  string,
  UserInteractionAnswerV1
>;

export type UserInteractionBatchV1 = {
  schema: typeof USER_INTERACTION_BATCH_SCHEMA;
  batchId: string;
  ownerKey: string;
  turnId: string;
  assistantMessageId: string;
  status: UserInteractionBatchStatusV1;
  /** Draft CAS revision; every accepted mutation bumps it by one. */
  revision: number;
  calls: UserInteractionCallV1[];
  questions: UserInteractionQuestionV1[];
  draftAnswers: UserInteractionDraftAnswersV1;
};

// ---------------------------------------------------------------------------
// Action payloads (draft / submit / decline)
// ---------------------------------------------------------------------------

/** One idempotent draft mutation keyed by \`mutationId\` + \`baseRevision\`. */
export type AssistantInteractionDraftPayloadV1 = {
  batchId: string;
  questionId: string;
  baseRevision: number;
  mutationId: string;
  answer: UserInteractionAnswerV1;
};

/** Atomic whole-batch submission; competes with decline for one terminal. */
export type AssistantInteractionSubmitPayloadV1 = {
  batchId: string;
  baseRevision: number;
  mutationId: string;
  answers: UserInteractionDraftAnswersV1;
};

/** Whole-batch decline; the model receives one declined result per call. */
export type AssistantInteractionDeclinePayloadV1 = {
  batchId: string;
  baseRevision: number;
  mutationId: string;
};

/**
 * One \`submit-interaction-files\` pick for a batch question/slot. The host
 * re-opens the picker, stages the chosen files as opaque managed refs and
 * commits them with CAS against \`baseRevision\`; a stale pick is rejected and
 * rebased to the canonical draft.
 *
 * \`slotId\` is null when a files question declares no slot (or the pick is
 * question-level). Legacy single-question senders must still send the exact
 * key set because the child-action router exact-key-gates this action; they
 * send empty/zero sentinels and their own handler ignores the payload.
 */
export type AssistantInteractionFilePickPayloadV1 = {
  batchId: string;
  questionId: string;
  slotId: string | null;
  baseRevision: number;
  mutationId: string;
};

// ---------------------------------------------------------------------------
// Model-facing tool result (\`AskUserToolResultV1\`)
// ---------------------------------------------------------------------------

export type AskUserToolResultAnswerV1 = {
  questionId: string;
  answer: UserInteractionAnswerV1;
};

export type AskUserToolResultV1 = {
  schema: typeof ASK_USER_RESULT_SCHEMA;
  toolCallId: string;
  outcome: "answered" | "declined";
  /** One typed answer per question of the call, in original order. */
  answers: AskUserToolResultAnswerV1[];
};

// ---------------------------------------------------------------------------
// Validation primitives
// ---------------------------------------------------------------------------

const MAX_PROMPT_LENGTH = 12_000;
const MAX_HEADER_LENGTH = 512;
const MAX_LABEL_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_HINT_LENGTH = 4_000;
const MAX_FILE_FIELD_LENGTH = 512;
const MAX_ID_LENGTH = 512;
const MAX_MEDIA_TYPE_LENGTH = 255;
const MAX_OPTION_JSON_BYTES = 16_384;
const MAX_OPTION_JSON_DEPTH = 24;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: unknown,
  expected: readonly string[],
): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return (
    actual.length === keys.length &&
    actual.every((entry, index) => entry === keys[index])
  );
}

function onlyDeclaredKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedText(value: unknown, maxLength: number): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= maxLength ? text : null;
}

function boundedNullableText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  return boundedText(value, maxLength);
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function isJsonValue(
  value: unknown,
  seen = new Set<object>(),
  depth = 0,
): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (
    !value ||
    typeof value !== "object" ||
    seen.has(value) ||
    depth >= MAX_OPTION_JSON_DEPTH
  ) {
    return false;
  }
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonValue(entry, seen, depth + 1))
    : Object.entries(value).every(
        ([key, entry]) =>
          key.length <= MAX_LABEL_LENGTH && isJsonValue(entry, seen, depth + 1),
      );
  seen.delete(value);
  return valid;
}

function boundedJsonValue(value: unknown): AssistantInteractionJson | null {
  if (!isJsonValue(value)) return null;
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined || encoded.length > MAX_OPTION_JSON_BYTES) {
      return null;
    }
    return value as AssistantInteractionJson;
  } catch {
    return null;
  }
}

/** Stable canonical form used to enforce unique option values. */
function canonicalJson(value: AssistantInteractionJson): string {
  const canonicalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonicalize);
    if (isObject(entry)) {
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonicalize(nested)]),
      );
    }
    return entry;
  };
  return JSON.stringify(canonicalize(value)) ?? "";
}

function isQuestionKind(value: unknown): value is UserInteractionQuestionKind {
  return (
    typeof value === "string" &&
    (USER_INTERACTION_QUESTION_KINDS as readonly string[]).includes(value)
  );
}

function isSelectKind(kind: UserInteractionQuestionKind): boolean {
  return kind === "single_select" || kind === "multi_select";
}

function normalizeFileRef(
  value: unknown,
  exact: boolean,
): ToolGatewayFileRef | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, FILE_REF_KEYS)) return null;
  const refId = boundedText(value.refId, MAX_ID_LENGTH);
  const name = boundedNullableText(value.name, MAX_FILE_FIELD_LENGTH);
  const mediaType = boundedNullableText(value.mediaType, MAX_MEDIA_TYPE_LENGTH);
  if (
    !refId ||
    (value.name != null && name === null) ||
    (value.mediaType != null && mediaType === null)
  ) {
    return null;
  }
  const byteLength =
    value.byteLength === null || value.byteLength === undefined
      ? null
      : nonNegativeInteger(value.byteLength);
  if (value.byteLength != null && byteLength === null) return null;
  return { refId, name, mediaType, byteLength };
}

const FILE_REF_KEYS = ["refId", "name", "mediaType", "byteLength"] as const;
const MODEL_OPTION_KEYS = ["label", "value", "description"] as const;
const MODEL_FILE_SLOT_KEYS = ["name", "required", "hint", "accept"] as const;
const MODEL_QUESTION_KEYS = [
  "kind",
  "prompt",
  "header",
  "hint",
  "required",
  "options",
  "files",
] as const;

// ---------------------------------------------------------------------------
// Model input
// ---------------------------------------------------------------------------

function normalizeModelOption(
  value: unknown,
  exact: boolean,
): AskUserModelOptionV1 | null {
  if (!isObject(value)) return null;
  if (
    exact &&
    (!onlyDeclaredKeys(value, MODEL_OPTION_KEYS) ||
      !("label" in value) ||
      !("value" in value))
  ) {
    return null;
  }
  const label = boundedText(value.label, MAX_LABEL_LENGTH);
  const description = boundedNullableText(
    value.description,
    MAX_DESCRIPTION_LENGTH,
  );
  if (!label || (value.description != null && description === null))
    return null;
  if (!Object.prototype.hasOwnProperty.call(value, "value")) return null;
  const jsonValue = boundedJsonValue(value.value);
  if (jsonValue === null && value.value !== null) return null;
  return { label, value: jsonValue, description };
}

function normalizeModelFileSlot(
  value: unknown,
  exact: boolean,
): AskUserModelFileSlotV1 | null {
  if (!isObject(value)) return null;
  if (
    exact &&
    (!onlyDeclaredKeys(value, MODEL_FILE_SLOT_KEYS) || !("name" in value))
  ) {
    return null;
  }
  const name = boundedText(value.name, MAX_FILE_FIELD_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  const accept = boundedNullableText(value.accept, MAX_FILE_FIELD_LENGTH);
  if (
    !name ||
    (value.hint != null && hint === null) ||
    (value.accept != null && accept === null)
  ) {
    return null;
  }
  if (value.required != null && typeof value.required !== "boolean")
    return null;
  return { name, required: value.required === true, hint, accept };
}

function normalizeModelQuestion(
  value: unknown,
  exact: boolean,
): AskUserModelQuestionV1 | null {
  if (!isObject(value)) return null;
  if (exact && !onlyDeclaredKeys(value, MODEL_QUESTION_KEYS)) return null;
  const prompt = boundedText(value.prompt, MAX_PROMPT_LENGTH);
  const header = boundedNullableText(value.header, MAX_HEADER_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  if (
    !prompt ||
    !isQuestionKind(value.kind) ||
    (value.header != null && header === null) ||
    (value.hint != null && hint === null) ||
    (value.required != null && typeof value.required !== "boolean")
  ) {
    return null;
  }
  const kind = value.kind;
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const rawFiles = Array.isArray(value.files) ? value.files : [];
  if (isSelectKind(kind)) {
    if (
      rawOptions.length < USER_INTERACTION_SELECT_MIN_OPTIONS ||
      rawOptions.length > USER_INTERACTION_SELECT_MAX_OPTIONS
    ) {
      return null;
    }
  } else if (rawOptions.length > 0) {
    return null;
  }
  // A files question must declare at least one host slot: without a slot the
  // owner has no identity to place picked files into. Every other kind must
  // not carry slots at all.
  if (kind === "files") {
    if (rawFiles.length < 1) return null;
  } else if (rawFiles.length > 0) {
    return null;
  }
  const options = rawOptions.map((entry) => normalizeModelOption(entry, exact));
  const files = rawFiles.map((entry) => normalizeModelFileSlot(entry, exact));
  if (options.some((entry) => !entry) || files.some((entry) => !entry)) {
    return null;
  }
  const normalizedOptions = options as AskUserModelOptionV1[];
  if (normalizedOptions.length > 0) {
    const values = new Set(
      normalizedOptions.map((entry) => canonicalJson(entry.value)),
    );
    if (values.size !== normalizedOptions.length) return null;
  }
  return {
    kind,
    prompt,
    header,
    hint,
    required: value.required !== false,
    options: normalizedOptions,
    files: files as AskUserModelFileSlotV1[],
  };
}

function normalizeModelInput(
  value: unknown,
  exact: boolean,
): AskUserModelInputV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, ["questions"])) return null;
  const rawQuestions = Array.isArray(value.questions) ? value.questions : [];
  if (
    rawQuestions.length < ASK_USER_MIN_QUESTIONS_PER_CALL ||
    rawQuestions.length > ASK_USER_MAX_QUESTIONS_PER_CALL
  ) {
    return null;
  }
  const questions = rawQuestions.map((entry) =>
    normalizeModelQuestion(entry, exact),
  );
  if (questions.some((entry) => !entry)) return null;
  return { questions: questions as AskUserModelQuestionV1[] };
}

/** Strict, closed projection of one \`ask_user\` tool argument object. */
export function parseAskUserModelInputV1(
  value: unknown,
): AskUserModelInputV1 | null {
  return normalizeModelInput(value, true);
}

/** Lenient projection for an already schema-validated model input. */
export function projectAskUserModelInputV1(
  value: unknown,
): AskUserModelInputV1 | null {
  return normalizeModelInput(value, false);
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

const BATCH_KEYS = [
  "schema",
  "batchId",
  "ownerKey",
  "turnId",
  "assistantMessageId",
  "status",
  "revision",
  "calls",
  "questions",
  "draftAnswers",
] as const;
const CALL_KEYS = ["toolCallId", "callIndex", "questionIds"] as const;
const QUESTION_KEYS = [
  "questionId",
  "toolCallId",
  "callIndex",
  "questionIndex",
  "kind",
  "prompt",
  "header",
  "hint",
  "required",
  "options",
  "files",
] as const;
const BATCH_OPTION_KEYS = [
  "optionId",
  "label",
  "value",
  "description",
] as const;
const BATCH_FILE_SLOT_KEYS = [
  "slotId",
  "name",
  "required",
  "hint",
  "accept",
] as const;
const BATCH_STATUSES: ReadonlySet<UserInteractionBatchStatusV1> = new Set([
  "collecting",
  "submitted",
  "declined",
  "canceled",
]);

function normalizeBatchOption(
  value: unknown,
  exact: boolean,
): UserInteractionOptionV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, BATCH_OPTION_KEYS)) return null;
  const optionId = boundedText(value.optionId, MAX_ID_LENGTH);
  const label = boundedText(value.label, MAX_LABEL_LENGTH);
  const description = boundedNullableText(
    value.description,
    MAX_DESCRIPTION_LENGTH,
  );
  if (
    !optionId ||
    !label ||
    (value.description != null && description === null)
  ) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(value, "value")) return null;
  const jsonValue = boundedJsonValue(value.value);
  if (jsonValue === null && value.value !== null) return null;
  return { optionId, label, value: jsonValue, description };
}

function normalizeBatchFileSlot(
  value: unknown,
  exact: boolean,
): UserInteractionFileSlotV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, BATCH_FILE_SLOT_KEYS)) return null;
  const slotId = boundedText(value.slotId, MAX_ID_LENGTH);
  const name = boundedText(value.name, MAX_FILE_FIELD_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  const accept = boundedNullableText(value.accept, MAX_FILE_FIELD_LENGTH);
  if (
    !slotId ||
    !name ||
    typeof value.required !== "boolean" ||
    (value.hint != null && hint === null) ||
    (value.accept != null && accept === null)
  ) {
    return null;
  }
  return { slotId, name, required: value.required, hint, accept };
}

function normalizeBatchQuestion(
  value: unknown,
  exact: boolean,
): UserInteractionQuestionV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, QUESTION_KEYS)) return null;
  const questionId = boundedText(value.questionId, MAX_ID_LENGTH);
  const toolCallId = boundedText(value.toolCallId, MAX_ID_LENGTH);
  const callIndex = nonNegativeInteger(value.callIndex);
  const questionIndex = nonNegativeInteger(value.questionIndex);
  const prompt = boundedText(value.prompt, MAX_PROMPT_LENGTH);
  const header = boundedNullableText(value.header, MAX_HEADER_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  if (
    !questionId ||
    !toolCallId ||
    callIndex === null ||
    questionIndex === null ||
    !prompt ||
    !isQuestionKind(value.kind) ||
    typeof value.required !== "boolean" ||
    (value.header != null && header === null) ||
    (value.hint != null && hint === null)
  ) {
    return null;
  }
  const kind = value.kind;
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const rawFiles = Array.isArray(value.files) ? value.files : [];
  if (isSelectKind(kind)) {
    if (
      rawOptions.length < USER_INTERACTION_SELECT_MIN_OPTIONS ||
      rawOptions.length > USER_INTERACTION_SELECT_MAX_OPTIONS
    ) {
      return null;
    }
  } else if (rawOptions.length > 0) {
    return null;
  }
  // A files question must declare at least one host slot: without a slot the
  // owner has no identity to place picked files into. Every other kind must
  // not carry slots at all.
  if (kind === "files") {
    if (rawFiles.length < 1) return null;
  } else if (rawFiles.length > 0) {
    return null;
  }
  const options = rawOptions.map((entry) => normalizeBatchOption(entry, exact));
  const files = rawFiles.map((entry) => normalizeBatchFileSlot(entry, exact));
  if (options.some((entry) => !entry) || files.some((entry) => !entry)) {
    return null;
  }
  const normalizedOptions = options as UserInteractionOptionV1[];
  if (normalizedOptions.length > 0) {
    const optionIds = new Set(normalizedOptions.map((entry) => entry.optionId));
    const values = new Set(
      normalizedOptions.map((entry) => canonicalJson(entry.value)),
    );
    if (
      optionIds.size !== normalizedOptions.length ||
      values.size !== normalizedOptions.length
    ) {
      return null;
    }
  }
  const normalizedFiles = files as UserInteractionFileSlotV1[];
  if (
    new Set(normalizedFiles.map((entry) => entry.slotId)).size !==
    normalizedFiles.length
  ) {
    return null;
  }
  return {
    questionId,
    toolCallId,
    callIndex,
    questionIndex,
    kind,
    prompt,
    header,
    hint,
    required: value.required,
    options: normalizedOptions,
    files: normalizedFiles,
  };
}

function normalizeCall(
  value: unknown,
  exact: boolean,
): UserInteractionCallV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, CALL_KEYS)) return null;
  const toolCallId = boundedText(value.toolCallId, MAX_ID_LENGTH);
  const callIndex = nonNegativeInteger(value.callIndex);
  const rawIds = Array.isArray(value.questionIds) ? value.questionIds : [];
  if (!toolCallId || callIndex === null) return null;
  if (
    rawIds.length < ASK_USER_MIN_QUESTIONS_PER_CALL ||
    rawIds.length > ASK_USER_MAX_QUESTIONS_PER_CALL
  ) {
    return null;
  }
  const questionIds = rawIds.map((entry) => boundedText(entry, MAX_ID_LENGTH));
  if (questionIds.some((entry) => !entry)) return null;
  const ids = questionIds as string[];
  if (new Set(ids).size !== ids.length) return null;
  return { toolCallId, callIndex, questionIds: ids };
}

function normalizeAnswer(
  value: unknown,
  exact: boolean,
): UserInteractionAnswerV1 | null {
  if (!isObject(value)) return null;
  switch (value.kind) {
    case "text": {
      if (exact && !hasExactKeys(value, ["kind", "text"])) return null;
      const text = typeof value.text === "string" ? value.text : null;
      if (text === null || text.length > MAX_PROMPT_LENGTH) return null;
      return { kind: "text", text };
    }
    case "single_select": {
      if (exact && !hasExactKeys(value, ["kind", "optionId", "value"]))
        return null;
      const optionId = boundedText(value.optionId, MAX_ID_LENGTH);
      if (!optionId || !Object.prototype.hasOwnProperty.call(value, "value")) {
        return null;
      }
      const jsonValue = boundedJsonValue(value.value);
      if (jsonValue === null && value.value !== null) return null;
      return { kind: "single_select", optionId, value: jsonValue };
    }
    case "multi_select": {
      if (exact && !hasExactKeys(value, ["kind", "selections"])) return null;
      const raw = Array.isArray(value.selections) ? value.selections : [];
      if (raw.length > USER_INTERACTION_SELECT_MAX_OPTIONS) return null;
      const selections: Array<{
        optionId: string;
        value: AssistantInteractionJson;
      }> = [];
      const seen = new Set<string>();
      for (const entry of raw) {
        if (!isObject(entry)) return null;
        if (exact && !hasExactKeys(entry, ["optionId", "value"])) return null;
        const optionId = boundedText(entry.optionId, MAX_ID_LENGTH);
        if (
          !optionId ||
          !Object.prototype.hasOwnProperty.call(entry, "value")
        ) {
          return null;
        }
        const jsonValue = boundedJsonValue(entry.value);
        if (jsonValue === null && entry.value !== null) return null;
        if (seen.has(optionId)) return null;
        seen.add(optionId);
        selections.push({ optionId, value: jsonValue });
      }
      return { kind: "multi_select", selections };
    }
    case "confirm": {
      if (exact && !hasExactKeys(value, ["kind", "confirmed"])) return null;
      if (typeof value.confirmed !== "boolean") return null;
      return { kind: "confirm", confirmed: value.confirmed };
    }
    case "files": {
      if (exact && !hasExactKeys(value, ["kind", "slots"])) return null;
      const raw = Array.isArray(value.slots) ? value.slots : [];
      const slots: Array<{ slotId: string; files: ToolGatewayFileRef[] }> = [];
      const seen = new Set<string>();
      let total = 0;
      for (const entry of raw) {
        if (!isObject(entry)) return null;
        if (exact && !hasExactKeys(entry, ["slotId", "files"])) return null;
        const slotId = boundedText(entry.slotId, MAX_ID_LENGTH);
        const rawFiles = Array.isArray(entry.files) ? entry.files : [];
        if (!slotId || seen.has(slotId)) return null;
        seen.add(slotId);
        const files = rawFiles.map((file) => normalizeFileRef(file, exact));
        if (files.some((file) => !file)) return null;
        total += files.length;
        if (total > USER_INTERACTION_BATCH_FILE_LIMIT) return null;
        slots.push({ slotId, files: files as ToolGatewayFileRef[] });
      }
      return { kind: "files", slots };
    }
    case "unanswered": {
      if (exact && !hasExactKeys(value, ["kind", "reason"])) return null;
      if (value.reason !== "optional") return null;
      return { kind: "unanswered", reason: "optional" };
    }
    default:
      return null;
  }
}

function answerMatchesQuestion(
  answer: UserInteractionAnswerV1,
  question: UserInteractionQuestionV1,
): boolean {
  if (answer.kind === "unanswered") return !question.required;
  if (answer.kind !== question.kind) return false;
  const optionByValue = (optionId: string, value: AssistantInteractionJson) => {
    const option = question.options.find(
      (entry) => entry.optionId === optionId,
    );
    return !!option && canonicalJson(option.value) === canonicalJson(value);
  };
  if (answer.kind === "single_select") {
    return optionByValue(answer.optionId, answer.value);
  }
  if (answer.kind === "multi_select") {
    const askedIds = question.options.map((entry) => entry.optionId);
    return answer.selections.every(
      (selection) =>
        askedIds.includes(selection.optionId) &&
        optionByValue(selection.optionId, selection.value),
    );
  }
  if (answer.kind === "files") {
    const slotIds = question.files.map((entry) => entry.slotId);
    return answer.slots.every((slot) => slotIds.includes(slot.slotId));
  }
  return true;
}

function normalizeBatch(
  value: unknown,
  exact: boolean,
): UserInteractionBatchV1 | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, BATCH_KEYS)) return null;
  if (value.schema !== USER_INTERACTION_BATCH_SCHEMA) return null;
  const batchId = boundedText(value.batchId, MAX_ID_LENGTH);
  const ownerKey = boundedText(value.ownerKey, MAX_ID_LENGTH);
  const turnId = boundedText(value.turnId, MAX_ID_LENGTH);
  const assistantMessageId = boundedText(
    value.assistantMessageId,
    MAX_ID_LENGTH,
  );
  const status = value.status as UserInteractionBatchStatusV1;
  const revision = nonNegativeInteger(value.revision);
  if (
    !batchId ||
    !ownerKey ||
    !turnId ||
    !assistantMessageId ||
    !BATCH_STATUSES.has(status) ||
    revision === null
  ) {
    return null;
  }
  const rawCalls = Array.isArray(value.calls) ? value.calls : [];
  const rawQuestions = Array.isArray(value.questions) ? value.questions : [];
  if (rawCalls.length === 0 || rawQuestions.length === 0) return null;
  if (rawQuestions.length > USER_INTERACTION_MAX_QUESTIONS_PER_BATCH)
    return null;
  const calls = rawCalls.map((entry) => normalizeCall(entry, exact));
  if (calls.some((entry) => !entry)) return null;
  const normalizedCalls = calls as UserInteractionCallV1[];
  const callByToolCallId = new Map(
    normalizedCalls.map((call) => [call.toolCallId, call]),
  );
  if (callByToolCallId.size !== normalizedCalls.length) return null;
  const questions = rawQuestions.map((entry) =>
    normalizeBatchQuestion(entry, exact),
  );
  if (questions.some((entry) => !entry)) return null;
  const normalizedQuestions = questions as UserInteractionQuestionV1[];
  const questionById = new Map(
    normalizedQuestions.map((question) => [question.questionId, question]),
  );
  if (questionById.size !== normalizedQuestions.length) return null;
  for (const question of normalizedQuestions) {
    const call = callByToolCallId.get(question.toolCallId);
    if (!call || call.callIndex !== question.callIndex) return null;
    if (!call.questionIds.includes(question.questionId)) return null;
  }
  for (const call of normalizedCalls) {
    for (const questionId of call.questionIds) {
      if (questionById.get(questionId)?.toolCallId !== call.toolCallId)
        return null;
    }
  }
  const rawAnswers = isObject(value.draftAnswers) ? value.draftAnswers : {};
  const draftAnswers: UserInteractionDraftAnswersV1 = {};
  let totalFiles = 0;
  for (const [questionId, entry] of Object.entries(rawAnswers)) {
    const question = questionById.get(questionId);
    if (!question) return null;
    const answer = normalizeAnswer(entry, exact);
    if (!answer || !answerMatchesQuestion(answer, question)) return null;
    if (answer.kind === "files") {
      totalFiles += answer.slots.reduce(
        (sum, slot) => sum + slot.files.length,
        0,
      );
    }
    draftAnswers[questionId] = answer;
  }
  if (totalFiles > USER_INTERACTION_BATCH_FILE_LIMIT) return null;
  return {
    schema: USER_INTERACTION_BATCH_SCHEMA,
    batchId,
    ownerKey,
    turnId,
    assistantMessageId,
    status,
    revision,
    calls: normalizedCalls,
    questions: normalizedQuestions,
    draftAnswers,
  };
}

/** Strict, closed projection of the composer interaction batch. */
export function parseUserInteractionBatchV1(
  value: unknown,
): UserInteractionBatchV1 | null {
  return normalizeBatch(value, true);
}

/** Lenient projection for an already wire-asserted batch. */
export function projectUserInteractionBatchV1(
  value: unknown,
): UserInteractionBatchV1 | null {
  return normalizeBatch(value, false);
}

/** Validate one typed answer against its host question (draft CAS). */
export function isUserInteractionAnswerV1(
  value: unknown,
): value is UserInteractionAnswerV1 {
  return normalizeAnswer(value, true) !== null;
}

/**
 * Structured boundary check for one typed answer: kind must match the
 * question, selection optionIds must be declared and carry the declared
 * value, file slots must belong to the question, and \`unanswered\` is only
 * valid for an optional question. Hosts and the Reply region use this to drop
 * malformed draft/submit payloads instead of persisting them.
 */
export function userInteractionAnswerFitsQuestionV1(
  question: UserInteractionQuestionV1,
  answer: UserInteractionAnswerV1,
): boolean {
  return answerMatchesQuestion(answer, question);
}

/** True when a question is satisfied for Submit (required answered/declined). */
export function isUserInteractionQuestionSatisfied(
  question: UserInteractionQuestionV1,
  answer: UserInteractionAnswerV1 | undefined,
): boolean {
  if (!question.required) return true;
  if (!answer || answer.kind === "unanswered") return false;
  if (answer.kind === "text") return answer.text.trim().length > 0;
  if (answer.kind === "multi_select") return answer.selections.length > 0;
  if (answer.kind === "files") return true;
  return true;
}

/** All required questions answered (Submit precondition). */
export function isUserInteractionBatchSubmittableV1(
  batch: UserInteractionBatchV1,
): boolean {
  return batch.questions.every((question) =>
    isUserInteractionQuestionSatisfied(
      question,
      batch.draftAnswers[question.questionId],
    ),
  );
}

/** Total opaque file refs across a draft answer map (batch file bound). */
export function countUserInteractionFileRefs(
  answers: UserInteractionDraftAnswersV1,
): number {
  return Object.values(answers).reduce(
    (total, answer) =>
      total +
      (answer.kind === "files"
        ? answer.slots.reduce((sum, slot) => sum + slot.files.length, 0)
        : 0),
    0,
  );
}

/** Extract every opaque file ref staged by a batch's files answers. */
export function collectUserInteractionFileRefs(
  answers: UserInteractionDraftAnswersV1,
): ToolGatewayFileRef[] {
  return Object.values(answers).flatMap((answer) =>
    answer.kind === "files" ? answer.slots.flatMap((slot) => slot.files) : [],
  );
}

// ---------------------------------------------------------------------------
// Model-facing tool result
// ---------------------------------------------------------------------------

const TOOL_RESULT_KEYS = [
  "schema",
  "toolCallId",
  "outcome",
  "answers",
] as const;
const TOOL_RESULT_ANSWER_KEYS = ["questionId", "answer"] as const;

/** Strict projection of one model-facing \`ask_user\` result for one call. */
export function parseAskUserToolResultV1(
  value: unknown,
): AskUserToolResultV1 | null {
  if (!isObject(value) || !hasExactKeys(value, TOOL_RESULT_KEYS)) return null;
  if (value.schema !== ASK_USER_RESULT_SCHEMA) return null;
  const toolCallId = boundedText(value.toolCallId, MAX_ID_LENGTH);
  if (
    !toolCallId ||
    (value.outcome !== "answered" && value.outcome !== "declined")
  ) {
    return null;
  }
  const rawAnswers = Array.isArray(value.answers) ? value.answers : [];
  if (value.outcome === "declined" && rawAnswers.length > 0) return null;
  const answers: AskUserToolResultAnswerV1[] = [];
  const seen = new Set<string>();
  for (const entry of rawAnswers) {
    if (!isObject(entry) || !hasExactKeys(entry, TOOL_RESULT_ANSWER_KEYS)) {
      return null;
    }
    const questionId = boundedText(entry.questionId, MAX_ID_LENGTH);
    if (!questionId || seen.has(questionId)) return null;
    const answer = normalizeAnswer(entry.answer, true);
    if (!answer) return null;
    seen.add(questionId);
    answers.push({ questionId, answer });
  }
  return {
    schema: ASK_USER_RESULT_SCHEMA,
    toolCallId,
    outcome: value.outcome,
    answers,
  };
}
