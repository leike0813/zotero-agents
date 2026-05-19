import { config } from "../../package.json";
import { promises as fs } from "fs";
import * as fsSync from "fs";
import os from "os";
import path from "path";

type TagEntry = { tag: string; type?: number };
type MockParityRisk = "low" | "medium" | "high";
type MockParityDriftStatus = "open" | "waived" | "closed";
type MockParityDriftEntry = {
  id: string;
  scope: string;
  risk: MockParityRisk;
  status: MockParityDriftStatus;
  summary: string;
  closureCriteria: string;
};
type MockParityDescriptor = {
  runtime: "node-mock";
  contractVersion: string;
  capabilities: Record<string, boolean>;
  drifts: MockParityDriftEntry[];
};

type ZoteroMock = {
  Promise: {
    delay: (ms: number) => Promise<void>;
  };
  debug: (...args: unknown[]) => void;
  File: {
    putContentsAsync: (file: MockFile, content: string) => Promise<void>;
    createDirectoryIfMissingAsync: (dir: MockFile) => Promise<void>;
  };
  Item: typeof MockItem;
  Items: {
    get: (id: number) => MockItem | undefined;
    getByLibraryAndKey: (libraryID: number, key: string) => MockItem | undefined;
    getAsync?: (id: number) => Promise<MockItem | undefined>;
    trashTx?: (ids: number[]) => Promise<void>;
  };
  Attachments: {
    linkFromFile: (opts: {
      file: MockFile;
      parentItemID?: number | null;
    }) => Promise<MockItem>;
    importFromURL?: (opts: {
      url: string;
      parentItemID?: number | null;
      title?: string;
      contentType?: string;
    }) => Promise<MockItem>;
    resolveRelativePath?: (dataPath: string) => string;
    getStorageDirectoryByLibraryAndKey?: (
      libraryID: number,
      key: string,
    ) => MockFile;
  };
  Collection: typeof MockCollection;
  Collections: {
    get: (id: number) => MockCollection | undefined;
    getByLibraryAndKey: (
      libraryID: number,
      key: string,
    ) => MockCollection | undefined;
  };
  ItemTypes: {
    getID: (itemType: string) => number;
  };
  ItemFields: {
    getID: (field: string) => number | undefined;
    isValidForType: (fieldID: number, itemTypeID: number) => boolean;
    getBaseIDFromTypeAndField: (
      itemTypeID: number,
      fieldID: number,
    ) => number | null;
    getFieldIDFromTypeAndBase: (
      itemTypeID: number,
      baseFieldID: number,
    ) => number | null;
  };
  Libraries: {
    userLibraryID: number;
  };
  getTempDirectory: () => MockFile;
  isWin: boolean;
  __parity?: MockParityDescriptor;
  [key: string]: unknown;
};

const ZOTERO_MOCK_PARITY: MockParityDescriptor = {
  runtime: "node-mock",
  contractVersion: "2026-02-hb08",
  capabilities: {
    attachmentsRelativePathResolution: true,
    trashMarksDeleted: true,
    readonlyDeletedField: true,
    itemLookupSemantics: true,
    fieldValidationSemantics: true,
    searchStubOnly: true,
  },
  drifts: [
    {
      id: "DR-001",
      scope: "File.pathToFile",
      risk: "high",
      status: "open",
      summary:
        "Mock accepts forward-slash drive path (D:/...), while real Zotero can reject it in some runtime chains.",
      closureCriteria:
        "Align path parser behavior with real Zotero and keep regression coverage green.",
    },
    {
      id: "DR-002",
      scope: "Search API",
      risk: "medium",
      status: "waived",
      summary: "Search.search() is currently a stub that always returns empty array.",
      closureCriteria:
        "Implement real query semantics once workflows depend on Search behavior.",
    },
    {
      id: "DR-003",
      scope: "UI registration APIs",
      risk: "low",
      status: "waived",
      summary:
        "PreferencePanes/ItemPaneManager and related APIs are lightweight no-op stubs in node runtime.",
      closureCriteria:
        "Backfill observable UI side-effect simulation when tests require those guarantees.",
    },
  ],
};

class MockFile {
  path: string;

  constructor(filePath: string) {
    this.path = filePath;
  }

  append(name: string) {
    this.path = path.join(this.path, name);
  }

  get parent() {
    return new MockFile(path.dirname(this.path));
  }

