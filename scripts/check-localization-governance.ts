import { readFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const LOCALES = ["en-US", "zh-CN", "ja-JP", "fr-FR"] as const;
const BASE_LOCALE = "en-US" as const;
const FTL_FILES = ["addon.ftl", "preferences.ftl"] as const;
const REQUIRED_KEYS_BY_FILE: Record<string, string[]> = {
  "addon.ftl": [
    "backend-display-local-skillrunner",
    "skillrunner-local-runtime-toast-up",
    "skillrunner-local-runtime-toast-down",
    "skillrunner-local-runtime-toast-abnormal-stop",
  ],
  "preferences.ftl": [
    "pref-skillrunner-local-status-working-deploy",
    "pref-skillrunner-local-status-working-start",
    "pref-skillrunner-local-status-working-stop",
    "pref-skillrunner-local-status-working-uninstall",
    "pref-skillrunner-local-status-result-unknown",
    "pref-skillrunner-local-status-stage-oneclick-plan-start",
    "pref-skillrunner-local-status-stage-oneclick-plan-deploy",
    "pref-skillrunner-local-status-stage-oneclick-preflight-failed",
    "pref-skillrunner-local-status-stage-oneclick-start-complete",
    "pref-skillrunner-local-status-stage-oneclick-start-missing-runtime",
    "pref-skillrunner-local-status-stage-oneclick-status-failed",
    "pref-skillrunner-local-status-stage-oneclick-configure-profile-failed",
    "pref-skillrunner-local-status-stage-oneclick-lease-failed",
    "pref-skillrunner-local-status-stage-deploy-complete",
    "pref-skillrunner-local-status-stage-deploy-release-assets-probe-failed",
    "pref-skillrunner-local-status-stage-deploy-release-install-failed",
    "pref-skillrunner-local-status-stage-deploy-bootstrap-failed",
    "pref-skillrunner-local-status-stage-deploy-bootstrap-report-failed",
    "pref-skillrunner-local-status-stage-post-deploy-preflight-failed",
    "pref-skillrunner-local-status-stage-start-complete",
    "pref-skillrunner-local-status-stage-start-backend-failed",
    "pref-skillrunner-local-status-stage-start-ensure-failed",
    "pref-skillrunner-local-status-stage-stop-complete",
    "pref-skillrunner-local-status-stage-stop-down-failed",
    "pref-skillrunner-local-status-stage-stop-status-running",
    "pref-skillrunner-local-status-stage-stop-status-failed",
    "pref-skillrunner-local-status-stage-stop-failed",
    "pref-skillrunner-local-status-stage-uninstall-preview",
    "pref-skillrunner-local-status-stage-uninstall-complete",
    "pref-skillrunner-local-status-stage-uninstall-local-root-failed",
    "pref-skillrunner-local-status-stage-uninstall-down-failed",
    "pref-skillrunner-local-status-stage-uninstall-delete-failed",
    "pref-skillrunner-local-status-stage-uninstall-profile-failed",
    "pref-skillrunner-local-status-stage-open-managed-backend-page",
    "pref-skillrunner-local-status-stage-refresh-model-cache",
  ],
};
const ALLOWED_CROSS_FILE_DUPLICATES = new Set([
  "pref-skillrunner-local-status-idle",
  "pref-skillrunner-local-status-working",
  "pref-skillrunner-local-status-ok-prefix",
  "pref-skillrunner-local-status-failed-prefix",
  "pref-skillrunner-local-status-conflict-prefix",
  "pref-skillrunner-local-copy-commands-copied",
]);

function readText(relPath: string) {
  const absPath = path.join(ROOT, relPath);
  return readFileSync(absPath, "utf8");
}

function parseFluentKeys(content: string) {
  return content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => !!line && !line.startsWith("#"))
    .map((line) => {
      const match = line.match(/^([a-zA-Z0-9][a-zA-Z0-9-]*)\s*=/);
      return match ? match[1] : "";
    })
    .filter((key) => !!key);
}

function parseSynthesisWorkbenchMessageKeys(content: string) {
  const keys = new Set<string>();
  for (const match of content.matchAll(
    /"((?:synthesis-)[a-zA-Z0-9-]+)"\s*:/g,
  )) {
    keys.add(match[1]);
  }
  return Array.from(keys).sort();
}

