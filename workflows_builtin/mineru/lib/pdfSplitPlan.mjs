const MAX_PAGES_PER_PART = 200;

function normalizeString(value) {
  return String(value || "").trim();
}

export function portableItemRef(value) {
  const source = value?.ref || value || {};
  const libraryId = source.libraryId;
  const key = String(source.key || "").trim();
  if (
    !Number.isSafeInteger(libraryId) ||
    libraryId <= 0 ||
    !key ||
    Object.keys(source).some(
      (entry) => entry !== "libraryId" && entry !== "key",
    )
  ) {
    throw new Error("portable Zotero item ref is required");
  }
  return { libraryId, key };
}

export async function resolveAttachmentPath(attachmentRef, runtime) {
  const ref = portableItemRef(attachmentRef);
  const detail = await runtime?.hostApi?.library?.getItemDetail(ref);
  if (detail?.kind !== "attachment" || !detail.item) {
    throw new Error("workflow source attachment is unavailable");
  }
  if (detail.item.file?.state !== "available" || !detail.item.file.path) {
    throw new Error("workflow source attachment file is unavailable");
  }
  return detail.item.file.path;
}

export async function readHostPages({
  readPage,
  getItems,
  limit = 100,
  operation = "host read",
}) {
  if (typeof readPage !== "function" || typeof getItems !== "function") {
    throw new TypeError(`${operation} page reader is required`);
  }
  const items = [];
  let cursor;
  while (true) {
    const page = await readPage({ limit, ...(cursor ? { cursor } : {}) });
    items.push(...getItems(page));
    if (page.hasMore !== true) return items;
    const nextCursor = String(page.nextCursor || "").trim();
    if (!nextCursor || nextCursor === cursor) {
      throw new Error(`${operation} received hasMore without a new cursor`);
    }
    cursor = nextCursor;
  }
}

function normalizePath(value) {
  return normalizeString(value).replace(/[\\/]+/g, "/");
}

export function resolveSourceAttachment(selectionContext) {
  const attachments = Array.isArray(selectionContext?.items)
    ? selectionContext.items.filter((item) => item?.kind === "attachment")
    : [];
  const attachment = attachments[0];
  if (!attachment?.ref) return null;
  return {
    ref: attachment.ref,
    parentRef: attachment.parentRef || null,
    fileName: normalizeString(attachment.filename || attachment.title),
  };
}

async function readPdfBytes(args) {
  const reader = args.runtime?.hostApi?.file?.readBytes;
  if (typeof reader !== "function") {
    throw new Error("Workflow Host file.readBytes is unavailable");
  }
  const bytes = await reader(args.filePath);
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function decodePdfBytes(bytes) {
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("latin1").decode(bytes);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  }
  let text = "";
  for (let index = 0; index < bytes.length; index++) {
    text += String.fromCharCode(bytes[index]);
  }
  return text;
}

function normalizePageCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.floor(count);
}

function normalizeOutlineEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => ({
      title: normalizeString(entry?.title),
      page: normalizePageCount(entry?.page),
      level: Math.max(1, Number(entry?.level || 1) || 1),
    }))
    .filter((entry) => entry.page > 0);
}

async function readMetadataFromRuntimeHelper(args) {
  void args;
  return null;
}

function getPdfJsFromModule(moduleValue) {
  if (!moduleValue || typeof moduleValue !== "object") {
    return null;
  }
  if (typeof moduleValue.getDocument === "function") {
    return moduleValue;
  }
  if (typeof moduleValue.pdfjsLib?.getDocument === "function") {
    return moduleValue.pdfjsLib;
  }
  if (typeof moduleValue.default?.getDocument === "function") {
    return moduleValue.default;
  }
  return null;
}

async function loadPdfJs() {
  const chromeUtils = globalThis.ChromeUtils;
  if (!chromeUtils || typeof chromeUtils.importESModule !== "function") {
    return null;
  }
  const specifiers = [
    "resource://pdf.js/build/pdf.mjs",
    "resource://pdf.js/build/pdf.js",
    "resource://zotero/pdfjs/build/pdf.mjs",
  ];
  for (const specifier of specifiers) {
    try {
      const moduleValue = chromeUtils.importESModule(specifier);
      const pdfjs = getPdfJsFromModule(moduleValue);
      if (pdfjs) {
        return pdfjs;
      }
    } catch {
      // Try the next known runtime location.
    }
  }
  return null;
}

async function resolveOutlinePage(doc, item) {
  let dest = item?.dest;
  if (!dest) {
    return 0;
  }
  try {
    if (typeof dest === "string" && typeof doc.getDestination === "function") {
      dest = await doc.getDestination(dest);
    }
    const ref = Array.isArray(dest) ? dest[0] : null;
    if (ref && typeof doc.getPageIndex === "function") {
      return (await doc.getPageIndex(ref)) + 1;
    }
  } catch {
    return 0;
  }
  return 0;
}

async function flattenPdfJsOutline(doc, entries, level = 1, output = []) {
  if (!Array.isArray(entries)) {
    return output;
  }
  for (const entry of entries) {
    const page = await resolveOutlinePage(doc, entry);
    if (page > 0) {
      output.push({
        title: normalizeString(entry?.title),
        page,
        level,
      });
    }
    await flattenPdfJsOutline(doc, entry?.items, level + 1, output);
  }
  return output;
}

