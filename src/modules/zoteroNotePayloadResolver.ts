import {
  listNotePayloadBlocks,
  parseEmbeddedNotePayloadBlock,
  assertNoteHtmlSourceWithinLimit,
  decodeBase64Utf8,
  encodeBase64Utf8,
  NOTE_PAYLOAD_MAX_BYTES,
  ZoteroNotePayloadResourceLimitError,
  type ZoteroNotePayloadBlock,
} from "./notePayloadCodec";
import { readRuntimeBytes, statRuntimePath } from "./runtimePersistence";
import { queryZoteroChildItemPage } from "./zoteroLibraryPageQuery";
import { sha256Hex } from "../utils/sha256";
import { yieldToEventLoop } from "../utils/runtimeCompatibility";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function readTagAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(tag || "").match(
    new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return String(match?.[1] || match?.[2] || match?.[3] || "").trim();
}

function collectPayloadAnchors(noteHtml: string) {
  const anchors = new Map<string, string>();
  const pattern =
    /<img\b[^>]*\bdata-zs-payload-anchor\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi;
  for (const match of noteHtml.matchAll(pattern)) {
    const tag = match[0];
    const payloadType = readTagAttribute(tag, "data-zs-payload-anchor");
    const attachmentKey = readTagAttribute(tag, "data-attachment-key");
    if (payloadType) {
      anchors.set(payloadType, attachmentKey);
    }
  }
  return anchors;
}

type NativeSlice = <T>(run: () => Promise<T> | T) => Promise<T>;

const runNativeImmediately: NativeSlice = <T>(run: () => Promise<T> | T) =>
  Promise.resolve().then(run);

async function readAttachmentPath(attachment: any, checkCanceled?: () => void) {
  checkCanceled?.();
  const path = cleanString(await attachment?.getFilePathAsync?.());
  checkCanceled?.();
  return path;
}

async function readAttachmentBytes(
  attachment: any,
  checkCanceled?: () => void,
) {
  const path = await readAttachmentPath(attachment, checkCanceled);
  if (!path) {
    throw new Error("embedded payload attachment path is missing");
  }
  const stat = await statRuntimePath(path);
  checkCanceled?.();
  if (!stat.exists || stat.isDir) {
    throw new Error("embedded payload attachment is unavailable");
  }
  if (stat.size > NOTE_PAYLOAD_MAX_BYTES) {
    throw new ZoteroNotePayloadResourceLimitError("attachment");
  }
  const bytes = await readRuntimeBytes(path);
  checkCanceled?.();
  return bytes;
}

type PayloadPageCursor = {
  version: 1;
  basis: string;
  stage: "html" | "attachments";
  htmlIndex: number;
  attachmentCursor: string | null;
  attachmentBasis: string | null;
  attachmentPageCursor: string | null;
  attachmentPageLimit: number | null;
};

export class ZoteroNotePayloadCursorError extends Error {
  readonly code = "invalid_note_payload_cursor" as const;

  constructor(message = "invalid note payload cursor") {
    super(message);
    this.name = "ZoteroNotePayloadCursorError";
  }
}

export class ZoteroNotePayloadPageLimitError extends Error {
  readonly code = "note_payload_page_limit_exceeded" as const;

  constructor(
    readonly limit: number,
    readonly observed: number,
  ) {
    super(`note payload page limit cannot exceed ${limit}`);
    this.name = "ZoteroNotePayloadPageLimitError";
  }
}

