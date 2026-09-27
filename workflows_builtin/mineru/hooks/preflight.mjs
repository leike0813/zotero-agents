import {
  buildAggregateId,
  buildPageRangePlan,
  readPdfSplitMetadata,
  resolveAttachmentPath,
  resolveSourceAttachment,
} from "../lib/pdfSplitPlan.mjs";

export async function preflight({ selectionContext, runtime }) {
  const source = resolveSourceAttachment(selectionContext);
  if (!source?.ref) {
    return {
      kind: "continue",
      context: {
        mineruSplit: {
          enabled: false,
          reason: "source-pdf-unavailable",
        },
      },
    };
  }

  const filePath = await resolveAttachmentPath(source.ref, runtime);
  const metadata = await readPdfSplitMetadata({
    filePath,
    runtime,
  });
  const baseContext = {
    source_attachment_name: source.fileName,
    source_attachment_ref: source.ref,
    mineruSplit: {
      pageCount: metadata.pageCount || null,
      metadataSource: metadata.source,
      diagnostics: metadata.diagnostics || [],
    },
  };

  if (!metadata.pageCount) {
    return {
      kind: "continue",
      context: {
        ...baseContext,
        mineruSplit: {
          ...baseContext.mineruSplit,
          enabled: false,
          reason: "page-count-unavailable",
        },
      },
    };
  }

  if (metadata.pageCount <= 200) {
    return {
      kind: "continue",
      context: {
        ...baseContext,
        mineruSplit: {
          ...baseContext.mineruSplit,
          enabled: false,
          reason: "within-page-limit",
        },
      },
    };
  }

  const ranges = buildPageRangePlan({
    pageCount: metadata.pageCount,
    outline: metadata.outline,
  });
  return {
    kind: "replace-units",
    context: {
      ...baseContext,
      mineruSplit: {
        ...baseContext.mineruSplit,
        enabled: true,
        partCount: ranges.length,
      },
    },
    aggregate: {
      id: buildAggregateId({
        itemKey: source.ref.key,
        fileName: source.fileName,
      }),
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
    units: ranges.map((range) => ({
      id: `part-${range.partIndex}`,
      order: range.partIndex,
      context: {
        page_ranges: range.page_ranges,
        partIndex: range.partIndex,
        partCount: range.partCount,
        pageStart: range.pageStart,
        pageEnd: range.pageEnd,
        splitStrategy: range.splitStrategy,
      },
    })),
  };
}
