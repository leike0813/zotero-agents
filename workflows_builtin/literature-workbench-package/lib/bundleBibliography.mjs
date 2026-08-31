function normalizeText(value) {
  return String(value || "").trim();
}

export async function exportBundleBibliography(args) {
  const itemRefs = Array.isArray(args.itemRefs) ? args.itemRefs : [];
  if (itemRefs.length === 0) {
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
  let exported;
  try {
    exported = await args.host.bibliography.render({
      itemRefs,
      formatPreference: [{ id: "better-bibtex" }, { id: "bibtex" }],
      formatOptions: {
        exportNotes: false,
        exportFileData: false,
        keepUpdated: false,
        useJournalAbbreviation: false,
      },
    });
  } catch {
    const error = new Error("unable to export bundle bibliography");
    error.code = "bibliography_export_failed";
    throw error;
  }
  const actualFormat = exported.usedFormat.ref.id;
  const bibliography = {
    status: "generated",
    path: "references.bib",
    requested_format: "better-bibtex",
    actual_format: actualFormat,
    translator: {
      translator_id: actualFormat,
      label: exported.usedFormat.label,
    },
    fallback_used: Boolean(exported.fallbackUsed),
    item_count: itemRefs.length,
  };
  if (exported.fallbackUsed) {
    args.warnings?.push?.({
      code: "bibliography_export_fallback",
      requested_format: "better-bibtex",
      actual_format: actualFormat,
      reason_code: normalizeText(exported.issues?.[0]?.code) || "unavailable",
    });
  }
  return { bibliography, content: String(exported.content || "") };
}
