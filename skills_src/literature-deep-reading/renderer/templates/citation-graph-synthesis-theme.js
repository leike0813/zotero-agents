(function () {
  "use strict";

  const STORAGE_KEY = "zotero-skills.theme";
  const VALID = new Set(["system", "light", "dark"]);

  function normalizeTheme(value) {
    const candidate = String(value || "")
      .trim()
      .toLowerCase();
    return VALID.has(candidate) ? candidate : "system";
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(
        window.localStorage && window.localStorage.getItem(STORAGE_KEY),
      );
    } catch {
      return "system";
    }
  }

  function applyTheme(theme) {
    const normalized = normalizeTheme(theme);
    const root = document.documentElement;
    if (normalized === "system") {
      root.removeAttribute("data-zs-theme");
    } else {
      root.setAttribute("data-zs-theme", normalized);
    }
    root.setAttribute("data-zs-theme-choice", normalized);
    return normalized;
  }

  function setTheme(theme) {
    const normalized = applyTheme(theme);
    try {
      window.localStorage &&
        window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Local storage is best-effort in chrome iframes.
    }
    try {
      window.dispatchEvent(
        new CustomEvent("zotero-skills-theme-change", {
          detail: { theme: normalized },
        }),
      );
    } catch {
      // CustomEvent may be unavailable in some narrow test contexts.
    }
    return normalized;
  }

  applyTheme(readStoredTheme());

  window.ZoteroSkillsTheme = {
    getTheme: () =>
      normalizeTheme(
        document.documentElement.getAttribute("data-zs-theme-choice"),
      ),
    setTheme,
  };

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(event.newValue);
    }
  });
})();