function payloadCursorEncode(cursor: PayloadPageCursor) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function payloadCursorDecode(
  value: unknown,
  basis: string,
): PayloadPageCursor | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new ZoteroNotePayloadCursorError("payload cursor is malformed");
  }
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(
      decodeBase64Utf8(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    ) as Partial<PayloadPageCursor>;
    const cursorKeys = Object.keys(decoded as Record<string, unknown>).sort();
    const expectedCursorKeys = [
      "attachmentBasis",
      "attachmentCursor",
      "attachmentPageCursor",
      "attachmentPageLimit",
      "basis",
      "htmlIndex",
      "stage",
      "version",
    ];
    const attachmentCursor = decoded.attachmentCursor;
    const attachmentBasis = decoded.attachmentBasis;
    const attachmentPageCursor = decoded.attachmentPageCursor;
    const attachmentPageLimit = decoded.attachmentPageLimit;
    const attachmentFieldsValid =
      (attachmentCursor === null ||
        (typeof attachmentCursor === "string" &&
          attachmentCursor.length > 0)) &&
      (attachmentBasis === null ||
        (typeof attachmentBasis === "string" && attachmentBasis.length > 0)) &&
      (attachmentPageCursor === null ||
        (typeof attachmentPageCursor === "string" &&
          attachmentPageCursor.length > 0));
    const attachmentStageValid =
      decoded.stage === "html"
        ? attachmentCursor === null &&
          attachmentBasis === null &&
          attachmentPageCursor === null &&
          attachmentPageLimit === null
        : attachmentBasis === null
          ? attachmentPageCursor === null && attachmentPageLimit === null
          : attachmentPageLimit !== null;
    if (
      cursorKeys.join("\u0000") !== expectedCursorKeys.join("\u0000") ||
      decoded.version !== 1 ||
      decoded.basis !== basis ||
      (decoded.stage !== "html" && decoded.stage !== "attachments") ||
      !Number.isSafeInteger(decoded.htmlIndex) ||
      decoded.htmlIndex! < 0 ||
      !attachmentFieldsValid ||
      !attachmentStageValid ||
      (attachmentPageLimit !== null &&
        (typeof attachmentPageLimit !== "number" ||
          !Number.isSafeInteger(attachmentPageLimit) ||
          attachmentPageLimit < 1 ||
          attachmentPageLimit > 100))
    ) {
      throw new ZoteroNotePayloadCursorError(
        "payload cursor does not match source",
      );
    }
    return decoded as PayloadPageCursor;
  } catch (error) {
    if (error instanceof ZoteroNotePayloadCursorError) throw error;
    throw new ZoteroNotePayloadCursorError("payload cursor is invalid");
  }
}

type NotePayloadSource = {
  libraryId: number;
  itemId: number;
  version: string;
  html: string;
};

async function payloadSourceBasis(source: NotePayloadSource) {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        libraryId: source.libraryId,
        itemId: source.itemId,
        version: source.version,
        html: source.html,
      }),
    ),
  );
  if (!digest) throw new Error("payload source basis is unavailable");
  return digest;
}

type AttachmentSourceDescriptor = {
  item: Zotero.Item;
  id: number;
  key: string;
  version: string;
  dateModified: string;
};

const PAYLOAD_READ_YIELD_ITEMS = 100;
const PAYLOAD_READ_YIELD_MS = 50;

type PayloadReadYieldBudget = {
  startedAt: number;
  processed: number;
};

function createPayloadReadYieldBudget(): PayloadReadYieldBudget {
  return { startedAt: Date.now(), processed: 0 };
}

async function yieldAfterPayloadItem(
  budget: PayloadReadYieldBudget,
  checkCanceled?: () => void,
) {
  budget.processed += 1;
  if (
    budget.processed < PAYLOAD_READ_YIELD_ITEMS &&
    Date.now() - budget.startedAt < PAYLOAD_READ_YIELD_MS
  ) {
    return;
  }
  await yieldToEventLoop();
  checkCanceled?.();
  budget.startedAt = Date.now();
  budget.processed = 0;
}

function detachAttachmentSources(attachments: Zotero.Item[]) {
  return attachments.map((attachment) => {
    const id = Number((attachment as any)?.id);
    const key = cleanString((attachment as any)?.key);
    if (!Number.isSafeInteger(id) || id <= 0 || !key) {
      throw new Error("payload attachment identity is unavailable");
    }
    return {
      item: attachment,
      id,
      key,
      version: String(
        (attachment as any).version ?? (attachment as any).dateModified ?? "",
      ),
      dateModified: String((attachment as any).dateModified ?? ""),
    } satisfies AttachmentSourceDescriptor;
  });
}

