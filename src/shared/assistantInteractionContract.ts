export const ASSISTANT_PENDING_INTERACTION_OPTION_LIMIT = 16;
export const ASSISTANT_PENDING_INTERACTION_FILE_LIMIT = 8;
export const ASSISTANT_INTERACTION_FILE_MAX_BYTES = 32 * 1024 * 1024;
export const ASSISTANT_INTERACTION_TOTAL_MAX_BYTES = 64 * 1024 * 1024;

const MAX_PROMPT_LENGTH = 12_000;
const MAX_HINT_LENGTH = 4_000;
const MAX_LABEL_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_FILE_FIELD_LENGTH = 512;
const MAX_OPTION_JSON_BYTES = 16_384;
const MAX_OPTION_JSON_DEPTH = 24;

export type AssistantInteractionInputKind =
  | "open_text"
  | "choose_one"
  | "confirm"
  | "upload_files";

export type AssistantInteractionJson =
  | null
  | boolean
  | number
  | string
  | AssistantInteractionJson[]
  | { [key: string]: AssistantInteractionJson };

export type AssistantInteractionOption = {
  label: string;
  value: AssistantInteractionJson;
  description: string | null;
};

export type AssistantInteractionFileSlot = {
  name: string;
  required: boolean;
  hint: string | null;
  accept: string | null;
};

export type AssistantInteractionFileReply = {
  supported: boolean;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
};

/**
 * Optional auth-challenge suite carried alongside the pending interaction
 * while a run waits on authentication (SkillRunner `waiting_auth`). The
 * field set mirrors the legacy `buildSkillRunnerPendingInteraction`
 * waiting-auth output so the child hint region renders without changes.
 * Absent (`null`) for non-auth interactions, e.g. every ACP projection.
 */
export type AssistantPendingInteractionAuth = {
  phase: string | null;
  challengeKind: string | null;
  prompt: string | null;
  hint: string | null;
  inputKind: string | null;
  acceptsChatInput: boolean;
  authUrl: string | null;
  userCode: string | null;
  lastError: string | null;
  actionPending: boolean;
  actionKind: string | null;
  methods: AssistantInteractionOption[];
  importFiles: AssistantInteractionFileSlot[];
  importRiskNoticeRequired: boolean;
};

export type AssistantPendingInteraction = {
  inputKind: AssistantInteractionInputKind;
  prompt: string | null;
  hint: string | null;
  options: AssistantInteractionOption[];
  files: AssistantInteractionFileSlot[];
  fileReply: AssistantInteractionFileReply;
  auth: AssistantPendingInteractionAuth | null;
};

const INPUT_KINDS = new Set<AssistantInteractionInputKind>([
  "open_text",
  "choose_one",
  "confirm",
  "upload_files",
]);

const ROOT_KEYS = [
  "inputKind",
  "prompt",
  "hint",
  "options",
  "files",
  "fileReply",
] as const;
const ROOT_KEYS_WITH_AUTH = [...ROOT_KEYS, "auth"] as const;
const OPTION_KEYS = ["label", "value", "description"] as const;
const FILE_KEYS = ["name", "required", "hint", "accept"] as const;
const FILE_REPLY_KEYS = [
  "supported",
  "maxFiles",
  "maxFileBytes",
  "maxTotalBytes",
] as const;
const AUTH_KEYS = [
  "phase",
  "challengeKind",
  "prompt",
  "hint",
  "inputKind",
  "acceptsChatInput",
  "authUrl",
  "userCode",
  "lastError",
  "actionPending",
  "actionKind",
  "methods",
  "importFiles",
  "importRiskNoticeRequired",
] as const;

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

function boundedText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= maxLength ? text : null;
}

function boundedNullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  return boundedText(value, maxLength);
}

function positiveInteger(value: unknown, fallback: number, ceiling: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(ceiling, Math.floor(parsed));
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

function normalizeOption(
  value: unknown,
  exact: boolean,
): AssistantInteractionOption | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, OPTION_KEYS)) return null;
  const label = boundedText(value.label, MAX_LABEL_LENGTH);
  const description = boundedNullableText(
    value.description,
    MAX_DESCRIPTION_LENGTH,
  );
  if (!label || (value.description != null && description === null)) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(value, "value")) return null;
  const jsonValue = boundedJsonValue(value.value);
  if (jsonValue === null && value.value !== null) return null;
  return { label, value: jsonValue, description };
}

