import type { ProviderRuntimeOptionSchemaEntry } from "../providers/types";
import { getStringOrFallback } from "../utils/locale";
import { AUTO_APPROVE_ZOTERO_WRITES_PARAM } from "../workflows/zoteroHostAccessOptions";

type LocalizableProviderOptionText = Pick<
  ProviderRuntimeOptionSchemaEntry,
  "title" | "description" | "placeholder"
>;

type ProviderOptionTextKeyMap = Partial<
  Record<keyof LocalizableProviderOptionText, string>
>;

const PROVIDER_OPTION_LOCALE_KEYS: Record<
  string,
  Record<string, ProviderOptionTextKeyMap>
> = {
  skillrunner: {
    engine: {
      title: "workflow-settings-provider-option-skillrunner-engine-title",
      description:
        "workflow-settings-provider-option-skillrunner-engine-description",
    },
    provider_id: {
      title: "workflow-settings-provider-option-skillrunner-provider-id-title",
      description:
        "workflow-settings-provider-option-skillrunner-provider-id-description",
    },
    model: {
      title: "workflow-settings-provider-option-skillrunner-model-title",
      description:
        "workflow-settings-provider-option-skillrunner-model-description",
    },
    effort: {
      title: "workflow-settings-provider-option-skillrunner-effort-title",
      description:
        "workflow-settings-provider-option-skillrunner-effort-description",
    },
    no_cache: {
      title: "workflow-settings-provider-option-skillrunner-no-cache-title",
      description:
        "workflow-settings-provider-option-skillrunner-no-cache-description",
    },
    interactive_auto_reply: {
      title:
        "workflow-settings-provider-option-skillrunner-interactive-auto-reply-title",
      description:
        "workflow-settings-provider-option-skillrunner-interactive-auto-reply-description",
    },
    interactive_reply_timeout_sec: {
      title:
        "workflow-settings-provider-option-skillrunner-interactive-reply-timeout-title",
      description:
        "workflow-settings-provider-option-skillrunner-interactive-reply-timeout-description",
    },
    hard_timeout_seconds: {
      title:
        "workflow-settings-provider-option-shared-hard-timeout-seconds-title",
      description:
        "workflow-settings-provider-option-shared-hard-timeout-seconds-description",
      placeholder: "workflow-settings-job-timeout-placeholder",
    },
  },
  acp: {
    acpModeId: {
      title: "workflow-settings-provider-option-acp-mode-id-title",
      description: "workflow-settings-provider-option-acp-mode-id-description",
    },
    acpModelProvider: {
      title: "workflow-settings-provider-option-acp-model-provider-title",
      description:
        "workflow-settings-provider-option-acp-model-provider-description",
    },
    acpModelId: {
      title: "workflow-settings-provider-option-acp-model-id-title",
      description: "workflow-settings-provider-option-acp-model-id-description",
    },
    acpReasoningEffort: {
      title: "workflow-settings-provider-option-acp-reasoning-effort-title",
      description:
        "workflow-settings-provider-option-acp-reasoning-effort-description",
    },
    autoApproveAcpPermissions: {
      title:
        "workflow-settings-provider-option-acp-auto-approve-permissions-title",
      description:
        "workflow-settings-provider-option-acp-auto-approve-permissions-description",
    },
    hard_timeout_seconds: {
      title:
        "workflow-settings-provider-option-shared-hard-timeout-seconds-title",
      description:
        "workflow-settings-provider-option-shared-hard-timeout-seconds-description",
      placeholder: "workflow-settings-job-timeout-placeholder",
    },
  },
};

function localizeField(
  localeKey: string | undefined,
  fallback: string | undefined,
) {
  if (!localeKey) {
    return fallback;
  }
  return getStringOrFallback(localeKey, String(fallback || ""));
}

export function localizeProviderRuntimeOptionText(args: {
  providerId: string;
  optionKey: string;
  entry: LocalizableProviderOptionText;
}): LocalizableProviderOptionText {
  const providerId = String(args.providerId || "").trim();
  const optionKey = String(args.optionKey || "").trim();
  const localeKeys = PROVIDER_OPTION_LOCALE_KEYS[providerId]?.[optionKey];
  if (!localeKeys) {
    return args.entry;
  }
  return {
    title: localizeField(localeKeys.title, args.entry.title),
    description: localizeField(localeKeys.description, args.entry.description),
    placeholder: localizeField(localeKeys.placeholder, args.entry.placeholder),
  };
}

export function localizeWorkflowRunOptionText(args: {
  optionKey: string;
  title?: string;
  description?: string;
}) {
  const optionKey = String(args.optionKey || "").trim();
  if (optionKey !== AUTO_APPROVE_ZOTERO_WRITES_PARAM) {
    return {
      title: args.title,
      description: args.description,
    };
  }
  return {
    title: getStringOrFallback(
      "workflow-settings-run-option-auto-approve-zotero-writes-title",
      String(args.title || ""),
    ),
    description: getStringOrFallback(
      "workflow-settings-run-option-auto-approve-zotero-writes-description",
      String(args.description || ""),
    ),
  };
}