async function attachmentSourceBasis(
  attachments: AttachmentSourceDescriptor[],
  contentDigests?: ReadonlyMap<number, string>,
  checkCanceled?: () => void,
) {
  const entries: Array<Record<string, unknown>> = [];
  const yieldBudget = createPayloadReadYieldBudget();
  for (const attachment of attachments) {
    const path = await readAttachmentPath(attachment.item, checkCanceled);
    const stat = path ? await statRuntimePath(path) : null;
    checkCanceled?.();
    const contentDigest =
      contentDigests?.get(attachment.id) ||
      (await sha256Hex(
        await readAttachmentBytes(attachment.item, checkCanceled),
      ));
    checkCanceled?.();
    if (!contentDigest) {
      throw new Error("payload attachment content basis is unavailable");
    }
    entries.push({
      id: attachment.id,
      key: attachment.key,
      version: attachment.version,
      dateModified: attachment.dateModified,
      path,
      exists: Boolean(stat?.exists),
      size: Number(stat?.size || 0) || 0,
      lastModified: Number(stat?.lastModified || 0) || 0,
      contentDigest,
    });
    await yieldAfterPayloadItem(yieldBudget, checkCanceled);
  }
  const digest = await sha256Hex(
    new TextEncoder().encode(JSON.stringify(entries)),
  );
  if (!digest) throw new Error("payload attachment basis is unavailable");
  return digest;
}