  exists() {
    return fsSync.existsSync(this.path);
  }
}

let nextItemId = 1;
let nextCollectionId = 1;
const itemsById = new Map<number, MockItem>();
const itemsByKey = new Map<string, MockItem>();
const collectionsById = new Map<number, MockCollection>();
const collectionsByKey = new Map<string, MockCollection>();
const prefsStore = new Map<string, unknown>();
let notifierCounter = 0;

function initializeZoteroMockState() {
  nextItemId = 1;
  nextCollectionId = 1;
  itemsById.clear();
  itemsByKey.clear();
  collectionsById.clear();
  collectionsByKey.clear();
  prefsStore.clear();
  prefsStore.set(`${config.prefsPrefix}.workflowDir`, "");
  notifierCounter = 0;
}

export function resetZoteroMockStateForTests() {
  initializeZoteroMockState();
}

function generateKey(id: number) {
  return id.toString(36).toUpperCase().padStart(8, "0").slice(-8);
}

class MockItem {
  id!: number;
  key!: string;
  itemTypeID!: number;
  itemType: string;
  libraryID = 1;
  parentItemID: number | null = null;
  private fields: Record<string, string | number | boolean | null> = {};
  private note = "";
  private tags: TagEntry[] = [];
  private attachments: number[] = [];
  private notes: number[] = [];
  private children: number[] = [];
  private collections: Array<number | string> = [];
  relatedItems: string[] = [];
  private filePath: string | null = null;
  private creators: Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
    creatorType?: string;
  }> = [];
  private deletedFlag = false;

  constructor(itemType: string) {
    this.itemType = itemType;
    this.itemTypeID = itemTypeIdByName.get(itemType) ?? 0;
  }

  set parentID(id: number | null) {
    this.parentItemID = id ?? null;
  }

  get parentID() {
    return this.parentItemID;
  }

  setField(field: string, value: string | number | boolean | null) {
    this.fields[field] = value;
  }

  getField(field: string) {
    return this.fields[field] ?? "";
  }

  getDisplayTitle() {
    return String(this.getField("title") || "");
  }

  get firstCreator() {
    const creator = this.creators[0];
    if (!creator) {
      return "";
    }
    const preferred = String(
      creator.lastName || creator.name || creator.firstName || "",
    ).trim();
    return preferred;
  }

  get deleted() {
    return this.deletedFlag;
  }

  isNote() {
    return this.itemType === "note";
  }

  isAttachment() {
    return this.itemType === "attachment";
  }

  isRegularItem() {
    return !this.isNote() && !this.isAttachment();
  }

  isTopLevelItem() {
    return this.isRegularItem() && !this.parentItemID;
  }

  setNote(content: string) {
    this.note = content;
  }

  getNote() {
    return this.note;
  }

  addTag(tag: string) {
    if (!this.tags.find((entry) => entry.tag === tag)) {
      this.tags.push({ tag });
    }
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter((entry) => entry.tag !== tag);
  }

  getTags() {
    return [...this.tags];
  }

  getNotes() {
    return [...this.notes];
  }

  getAttachments() {
    return [...this.attachments];
  }

  getChildren() {
    return [...this.children];
  }

  addToCollection(id: number | string) {
    if (!this.collections.includes(id)) {
      this.collections.push(id);
    }
  }

  removeFromCollection(id: number | string) {
    this.collections = this.collections.filter((entry) => entry !== id);
  }

  getCollections() {
    return [...this.collections];
  }

  setCreators(
    creators: Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      creatorType?: string;
    }>,
  ) {
    this.creators = Array.isArray(creators)
      ? creators.map((entry) => ({ ...(entry || {}) }))
      : [];
  }

  getCreators() {
    return this.creators.map((entry) => ({ ...entry }));
  }

  markDeleted(next = true) {
    this.deletedFlag = !!next;
  }

  addRelatedItem(item: MockItem) {
    if (!this.relatedItems.includes(item.key)) {
      this.relatedItems.push(item.key);
    }
  }

  removeRelatedItem(item: MockItem) {
    this.relatedItems = this.relatedItems.filter((key) => key !== item.key);
  }

  async getFilePathAsync() {
    return this.filePath;
  }

  toJSON() {
    const parent = this.parentItemID
      ? itemsById.get(this.parentItemID)
      : null;
    const data: Record<string, unknown> = {
      key: this.key,
      version: 0,
      itemType: this.itemType,
      title: this.getField("title") || "",
      tags: this.getTags(),
      collections: this.getCollections(),
      relations: {},
    };
    if (parent) {
      data.parentItem = parent.key;
    }
    if (this.isNote()) {
      data.note = this.note;
    }
    if (this.filePath) {
      data.path = this.filePath;
    }
    if (this.creators.length > 0) {
      data.creators = this.getCreators();
    }
    if (this.deletedFlag) {
      data.deleted = true;
    }
    for (const [field, value] of Object.entries(this.fields)) {
      if (field in data) {
        continue;
      }
      data[field] = value;
    }
    return data;
  }

  async saveTx() {
    if (!this.id) {
      this.id = nextItemId++;
      this.key = generateKey(this.id);
      this.itemTypeID = itemTypeIdByName.get(this.itemType) ?? this.itemTypeID;
    }
    itemsById.set(this.id, this);
    itemsByKey.set(this.key, this);
    if (this.parentItemID) {
      const parent = itemsById.get(this.parentItemID);
      if (parent) {
        if (this.itemType === "note") {
          if (!parent.notes.includes(this.id)) {
            parent.notes.push(this.id);
          }
        } else if (this.itemType === "attachment") {
          if (!parent.attachments.includes(this.id)) {
            parent.attachments.push(this.id);
          }
        } else if (!parent.children.includes(this.id)) {
          parent.children.push(this.id);
        }
      }
    }
    return this.id;
  }

  async eraseTx() {
    if (this.parentItemID) {
      const parent = itemsById.get(this.parentItemID);
      if (parent) {
        if (this.itemType === "note") {
          parent.notes = parent.notes.filter((id) => id !== this.id);
        } else if (this.itemType === "attachment") {
          parent.attachments = parent.attachments.filter((id) => id !== this.id);
        } else {
          parent.children = parent.children.filter((id) => id !== this.id);
        }
      }
    }
    itemsById.delete(this.id);
    itemsByKey.delete(this.key);
  }

  setFilePath(filePath: string) {
    this.filePath = filePath;
  }
}

