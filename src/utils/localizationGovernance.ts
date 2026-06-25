import { getString } from "./locale";

export type ManagedLocalRuntimeToastKind =
  | "runtime-up"
  | "runtime-down"
  | "runtime-abnormal-stop";

function normalizeLocale(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function resolveRuntimeLocale() {
  const runtime = globalThis as {
    Zotero?: { locale?: unknown };
    navigator?: { language?: unknown };
  };
  const fromZotero = normalizeLocale(runtime.Zotero?.locale);
  if (fromZotero) {
    return fromZotero;
  }
  const fromNavigator = normalizeLocale(runtime.navigator?.language);
  if (fromNavigator) {
    return fromNavigator;
  }
  return "en-us";
}

export function isZhLocale(locale?: string) {
  const normalized = normalizeLocale(locale || resolveRuntimeLocale());
  return normalized.startsWith("zh");
}

export function fallbackByLocale(args: {
  zhCN: string;
  enUS: string;
  locale?: string;
}) {
  if (isZhLocale(args.locale)) {
    return args.zhCN;
  }
  return args.enUS;
}

function looksLikeUnresolvedLocalizationValue(value: string, key: string) {
  const normalizedValue = String(value || "").trim();
  const normalizedKey = String(key || "").trim();
  if (!normalizedValue) {
    return true;
  }
  if (!normalizedKey) {
    return false;
  }
  if (normalizedValue === normalizedKey) {
    return true;
  }
  // getString unresolved shape: "<addonRef>-<key>"
  if (normalizedValue.endsWith(`-${normalizedKey}`)) {
    return true;
  }
  return false;
}

export function getStringWithLocaleFallback(args: {
  key: string;
  fallback: {
    zhCN: string;
    enUS: string;
  };
  locale?: string;
  values?: Record<string, unknown>;
}) {
  let localized = "";
  try {
    const runtime = globalThis as { addon?: unknown };
    if (runtime.addon) {
      localized = String(
        args.values
          ? getString(args.key as any, { args: args.values })
          : getString(args.key as any),
      ).trim();
    }
  } catch {
    localized = "";
  }
  if (looksLikeUnresolvedLocalizationValue(localized, args.key)) {
    return fallbackByLocale({
      zhCN: args.fallback.zhCN,
      enUS: args.fallback.enUS,
      locale: args.locale,
    });
  }
  return localized;
}

const managedLocalBackendDisplayNameFallback = {
  zhCN: "本地后端",
  enUS: "Local Backend",
};

const managedLocalRuntimeToastFallback: Record<
  ManagedLocalRuntimeToastKind,
  { zhCN: string; enUS: string }
> = {
  "runtime-up": {
    zhCN: "本地后端已启动。",
    enUS: "Local backend started.",
  },
  "runtime-down": {
    zhCN: "本地后端已停止。",
    enUS: "Local backend stopped.",
  },
  "runtime-abnormal-stop": {
    zhCN: "本地后端异常停止。",
    enUS: "Local backend stopped unexpectedly.",
  },
};

export function resolveManagedLocalBackendDisplayNameText() {
  return getStringWithLocaleFallback({
    key: "backend-display-local-skillrunner",
    fallback: managedLocalBackendDisplayNameFallback,
  });
}

export function resolveManagedLocalRuntimeToastText(
  kind: ManagedLocalRuntimeToastKind,
) {
  if (kind === "runtime-up") {
    return getStringWithLocaleFallback({
      key: "skillrunner-local-runtime-toast-up",
      fallback: managedLocalRuntimeToastFallback["runtime-up"],
    });
  }
  if (kind === "runtime-down") {
    return getStringWithLocaleFallback({
      key: "skillrunner-local-runtime-toast-down",
      fallback: managedLocalRuntimeToastFallback["runtime-down"],
    });
  }
  return getStringWithLocaleFallback({
    key: "skillrunner-local-runtime-toast-abnormal-stop",
    fallback: managedLocalRuntimeToastFallback["runtime-abnormal-stop"],
  });
}

export function resolveSkillRunnerBackendCommunicationFailedToastText(
  backendDisplayName: string,
) {
  const normalizedDisplayName =
    String(backendDisplayName || "").trim() || "unknown";
  return getStringWithLocaleFallback({
    key: "skillrunner-backend-communication-failed",
    fallback: {
      zhCN: `与后端${normalizedDisplayName}通信失败`,
      enUS: `Failed to communicate with backend ${normalizedDisplayName}`,
    },
    values: {
      backend: normalizedDisplayName,
    },
  });
}

export function resolveSkillRunnerBackendUnavailableToastText(
  backendDisplayName: string,
) {
  const normalizedDisplayName =
    String(backendDisplayName || "").trim() || "unknown";
  return getStringWithLocaleFallback({
    key: "skillrunner-backend-unavailable-toast",
    fallback: {
      zhCN: `后端${normalizedDisplayName}暂时不可达，请稍后再试。`,
      enUS: `Backend ${normalizedDisplayName} is temporarily unreachable. Please try again later.`,
    },
    values: {
      backend: normalizedDisplayName,
    },
  });
}

export function resolveSkillRunnerBackendAutoDisabledToastText(
  backendDisplayName: string,
) {
  const normalizedDisplayName =
    String(backendDisplayName || "").trim() || "unknown";
  return getStringWithLocaleFallback({
    key: "skillrunner-backend-auto-disabled-toast",
    fallback: {
      zhCN: `后端${normalizedDisplayName}已在 6 小时未成功连接后自动禁用。请在后端管理器中重新启用后再探测。`,
      enUS: `Backend ${normalizedDisplayName} was disabled after 6 hours without a successful connection. Re-enable it in Backend Manager to probe again.`,
    },
    values: {
      backend: normalizedDisplayName,
    },
  });
}
