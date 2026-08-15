export const ACP_TOOL_CALL_DISPLAY_KINDS = [
  "read",
  "edit",
  "delete",
  "move",
  "search",
  "execute",
  "think",
  "fetch",
  "other",
] as const;

export type AcpToolCallDisplayKind =
  (typeof ACP_TOOL_CALL_DISPLAY_KINDS)[number];

export type AcpToolCallDisplayState = {
  toolName?: string;
  title?: string;
  kind?: AcpToolCallDisplayKind;
  inputSummary?: string;
  resultSummary?: string;
  summary?: string;
};

export type AcpToolCallDisplayUpdate = {
  toolCallId?: unknown;
  name?: unknown;
  tool?: unknown;
  functionName?: unknown;
  function_name?: unknown;
  title?: unknown;
  metadata?: unknown;
  kind?: unknown;
  toolKind?: unknown;
  rawInput?: unknown;
  input?: unknown;
  arguments?: unknown;
  args?: unknown;
  parameters?: unknown;
  params?: unknown;
  content?: unknown;
  rawOutput?: unknown;
  output?: unknown;
  result?: unknown;
  message?: unknown;
  detail?: unknown;
  summary?: unknown;
};

export type AcpToolCallDisplaySelection = {
  primary?: string;
  secondary?: string;
};