function normalizeFileSlot(
  value: unknown,
  exact: boolean,
): AssistantInteractionFileSlot | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, FILE_KEYS)) return null;
  const name = boundedText(value.name, MAX_FILE_FIELD_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  const accept = boundedNullableText(value.accept, MAX_FILE_FIELD_LENGTH);
  if (
    !name ||
    typeof value.required !== "boolean" ||
    (value.hint != null && hint === null) ||
    (value.accept != null && accept === null)
  ) {
    return null;
  }
  return { name, required: value.required, hint, accept };
}

function normalizeFileReply(
  value: unknown,
  exact: boolean,
): AssistantInteractionFileReply | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, FILE_REPLY_KEYS)) return null;
  if (typeof value.supported !== "boolean") return null;
  const maxFiles = positiveInteger(
    value.maxFiles,
    ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
    ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  );
  const maxFileBytes = positiveInteger(
    value.maxFileBytes,
    ASSISTANT_INTERACTION_FILE_MAX_BYTES,
    ASSISTANT_INTERACTION_FILE_MAX_BYTES,
  );
  const maxTotalBytes = positiveInteger(
    value.maxTotalBytes,
    ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
    ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
  );
  if (maxTotalBytes < maxFileBytes) return null;
  return { supported: value.supported, maxFiles, maxFileBytes, maxTotalBytes };
}

