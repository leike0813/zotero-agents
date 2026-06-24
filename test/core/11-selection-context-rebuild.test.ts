import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import dualParent from "../fixtures/selection-context/selection-context-dual-parent.json";
import mixAll from "../fixtures/selection-context/selection-context-mix-all.json";
import mixAllTop3Parents from "../fixtures/selection-context/selection-context-mix-all-top3-parents";
import multiAttachDiffParents from "../fixtures/selection-context/selection-context-multi-attach-diff-parents.json";
import multiAttachSameParent from "../fixtures/selection-context/selection-context-multi-attach-same-parent.json";
import multiMarkdownDiffParents from "../fixtures/selection-context/selection-context-multi-markdown-diff-parents.json";
import multiMarkdownNoPdf from "../fixtures/selection-context/selection-context-multi-markdown-no-pdf.json";
import multiMarkdownSameParent from "../fixtures/selection-context/selection-context-multi-markdown-same-parent.json";
import multiMarkdownWithParent from "../fixtures/selection-context/selection-context-multi-markdown-with-parent.json";
import multiPdfAndMd from "../fixtures/selection-context/selection-context-multi-pdf-and-md.json";
import orphanNote from "../fixtures/selection-context/selection-context-orphan-note.json";
import singleMarkdown from "../fixtures/selection-context/selection-context-single-markdown.json";
import singleParent from "../fixtures/selection-context/selection-context-single-parent.json";
import singlePdf from "../fixtures/selection-context/selection-context-single-pdf.json";
import variousTypeAttachDiffParents from "../fixtures/selection-context/selection-context-various-type-attach-diff-parents.json";
import variousTypeAttachSameParent from "../fixtures/selection-context/selection-context-various-type-attach-same-parent.json";
import { isFullTestMode } from "./testMode";

type ItemBase = {
  id: number;
  key: string;
  itemType: string;
  title: string;
  libraryID: number;
  parentItemID: number | null;
  data: Record<string, unknown> | null;
  note?: string;
};

type TagEntry = { tag: string; type?: number };

type AttachmentContext = {
  item: ItemBase;
  parent: ItemBase | null;
  filePath: string | null;
  mimeType: string | null;
};

type ParentContext = {
  item: ItemBase;
  attachments: AttachmentContext[];
  notes: ItemBase[];
  tags: TagEntry[];
  collections: string[];
  children: ItemBase[];
};

type ChildContext = {
  item: ItemBase;
  parent: ItemBase | null;
  attachments: AttachmentContext[];
  notes: ItemBase[];
  tags: TagEntry[];
  collections: string[];
};

type NoteContext = {
  item: ItemBase;
  parent: ItemBase | null;
  tags: TagEntry[];
  collections: string[];
};

type SelectionContext = {
  selectionType: string;
  items: {
    parents: ParentContext[];
    children: ChildContext[];
    attachments: AttachmentContext[];
    notes: NoteContext[];
  };
  summary: {
    parentCount: number;
    childCount: number;
    attachmentCount: number;
    noteCount: number;
  };
};

type NormalizedContext = {
  summary: SelectionContext["summary"];
  signatures: string[];
};

const FIXTURE_ROOT = "test/fixtures/selection-context";
const ATTACHMENTS_ROOT = `${FIXTURE_ROOT}/attachments`;

function isZoteroEnv() {
  return (
    typeof Zotero !== "undefined" &&
    typeof Zotero.Item === "function" &&
    typeof Zotero.Attachments?.linkFromFile === "function" &&
    typeof Zotero.File?.pathToFile === "function"
  );
}

function sanitizeItemData(data: Record<string, unknown> | null) {
  if (!data) return null;
  const copy = { ...data };
  delete copy.key;
  delete copy.version;
  delete copy.collections;
  delete copy.relations;
  delete copy.dateAdded;
  delete copy.dateModified;
  delete copy.parentItem;
  return copy;
}