class MockCollection {
  id!: number;
  key!: string;
  name = "";
  libraryID = 0;
  parentID: number | null = null;

  async saveTx() {
    if (!this.id) {
      this.id = nextCollectionId++;
      this.key = generateKey(this.id);
      collectionsById.set(this.id, this);
      collectionsByKey.set(this.key, this);
    }
    return this.id;
  }

  async eraseTx() {
    collectionsById.delete(this.id);
    collectionsByKey.delete(this.key);
  }
}

class MockSearch {
  private conditions: Array<[string, string, string]> = [];

  addCondition(field: string, operator: string, value: string) {
    this.conditions.push([field, operator, value]);
  }

  async search() {
    return [] as number[];
  }
}

// GENERATED FROM reference/zotero-item-typeMap.xml
const itemTypeIdByName = new Map<string, number>([
  ["artwork", 1],
  ["attachment", 2],
  ["audioRecording", 3],
  ["bill", 4],
  ["blogPost", 5],
  ["book", 6],
  ["bookSection", 7],
  ["case", 8],
  ["computerProgram", 9],
  ["conferencePaper", 10],
  ["dictionaryEntry", 11],
  ["document", 12],
  ["email", 13],
  ["encyclopediaArticle", 14],
  ["film", 15],
  ["forumPost", 16],
  ["hearing", 17],
  ["instantMessage", 18],
  ["interview", 19],
  ["journalArticle", 20],
  ["letter", 21],
  ["magazineArticle", 22],
  ["manuscript", 23],
  ["map", 24],
  ["newspaperArticle", 25],
  ["note", 26],
  ["patent", 27],
  ["podcast", 28],
  ["presentation", 29],
  ["radioBroadcast", 30],
  ["report", 31],
  ["statute", 32],
  ["thesis", 33],
  ["tvBroadcast", 34],
  ["videoRecording", 35],
  ["webpage", 36],
  ["annotation", 37],
  ["preprint", 38],
]);