export type ZoteroNotePayloadSourcePage = {
  blocks: ZoteroNotePayloadBlock[];
  scanned: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type ZoteroNotePayloadPageOptions = {
  runNativeSlice?: NativeSlice;
  checkCanceled?: () => void;
};

export async function listNotePayloadBlocksForItemPage(
  note: Zotero.Item,
  input: { limit?: unknown; cursor?: unknown } = {},
  options: ZoteroNotePayloadPageOptions = {},
): Promise<ZoteroNotePayloadSourcePage> {
  const observedLimit =
    input.limit === undefined || input.limit === null || input.limit === ""
      ? 25
      : Number(input.limit);
  if (
    !Number.isSafeInteger(observedLimit) ||
    observedLimit <= 0 ||
    observedLimit > 100
  ) {
    throw new ZoteroNotePayloadPageLimitError(100, observedLimit);
  }
  const runNativeSlice = options.runNativeSlice || runNativeImmediately;
  options.checkCanceled?.();
  const source = await runNativeSlice(() => {
    const html = String(note?.getNote?.() || "");
    return {
      html,
      libraryId: Number((note as any).libraryID) || 0,
      itemId: Number((note as any).id) || 0,
      version: String(
        (note as any).version ?? (note as any).dateModified ?? "",
      ),
    } satisfies NotePayloadSource;
  });
  const html = source.html;
  assertNoteHtmlSourceWithinLimit(html);
  const basis = await payloadSourceBasis(source);
  const cursor = payloadCursorDecode(input.cursor, basis);
  const htmlBlocks = listNotePayloadBlocks(html);
  const stage = cursor?.stage || "html";
  let htmlIndex = cursor?.htmlIndex || 0;
  if (
    cursor &&
    ((stage === "html" && htmlIndex >= htmlBlocks.length) ||
      (stage === "attachments" && htmlIndex !== htmlBlocks.length))
  ) {
    throw new ZoteroNotePayloadCursorError(
      "payload cursor position is invalid",
    );
  }
  const attachmentCursor = cursor?.attachmentCursor || null;
  const blocks: ZoteroNotePayloadBlock[] = [];
  let scanned = 0;

  if (cursor?.stage === "attachments" && cursor.attachmentBasis) {
    options.checkCanceled?.();
    const attachmentPageLimit = cursor.attachmentPageLimit;
    const attachmentPageCursor = cursor.attachmentPageCursor;
    if (attachmentPageLimit === null || attachmentPageLimit === undefined) {
      throw new ZoteroNotePayloadCursorError(
        "payload attachment cursor basis is invalid",
      );
    }
    const previousPage = await runNativeSlice(() =>
      queryZoteroChildItemPage({
        domain: "attachments",
        libraryId: source.libraryId,
        parentItemId: source.itemId,
        limit: attachmentPageLimit,
        cursor: attachmentPageCursor || undefined,
      }),
    );
    options.checkCanceled?.();
    const previousAttachments = await runNativeSlice(() =>
      detachAttachmentSources(previousPage.items),
    );
    const previousBasis = await attachmentSourceBasis(
      previousAttachments,
      undefined,
      options.checkCanceled,
    );
    if (previousBasis !== cursor.attachmentBasis) {
      throw new ZoteroNotePayloadCursorError(
        "payload attachment source basis changed",
      );
    }
  }

  if (stage === "html") {
    const htmlEnd = Math.min(htmlBlocks.length, htmlIndex + observedLimit);
    blocks.push(...htmlBlocks.slice(htmlIndex, htmlEnd));
    scanned += htmlEnd - htmlIndex;
    htmlIndex = htmlEnd;
    if (htmlIndex < htmlBlocks.length) {
      return {
        blocks,
        scanned,
        hasMore: true,
        nextCursor: payloadCursorEncode({
          version: 1,
          basis,
          stage: "html",
          htmlIndex,
          attachmentCursor: null,
          attachmentBasis: null,
          attachmentPageCursor: null,
          attachmentPageLimit: null,
        }),
      };
    }
  }

  const remaining = observedLimit - blocks.length;
  if (remaining <= 0) {
    return {
      blocks,
      scanned,
      hasMore: true,
      nextCursor: payloadCursorEncode({
        version: 1,
        basis,
        stage: "attachments",
        htmlIndex,
        attachmentCursor: attachmentCursor,
        attachmentBasis: null,
        attachmentPageCursor: null,
        attachmentPageLimit: null,
      }),
    };
  }
  const childPage = await runNativeSlice(() =>
    queryZoteroChildItemPage({
      domain: "attachments",
      libraryId: source.libraryId,
      parentItemId: source.itemId,
      limit: remaining,
      cursor: attachmentCursor || undefined,
    }),
  );
  options.checkCanceled?.();
  const attachments = await runNativeSlice(() =>
    detachAttachmentSources(childPage.items),
  );
  scanned += childPage.items.length;
  const anchors = collectPayloadAnchors(html);
  const contentDigests = new Map<number, string>();
  const yieldBudget = createPayloadReadYieldBudget();
  for (const attachment of attachments) {
    options.checkCanceled?.();
    const bytes = await readAttachmentBytes(
      attachment.item,
      options.checkCanceled,
    );
    const contentDigest = await sha256Hex(bytes);
    options.checkCanceled?.();
    if (!contentDigest) {
      throw new Error("payload attachment content basis is unavailable");
    }
    contentDigests.set(attachment.id, contentDigest);
    const parsed = parseEmbeddedNotePayloadBlock(bytes, {
      key: attachment.key,
      id: attachment.id,
    });
    if (parsed) {
      const expectedKey = parsed.payloadType
        ? anchors.get(parsed.payloadType)
        : "";
      parsed.anchorStatus = expectedKey
        ? expectedKey === cleanString(attachment.key)
          ? "present"
          : "stale"
        : "missing";
      blocks.push(parsed);
    }
    await yieldAfterPayloadItem(yieldBudget, options.checkCanceled);
  }
  const attachmentBasis = await attachmentSourceBasis(
    attachments,
    contentDigests,
    options.checkCanceled,
  );
  const hasMore = childPage.hasMore;
  return {
    blocks,
    scanned,
    hasMore,
    nextCursor: hasMore
      ? payloadCursorEncode({
          version: 1,
          basis,
          stage: "attachments",
          htmlIndex,
          attachmentCursor: childPage.nextCursor,
          attachmentBasis,
          attachmentPageCursor: attachmentCursor,
          attachmentPageLimit: remaining,
        })
      : null,
  };
}

export function selectPreferredNotePayloadBlock(
  blocks: ZoteroNotePayloadBlock[],
  payloadType?: string | null,
) {
  const candidates = payloadType
    ? blocks.filter((entry) => entry.payloadType === payloadType)
    : blocks;
  return (
    candidates.find(
      (entry) =>
        entry.source === "embedded-image-attachment" &&
        entry.payloadStorageVersion === 2,
    ) ||
    candidates.find((entry) => entry.source === "embedded-image-attachment") ||
    candidates.find((entry) => entry.source === "html-payload-block") ||
    candidates[0] ||
    null
  );
}