async function readMetadataFromPdfJs(args) {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    return null;
  }
  const bytes = await readPdfBytes(args);
  let loadingTask = null;
  let doc = null;
  try {
    loadingTask = pdfjs.getDocument({
      data: bytes,
      disableWorker: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    doc = await loadingTask.promise;
    const outline =
      typeof doc.getOutline === "function" ? await doc.getOutline() : [];
    return {
      pageCount: normalizePageCount(doc.numPages),
      outline: normalizeOutlineEntries(
        await flattenPdfJsOutline(doc, outline || []),
      ),
      source: "pdfjs",
    };
  } finally {
    try {
      await doc?.destroy?.();
    } catch {
      // ignore cleanup errors
    }
    try {
      await loadingTask?.destroy?.();
    } catch {
      // ignore cleanup errors
    }
  }
}

function estimatePageCountFromPdfText(text) {
  const source = String(text || "");
  const pageObjectCount = (source.match(/\/Type\s*\/Page\b/g) || []).length;
  if (pageObjectCount > 0) {
    return pageObjectCount;
  }
  let maxCount = 0;
  const countPattern = /\/Count\s+(\d+)/g;
  let match = countPattern.exec(source);
  while (match) {
    maxCount = Math.max(maxCount, normalizePageCount(match[1]));
    match = countPattern.exec(source);
  }
  return maxCount;
}

async function readMetadataFromFallback(args) {
  const bytes = await readPdfBytes(args);
  const text = decodePdfBytes(bytes);
  const pageCount = estimatePageCountFromPdfText(text);
  if (pageCount <= 0) {
    return null;
  }
  return {
    pageCount,
    outline: [],
    source: "pdf-object-count",
  };
}

export async function readPdfSplitMetadata(args) {
  const diagnostics = [];
  const readers = [
    readMetadataFromRuntimeHelper,
    readMetadataFromPdfJs,
    readMetadataFromFallback,
  ];
  for (const reader of readers) {
    try {
      const metadata = await reader(args);
      if (metadata?.pageCount > 0) {
        return {
          ...metadata,
          outline: normalizeOutlineEntries(metadata.outline),
          diagnostics,
        };
      }
    } catch (error) {
      diagnostics.push({
        code: "pdf_metadata_reader_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    pageCount: 0,
    outline: [],
    source: "unavailable",
    diagnostics,
  };
}

function isLikelySectionBoundary(entry) {
  if (!entry) {
    return false;
  }
  if (entry.level <= 2) {
    return true;
  }
  return /(^|\b)(chapter|section|part|book|appendix)\b|第.+[章节篇部卷]/i.test(
    normalizeString(entry.title),
  );
}

function chooseOutlineBoundary(args) {
  const lowerBound = args.start + Math.min(50, Math.floor(args.targetSize / 2));
  const upperBound = args.hardMaxEnd + 1;
  const candidates = args.outline
    .filter((entry) => {
      const page = normalizePageCount(entry.page);
      return (
        page >= lowerBound &&
        page <= upperBound &&
        page > args.start &&
        page <= args.pageCount &&
        isLikelySectionBoundary(entry)
      );
    })
    .sort((left, right) => {
      const leftDistance = Math.abs(left.page - args.idealNextStart);
      const rightDistance = Math.abs(right.page - args.idealNextStart);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      return left.page - right.page;
    });
  return candidates[0]?.page || 0;
}

export function buildPageRangePlan(args) {
  const pageCount = normalizePageCount(args.pageCount);
  if (pageCount <= 0) {
    return [];
  }
  if (pageCount <= MAX_PAGES_PER_PART) {
    return [
      {
        partIndex: 1,
        partCount: 1,
        pageStart: 1,
        pageEnd: pageCount,
        page_ranges: `1-${pageCount}`,
        splitStrategy: "single",
      },
    ];
  }
  const partCount = Math.ceil(pageCount / MAX_PAGES_PER_PART);
  const targetSize = Math.ceil(pageCount / partCount);
  const outline = normalizeOutlineEntries(args.outline);
  const ranges = [];
  let start = 1;
  for (let index = 1; index < partCount; index++) {
    const hardMaxEnd = Math.min(pageCount, start + MAX_PAGES_PER_PART - 1);
    const idealNextStart = Math.min(pageCount, start + targetSize);
    const outlineBoundary = chooseOutlineBoundary({
      outline,
      start,
      pageCount,
      targetSize,
      hardMaxEnd,
      idealNextStart,
    });
    const nextStart =
      outlineBoundary ||
      Math.min(pageCount, Math.max(start + 1, idealNextStart));
    const pageEnd = Math.min(hardMaxEnd, nextStart - 1);
    ranges.push({
      partIndex: index,
      partCount,
      pageStart: start,
      pageEnd,
      page_ranges: `${start}-${pageEnd}`,
      splitStrategy: outlineBoundary ? "outline" : "balanced",
    });
    start = pageEnd + 1;
  }
  ranges.push({
    partIndex: partCount,
    partCount,
    pageStart: start,
    pageEnd: pageCount,
    page_ranges: `${start}-${pageCount}`,
    splitStrategy: "tail",
  });
  return ranges;
}

export function buildAggregateId(source) {
  const key =
    normalizeString(source?.itemKey) || normalizeString(source?.itemId);
  const name = normalizeString(source?.fileName) || "pdf";
  return `mineru-${key || name}`.replace(/[^A-Za-z0-9._:-]+/g, "-");
}
