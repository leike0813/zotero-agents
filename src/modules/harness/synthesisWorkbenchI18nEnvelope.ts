import { readFileSync } from "node:fs";
import path from "node:path";

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  SYNTHESIS_WORKBENCH_MESSAGE_KEYS,
  type SynthesisWorkbenchI18nEnvelope,
  type SynthesisWorkbenchMessageKey,
} from "../../synthesisWorkbenchI18n";

const SUPPORTED_SYNTHESIS_HARNESS_LOCALES = [
  "en-US",
  "zh-CN",
  "ja-JP",
  "fr-FR",
] as const;

type SupportedSynthesisHarnessLocale =
  (typeof SUPPORTED_SYNTHESIS_HARNESS_LOCALES)[number];

const localeAlias = new Map<string, SupportedSynthesisHarnessLocale>(
  SUPPORTED_SYNTHESIS_HARNESS_LOCALES.flatMap((locale) => {
    const language = locale.split("-")[0].toLowerCase();
    return [
      [locale.toLowerCase(), locale],
      [language, locale],
    ];
  }),
);

const messageKeySet = new Set<string>(SYNTHESIS_WORKBENCH_MESSAGE_KEYS);
const envelopeCache = new Map<string, SynthesisWorkbenchI18nEnvelope>();

export function resolveHarnessSynthesisLocale(
  localeInput?: string,
): SupportedSynthesisHarnessLocale {
  const requested = String(localeInput || "")
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);
  for (const entry of requested) {
    const normalized = entry.replace("_", "-").toLowerCase();
    const exact = localeAlias.get(normalized);
    if (exact) {
      return exact;
    }
    const language = normalized.split("-")[0];
    const languageMatch = localeAlias.get(language);
    if (languageMatch) {
      return languageMatch;
    }
  }
  return "en-US";
}

export function buildHarnessSynthesisI18nEnvelope(
  localeInput?: string,
  options: { rootDir?: string } = {},
): SynthesisWorkbenchI18nEnvelope {
  const locale = resolveHarnessSynthesisLocale(localeInput);
  const rootDir = options.rootDir || process.cwd();
  const cacheKey = `${rootDir}\0${locale}`;
  const cached = envelopeCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const messages: Record<SynthesisWorkbenchMessageKey, string> = {
    ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  };
  const localeMessages = readSynthesisFtlMessages(rootDir, locale);
  for (const key of SYNTHESIS_WORKBENCH_MESSAGE_KEYS) {
    const value = localeMessages[key];
    if (value) {
      messages[key] = value;
    }
  }
  const envelope = { locale, messages };
  envelopeCache.set(cacheKey, envelope);
  return envelope;
}

function readSynthesisFtlMessages(
  rootDir: string,
  locale: SupportedSynthesisHarnessLocale,
) {
  const filePath = path.join(rootDir, "addon", "locale", locale, "addon.ftl");
  try {
    return parseSynthesisFtlMessages(readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function parseSynthesisFtlMessages(content: string) {
  const messages: Partial<Record<SynthesisWorkbenchMessageKey, string>> = {};
  let currentKey = "";
  let currentValue: string[] = [];

  const flush = () => {
    if (!currentKey) return;
    const value = currentValue.join("\n").trim();
    if (value) {
      messages[currentKey as SynthesisWorkbenchMessageKey] = value;
    }
    currentKey = "";
    currentValue = [];
  };

  for (const line of content.split(/\r?\n/g)) {
    const message = line.match(/^([a-zA-Z0-9][a-zA-Z0-9-]*)\s*=\s*(.*)$/);
    if (message) {
      flush();
      const key = message[1] || "";
      if (messageKeySet.has(key)) {
        currentKey = key;
        currentValue = [message[2]?.trim() || ""];
      }
      continue;
    }
    if (!currentKey) continue;
    const continuation = line.match(/^\s+(.+)$/);
    if (!continuation) {
      flush();
      continue;
    }
    const value = continuation[1]?.trim() || "";
    if (!value || value.startsWith("#") || value.startsWith(".")) {
      continue;
    }
    currentValue.push(value);
  }
  flush();
  return messages;
}