const fieldIdByName = new Map<string, number>([
  ["title", 1],
  ["abstractNote", 2],
  ["artworkMedium", 3],
  ["medium", 4],
  ["artworkSize", 5],
  ["date", 6],
  ["language", 7],
  ["shortTitle", 8],
  ["archive", 9],
  ["archiveLocation", 10],
  ["libraryCatalog", 11],
  ["callNumber", 12],
  ["url", 13],
  ["accessDate", 14],
  ["rights", 15],
  ["extra", 16],
  ["audioRecordingFormat", 17],
  ["seriesTitle", 18],
  ["volume", 19],
  ["numberOfVolumes", 20],
  ["place", 21],
  ["label", 22],
  ["publisher", 23],
  ["runningTime", 24],
  ["ISBN", 25],
  ["billNumber", 26],
  ["number", 27],
  ["code", 28],
  ["codeVolume", 29],
  ["section", 30],
  ["codePages", 31],
  ["pages", 32],
  ["legislativeBody", 33],
  ["session", 34],
  ["history", 35],
  ["blogTitle", 36],
  ["publicationTitle", 37],
  ["websiteType", 38],
  ["type", 39],
  ["series", 40],
  ["seriesNumber", 41],
  ["edition", 42],
  ["numPages", 43],
  ["bookTitle", 44],
  ["caseName", 45],
  ["court", 46],
  ["dateDecided", 47],
  ["docketNumber", 48],
  ["reporter", 49],
  ["reporterVolume", 50],
  ["firstPage", 51],
  ["versionNumber", 52],
  ["system", 53],
  ["company", 54],
  ["programmingLanguage", 55],
  ["proceedingsTitle", 56],
  ["conferenceName", 57],
  ["DOI", 58],
  ["dictionaryTitle", 59],
  ["subject", 60],
  ["encyclopediaTitle", 61],
  ["distributor", 62],
  ["genre", 63],
  ["videoRecordingFormat", 64],
  ["forumTitle", 65],
  ["postType", 66],
  ["committee", 67],
  ["documentNumber", 68],
  ["interviewMedium", 69],
  ["issue", 70],
  ["seriesText", 71],
  ["journalAbbreviation", 72],
  ["ISSN", 73],
  ["letterType", 74],
  ["manuscriptType", 75],
  ["mapType", 76],
  ["scale", 77],
  ["country", 78],
  ["assignee", 79],
  ["issuingAuthority", 80],
  ["patentNumber", 81],
  ["filingDate", 82],
  ["applicationNumber", 83],
  ["priorityNumbers", 84],
  ["issueDate", 85],
  ["references", 86],
  ["legalStatus", 87],
  ["episodeNumber", 88],
  ["audioFileType", 89],
  ["presentationType", 90],
  ["meetingName", 91],
  ["programTitle", 92],
  ["network", 93],
  ["reportNumber", 94],
  ["reportType", 95],
  ["institution", 96],
  ["nameOfAct", 97],
  ["codeNumber", 98],
  ["publicLawNumber", 99],
  ["dateEnacted", 100],
  ["thesisType", 101],
  ["university", 102],
  ["studio", 103],
  ["websiteTitle", 104],
  ["repository", 105],
  ["archiveID", 106],
  ["citationKey", 107],
]);

const validFieldsByType = new Map<number, Set<number>>([
  [1, new Set([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])],
  [2, new Set([1, 13, 14])],
  [3, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25])],
  [4, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 26, 28, 29, 30, 31, 33, 34, 35])],
  [5, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 36, 38])],
  [6, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 23, 25, 40, 41, 42, 43])],
  [7, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 23, 25, 32, 40, 41, 42, 44])],
  [8, new Set([2, 7, 8, 13, 14, 15, 16, 35, 45, 46, 47, 48, 49, 50, 51])],
  [9, new Set([1, 2, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 21, 25, 52, 53, 54, 55])],
  [10, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 21, 23, 25, 32, 40, 56, 57, 58])],
  [11, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 23, 25, 32, 40, 41, 42, 59])],
  [12, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 23])],
  [13, new Set([2, 6, 7, 8, 13, 14, 15, 16, 60])],
  [14, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 23, 25, 32, 40, 41, 42, 61])],
  [15, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 62, 63, 64])],
  [16, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 65, 66])],
  [17, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 20, 21, 23, 32, 33, 34, 35, 67, 68])],
  [18, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16])],
  [19, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 69])],
  [20, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 32, 37, 40, 58, 70, 71, 72, 73])],
  [21, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 74])],
  [22, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 32, 37, 70, 73])],
  [23, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 43, 75])],
  [24, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 21, 23, 25, 42, 76, 77])],
  [25, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 30, 32, 37, 42, 73])],
  [26, new Set([])],
  [27, new Set([1, 2, 7, 8, 13, 14, 15, 16, 21, 32, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87])],
  [28, new Set([1, 2, 7, 8, 13, 14, 15, 16, 18, 24, 88, 89])],
  [29, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 21, 90, 91])],
  [30, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 24, 88, 92, 93])],
  [31, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 21, 32, 94, 95, 96])],
  [32, new Set([2, 7, 8, 13, 14, 15, 16, 28, 30, 32, 34, 35, 97, 98, 99, 100])],
  [33, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 43, 101, 102])],
  [34, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 24, 64, 88, 92, 93])],
  [35, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 24, 25, 64, 103])],
  [36, new Set([1, 2, 6, 7, 8, 13, 14, 15, 16, 38, 104])],
  [37, new Set([])],
  [38, new Set([1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 40, 41, 58, 63, 105, 106, 107])],
]);

