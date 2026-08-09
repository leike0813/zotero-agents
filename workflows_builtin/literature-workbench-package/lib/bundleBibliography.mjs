const BETTER_BIBTEX_TRANSLATOR_ID =
  "ca65189f-8815-4afe-8c8b-8c7c15f0edca";
const NATIVE_BIBTEX_TRANSLATOR_ID =
  "9cb70025-a888-4a29-a210-93ec52da40d4";

function normalizeText(value) {
  return String(value || "").trim();
}

export async function exportBundleBibliography(args) {
  const items = Array.isArray(args.items) ? args.items : [];
  if (items.length === 0) {
    return {
      bibliography: {
        status: "not_generated",
        reason: "no_materialized_items",
        requested_format: "better-bibtex",
        item_count: 0,
      },
      content: "",
    };
  }
  const host = args.host;
  if (typeof host?.items?.exportText !== "function") {
    throw new Error("workflow host does not provide items.exportText");
  }
  const exported = await host.items.exportText({
    items,
    translatorCandidates: [
      {
        translatorID: BETTER_BIBTEX_TRANSLATOR_ID,
        label: "Better BibTeX",
      },
      {
        translatorID: NATIVE_BIBTEX_TRANSLATOR_ID,
        label: "BibTeX",
      },
    ],
    displayOptions: {
      exportNotes: false,
      exportFileData: false,
      keepUpdated: false,
      useJournalAbbreviation: false,
    },
  });
  if (!exported?.ok) {
    const error = new Error("unable to export bundle bibliography");
    error.code = "bibliography_export_failed";
    error.attempts = exported?.attempts || [];
    throw error;
  }
  const actualFormat =
    exported.translator.translatorID === BETTER_BIBTEX_TRANSLATOR_ID
      ? "better-bibtex"
      : "bibtex";
  const bibliography = {
    status: "generated",
    path: "references.bib",
    requested_format: "better-bibtex",
    actual_format: actualFormat,
    translator: {
      translator_id: exported.translator.translatorID,
      label: exported.translator.label,
    },
    fallback_used: Boolean(exported.fallbackUsed),
    item_count: items.length,
  };
  if (exported.fallbackUsed) {
    const primaryAttempt = exported.attempts?.[0] || {};
    const primaryMessage = normalizeText(primaryAttempt.message);
    args.warnings?.push?.({
      code: "bibliography_export_fallback",
      requested_format: "better-bibtex",
      actual_format: actualFormat,
      reason_code:
        primaryAttempt.errorCode || primaryAttempt.status || "unknown",
      ...(primaryMessage ? { message: primaryMessage } : {}),
    });
  }
  return { bibliography, content: String(exported.content || "") };
}
