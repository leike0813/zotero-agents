import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type PrivateWorkflowCreator = {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

type PrivateWorkflowPdf = {
  sourceKey: string;
  path: string;
  contentType: "application/pdf";
  title: string;
};

export type PrivateWorkflowSource = {
  schemaVersion: "workflow-e2e-private-source.v1";
  items: Array<{
    sourceKey: string;
    itemType: string;
    fields: Record<string, string>;
    creators: PrivateWorkflowCreator[];
    tags: Array<{ tag: string; type: number }>;
    collectionKeys: string[];
    pdfs: PrivateWorkflowPdf[];
  }>;
  collections: Array<{
    sourceKey: string;
    name: string;
    parentKey: string | null;
  }>;
  missingPdfs: Array<{
    sourceKey: string;
    parentKey: string;
    path: string;
  }>;
  facts: {
    items: number;
    pdfs: number;
    missingPdfs: number;
    collections: number;
  };
};

type SourceItem = PrivateWorkflowSource["items"][number] & {
  itemID: number;
};

type AttachmentRow = {
  sourceKey: string;
  parentID: number;
  attachmentPath: string | null;
  title: string | null;
};

const SOURCE_ITEMS_CTE = `
  source_items AS (
    SELECT i.itemID, i.key
    FROM items i
    JOIN itemTypes item_type
      ON item_type.itemTypeID = i.itemTypeID
    LEFT JOIN deletedItems deleted ON deleted.itemID = i.itemID
    WHERE i.libraryID = 1
      AND deleted.itemID IS NULL
      AND item_type.typeName NOT IN ('attachment', 'note', 'annotation')
  )
`;

function sourceItems(database: DatabaseSync): SourceItem[] {
  return database
    .prepare(
      `SELECT i.itemID, i.key AS sourceKey, item_type.typeName AS itemType
       FROM items i
       JOIN itemTypes item_type
         ON item_type.itemTypeID = i.itemTypeID
       LEFT JOIN deletedItems deleted ON deleted.itemID = i.itemID
       WHERE i.libraryID = 1
         AND deleted.itemID IS NULL
         AND item_type.typeName NOT IN ('attachment', 'note', 'annotation')
       ORDER BY i.itemID`,
    )
    .all()
    .map((row) => ({
      itemID: Number(row.itemID),
      sourceKey: String(row.sourceKey),
      itemType: String(row.itemType),
      fields: {},
      creators: [],
      tags: [],
      collectionKeys: [],
      pdfs: [],
    }));
}

async function readManifest(
  database: DatabaseSync,
  sourceDataDir: string,
  baseAttachmentDir: string,
  targetDir: string,
): Promise<PrivateWorkflowSource> {
  const items = sourceItems(database);
  const itemByID = new Map(items.map((item) => [item.itemID, item]));

  const fieldRows = database
    .prepare(
      `WITH ${SOURCE_ITEMS_CTE}
       SELECT i.itemID, field.fieldName, CAST(value.value AS TEXT) AS value
       FROM source_items i
       JOIN itemData data ON data.itemID = i.itemID
       JOIN fields field ON field.fieldID = data.fieldID
       JOIN itemDataValues value ON value.valueID = data.valueID
       WHERE field.fieldName IS NOT NULL AND value.value IS NOT NULL
       ORDER BY i.itemID, field.fieldName`,
    )
    .all();
  for (const row of fieldRows) {
    const item = itemByID.get(Number(row.itemID));
    if (item) item.fields[String(row.fieldName)] = String(row.value);
  }

  const creatorRows = database
    .prepare(
      `WITH ${SOURCE_ITEMS_CTE}
       SELECT i.itemID, creator_type.creatorType AS creatorType,
              creator.firstName, creator.lastName, creator.fieldMode
       FROM source_items i
       JOIN itemCreators item_creator ON item_creator.itemID = i.itemID
       JOIN creators creator ON creator.creatorID = item_creator.creatorID
       JOIN creatorTypes creator_type
         ON creator_type.creatorTypeID = item_creator.creatorTypeID
       ORDER BY i.itemID, item_creator.orderIndex`,
    )
    .all();
  for (const row of creatorRows) {
    const creator: PrivateWorkflowCreator = {
      creatorType: String(row.creatorType ?? ""),
    };
    if (Number(row.fieldMode) === 1) {
      creator.name = String(row.lastName ?? row.firstName ?? "");
    } else {
      if (row.firstName !== null && row.firstName !== undefined) {
        creator.firstName = String(row.firstName);
      }
      if (row.lastName !== null && row.lastName !== undefined) {
        creator.lastName = String(row.lastName);
      }
    }
    itemByID.get(Number(row.itemID))?.creators.push(creator);
  }

  const tagRows = database
    .prepare(
      `WITH ${SOURCE_ITEMS_CTE}
       SELECT i.itemID, tag.name AS tag, item_tag.type
       FROM source_items i
       JOIN itemTags item_tag ON item_tag.itemID = i.itemID
       JOIN tags tag ON tag.tagID = item_tag.tagID
       ORDER BY i.itemID, tag.name`,
    )
    .all();
  for (const row of tagRows) {
    itemByID.get(Number(row.itemID))?.tags.push({
      tag: String(row.tag),
      type: Number(row.type),
    });
  }

  const collectionRows = database
    .prepare(
      `SELECT collection.collectionID, collection.key AS sourceKey,
              collection.collectionName AS name,
              collection.parentCollectionID
       FROM collections collection
       LEFT JOIN deletedCollections deleted
         ON deleted.collectionID = collection.collectionID
       WHERE collection.libraryID = 1 AND deleted.collectionID IS NULL
       ORDER BY collection.collectionID`,
    )
    .all();
  const collectionKeyByID = new Map(
    collectionRows.map((row) => [
      Number(row.collectionID),
      String(row.sourceKey),
    ]),
  );
  const collections = collectionRows.map((row) => ({
    sourceKey: String(row.sourceKey),
    name: String(row.name),
    parentKey:
      row.parentCollectionID === null
        ? null
        : (collectionKeyByID.get(Number(row.parentCollectionID)) ?? null),
  }));

  const membershipRows = database
    .prepare(
      `WITH ${SOURCE_ITEMS_CTE}
       SELECT i.itemID, collection.key AS collectionKey
       FROM source_items i
       JOIN collectionItems membership ON membership.itemID = i.itemID
       JOIN collections collection
         ON collection.collectionID = membership.collectionID
       LEFT JOIN deletedCollections deleted
         ON deleted.collectionID = collection.collectionID
       WHERE collection.libraryID = 1 AND deleted.collectionID IS NULL
       ORDER BY i.itemID, collection.key`,
    )
    .all();
  for (const row of membershipRows) {
    itemByID
      .get(Number(row.itemID))
      ?.collectionKeys.push(String(row.collectionKey));
  }

  const attachmentRows = database
    .prepare(
      `WITH ${SOURCE_ITEMS_CTE}
       SELECT attachment_item.key AS sourceKey,
              parent.itemID AS parentID,
              attachment.path AS attachmentPath,
              (
                SELECT value.value
                FROM itemData title_data
                JOIN fields title_field
                  ON title_field.fieldID = title_data.fieldID
                JOIN itemDataValues value
                  ON value.valueID = title_data.valueID
                WHERE title_data.itemID = attachment_item.itemID
                  AND title_field.fieldName = 'title'
                LIMIT 1
              ) AS title
       FROM source_items parent
       JOIN itemAttachments attachment
         ON attachment.parentItemID = parent.itemID
       JOIN items attachment_item
         ON attachment_item.itemID = attachment.itemID
       LEFT JOIN deletedItems deleted
         ON deleted.itemID = attachment_item.itemID
       WHERE attachment_item.libraryID = 1
         AND deleted.itemID IS NULL
         AND LOWER(TRIM(attachment.contentType)) = 'application/pdf'
       ORDER BY attachment.itemID`,
    )
    .all() as AttachmentRow[];

  const missingPdfs: PrivateWorkflowSource["missingPdfs"] = [];
  let pdfDirectoryCreated = false;
  for (const row of attachmentRows) {
    const item = itemByID.get(Number(row.parentID));
    if (!item) continue;
    const sourceKey = String(row.sourceKey);
    assertSafeFilenameSegment(sourceKey);
    const sourcePath = resolveAttachmentPath(
      row.attachmentPath,
      sourceKey,
      sourceDataDir,
      baseAttachmentDir,
    );
    if (!sourcePath || !(await isRegularFile(sourcePath))) {
      missingPdfs.push({
        sourceKey,
        parentKey: item.sourceKey,
        path: sourcePath ?? String(row.attachmentPath ?? ""),
      });
      continue;
    }
    const pdf = {
      sourceKey,
      path: `pdfs/${sourceKey}.pdf`,
      contentType: "application/pdf" as const,
      title:
        String(row.title ?? "").trim() ||
        path.basename(sourcePath) ||
        sourceKey,
    };
    if (!pdfDirectoryCreated) {
      await mkdir(path.join(targetDir, "pdfs"));
      pdfDirectoryCreated = true;
    }
    await copyFile(
      sourcePath,
      path.join(targetDir, "pdfs", `${sourceKey}.pdf`),
      constants.COPYFILE_EXCL,
    );
    item.pdfs.push(pdf);
  }

  return {
    schemaVersion: "workflow-e2e-private-source.v1",
    items: items.map(({ itemID: _itemID, ...item }) => item),
    collections,
    missingPdfs,
    facts: {
      items: items.length,
      pdfs: items.reduce((count, item) => count + item.pdfs.length, 0),
      missingPdfs: missingPdfs.length,
      collections: collections.length,
    },
  };
}

function resolveAttachmentPath(
  storedPath: string | null,
  attachmentKey: string,
  sourceDataDir: string,
  baseAttachmentDir: string,
) {
  if (!storedPath) return null;
  if (storedPath.startsWith("storage:")) {
    const relativePath = storedPath.slice("storage:".length);
    if (!relativePath || path.isAbsolute(relativePath)) return null;
    const storageRoot = path.resolve(sourceDataDir, "storage", attachmentKey);
    const resolved = path.resolve(storageRoot, relativePath);
    return isWithin(storageRoot, resolved) ? resolved : null;
  }
  if (storedPath.startsWith("attachments:")) {
    const relativePath = storedPath.slice("attachments:".length);
    return relativePath ? path.resolve(baseAttachmentDir, relativePath) : null;
  }
  return path.isAbsolute(storedPath) ? path.normalize(storedPath) : null;
}

function assertSafeFilenameSegment(value: string) {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new Error("workflow source attachment key is unsafe");
  }
}

