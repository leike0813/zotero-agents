import { config } from "../../package.json";
import { createZToolkit } from "./ztoolkit";
export { initLocale, getString, getLocaleID, getStringOrFallback };
/**
 * Initialize locale data
 */
function initLocale() {
    const toolkit = getToolkit();
    const localizationCtor = typeof Localization === "undefined"
        ? toolkit.getGlobal("Zotero")?.getMainWindow?.()?.Localization ||
            toolkit.getGlobal("Localization")
        : Localization;
    if (!localizationCtor) {
        throw new Error("Localization is not available");
    }
    const l10n = new localizationCtor([`${config.addonRef}-addon.ftl`, `${config.addonRef}-preferences.ftl`], true);
    addon.data.locale = {
        current: l10n,
    };
}
function getString(...inputs) {
    if (inputs.length === 1) {
        return _getString(inputs[0]);
    }
    else if (inputs.length === 2) {
        if (typeof inputs[1] === "string") {
            return _getString(inputs[0], { branch: inputs[1] });
        }
        else {
            return _getString(inputs[0], inputs[1]);
        }
    }
    else {
        throw new Error("Invalid arguments");
    }
}
function getStringOrFallback(localeString, fallback, options = {}) {
    try {
        const resolved = String(_getString(localeString, options)).trim();
        const rawId = String(localeString || "").trim();
        if (!resolved ||
            resolved === rawId ||
            resolved === getLocaleID(localeString) ||
            resolved.endsWith(`-${rawId}`)) {
            return fallback;
        }
        return resolved;
    }
    catch {
        return fallback;
    }
}
function _getString(localeString, options = {}) {
    const localStringWithPrefix = `${config.addonRef}-${localeString}`;
    const { branch, args } = options;
    if (!addon.data.locale?.current) {
        try {
            initLocale();
        }
        catch {
            return localStringWithPrefix;
        }
    }
    const pattern = addon.data.locale?.current.formatMessagesSync([
        { id: localStringWithPrefix, args },
    ])[0];
    if (!pattern) {
        return localStringWithPrefix;
    }
    if (branch && pattern.attributes) {
        return (pattern.attributes.find((attr) => attr.name === branch)?.value ||
            localStringWithPrefix);
    }
    else {
        return pattern.value || localStringWithPrefix;
    }
}
function getLocaleID(id) {
    return `${config.addonRef}-${id}`;
}
function getToolkit() {
    if (addon?.data?.ztoolkit)
        return addon.data.ztoolkit;
    addon.data.ztoolkit = createZToolkit();
    return addon.data.ztoolkit;
}