const baseFieldByTypeAndField = new Map<number, Map<number, number>>([
  [
    1,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [3, 4],
      [5, 5],
      [6, 6],
      [7, 7],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    2,
    new Map<number, number>([
      [1, 1],
      [14, 14],
      [13, 13],
    ]),
  ],
  [
    3,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [17, 4],
      [18, 18],
      [19, 19],
      [20, 20],
      [21, 21],
      [22, 23],
      [6, 6],
      [24, 24],
      [7, 7],
      [25, 25],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    4,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [26, 27],
      [28, 28],
      [29, 19],
      [30, 30],
      [31, 32],
      [33, 33],
      [34, 34],
      [35, 35],
      [6, 6],
      [7, 7],
      [13, 13],
      [14, 14],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    5,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [36, 37],
      [38, 39],
      [6, 6],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    6,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [43, 43],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    7,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [44, 37],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    8,
    new Map<number, number>([
      [45, 1],
      [2, 2],
      [46, 46],
      [47, 6],
      [48, 27],
      [49, 49],
      [50, 19],
      [51, 32],
      [35, 35],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    9,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [18, 18],
      [52, 52],
      [6, 6],
      [53, 53],
      [21, 21],
      [54, 23],
      [55, 55],
      [25, 25],
      [8, 8],
      [13, 13],
      [15, 15],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [14, 14],
      [16, 16],
    ]),
  ],
  [
    10,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [56, 37],
      [57, 57],
      [21, 21],
      [23, 23],
      [19, 19],
      [32, 32],
      [40, 40],
      [7, 7],
      [58, 58],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    11,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [59, 37],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    12,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [23, 23],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    13,
    new Map<number, number>([
      [60, 1],
      [2, 2],
      [6, 6],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    14,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [61, 37],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    15,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [62, 23],
      [6, 6],
      [63, 39],
      [64, 4],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    16,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [65, 37],
      [66, 39],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    17,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [67, 67],
      [21, 21],
      [23, 23],
      [20, 20],
      [68, 27],
      [32, 32],
      [33, 33],
      [34, 34],
      [35, 35],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    18,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    19,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [69, 4],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    20,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [19, 19],
      [70, 70],
      [32, 32],
      [6, 6],
      [40, 40],
      [18, 18],
      [71, 71],
      [72, 72],
      [7, 7],
      [58, 58],
      [73, 73],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    21,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [74, 39],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    22,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [19, 19],
      [70, 70],
      [6, 6],
      [32, 32],
      [7, 7],
      [73, 73],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    23,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [75, 39],
      [21, 21],
      [6, 6],
      [43, 43],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    24,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [76, 39],
      [77, 77],
      [18, 18],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    25,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [21, 21],
      [42, 42],
      [6, 6],
      [30, 30],
      [32, 32],
      [7, 7],
      [8, 8],
      [73, 73],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [26, new Map<number, number>([])],
  [
    27,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [21, 21],
      [78, 78],
      [79, 79],
      [80, 80],
      [81, 27],
      [82, 82],
      [32, 32],
      [83, 83],
      [84, 84],
      [85, 6],
      [86, 86],
      [87, 87],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    28,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [18, 18],
      [88, 27],
      [89, 4],
      [24, 24],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    29,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [90, 39],
      [6, 6],
      [21, 21],
      [91, 91],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    30,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [92, 37],
      [88, 27],
      [17, 4],
      [21, 21],
      [93, 23],
      [6, 6],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    31,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [94, 27],
      [95, 39],
      [18, 18],
      [21, 21],
      [96, 23],
      [6, 6],
      [32, 32],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    32,
    new Map<number, number>([
      [97, 1],
      [2, 2],
      [28, 28],
      [98, 98],
      [99, 27],
      [100, 6],
      [32, 32],
      [30, 30],
      [34, 34],
      [35, 35],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    33,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [101, 39],
      [102, 23],
      [21, 21],
      [6, 6],
      [43, 43],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    34,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [92, 37],
      [88, 27],
      [64, 4],
      [21, 21],
      [93, 23],
      [6, 6],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    35,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [64, 4],
      [18, 18],
      [19, 19],
      [20, 20],
      [21, 21],
      [103, 23],
      [6, 6],
      [24, 24],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    36,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [104, 37],
      [38, 39],
      [6, 6],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [15, 15],
      [16, 16],
    ]),
  ],
  [37, new Map<number, number>([])],
  [
    38,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [63, 39],
      [105, 23],
      [106, 27],
      [21, 21],
      [6, 6],
      [40, 40],
      [41, 41],
      [58, 58],
      [107, 107],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [8, 8],
      [7, 7],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
]);

const fieldIdByTypeAndBase = new Map<number, Map<number, number>>([
  [
    1,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [4, 3],
      [5, 5],
      [6, 6],
      [7, 7],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    2,
    new Map<number, number>([
      [1, 1],
      [14, 14],
      [13, 13],
    ]),
  ],
  [
    3,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [4, 17],
      [18, 18],
      [19, 19],
      [20, 20],
      [21, 21],
      [23, 22],
      [6, 6],
      [24, 24],
      [7, 7],
      [25, 25],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    4,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [27, 26],
      [28, 28],
      [19, 29],
      [30, 30],
      [32, 31],
      [33, 33],
      [34, 34],
      [35, 35],
      [6, 6],
      [7, 7],
      [13, 13],
      [14, 14],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    5,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 36],
      [39, 38],
      [6, 6],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    6,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [43, 43],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    7,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 44],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    8,
    new Map<number, number>([
      [1, 45],
      [2, 2],
      [46, 46],
      [6, 47],
      [27, 48],
      [49, 49],
      [19, 50],
      [32, 51],
      [35, 35],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    9,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [18, 18],
      [52, 52],
      [6, 6],
      [53, 53],
      [21, 21],
      [23, 54],
      [55, 55],
      [25, 25],
      [8, 8],
      [13, 13],
      [15, 15],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [14, 14],
      [16, 16],
    ]),
  ],
  [
    10,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [37, 56],
      [57, 57],
      [21, 21],
      [23, 23],
      [19, 19],
      [32, 32],
      [40, 40],
      [7, 7],
      [58, 58],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    11,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 59],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    12,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [23, 23],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    13,
    new Map<number, number>([
      [1, 60],
      [2, 2],
      [6, 6],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    14,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 61],
      [40, 40],
      [41, 41],
      [19, 19],
      [20, 20],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [32, 32],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    15,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [23, 62],
      [6, 6],
      [39, 63],
      [4, 64],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    16,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 65],
      [39, 66],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    17,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [67, 67],
      [21, 21],
      [23, 23],
      [20, 20],
      [27, 68],
      [32, 32],
      [33, 33],
      [34, 34],
      [35, 35],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    18,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    19,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [6, 6],
      [4, 69],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    20,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [19, 19],
      [70, 70],
      [32, 32],
      [6, 6],
      [40, 40],
      [18, 18],
      [71, 71],
      [72, 72],
      [7, 7],
      [58, 58],
      [73, 73],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    21,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 74],
      [6, 6],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    22,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [19, 19],
      [70, 70],
      [6, 6],
      [32, 32],
      [7, 7],
      [73, 73],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    23,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 75],
      [21, 21],
      [6, 6],
      [43, 43],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    24,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 76],
      [77, 77],
      [18, 18],
      [42, 42],
      [21, 21],
      [23, 23],
      [6, 6],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    25,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 37],
      [21, 21],
      [42, 42],
      [6, 6],
      [30, 30],
      [32, 32],
      [7, 7],
      [8, 8],
      [73, 73],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [26, new Map<number, number>([])],
  [
    27,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [21, 21],
      [78, 78],
      [79, 79],
      [80, 80],
      [27, 81],
      [82, 82],
      [32, 32],
      [83, 83],
      [84, 84],
      [6, 85],
      [86, 86],
      [87, 87],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    28,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [18, 18],
      [27, 88],
      [4, 89],
      [24, 24],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    29,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 90],
      [6, 6],
      [21, 21],
      [91, 91],
      [13, 13],
      [14, 14],
      [7, 7],
      [8, 8],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    30,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 92],
      [27, 88],
      [4, 17],
      [21, 21],
      [23, 93],
      [6, 6],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    31,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [27, 94],
      [39, 95],
      [18, 18],
      [21, 21],
      [23, 96],
      [6, 6],
      [32, 32],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    32,
    new Map<number, number>([
      [1, 97],
      [2, 2],
      [28, 28],
      [98, 98],
      [27, 99],
      [6, 100],
      [32, 32],
      [30, 30],
      [34, 34],
      [35, 35],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    33,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 101],
      [23, 102],
      [21, 21],
      [6, 6],
      [43, 43],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    34,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 92],
      [27, 88],
      [4, 64],
      [21, 21],
      [23, 93],
      [6, 6],
      [24, 24],
      [7, 7],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    35,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [4, 64],
      [18, 18],
      [19, 19],
      [20, 20],
      [21, 21],
      [23, 103],
      [6, 6],
      [24, 24],
      [7, 7],
      [25, 25],
      [8, 8],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
  [
    36,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [37, 104],
      [39, 38],
      [6, 6],
      [8, 8],
      [13, 13],
      [14, 14],
      [7, 7],
      [15, 15],
      [16, 16],
    ]),
  ],
  [37, new Map<number, number>([])],
  [
    38,
    new Map<number, number>([
      [1, 1],
      [2, 2],
      [39, 63],
      [23, 105],
      [27, 106],
      [21, 21],
      [6, 6],
      [40, 40],
      [41, 41],
      [58, 58],
      [107, 107],
      [13, 13],
      [14, 14],
      [9, 9],
      [10, 10],
      [8, 8],
      [7, 7],
      [11, 11],
      [12, 12],
      [15, 15],
      [16, 16],
    ]),
  ],
]);