async function isRegularFile(filePath: string) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error as NodeJS.ErrnoException).code === "ENOTDIR"
    ) {
      return false;
    }
    throw error;
  }
}

function isWithin(basePath: string, candidatePath: string) {
  const relative = path.relative(basePath, candidatePath);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function canonicalPath(candidatePath: string) {
  const absolutePath = path.resolve(candidatePath);
  const missingSegments: string[] = [];
  let currentPath = absolutePath;
  while (true) {
    try {
      const existingPath = await realpath(currentPath);
      return path.resolve(existingPath, ...missingSegments.reverse());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) return absolutePath;
      missingSegments.push(path.basename(currentPath));
      currentPath = parentPath;
    }
  }
}

async function assertTargetIsEmpty(targetDir: string) {
  await mkdir(targetDir, { recursive: true });
  if ((await readdir(targetDir)).length > 0) {
    throw new Error("workflow source target must be missing or empty");
  }
}

async function assertSourceIsQuiescent(sourceDatabasePath: string) {
  const walPath = `${sourceDatabasePath}-wal`;
  try {
    if ((await stat(walPath)).size > 0) {
      throw new Error(
        "workflow source database has a non-empty WAL and is not quiescent",
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function prepareWorkflowSource(input: {
  sourceDataDir: string;
  baseAttachmentDir: string;
  targetDir: string;
}): Promise<{
  manifestPath: string;
  facts: PrivateWorkflowSource["facts"];
}> {
  const sourceDataDir = path.resolve(input.sourceDataDir);
  const baseAttachmentDir = path.resolve(input.baseAttachmentDir);
  const targetDir = path.resolve(input.targetDir);
  const [canonicalSource, canonicalAttachments, canonicalTarget] =
    await Promise.all([
      canonicalPath(sourceDataDir),
      canonicalPath(baseAttachmentDir),
      canonicalPath(targetDir),
    ]);
  if (
    isWithin(canonicalSource, canonicalTarget) ||
    isWithin(canonicalAttachments, canonicalTarget)
  ) {
    throw new Error(
      "workflow source target must be outside source data and attachment directories",
    );
  }

  const sourceDatabasePath = path.join(sourceDataDir, "zotero.sqlite");
  if (!(await isRegularFile(sourceDatabasePath))) {
    throw new Error("workflow source Zotero database is missing");
  }
  await assertSourceIsQuiescent(sourceDatabasePath);
  await assertTargetIsEmpty(targetDir);

  const snapshotPath = path.join(targetDir, "source.sqlite");
  await copyFile(sourceDatabasePath, snapshotPath, constants.COPYFILE_EXCL);
  const database = new DatabaseSync(snapshotPath, { readOnly: true });
  let manifest: PrivateWorkflowSource;
  try {
    manifest = await readManifest(
      database,
      sourceDataDir,
      baseAttachmentDir,
      targetDir,
    );
  } finally {
    database.close();
  }

  const manifestPath = path.join(targetDir, "source.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return { manifestPath, facts: manifest.facts };
}