const TOOL_NAME_LIMIT = 256;
const TITLE_LIMIT = 512;
const SUMMARY_LIMIT = 1024;
const KINDS = new Set<string>(ACP_TOOL_CALL_DISPLAY_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncateCodePoints(value: string, limit: number) {
  const points = Array.from(value);
  if (points.length <= limit) {
    return value;
  }
  return `${points.slice(0, Math.max(0, limit - 1)).join("")}…`;
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function opaqueName(value: unknown) {
  return typeof value === "string"
    ? truncateCodePoints(value.trim(), TOOL_NAME_LIMIT)
    : "";
}

function normalizedText(value: unknown, limit: number) {
  return typeof value === "string"
    ? truncateCodePoints(singleLine(value), limit)
    : "";
}

function normalizedToken(value: unknown) {
  return typeof value === "string" ? singleLine(value).toLowerCase() : "";
}

function firstValue<T>(
  values: unknown[],
  normalize: (value: unknown) => T | "",
) {
  for (const value of values) {
    const normalized = normalize(value);
    if (normalized !== "") {
      return normalized;
    }
  }
  return undefined;
}

function compatibilityIdentity(value: unknown, toolCallId: string) {
  const text = opaqueName(value);
  if (!text) {
    return "";
  }
  const token = normalizedToken(text);
  if (
    token === "tool" ||
    token === "tool call" ||
    token === "other" ||
    (toolCallId && text === toolCallId)
  ) {
    return "";
  }
  return text;
}

function displayTitle(value: unknown, toolCallId: string) {
  const text = normalizedText(value, TITLE_LIMIT);
  if (!text) {
    return "";
  }
  const token = normalizedToken(text);
  const normalizedId = singleLine(toolCallId);
  if (
    token === "tool" ||
    token === "tool call" ||
    token === "other" ||
    (normalizedId &&
      (text === normalizedId ||
        token === `call ${normalizedId.toLowerCase()}` ||
        token === `tool ${normalizedId.toLowerCase()}`))
  ) {
    return "";
  }
  return text;
}

function displayKind(value: unknown): AcpToolCallDisplayKind | "" {
  const token = normalizedToken(value);
  if (!token) {
    return "";
  }
  return KINDS.has(token) ? (token as AcpToolCallDisplayKind) : "other";
}

function isEmptyStructuredValue(value: unknown) {
  return (
    (Array.isArray(value) && value.length === 0) ||
    (isRecord(value) && Object.keys(value).length === 0)
  );
}

function payloadText(value: unknown) {
  if (value === undefined || value === null || isEmptyStructuredValue(value)) {
    return "";
  }
  if (typeof value === "string") {
    return truncateCodePoints(singleLine(value), SUMMARY_LIMIT);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return truncateCodePoints(String(value), SUMMARY_LIMIT);
  }
  if (typeof value !== "object") {
    return "";
  }
  try {
    return truncateCodePoints(singleLine(JSON.stringify(value)), SUMMARY_LIMIT);
  } catch {
    return "";
  }
}

function textContent(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }
  const parts: string[] = [];
  for (const block of value) {
    if (!isRecord(block)) {
      continue;
    }
    if (block.type === "text") {
      const text = normalizedText(block.text, SUMMARY_LIMIT);
      if (text) {
        parts.push(text);
      }
      continue;
    }
    if (block.type !== "content" || !isRecord(block.content)) {
      continue;
    }
    if (block.content.type === "text") {
      const text = normalizedText(block.content.text, SUMMARY_LIMIT);
      if (text) {
        parts.push(text);
      }
    }
  }
  return truncateCodePoints(singleLine(parts.join(" ")), SUMMARY_LIMIT);
}

function compatibilitySummary(value: unknown) {
  const text = normalizedText(value, SUMMARY_LIMIT);
  const token = normalizedToken(text);
  return !text ||
    token === "tool" ||
    token === "tool call" ||
    text === "[]" ||
    text === "{}"
    ? ""
    : text;
}

export function applyAcpToolCallDisplayUpdate(
  current: Readonly<AcpToolCallDisplayState> | undefined,
  update: AcpToolCallDisplayUpdate,
): AcpToolCallDisplayState {
  const next: AcpToolCallDisplayState = { ...(current || {}) };
  const toolCallId = opaqueName(update.toolCallId);

  const canonicalName = opaqueName(update.name);
  if (canonicalName) {
    next.toolName = canonicalName;
  } else if (!next.toolName) {
    const compatibilityName = firstValue(
      [update.tool, update.functionName, update.function_name],
      (value) => compatibilityIdentity(value, toolCallId),
    );
    if (compatibilityName) {
      next.toolName = compatibilityName;
    }
  }

  const canonicalTitle = displayTitle(update.title, toolCallId);
  if (canonicalTitle) {
    next.title = canonicalTitle;
  } else if (!next.title && isRecord(update.metadata)) {
    const compatibilityTitle = displayTitle(update.metadata.title, toolCallId);
    if (compatibilityTitle) {
      next.title = compatibilityTitle;
    }
  }

  const canonicalKind = displayKind(update.kind);
  if (canonicalKind) {
    next.kind = canonicalKind;
  } else if (!next.kind) {
    const compatibilityKind = displayKind(update.toolKind);
    if (compatibilityKind) {
      next.kind = compatibilityKind;
    }
  }

  if (!next.inputSummary) {
    const inputSummary = firstValue(
      [
        update.rawInput,
        update.input,
        update.arguments,
        update.args,
        update.parameters,
        update.params,
      ],
      payloadText,
    );
    if (inputSummary) {
      next.inputSummary = inputSummary;
    }
  }

  const resultSummary =
    textContent(update.content) ||
    firstValue(
      [
        update.rawOutput,
        update.output,
        update.result,
        update.message,
        update.detail,
      ],
      payloadText,
    );
  if (resultSummary) {
    next.resultSummary = resultSummary;
  }

  const summary = compatibilitySummary(update.summary);
  if (summary) {
    next.summary = summary;
  }

  return next;
}

function selectedText(value: unknown) {
  return normalizedText(value, SUMMARY_LIMIT);
}

function selectionKey(value: string) {
  return singleLine(value);
}

export function selectAcpToolCallDisplay(
  state: Readonly<AcpToolCallDisplayState>,
): AcpToolCallDisplaySelection {
  const toolName = opaqueName(state.toolName);
  const title = displayTitle(state.title, "");
  const normalizedKind = displayKind(state.kind);
  const kind =
    normalizedKind && normalizedKind !== "other" ? normalizedKind : "";
  const primary = toolName || title || kind || undefined;
  const used = new Set(primary ? [selectionKey(primary)] : []);
  const secondaryCandidates = [
    selectedText(state.inputSummary),
    primary === title ? "" : title,
    compatibilitySummary(state.summary),
    selectedText(state.resultSummary),
  ];
  let secondary: string | undefined;
  for (const candidate of secondaryCandidates) {
    if (!candidate) {
      continue;
    }
    const key = selectionKey(candidate);
    if (!used.has(key)) {
      secondary = candidate;
      break;
    }
  }
  return { primary, secondary };
}