function parseSynthesisWorkbenchDefaultValues(content: string) {
  const values = new Set<string>();
  for (const match of content.matchAll(
    /"synthesis-[a-zA-Z0-9-]+"\s*:\s*"([^"]*)"/g,
  )) {
    values.add(match[1]);
  }
  return values;
}

function reportSynthesisWorkbenchUiHardcodes(
  content: string,
  allowedValues: Set<string>,
) {
  const errors: string[] = [];
  const allowedLiteral = (value: string) => {
    if (!value.trim()) return true;
    if (allowedValues.has(value)) return true;
    if (/^[#A-Z0-9↑↓:|.,/ -]+$/.test(value)) return true;
    if (/^[a-z0-9_.:-]+$/.test(value)) return true;
    if (value.includes("%")) return true;
    return false;
  };
  const patterns: Array<[string, RegExp]> = [
    ["button", /\bmake(?:Local)?Button\("([^"]+)"/g],
    ["placeholder", /\.placeholder\s*=\s*"([^"]+)"/g],
    ["aria-label", /\.setAttribute\("aria-label",\s*"([^"]+)"\)/g],
    ["title", /\.title\s*=\s*"([^"]+)"/g],
    ["text-node", /document\.createTextNode\("([^"]+)"\)/g],
    ["registry-header", /renderRegistryHeader\("([^"]+)"/g],
  ];
  for (const [kind, pattern] of patterns) {
    for (const match of content.matchAll(pattern)) {
      const value = match[1];
      if (!allowedLiteral(value)) {
        errors.push(`[synthesis-hardcoded-ui] ${kind}: "${value}"`);
      }
    }
  }
  return errors;
}

function diffKeys(a: Set<string>, b: Set<string>) {
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];
  for (const key of a) {
    if (!b.has(key)) {
      onlyInA.push(key);
    }
  }
  for (const key of b) {
    if (!a.has(key)) {
      onlyInB.push(key);
    }
  }
  return { onlyInA, onlyInB };
}

function hasAny(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return true;
    }
  }
  return false;
}