function isAbsolutePath(target: string) {
  return (
    /^[a-zA-Z]:[\\/]/.test(target) ||
    target.startsWith("/") ||
    target.startsWith("\\\\")
  );
}

function joinPath(base: string, target: string) {
  const parts = target.split(/[\\/]+/).filter(Boolean);
  if (typeof PathUtils !== "undefined") {
    return PathUtils.join(base, ...parts);
  }
  if (typeof OS !== "undefined" && OS.Path?.join) {
    return OS.Path.join(base, ...parts);
  }
  const sep = Zotero.isWin ? "\\" : "/";
  const joined = parts.join(sep);
  return base.endsWith(sep) ? `${base}${joined}` : `${base}${sep}${joined}`;
}

function getProjectRoot() {
  const services = globalThis.Services as
    | { dirsvc?: { get?: (key: string, iface: unknown) => { path?: string } } }
    | undefined;
  const ci = (globalThis as { Ci?: { nsIFile?: unknown } }).Ci;
  if (services?.dirsvc?.get && ci?.nsIFile) {
    const file = services.dirsvc.get("CurWorkD", ci.nsIFile);
    if (file?.path) {
      return file.path;
    }
  }
  return "";
}

function resolveProjectPath(target: string) {
  if (isAbsolutePath(target)) {
    return target;
  }
  const base = getProjectRoot();
  if (!base) {
    return target;
  }
  const normalized = target.replace(/^\.?[\\/]+/, "");
  if (normalized.startsWith(FIXTURE_ROOT)) {
    return joinPath(base, normalized);
  }
  const fixtureBase = joinPath(base, FIXTURE_ROOT);
  return joinPath(fixtureBase, normalized);
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, "_");
}