function normalizeInteractionAuth(
  value: unknown,
  exact: boolean,
): AssistantPendingInteractionAuth | null {
  if (!isObject(value)) return null;
  if (exact && !hasExactKeys(value, AUTH_KEYS)) return null;
  const phase = boundedNullableText(value.phase, MAX_LABEL_LENGTH);
  const challengeKind = boundedNullableText(
    value.challengeKind,
    MAX_LABEL_LENGTH,
  );
  const prompt = boundedNullableText(value.prompt, MAX_PROMPT_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  const inputKind = boundedNullableText(value.inputKind, MAX_LABEL_LENGTH);
  const authUrl = boundedNullableText(value.authUrl, MAX_DESCRIPTION_LENGTH);
  const userCode = boundedNullableText(value.userCode, MAX_LABEL_LENGTH);
  const lastError = boundedNullableText(
    value.lastError,
    MAX_DESCRIPTION_LENGTH,
  );
  const actionKind = boundedNullableText(value.actionKind, MAX_LABEL_LENGTH);
  if (
    (value.phase != null && phase === null) ||
    (value.challengeKind != null && challengeKind === null) ||
    (value.prompt != null && prompt === null) ||
    (value.hint != null && hint === null) ||
    (value.inputKind != null && inputKind === null) ||
    (value.authUrl != null && authUrl === null) ||
    (value.userCode != null && userCode === null) ||
    (value.lastError != null && lastError === null) ||
    (value.actionKind != null && actionKind === null) ||
    typeof value.acceptsChatInput !== "boolean" ||
    typeof value.actionPending !== "boolean" ||
    typeof value.importRiskNoticeRequired !== "boolean"
  ) {
    return null;
  }
  const rawMethods = Array.isArray(value.methods) ? value.methods : [];
  const rawImportFiles = Array.isArray(value.importFiles)
    ? value.importFiles
    : [];
  if (
    rawMethods.length > ASSISTANT_PENDING_INTERACTION_OPTION_LIMIT ||
    rawImportFiles.length > ASSISTANT_PENDING_INTERACTION_FILE_LIMIT
  ) {
    return null;
  }
  const methods = rawMethods.map((entry) => normalizeOption(entry, exact));
  const importFiles = rawImportFiles.map((entry) =>
    normalizeFileSlot(entry, exact),
  );
  if (methods.some((entry) => !entry) || importFiles.some((entry) => !entry)) {
    return null;
  }
  return {
    phase,
    challengeKind,
    prompt,
    hint,
    inputKind,
    acceptsChatInput: value.acceptsChatInput,
    authUrl,
    userCode,
    lastError,
    actionPending: value.actionPending,
    actionKind,
    methods: methods as AssistantInteractionOption[],
    importFiles: importFiles as AssistantInteractionFileSlot[],
    importRiskNoticeRequired: value.importRiskNoticeRequired,
  };
}

export function projectAssistantPendingInteractionAuth(
  value: unknown,
): AssistantPendingInteractionAuth | null {
  return normalizeInteractionAuth(value, false);
}

function normalizeInteraction(
  value: unknown,
  exact: boolean,
): AssistantPendingInteraction | null {
  if (!isObject(value)) return null;
  if (
    exact &&
    !hasExactKeys(value, ROOT_KEYS) &&
    !hasExactKeys(value, ROOT_KEYS_WITH_AUTH)
  ) {
    return null;
  }
  const inputKind = String(
    value.inputKind || "",
  ).trim() as AssistantInteractionInputKind;
  const prompt = boundedNullableText(value.prompt, MAX_PROMPT_LENGTH);
  const hint = boundedNullableText(value.hint, MAX_HINT_LENGTH);
  if (
    !INPUT_KINDS.has(inputKind) ||
    (value.prompt != null && prompt === null) ||
    (value.hint != null && hint === null)
  ) {
    return null;
  }
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const rawFiles = Array.isArray(value.files) ? value.files : [];
  if (
    rawOptions.length > ASSISTANT_PENDING_INTERACTION_OPTION_LIMIT ||
    rawFiles.length > ASSISTANT_PENDING_INTERACTION_FILE_LIMIT
  ) {
    return null;
  }
  const options = rawOptions.map((entry) => normalizeOption(entry, exact));
  const files = rawFiles.map((entry) => normalizeFileSlot(entry, exact));
  if (options.some((entry) => !entry) || files.some((entry) => !entry)) {
    return null;
  }
  const fileReply = normalizeFileReply(
    value.fileReply || {
      supported: false,
      maxFiles: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
      maxFileBytes: ASSISTANT_INTERACTION_FILE_MAX_BYTES,
      maxTotalBytes: ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
    },
    exact,
  );
  if (!fileReply) return null;
  const auth =
    value.auth == null ? null : normalizeInteractionAuth(value.auth, exact);
  if (value.auth != null && !auth) return null;
  return {
    inputKind,
    prompt,
    hint,
    options: options as AssistantInteractionOption[],
    files: files as AssistantInteractionFileSlot[],
    fileReply,
    auth,
  };
}

export function projectAssistantPendingInteraction(
  value: unknown,
): AssistantPendingInteraction | null {
  return normalizeInteraction(value, false);
}

export function projectAssistantPendingInteractionFromHints(args: {
  pendingKind?: unknown;
  uiHints?: unknown;
  options?: unknown;
  files?: unknown;
  fileReply?: unknown;
}) {
  const hints = isObject(args.uiHints) ? args.uiHints : {};
  const hintedKind = String(hints.kind || "").trim();
  const pendingKind = String(args.pendingKind || "").trim();
  const inputKind = INPUT_KINDS.has(hintedKind as AssistantInteractionInputKind)
    ? hintedKind
    : INPUT_KINDS.has(pendingKind as AssistantInteractionInputKind)
      ? pendingKind
      : "open_text";
  const optionSource = Array.isArray(hints.options)
    ? hints.options
    : Array.isArray(args.options)
      ? args.options
      : [];
  const options = optionSource
    .map((entry) => {
      if (
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean"
      ) {
        const label = String(entry).trim();
        return label ? { label, value: entry, description: null } : null;
      }
      if (!isObject(entry)) return null;
      const label = String(
        entry.label || entry.name || entry.title || entry.value || "",
      ).trim();
      if (!label) return null;
      const value = Object.prototype.hasOwnProperty.call(entry, "value")
        ? entry.value
        : Object.prototype.hasOwnProperty.call(entry, "reply")
          ? entry.reply
          : Object.prototype.hasOwnProperty.call(entry, "message")
            ? entry.message
            : label;
      return {
        label,
        value,
        description: String(entry.description || "").trim() || null,
      };
    })
    .filter(Boolean);
  const fileSource = Array.isArray(hints.files)
    ? hints.files
    : Array.isArray(args.files)
      ? args.files
      : [];
  const files = fileSource
    .map((entry, index) => {
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name, required: true, hint: null, accept: null } : null;
      }
      if (!isObject(entry)) return null;
      return {
        name:
          String(entry.name || entry.field || entry.slot || "").trim() ||
          `file-${index + 1}`,
        required: entry.required !== false,
        hint: String(entry.hint || "").trim() || null,
        accept: String(entry.accept || "").trim() || null,
      };
    })
    .filter(Boolean);
  return projectAssistantPendingInteraction({
    inputKind,
    prompt: String(hints.prompt || "").trim() || null,
    hint: String(hints.hint || "").trim() || null,
    options,
    files,
    fileReply:
      args.fileReply ||
      ({
        supported: false,
        maxFiles: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
        maxFileBytes: ASSISTANT_INTERACTION_FILE_MAX_BYTES,
        maxTotalBytes: ASSISTANT_INTERACTION_TOTAL_MAX_BYTES,
      } satisfies AssistantInteractionFileReply),
  });
}

export function parseAssistantPendingInteraction(
  value: unknown,
): AssistantPendingInteraction | null {
  return normalizeInteraction(value, true);
}

export function deterministicInteractionResponseText(value: unknown) {
  if (typeof value === "string") return value.trim();
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
  return JSON.stringify(canonicalize(value)) || "";
}