function main() {
  const errors: string[] = [];

  const localeFileKeySets = new Map<string, Set<string>>();
  const getLocaleFileKeySet = (locale: string, file: string) => {
    const cacheKey = `${locale}/${file}`;
    const cached = localeFileKeySets.get(cacheKey);
    if (cached) {
      return cached;
    }
    const keys = new Set(
      parseFluentKeys(readText(`addon/locale/${locale}/${file}`)),
    );
    localeFileKeySets.set(cacheKey, keys);
    return keys;
  };

  for (const file of FTL_FILES) {
    const baseKeys = getLocaleFileKeySet(BASE_LOCALE, file);
    for (const locale of LOCALES) {
      if (locale === BASE_LOCALE) {
        continue;
      }
      const localeKeys = getLocaleFileKeySet(locale, file);
      const { onlyInA, onlyInB } = diffKeys(baseKeys, localeKeys);
      if (onlyInA.length > 0 || onlyInB.length > 0) {
        errors.push(
          `[locale-parity] ${file} locale=${locale}: ${BASE_LOCALE}-only=[${onlyInA.join(", ")}], ${locale}-only=[${onlyInB.join(", ")}]`,
        );
      }
    }
  }

  for (const locale of LOCALES) {
    for (const file of FTL_FILES) {
      const requiredKeys = REQUIRED_KEYS_BY_FILE[file] || [];
      if (requiredKeys.length === 0) {
        continue;
      }
      const keys = getLocaleFileKeySet(locale, file);
      for (const key of requiredKeys) {
        if (!keys.has(key)) {
          errors.push(
            `[required-key] locale=${locale} file=${file} missing key: ${key}`,
          );
        }
      }
    }
  }

  const synthesisI18nModule = readText("src/synthesisWorkbenchI18n.ts");
  const synthesisWorkbenchKeys =
    parseSynthesisWorkbenchMessageKeys(synthesisI18nModule);
  const synthesisWorkbenchDefaultValues =
    parseSynthesisWorkbenchDefaultValues(synthesisI18nModule);
  if (synthesisWorkbenchKeys.length === 0) {
    errors.push("[synthesis-i18n] no Synthesis Workbench message keys found");
  }
  for (const locale of LOCALES) {
    const addonKeys = getLocaleFileKeySet(locale, "addon.ftl");
    for (const key of synthesisWorkbenchKeys) {
      if (!addonKeys.has(key)) {
        errors.push(
          `[synthesis-i18n-key] locale=${locale} file=addon.ftl missing key: ${key}`,
        );
      }
    }
  }

  for (const locale of LOCALES) {
    const sources = FTL_FILES.map((file) => {
      const keys = Array.from(getLocaleFileKeySet(locale, file));
      return { file, keys };
    });
    const ownerByKey = new Map<string, string[]>();
    for (const source of sources) {
      for (const key of source.keys) {
        const owners = ownerByKey.get(key) || [];
        owners.push(source.file);
        ownerByKey.set(key, owners);
      }
    }
    for (const [key, owners] of ownerByKey.entries()) {
      if (owners.length <= 1) {
        continue;
      }
      if (!ALLOWED_CROSS_FILE_DUPLICATES.has(key)) {
        errors.push(
          `[duplicate-key] locale=${locale} key=${key} owners=${owners.join(",")}`,
        );
      }
    }
  }

  const displayNameModule = readText("src/backends/displayName.ts");
  const runtimeToastModule = readText(
    "src/modules/skillRunnerLocalRuntimeManager.ts",
  );
  const governanceHelper = readText("src/utils/localizationGovernance.ts");
  const synthesisWorkbenchHost = readText(
    "src/modules/synthesisWorkbenchTab.ts",
  );
  const synthesisWorkbenchApp = readText("src/synthesisWorkbenchApp.ts");
  if (
    !displayNameModule.includes("resolveManagedLocalBackendDisplayNameText")
  ) {
    errors.push(
      "[helper-wiring] displayName path must use resolveManagedLocalBackendDisplayNameText",
    );
  }
  if (!runtimeToastModule.includes("resolveManagedLocalRuntimeToastText")) {
    errors.push(
      "[helper-wiring] runtime toast path must use resolveManagedLocalRuntimeToastText",
    );
  }
  if (
    hasAny(displayNameModule, [/本地后端/, /Local Backend/]) ||
    hasAny(runtimeToastModule, [
      /本地后端已启动。/,
      /本地后端已停止。/,
      /本地后端异常停止。/,
      /Local backend started\.?/,
      /Local backend stopped\.?/,
      /Local backend stopped unexpectedly\.?/,
    ])
  ) {
    errors.push(
      "[fallback-hardcode] managed local backend display/toast fallback text must stay in centralized helper",
    );
  }
  if (
    !governanceHelper.includes("resolveManagedLocalBackendDisplayNameText") ||
    !governanceHelper.includes("resolveManagedLocalRuntimeToastText")
  ) {
    errors.push(
      "[helper-contract] centralized helper must export managed backend display/toast resolvers",
    );
  }
  if (
    !synthesisWorkbenchHost.includes("buildSynthesisWorkbenchI18nEnvelope") ||
    !synthesisWorkbenchHost.includes("withSynthesisWorkbenchI18n(payload)")
  ) {
    errors.push(
      "[synthesis-i18n-wiring] Workbench host must inject locale/messages with every postMessage payload",
    );
  }
  if (
    !synthesisWorkbenchApp.includes("function t(") ||
    !synthesisWorkbenchApp.includes("applyI18nEnvelope") ||
    !synthesisWorkbenchApp.includes("localizeWorkbenchDom")
  ) {
    errors.push(
      "[synthesis-i18n-wiring] Workbench app must apply injected messages and localize rendered DOM",
    );
  }
  errors.push(
    ...reportSynthesisWorkbenchUiHardcodes(
      synthesisWorkbenchApp,
      synthesisWorkbenchDefaultValues,
    ),
  );

  if (errors.length > 0) {
    console.error("[localization-governance] failed");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
    return;
  }
  console.log("[localization-governance] passed");
}

main();
