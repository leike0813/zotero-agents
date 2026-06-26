import type {
  LoadedWorkflow,
  WorkflowI18nMessages,
  WorkflowParameterSchema,
} from "./types";

const DEFAULT_WORKFLOW_LOCALE = "en-US";

function normalizeLocaleTag(value: unknown) {
  const raw = String(value || "")
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean)[0];
  if (!raw) {
    return "";
  }
  const parts = raw.replace(/_/g, "-").split("-").filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return parts
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : part.toUpperCase(),
    )
    .join("-");
}

export function resolveWorkflowDisplayLocale(localeInput?: string) {
  const explicit = normalizeLocaleTag(localeInput);
  if (explicit) {
    return explicit;
  }
  const runtime = globalThis as {
    Services?: {
      locale?: {
        appLocaleAsBCP47?: unknown;
        getAppLocaleAsBCP47?: () => unknown;
      };
      intl?: {
        appLocaleAsBCP47?: unknown;
        getAppLocaleAsBCP47?: () => unknown;
      };
    };
    Zotero?: { locale?: unknown };
    navigator?: { language?: unknown; languages?: unknown };
  };
  const candidates = [
    runtime.Services?.locale?.appLocaleAsBCP47,
    runtime.Services?.locale?.getAppLocaleAsBCP47?.(),
    runtime.Services?.intl?.appLocaleAsBCP47,
    runtime.Services?.intl?.getAppLocaleAsBCP47?.(),
    runtime.Zotero?.locale,
    Array.isArray(runtime.navigator?.languages)
      ? runtime.navigator.languages[0]
      : "",
    runtime.navigator?.language,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeLocaleTag(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return DEFAULT_WORKFLOW_LOCALE;
}

function localeKeyMatch(
  messages: WorkflowI18nMessages | undefined,
  locale: string,
) {
  if (!messages) {
    return "";
  }
  const normalized = normalizeLocaleTag(locale).toLowerCase();
  if (!normalized) {
    return "";
  }
  const keys = Object.keys(messages);
  return (
    keys.find((key) => normalizeLocaleTag(key).toLowerCase() === normalized) ||
    ""
  );
}

function languageKeyMatch(
  messages: WorkflowI18nMessages | undefined,
  locale: string,
) {
  if (!messages) {
    return "";
  }
  const language = normalizeLocaleTag(locale).split("-")[0]?.toLowerCase();
  if (!language) {
    return "";
  }
  const keys = Object.keys(messages).sort((left, right) =>
    left.localeCompare(right),
  );
  return (
    keys.find((key) => normalizeLocaleTag(key).toLowerCase() === language) ||
    keys.find(
      (key) =>
        normalizeLocaleTag(key).split("-")[0]?.toLowerCase() === language,
    ) ||
    ""
  );
}

function resolveFromMessages(args: {
  messages?: WorkflowI18nMessages;
  locale: string;
  key: string;
  languageOnly?: boolean;
}) {
  const localeKey = args.languageOnly
    ? languageKeyMatch(args.messages, args.locale)
    : localeKeyMatch(args.messages, args.locale);
  if (!localeKey) {
    return "";
  }
  return String(args.messages?.[localeKey]?.[args.key] || "").trim();
}

function resolveLocalizedValue(args: {
  workflow: LoadedWorkflow;
  localKey: string;
  packageKey: string;
  rawFallback?: string;
  keyFallback: string;
  localeInput?: string;
}) {
  const locale = resolveWorkflowDisplayLocale(args.localeInput);
  const defaultLocale =
    normalizeLocaleTag(args.workflow.manifest.i18n?.defaultLocale) ||
    normalizeLocaleTag(args.workflow.localization?.packageDefaultLocale) ||
    DEFAULT_WORKFLOW_LOCALE;
  const inlineMessages = args.workflow.manifest.i18n?.messages;
  const packageMessages = args.workflow.localization?.packageMessages;
  const attempts = [
    { locale, languageOnly: false },
    { locale, languageOnly: true },
    { locale: defaultLocale, languageOnly: false },
    { locale: defaultLocale, languageOnly: true },
  ];
  for (const attempt of attempts) {
    const inline = resolveFromMessages({
      messages: inlineMessages,
      locale: attempt.locale,
      key: args.localKey,
      languageOnly: attempt.languageOnly,
    });
    if (inline) {
      return inline;
    }
    const packaged = resolveFromMessages({
      messages: packageMessages,
      locale: attempt.locale,
      key: args.packageKey,
      languageOnly: attempt.languageOnly,
    });
    if (packaged) {
      return packaged;
    }
  }
  return String(args.rawFallback || "").trim() || args.keyFallback;
}

function packageKey(workflowId: string, localKey: string) {
  return `workflows.${workflowId}.${localKey}`;
}

export function isCoreWorkflow(workflow: LoadedWorkflow) {
  return workflow.manifest.display?.core === true;
}

function workflowEmoji(workflow: LoadedWorkflow) {
  return String(workflow.manifest.display?.emoji || "").trim();
}

function withWorkflowEmoji(label: string, workflow: LoadedWorkflow) {
  const emoji = workflowEmoji(workflow);
  if (!emoji) {
    return label;
  }
  return `${emoji} ${label}`;
}

export function localizeWorkflowDisplayText(args: {
  workflow: LoadedWorkflow;
  key: string;
  rawFallback?: string;
  keyFallback?: string;
  localeInput?: string;
}) {
  return resolveLocalizedValue({
    workflow: args.workflow,
    localKey: args.key,
    packageKey: packageKey(args.workflow.manifest.id, args.key),
    rawFallback: args.rawFallback,
    keyFallback: args.keyFallback || args.key,
    localeInput: args.localeInput,
  });
}

type WorkflowLabelDisplayOptions = {
  localeInput?: string;
  includeEmoji?: boolean;
};

export function localizeWorkflowLabel(
  workflow: LoadedWorkflow,
  localeInputOrOptions?: string | WorkflowLabelDisplayOptions,
  includeEmoji = true,
) {
  const localeInput =
    typeof localeInputOrOptions === "object"
      ? localeInputOrOptions.localeInput
      : localeInputOrOptions;
  const shouldIncludeEmoji =
    typeof localeInputOrOptions === "object"
      ? localeInputOrOptions.includeEmoji !== false
      : includeEmoji !== false;
  const label = localizeWorkflowDisplayText({
    workflow,
    key: "label",
    rawFallback: workflow.manifest.label,
    keyFallback: workflow.manifest.id,
    localeInput,
  });
  return shouldIncludeEmoji ? withWorkflowEmoji(label, workflow) : label;
}

export function compareWorkflowDisplayOrder(
  left: LoadedWorkflow,
  right: LoadedWorkflow,
  localeInput?: string,
) {
  const coreDelta = Number(isCoreWorkflow(right)) - Number(isCoreWorkflow(left));
  if (coreDelta !== 0) {
    return coreDelta;
  }
  const leftLabel = localizeWorkflowLabel(left, {
    localeInput,
    includeEmoji: false,
  });
  const rightLabel = localizeWorkflowLabel(right, {
    localeInput,
    includeEmoji: false,
  });
  return (
    leftLabel.localeCompare(rightLabel) ||
    left.manifest.id.localeCompare(right.manifest.id)
  );
}

export function localizeWorkflowTaskNameTemplate(
  workflow: LoadedWorkflow,
  localeInput?: string,
) {
  return localizeWorkflowDisplayText({
    workflow,
    key: "taskNameTemplate",
    rawFallback: workflow.manifest.taskNameTemplate,
    keyFallback: "",
    localeInput,
  });
}

export function localizeWorkflowSkillName(args: {
  workflow: LoadedWorkflow;
  skillId: string;
  rawFallback?: string;
  localeInput?: string;
}) {
  const skillId = String(args.skillId || "").trim();
  if (!skillId) {
    return String(args.rawFallback || "").trim();
  }
  return localizeWorkflowDisplayText({
    workflow: args.workflow,
    key: `skills.${skillId}.name`,
    rawFallback: args.rawFallback,
    keyFallback: skillId,
    localeInput: args.localeInput,
  });
}

export function localizeWorkflowParameterSchema(args: {
  workflow: LoadedWorkflow;
  parameterKey: string;
  schema: WorkflowParameterSchema;
  localeInput?: string;
}): WorkflowParameterSchema {
  const title = localizeWorkflowDisplayText({
    workflow: args.workflow,
    key: `parameters.${args.parameterKey}.title`,
    rawFallback: args.schema.title,
    keyFallback: args.schema.title || args.parameterKey,
    localeInput: args.localeInput,
  });
  const description = localizeWorkflowDisplayText({
    workflow: args.workflow,
    key: `parameters.${args.parameterKey}.description`,
    rawFallback: args.schema.description,
    keyFallback: args.schema.description || "",
    localeInput: args.localeInput,
  });
  return {
    ...args.schema,
    title,
    description: description || undefined,
  };
}

export function localizeWorkflowParameters(
  workflow: LoadedWorkflow,
  localeInput?: string,
) {
  const parameters = workflow.manifest.parameters || {};
  return Object.fromEntries(
    Object.entries(parameters).map(([key, schema]) => [
      key,
      localizeWorkflowParameterSchema({
        workflow,
        parameterKey: key,
        schema,
        localeInput,
      }),
    ]),
  );
}
