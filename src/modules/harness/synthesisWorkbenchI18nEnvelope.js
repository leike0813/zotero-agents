import { readFileSync } from "node:fs";
import path from "node:path";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES, SYNTHESIS_WORKBENCH_MESSAGE_KEYS, } from "../../synthesisWorkbenchI18n";
const SUPPORTED_SYNTHESIS_HARNESS_LOCALES = [
    "en-US",
    "zh-CN",
    "zh-TW",
    "ja-JP",
    "fr-FR",
    "de",
    "es-ES",
    "pt-BR",
    "ko-KR",
    "it-IT",
    "ru-RU",
];
const localeAlias = new Map(SUPPORTED_SYNTHESIS_HARNESS_LOCALES.flatMap((locale) => {
    const language = locale.split("-")[0].toLowerCase();
    return [
        [locale.toLowerCase(), locale],
        [language, locale],
    ];
}));
const messageKeySet = new Set(SYNTHESIS_WORKBENCH_MESSAGE_KEYS);
const envelopeCache = new Map();
export function resolveHarnessSynthesisLocale(localeInput) {
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
export function buildHarnessSynthesisI18nEnvelope(localeInput, options = {}) {
    const locale = resolveHarnessSynthesisLocale(localeInput);
    const rootDir = options.rootDir || process.cwd();
    const cacheKey = `${rootDir}\0${locale}`;
    const cached = envelopeCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const messages = {
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
function readSynthesisFtlMessages(rootDir, locale) {
    const filePath = path.join(rootDir, "addon", "locale", locale, "addon.ftl");
    try {
        return parseSynthesisFtlMessages(readFileSync(filePath, "utf8"));
    }
    catch {
        return {};
    }
}
function parseSynthesisFtlMessages(content) {
    const messages = {};
    let currentKey = "";
    let currentValue = [];
    const flush = () => {
        if (!currentKey)
            return;
        const value = currentValue.join("\n").trim();
        if (value) {
            messages[currentKey] = value;
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
        if (!currentKey)
            continue;
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
