function resolveRuntimeGlobal(runtime, name) {
  return runtime?.[name] || globalThis?.[name] || null;
}

export async function copyTextToClipboard(text, runtime) {
  const navigatorClipboard =
    runtime?.navigator?.clipboard || globalThis?.navigator?.clipboard || null;
  if (navigatorClipboard && typeof navigatorClipboard.writeText === "function") {
    try {
      await navigatorClipboard.writeText(text);
      return {
        copied: true,
        method: "navigator.clipboard.writeText",
      };
    } catch {
      // Try host-runtime clipboard fallbacks below.
    }
  }

  const zoteroCopy = resolveRuntimeGlobal(runtime, "Zotero")?.Utilities?.Internal
    ?.copyTextToClipboard;
  if (typeof zoteroCopy === "function") {
    try {
      zoteroCopy(text);
      return {
        copied: true,
        method: "zotero-internal-copyTextToClipboard",
      };
    } catch {
      // Try nsIClipboardHelper below.
    }
  }

  try {
    const components = resolveRuntimeGlobal(runtime, "Components");
    const helper = components?.classes?.[
      "@mozilla.org/widget/clipboardhelper;1"
    ]?.getService?.(components.interfaces?.nsIClipboardHelper);
    if (helper && typeof helper.copyString === "function") {
      helper.copyString(text);
      return {
        copied: true,
        method: "nsIClipboardHelper.copyString",
      };
    }
  } catch {
    // Clipboard output is diagnostic-only.
  }

  return {
    copied: false,
    error: "clipboard unavailable",
  };
}