function createZoteroMock(): ZoteroMock {
  initializeZoteroMockState();

  const mock: ZoteroMock = {
    Promise: {
      delay: (ms: number) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        }),
    },
    debug: () => {},
    File: {
      pathToFile: (filePath: string | MockFile) => {
        if (filePath instanceof MockFile) {
          return new MockFile(filePath.path);
        }
        return new MockFile(filePath);
      },
      putContentsAsync: async (file: MockFile, content: string) => {
        await fs.mkdir(path.dirname(file.path), { recursive: true });
        await fs.writeFile(file.path, content, "utf8");
      },
      createDirectoryIfMissingAsync: async (dir: MockFile) => {
        await fs.mkdir(dir.path, { recursive: true });
      },
    },
    Item: MockItem,
    Items: {
      get: (id: number) => itemsById.get(id),
      getByLibraryAndKey: (_libraryID: number, key: string) =>
        itemsByKey.get(key),
      getAsync: async (id: number) => itemsById.get(id),
      trashTx: async (ids: number[]) => {
        for (const rawId of ids || []) {
          const id = Number(rawId);
          if (!Number.isFinite(id)) {
            continue;
          }
          const item = itemsById.get(id);
          if (item) {
            item.markDeleted(true);
          }
        }
      },
    },
    Attachments: {
      linkFromFile: async ({
        file,
        parentItemID,
      }: {
        file: MockFile;
        parentItemID?: number | null;
      }) => {
        const attachment = new MockItem("attachment");
        attachment.parentItemID = parentItemID ?? null;
        attachment.setFilePath(file.path);
        await attachment.saveTx();
        return attachment;
      },
      importFromURL: async ({
        url,
        parentItemID,
        title,
        contentType,
      }: {
        url: string;
        parentItemID?: number | null;
        title?: string;
        contentType?: string;
      }) => {
        if (
          !/^https?:\/\//i.test(url) ||
          /(?:^|[/?#&])fail(?:[=?&/#]|$)/i.test(url)
        ) {
          throw new Error(`Mock attachment URL import failed: ${url}`);
        }
        const attachment = new MockItem("attachment");
        attachment.parentItemID = parentItemID ?? null;
        attachment.setField("title", title || url);
        attachment.setField("url", url);
        attachment.setField("contentType", contentType || "application/pdf");
        attachment.setFilePath(
          path.join(os.tmpdir(), "zotero-url-attachments", encodeURIComponent(url)),
        );
        await attachment.saveTx();
        return attachment;
      },
      resolveRelativePath: (dataPath: string) => {
        return dataPath.replace(/^attachments:/, "");
      },
      getStorageDirectoryByLibraryAndKey: (
        _libraryID: number,
        key: string,
      ) => {
        return new MockFile(path.join(os.tmpdir(), "zotero-storage", key));
      },
    },
    Collection: MockCollection,
    Collections: {
      get: (id: number) => collectionsById.get(id),
      getByLibraryAndKey: (_libraryID: number, key: string) =>
        collectionsByKey.get(key),
      getByLibrary: (libraryID: number) =>
        Array.from(collectionsById.values()).filter(
          (collection) => collection.libraryID === libraryID,
        ),
    },
    ItemTypes: {
      getID: (itemType: string) => {
        const id = itemTypeIdByName.get(itemType);
        if (!id) {
          throw new Error(`Unknown item type: ${itemType}`);
        }
        return id;
      },
    },
    ItemFields: {
      getID: (field: string) => fieldIdByName.get(field),
      isValidForType: (fieldID: number, itemTypeID: number) =>
        validFieldsByType.get(itemTypeID)?.has(fieldID) ?? false,
      getBaseIDFromTypeAndField: (itemTypeID: number, fieldID: number) =>
        baseFieldByTypeAndField.get(itemTypeID)?.get(fieldID) ?? null,
      getFieldIDFromTypeAndBase: (itemTypeID: number, baseFieldID: number) =>
        fieldIdByTypeAndBase.get(itemTypeID)?.get(baseFieldID) ?? null,
    },
    Libraries: {
      userLibraryID: 1,
    },
    getTempDirectory: () => new MockFile(os.tmpdir()),
    initializationPromise: Promise.resolve(),
    unlockPromise: Promise.resolve(),
    uiReadyPromise: Promise.resolve(),
    getMainWindow: () => null,
    getMainWindows: () => [],
    Prefs: {
      get: (key: string) => prefsStore.get(key),
      set: (key: string, value: unknown) => {
        prefsStore.set(key, value);
      },
      clear: (key: string) => {
        prefsStore.delete(key);
      },
    },
    Notifier: {
      registerObserver: () => {
        notifierCounter += 1;
        return `mock-${notifierCounter}`;
      },
      unregisterObserver: () => {},
    },
    Plugins: {
      addObserver: () => {},
    },
    PreferencePanes: {
      register: () => {},
    },
    ItemTreeManager: {
      registerColumns: async () => {},
    },
    ItemPaneManager: {
      registerInfoRow: () => {},
      registerSection: (options: { paneID: string }) => options.paneID,
      unregisterSection: () => {},
    },
    Search: MockSearch,
    isWin: process.platform === "win32",
    isMac: process.platform === "darwin",
  };

  mock[config.addonInstance] = {
    data: {
      initialized: true,
      config,
      env: "test",
    },
  };
  mock.__parity = JSON.parse(JSON.stringify(ZOTERO_MOCK_PARITY));

  return mock;
}

if (!("Zotero" in globalThis)) {
  Object.defineProperty(globalThis, "Zotero", {
    value: createZoteroMock(),
    writable: false,
    configurable: true,
  });
}

if (!("Components" in globalThis)) {
  Object.defineProperty(globalThis, "Components", {
    value: { utils: { isDeadWrapper: () => false } },
    writable: false,
    configurable: true,
  });
}

if (!("PathUtils" in globalThis)) {
  Object.defineProperty(globalThis, "PathUtils", {
    value: { join: (...parts: string[]) => path.join(...parts) },
    writable: false,
    configurable: true,
  });
}

if (!("OS" in globalThis)) {
  Object.defineProperty(globalThis, "OS", {
    value: { Path: { join: (...parts: string[]) => path.join(...parts) } },
    writable: false,
    configurable: true,
  });
}

export const mochaHooks = {
  beforeEach() {
    resetZoteroMockStateForTests();
  },
  afterEach() {
    resetZoteroMockStateForTests();
  },
};