function extractFileName(value: string | null) {
  if (!value) return null;
  const normalized = value
    .replace(/^attachments:/, "")
    .replace(/^storage:/, "");
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

async function ensureAttachmentFile(path: string) {
  const file = Zotero.File.pathToFile(path);
  if (file.exists()) {
    return file;
  }
  const dir = Zotero.File.pathToFile(file.parent?.path ?? file.parent);
  await Zotero.File.createDirectoryIfMissingAsync(dir);
  await Zotero.File.putContentsAsync(file, "");
  return file;
}

function normalizeContext(context: SelectionContext): NormalizedContext {
  const signatures: string[] = [];

  const pushSignature = (value: string) => {
    signatures.push(value);
  };

  const safeTitle = (base: ItemBase | null | undefined) => base?.title || "";

  const noteContent = (base: ItemBase) => {
    if (typeof base.note === "string" && base.note.length > 0) {
      return base.note;
    }
    const fromData = typeof base.data?.note === "string" ? base.data.note : "";
    return fromData || base.title || "";
  };

  const noteSignature = (base: ItemBase, parent?: ItemBase | null) =>
    `note|${noteContent(base).slice(0, 80)}|parent:${safeTitle(parent)}`;

  const attachmentSignature = (base: ItemBase, parent?: ItemBase | null) =>
    `attachment|${base.title}|parent:${safeTitle(parent)}`;

  const childSignature = (base: ItemBase, parent?: ItemBase | null) =>
    `child|${base.itemType}|${base.title}|parent:${safeTitle(parent)}`;

  const parentSignature = (base: ItemBase) =>
    `parent|${base.itemType}|${base.title}`;

  for (const parentCtx of context.items.parents) {
    pushSignature(parentSignature(parentCtx.item));
    for (const attachment of parentCtx.attachments) {
      pushSignature(attachmentSignature(attachment.item, parentCtx.item));
    }
    for (const note of parentCtx.notes) {
      pushSignature(noteSignature(note, parentCtx.item));
    }
    for (const child of parentCtx.children) {
      pushSignature(childSignature(child, parentCtx.item));
    }
  }

  for (const childCtx of context.items.children) {
    pushSignature(childSignature(childCtx.item, childCtx.parent));
    for (const attachment of childCtx.attachments) {
      pushSignature(attachmentSignature(attachment.item, attachment.parent));
    }
    for (const note of childCtx.notes) {
      pushSignature(noteSignature(note, childCtx.item));
    }
  }

  for (const attachmentCtx of context.items.attachments) {
    pushSignature(
      attachmentSignature(attachmentCtx.item, attachmentCtx.parent),
    );
  }

  for (const noteCtx of context.items.notes) {
    pushSignature(noteSignature(noteCtx.item, noteCtx.parent));
  }

  signatures.sort();

  return {
    summary: context.summary,
    signatures,
  };
}

function collectSelectedItems(
  context: SelectionContext,
  created: Map<string, Zotero.Item>,
) {
  const selectionItems: Zotero.Item[] = [];

  const addItem = (key: string) => {
    const item = created.get(key);
    if (!item) {
      throw new Error(`Missing rebuilt item: ${key}`);
    }
    selectionItems.push(item);
  };

  context.items.parents.forEach((ctx) => addItem(ctx.item.key));
  context.items.children.forEach((ctx) => addItem(ctx.item.key));
  context.items.attachments.forEach((ctx) => addItem(ctx.item.key));
  context.items.notes.forEach((ctx) => addItem(ctx.item.key));

  return selectionItems;
}

function assertSelectionContextL2(
  expected: SelectionContext,
  actual: SelectionContext,
) {
  assert.equal(actual.summary.parentCount, expected.summary.parentCount);
  assert.equal(actual.summary.childCount, expected.summary.childCount);
  assert.equal(
    actual.summary.attachmentCount,
    expected.summary.attachmentCount,
  );
  assert.equal(actual.summary.noteCount, expected.summary.noteCount);

  const expectedNorm = normalizeContext(expected);
  const actualNorm = normalizeContext(actual);

  assert.deepEqual(actualNorm.signatures, expectedNorm.signatures);
}

async function applyTags(item: Zotero.Item, tags: TagEntry[]) {
  if (!tags.length) return;
  await handlers.tag.add(
    item,
    tags.map((tag) => tag.tag),
  );
}

async function applyCollections(
  item: Zotero.Item,
  collections: string[],
  registry: Map<string, Zotero.Collection>,
) {
  if (!collections.length) return;
  for (const id of collections) {
    let collection = registry.get(id);
    if (!collection) {
      collection = await handlers.collection.create({
        name: `Rebuild ${id}`,
        libraryID: Zotero.Libraries.userLibraryID,
      });
      registry.set(id, collection);
    }
    await handlers.collection.add(item, collection);
  }
}

async function createRegularItem(base: ItemBase, parent?: Zotero.Item | null) {
  return handlers.item.create({
    itemType: base.itemType,
    parent: parent ?? undefined,
    data: sanitizeItemData(base.data),
    fields: base.title ? { title: base.title } : undefined,
    libraryID: base.libraryID,
  });
}

async function createNoteItem(base: ItemBase, parent: Zotero.Item | null) {
  const content =
    (typeof base.data?.note === "string" && base.data.note) || base.note || "";
  if (parent) {
    return handlers.parent.addNote(parent, { content });
  }
  return handlers.note.create({ content });
}

async function createAttachmentItem(
  ctx: AttachmentContext,
  parent: Zotero.Item | null,
) {
  const dataPath =
    typeof ctx.item.data?.path === "string" ? ctx.item.data.path : null;
  const sourcePath = ctx.filePath || dataPath || null;
  let filePath = sourcePath ? resolveProjectPath(sourcePath) : null;
  if (!filePath) {
    const name =
      extractFileName(sourcePath) ||
      sanitizeFileName(ctx.item.title || ctx.item.key) ||
      `${ctx.item.key}.bin`;
    const relative = joinPath(ATTACHMENTS_ROOT, name);
    filePath = resolveProjectPath(relative);
  }
  const contentType =
    typeof ctx.item.data?.contentType === "string"
      ? ctx.item.data.contentType
      : null;
  await ensureAttachmentFile(filePath);
  return handlers.attachment.createFromPath({
    parent: parent ?? undefined,
    path: filePath,
    dataPath: null,
    itemKey: ctx.item.key,
    libraryID: ctx.item.libraryID,
    title: ctx.item.title,
    mimeType: ctx.mimeType || contentType,
    allowMissing: true,
  });
}

async function rebuildSelectionContext(context: SelectionContext) {
  const created = new Map<string, Zotero.Item>();
  const collections = new Map<string, Zotero.Collection>();

  const ensureParent = async (base: ItemBase | null) => {
    if (!base) return null;
    const existing = created.get(base.key);
    if (existing) return existing;
    const item = await createRegularItem(base);
    created.set(base.key, item);
    return item;
  };

  const ensureChild = async (ctx: ChildContext) => {
    const existing = created.get(ctx.item.key);
    if (existing) return existing;
    const parent = await ensureParent(ctx.parent);
    const child = await createRegularItem(ctx.item, parent);
    created.set(ctx.item.key, child);
    await applyTags(child, ctx.tags);
    await applyCollections(child, ctx.collections, collections);
    return child;
  };

  const ensureAttachment = async (ctx: AttachmentContext) => {
    const existing = created.get(ctx.item.key);
    if (existing) return existing;
    const parent = await ensureParent(ctx.parent);
    const attachment = await createAttachmentItem(ctx, parent);
    created.set(ctx.item.key, attachment);
    return attachment;
  };

  const ensureNote = async (
    base: ItemBase,
    parent: ItemBase | null,
    tags: TagEntry[],
    collectionsRef: string[],
  ) => {
    const existing = created.get(base.key);
    if (existing) {
      await applyTags(existing, tags);
      await applyCollections(existing, collectionsRef, collections);
      return existing;
    }
    const parentItem = await ensureParent(parent);
    const note = await createNoteItem(base, parentItem);
    created.set(base.key, note);
    await applyTags(note, tags);
    await applyCollections(note, collectionsRef, collections);
    return note;
  };

  for (const parentCtx of context.items.parents) {
    const parent = await ensureParent(parentCtx.item);
    await applyTags(parent, parentCtx.tags);
    await applyCollections(parent, parentCtx.collections, collections);
    for (const note of parentCtx.notes) {
      await ensureNote(note, parentCtx.item, [], []);
    }
    for (const attachment of parentCtx.attachments) {
      await ensureAttachment(attachment);
    }
    for (const child of parentCtx.children) {
      if (child.itemType === "note" || child.itemType === "attachment") {
        continue;
      }
      await ensureChild({
        item: child,
        parent: parentCtx.item,
        attachments: [],
        notes: [],
        tags: [],
        collections: [],
      });
    }
  }

  for (const childCtx of context.items.children) {
    await ensureChild(childCtx);
    for (const note of childCtx.notes) {
      await ensureNote(note, childCtx.item, [], []);
    }
    for (const attachment of childCtx.attachments) {
      await ensureAttachment(attachment);
    }
  }

  for (const attachmentCtx of context.items.attachments) {
    await ensureAttachment(attachmentCtx);
  }

  for (const noteCtx of context.items.notes) {
    await ensureNote(
      noteCtx.item,
      noteCtx.parent,
      noteCtx.tags,
      noteCtx.collections,
    );
  }

  const expectedKeys = new Set<string>();
  context.items.parents.forEach((ctx) => {
    expectedKeys.add(ctx.item.key);
    ctx.attachments.forEach((att) => expectedKeys.add(att.item.key));
    ctx.notes.forEach((note) => expectedKeys.add(note.key));
    ctx.children.forEach((child) => expectedKeys.add(child.key));
  });
  context.items.children.forEach((ctx) => {
    expectedKeys.add(ctx.item.key);
    ctx.attachments.forEach((att) => expectedKeys.add(att.item.key));
    ctx.notes.forEach((note) => expectedKeys.add(note.key));
    if (ctx.parent) expectedKeys.add(ctx.parent.key);
  });
  context.items.attachments.forEach((ctx) => {
    expectedKeys.add(ctx.item.key);
    if (ctx.parent) expectedKeys.add(ctx.parent.key);
  });
  context.items.notes.forEach((ctx) => {
    expectedKeys.add(ctx.item.key);
    if (ctx.parent) expectedKeys.add(ctx.parent.key);
  });

  assert.equal(created.size, expectedKeys.size);

  const selectionItems = collectSelectedItems(context, created);
  const actualContext = (await buildSelectionContext(
    selectionItems,
  )) as SelectionContext;
  assertSelectionContextL2(context, actualContext);

  return { created, collections };
}

describe("selection-context rebuild", function () {
  beforeEach(function () {
    if (!isZoteroEnv()) {
      this.skip();
    }
  });

  const fixtures: Array<{ name: string; data: SelectionContext }> = [
    { name: "selection-context-dual-parent.json", data: dualParent },
    {
      name: "selection-context-multi-attach-diff-parents.json",
      data: multiAttachDiffParents,
    },
    {
      name: "selection-context-multi-attach-same-parent.json",
      data: multiAttachSameParent,
    },
    {
      name: "selection-context-multi-markdown-diff-parents.json",
      data: multiMarkdownDiffParents,
    },
    {
      name: "selection-context-multi-markdown-no-pdf.json",
      data: multiMarkdownNoPdf,
    },
    {
      name: "selection-context-multi-markdown-same-parent.json",
      data: multiMarkdownSameParent,
    },
    {
      name: "selection-context-multi-markdown-with-parent.json",
      data: multiMarkdownWithParent,
    },
    { name: "selection-context-multi-pdf-and-md.json", data: multiPdfAndMd },
    { name: "selection-context-orphan-note.json", data: orphanNote },
    { name: "selection-context-single-markdown.json", data: singleMarkdown },
    { name: "selection-context-single-parent.json", data: singleParent },
    { name: "selection-context-single-pdf.json", data: singlePdf },
    {
      name: "selection-context-various-type-attach-diff-parents.json",
      data: variousTypeAttachDiffParents,
    },
    {
      name: "selection-context-various-type-attach-same-parent.json",
      data: variousTypeAttachSameParent,
    },
    {
      name: "selection-context-mix-all-top3-parents.json",
      data: mixAllTop3Parents,
    },
    { name: "selection-context-mix-all.json", data: mixAll },
  ];

  const selectedFixtures = isFullTestMode()
    ? fixtures
    : fixtures.filter(
        (fixture) =>
          fixture.name === "selection-context-mix-all-top3-parents.json",
      );

  selectedFixtures.forEach((fixture) => {
    it(`rebuilds ${fixture.name}`, async function () {
      const timeoutMs =
        fixture.name === "selection-context-mix-all.json"
          ? 180000
          : fixture.name === "selection-context-mix-all-top3-parents.json"
            ? 120000
            : 60000;
      this.timeout(timeoutMs);
      const shouldCleanup =
        fixture.name !== "selection-context-mix-all.json" &&
        fixture.name !== "selection-context-mix-all-top3-parents.json";
      const { created, collections } = await rebuildSelectionContext(
        fixture.data,
      );
      if (!shouldCleanup) {
        return;
      }
      const items = Array.from(created.values());
      const notes = items.filter((item) => item.itemType === "note");
      const attachments = items.filter(
        (item) => item.itemType === "attachment",
      );
      const others = items.filter(
        (item) => item.itemType !== "note" && item.itemType !== "attachment",
      );
      for (const item of [...notes, ...attachments, ...others]) {
        try {
          if (item.itemType === "note") {
            await handlers.note.remove(item);
          } else if (item.itemType === "attachment") {
            await handlers.attachment.remove(item);
          } else {
            await handlers.item.remove(item);
          }
        } catch {
          // best-effort cleanup
        }
      }
      for (const collection of collections.values()) {
        try {
          await handlers.collection.delete(collection);
        } catch {
          // best-effort cleanup
        }
      }
    });
  });
});
