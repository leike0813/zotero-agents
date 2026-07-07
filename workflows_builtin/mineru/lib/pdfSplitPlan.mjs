const MAX_PAGES_PER_PART = 200;

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizePath(value) {
  return normalizeString(value).replace(/[\\/]+/g, "/");
}

function basenamePath(filePath) {
  const parts = normalizePath(filePath).split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function getAttachment(selectionContext) {
  const selection = isObject(selectionContext) ? selectionContext : {};
  const attachments = Array.isArray(selection.items?.attachments)
    ? selection.items.attachments
    : [];
  return attachments[0] || null;
}

export function resolveSourceAttachment(selectionContext) {
  const attachment = getAttachment(selectionContext);
  const filePath = normalizeString(attachment?.filePath);
  if (!filePath) {
    return null;
  }
  return {
    filePath,
    fileName: basenamePath(filePath),
    itemId: Number(attachment?.item?.id || 0) || null,
    itemKey: normalizeString(attachment?.item?.key),
    parentId:
      Number(attachment?.parent?.id || attachment?.item?.parentItemID || 0) ||
      null,
  };
}

async function readPdfBytes(filePath) {
  const io = globalThis.IOUtils;
  if (io?.read) {
    const bytes = await io.read(filePath);
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }
  const dynamicImport = new Function("specifier", "return import(specifier)");
  const fs = await dynamicImport("fs/promises");
  const bytes = await fs.readFile(filePath);
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
  const helpers = args.runtime?.helpers;
  const reader =
    helpers?.mineruReadPdfMetadata || helpers?.readPdfMetadataForWorkflow;
  if (typeof reader !== "function") {
    return null;
  }
  const value = await reader(args.filePath);
  if (!isObject(value)) {
    return null;
  }
  return {
    pageCount: normalizePageCount(value.pageCount || value.numPages),
    outline: normalizeOutlineEntries(value.outline),
    source: "runtime-helper",
  };
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

async function readMetadataFromPdfJs(filePath) {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    return null;
  }
  const bytes = await readPdfBytes(filePath);
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

async function readMetadataFromFallback(filePath) {
  const bytes = await readPdfBytes(filePath);
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
    ({ filePath }) => readMetadataFromPdfJs(filePath),
    ({ filePath }) => readMetadataFromFallback(filePath),
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
  const key = normalizeString(source?.itemKey) || normalizeString(source?.itemId);
  const name = normalizeString(source?.fileName) || "pdf";
  return `mineru-${key || name}`.replace(/[^A-Za-z0-9._:-]+/g, "-");
}
