import {
  collectParentBindingsByTag,
  mergeParentBindingsIntoStagedEntries,
  normalizeParentBindings,
  normalizeStagedEntryWithBindings,
  normalizeStagedPublishState,
} from "../../lib/bindings.mjs";
import {
  buildGitHubContentsApiUrl,
  buildGitHubRawUrl,
  buildPublishedVocabularyPayload,
  publishRemoteVocabulary as publishRemoteVocabularyCore,
  subscribeRemoteVocabulary as subscribeRemoteVocabularyCore,
} from "../../lib/remote.mjs";
import {
  appendWorkflowRuntimeLog,
  requireHostEditor,
  requireHostItems,
  requireHostPrefs,
  showWorkflowToast,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import {
  loadLocalCommittedState as loadLocalCommittedStateCore,
  loadRemoteCommittedState as loadRemoteCommittedStateCore,
  loadPersistedStagedState as loadPersistedStagedStateCore,
  loadPersistedState as loadPersistedStateCore,
  persistEntries as persistEntriesCore,
  persistLocalCommittedEntries as persistLocalCommittedEntriesCore,
  persistRemoteCommittedEntries as persistRemoteCommittedEntriesCore,
  persistStagedEntries as persistStagedEntriesCore,
  readWorkflowSettingsParams,
  resolveGitHubSyncConfig,
  resolveLocalCommittedPrefsKey,
  resolvePrefsKey,
  resolveRemoteCommittedPrefsKey,
  resolveStagedPrefsKey,
  resolveTagVocabularyMode as resolveTagManagerMode,
  resolveWorkflowSettingsPrefsKey,
  syncActiveCommittedProjection as syncActiveCommittedProjectionCore,
} from "../../lib/state.mjs";
import { FACETS, normalizeRemoteVocabularyPayload, TAG_PATTERN } from "../../lib/model.mjs";

const RENDERER_ID = "tag-manager.default.v1";
const TAG_MANAGER_WORKFLOW_ID = "tag-manager";
const STAGED_SOURCE_FLOW_DEFAULT = "manual-staged";
const STAGED_PUBLISH_DEBOUNCE_MS = 1000;
const MAX_TAG_LENGTH = 120;
const ON_DUPLICATE_OPTIONS = ["skip", "overwrite", "error"];

function setPublishStateForTags(entries, tags, publishState, options = {}) {
  const requested = new Set(
    (Array.isArray(tags) ? tags : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const normalized = normalizeStagedEntryWithBindings(entry, options);
    const lowered = String(normalized.tag || "").trim().toLowerCase();
    if (!requested.has(lowered)) {
      return normalized;
    }
    return {
      ...normalized,
      publishState: normalizeStagedPublishState(publishState),
    };
  });
}

function parseBooleanLike(value) {
  const lowered = String(value || "")
    .trim()
    .toLowerCase();
  if (lowered === "true") {
    return true;
  }
  if (lowered === "false") {
    return false;
  }
  return null;
}

function unquoteYamlScalar(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseYamlKeyValueLine(line, index) {
  const match = String(line || "").match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
  if (!match) {
    throw new Error(`PARSE_ERROR: line ${index + 1} is not a key:value entry`);
  }
  const key = String(match[1] || "").trim();
  const raw = String(match[2] || "");
  const boolValue = parseBooleanLike(raw);
  const value = boolValue === null ? unquoteYamlScalar(raw) : boolValue;
  return {
    key,
    value,
  };
}

function parseYamlTagEntries(yamlText) {
  const lines = String(yamlText || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const entries = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = String(rawLine || "").trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (current) {
        entries.push(current);
      }
      current = {};
      const inline = trimmed.slice(2).trim();
      if (inline) {
        const kv = parseYamlKeyValueLine(inline, i);
        current[kv.key] = kv.value;
      }
      continue;
    }

    if (!current) {
      throw new Error(`PARSE_ERROR: line ${i + 1} appears before first list entry`);
    }

    const kv = parseYamlKeyValueLine(trimmed, i);
    current[kv.key] = kv.value;
  }

  if (current) {
    entries.push(current);
  }
  return entries;
}

async function readTextFromFileObject(fileLike) {
  if (!fileLike) {
    throw new Error("PARSE_ERROR: no import file selected");
  }
  if (typeof fileLike.text === "function") {
    return fileLike.text();
  }
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("PARSE_ERROR: failed to read selected file"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(fileLike);
    });
  }
  throw new Error("PARSE_ERROR: current runtime cannot read selected file");
}

function createHtmlElement(doc, tag) {
  return doc.createElementNS("http://www.w3.org/1999/xhtml", tag);
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function getNodeChildren(node) {
  if (!node || !node.children) {
    return [];
  }
  try {
    return Array.from(node.children);
  } catch {
    return Array.isArray(node.children) ? node.children : [];
  }
}

function findNodeByRoleAndRowIndex(root, role, rowIndex) {
  if (!root || !role) {
    return null;
  }
  const expectedRole = String(role || "");
  const expectedRow = String(rowIndex);
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.shift();
    if (
      node &&
      typeof node.getAttribute === "function" &&
      node.getAttribute("data-zs-role") === expectedRole &&
      node.getAttribute("data-zs-row-index") === expectedRow
    ) {
      return node;
    }
    const children = getNodeChildren(node);
    for (const child of children) {
      stack.push(child);
    }
  }
  return null;
}

function isNodeWithinRoles(target, boundary, roles) {
  const roleSet = new Set(
    (Array.isArray(roles) ? roles : [roles]).map((entry) => String(entry || "")),
  );
  let cursor = target || null;
  while (cursor) {
    if (typeof cursor.getAttribute === "function") {
      const role = cursor.getAttribute("data-zs-role");
      if (role && roleSet.has(String(role))) {
        return true;
      }
    }
    if (cursor === boundary) {
      break;
    }
    cursor = cursor.parentNode || null;
  }
  return false;
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function getTagPrefix(tag) {
  const text = String(tag || "").trim();
  const splitAt = text.indexOf(":");
  if (splitAt <= 0) {
    return "";
  }
  return text.slice(0, splitAt).trim();
}

function normalizeEntry(entry) {
  const source = entry && typeof entry === "object" ? entry : {};
  const facetFromField = String(source.facet || "").trim().toLowerCase();
  const rawTag = String(source.tag || "").trim();
  const facetFromTag = getTagPrefix(rawTag).toLowerCase();
  const facet = facetFromField || facetFromTag || "topic";
  let tag = rawTag;
  if (tag && !tag.includes(":")) {
    tag = `${facet}:${tag}`;
  }
  return {
    tag,
    facet,
    source: String(source.source || "manual").trim() || "manual",
    note: String(source.note || ""),
    deprecated: Boolean(source.deprecated),
  };
}

function toIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function nowIsoTimestamp() {
  return new Date().toISOString();
}

function normalizeStagedEntry(entry) {
  const now = nowIsoTimestamp();
  const normalized = normalizeStagedEntryWithBindings(entry, {
    defaultSourceFlow: STAGED_SOURCE_FLOW_DEFAULT,
  });
  const createdAt = toIsoTimestamp(normalized.createdAt) || now;
  const updatedAt = toIsoTimestamp(normalized.updatedAt) || createdAt;
  return {
    tag: normalized.tag,
    facet: normalized.facet,
    source: normalized.source,
    note: normalized.note,
    deprecated: normalized.deprecated,
    createdAt,
    updatedAt,
    sourceFlow: normalized.sourceFlow || STAGED_SOURCE_FLOW_DEFAULT,
    parentBindings: Array.isArray(normalized.parentBindings)
      ? [...normalized.parentBindings]
      : [],
    publishState: String(normalized.publishState || "").trim(),
  };
}

function normalizeEntriesInput(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.map((entry) => normalizeEntry(entry));
}

function normalizeStagedEntriesInput(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.map((entry) => normalizeStagedEntry(entry));
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    const facetCmp = left.facet.localeCompare(right.facet, "en", {
      sensitivity: "base",
    });
    if (facetCmp !== 0) {
      return facetCmp;
    }
    return left.tag.localeCompare(right.tag, "en", {
      sensitivity: "base",
    });
  });
}

function sortStagedEntries(entries) {
  return [...entries].sort((left, right) => {
    const facetCmp = String(left.facet || "").localeCompare(
      String(right.facet || ""),
      "en",
      {
        sensitivity: "base",
      },
    );
    if (facetCmp !== 0) {
      return facetCmp;
    }
    const tagCmp = String(left.tag || "").localeCompare(String(right.tag || ""), "en", {
      sensitivity: "base",
    });
    if (tagCmp !== 0) {
      return tagCmp;
    }
    const createdLeft = String(left.createdAt || "");
    const createdRight = String(right.createdAt || "");
    return createdLeft.localeCompare(createdRight, "en", {
      sensitivity: "base",
    });
  });
}

function collectValidationIssues(entries) {
  const issues = [];
  const exactSeen = new Map();
  const lowerSeen = new Map();
  entries.forEach((entry, index) => {
    const loc = `entry[${index}]`;
    const tag = String(entry.tag || "").trim();
    const facet = String(entry.facet || "").trim();
    const prefix = getTagPrefix(tag);
    if (!FACETS.includes(facet)) {
      issues.push({
        code: "INVALID_FACET",
        message: `${loc}: facet '${facet}' is invalid`,
      });
    }
    if (!tag) {
      issues.push({
        code: "INVALID_FORMAT",
        message: `${loc}: tag is empty`,
      });
    } else {
      if (tag.length > MAX_TAG_LENGTH) {
        issues.push({
          code: "INVALID_FORMAT",
          message: `${loc}: tag length exceeds ${MAX_TAG_LENGTH}`,
        });
      }
      if (!TAG_PATTERN.test(tag)) {
        issues.push({
          code: "INVALID_FORMAT",
          message: `${loc}: tag '${tag}' does not match required pattern`,
        });
      }
      if (prefix && facet && prefix !== facet) {
        issues.push({
          code: "FACET_FIELD_MATCH",
          message: `${loc}: facet '${facet}' does not match tag prefix '${prefix}'`,
        });
      }
      if (exactSeen.has(tag)) {
        issues.push({
          code: "DUPLICATE",
          message: `${loc}: tag '${tag}' duplicates ${exactSeen.get(tag)}`,
        });
      } else {
        exactSeen.set(tag, loc);
      }
      const lowered = tag.toLowerCase();
      if (lowerSeen.has(lowered) && lowerSeen.get(lowered) !== tag) {
        issues.push({
          code: "CASE_DUPLICATE",
          message: `${loc}: tag '${tag}' case-conflicts with '${lowerSeen.get(lowered)}'`,
        });
      } else {
        lowerSeen.set(lowered, tag);
      }
    }
    if (typeof entry.deprecated !== "boolean") {
      issues.push({
        code: "DEPRECATED_BOOLEAN",
        message: `${loc}: deprecated must be boolean`,
      });
    }
  });
  return issues;
}

function collectImportValidationIssues(entry, index, options) {
  const issues = [];
  const normalized = normalizeEntry({
    ...entry,
    source: String(entry?.source || options?.source || "import").trim(),
  });
  const requiredFields = ["tag", "facet", "source", "note", "deprecated"];
  for (const field of requiredFields) {
    if (typeof entry !== "object" || entry === null || !(field in entry)) {
      issues.push({
        code: "PARSE_ERROR",
        message: `entry[${index}] missing required field '${field}'`,
      });
    }
  }
  const baseIssues = collectValidationIssues([normalized]).map((issue) => ({
    ...issue,
    message: `entry[${index}] ${issue.message.replace(/^entry\[0\]\s*/, "")}`,
  }));
  return {
    normalized,
    issues: [...issues, ...baseIssues],
  };
}

function normalizeOnDuplicate(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (ON_DUPLICATE_OPTIONS.includes(normalized)) {
    return normalized;
  }
  return "skip";
}

function createImportReport() {
  return {
    imported: [],
    skipped: [],
    overwritten: [],
    errors: [],
    files_written: [],
    aborted: false,
  };
}

function importFromYamlText(args) {
  const existing = sortEntries(normalizeEntriesInput(args?.existingEntries));
  const options = {
    onDuplicate: normalizeOnDuplicate(args?.options?.onDuplicate),
    source: String(args?.options?.source || "import").trim() || "import",
    dryRun: Boolean(args?.options?.dryRun),
  };
  const report = createImportReport();

  let importedEntries = [];
  try {
    importedEntries = parseYamlTagEntries(args?.yamlText);
  } catch (error) {
    report.aborted = true;
    report.errors.push({
      tag: "",
      code: "PARSE_ERROR",
      message: String(error),
    });
    return {
      nextEntries: existing,
      report,
    };
  }

  if (!Array.isArray(importedEntries) || importedEntries.length === 0) {
    report.aborted = true;
    report.errors.push({
      tag: "",
      code: "EMPTY_INPUT",
      message: "Import list is empty.",
    });
    return {
      nextEntries: existing,
      report,
    };
  }

  const working = [...existing];
  const exactIndex = new Map();
  const lowerIndex = new Map();
  working.forEach((entry, index) => {
    exactIndex.set(entry.tag, index);
    lowerIndex.set(entry.tag.toLowerCase(), index);
  });

  for (let i = 0; i < importedEntries.length; i++) {
    const candidate = importedEntries[i];
    const validation = collectImportValidationIssues(candidate, i, options);
    if (validation.issues.length > 0) {
      validation.issues.forEach((issue) => {
        report.errors.push({
          tag: String(validation.normalized.tag || ""),
          code: issue.code,
          message: issue.message,
        });
      });
      if (validation.issues.some((issue) => issue.code === "PARSE_ERROR")) {
        report.aborted = true;
        return {
          nextEntries: existing,
          report,
        };
      }
      continue;
    }

    const nextEntry = validation.normalized;
    const key = String(nextEntry.tag || "");
    const lower = key.toLowerCase();
    const duplicateExactIndex = exactIndex.get(key);
    const duplicateLowerIndex = lowerIndex.get(lower);
    const duplicateIndex =
      typeof duplicateExactIndex === "number"
        ? duplicateExactIndex
        : duplicateLowerIndex;

    if (typeof duplicateIndex === "number") {
      if (options.onDuplicate === "skip") {
        report.skipped.push(key);
        continue;
      }
      if (options.onDuplicate === "error") {
        report.aborted = true;
        report.errors.push({
          tag: key,
          code: "DUPLICATE",
          message: `Tag '${key}' already exists (on_duplicate=error).`,
        });
        return {
          nextEntries: existing,
          report,
        };
      }
      const previous = working[duplicateIndex];
      exactIndex.delete(previous.tag);
      lowerIndex.delete(previous.tag.toLowerCase());
      working[duplicateIndex] = nextEntry;
      exactIndex.set(nextEntry.tag, duplicateIndex);
      lowerIndex.set(nextEntry.tag.toLowerCase(), duplicateIndex);
      report.overwritten.push(nextEntry.tag);
      continue;
    }

    working.push(nextEntry);
    const insertedIndex = working.length - 1;
    exactIndex.set(nextEntry.tag, insertedIndex);
    lowerIndex.set(nextEntry.tag.toLowerCase(), insertedIndex);
    report.imported.push(nextEntry.tag);
  }

  const nextEntries = sortEntries(working);
  const postIssues = collectValidationIssues(nextEntries);
  if (postIssues.length > 0) {
    report.aborted = true;
    postIssues.forEach((issue) => {
      report.errors.push({
        tag: "",
        code: issue.code,
        message: issue.message,
      });
    });
    return {
      nextEntries: existing,
      report,
    };
  }

  if (!options.dryRun) {
    report.files_written = ["tagVocabularyJson"];
  }
  return {
    nextEntries: options.dryRun ? existing : nextEntries,
    report,
  };
}

function assertNoValidationIssues(entries) {
  const issues = collectValidationIssues(entries);
  if (issues.length === 0) {
    return;
  }
  const head = issues
    .slice(0, 3)
    .map((issue) => `${issue.code}: ${issue.message}`)
    .join("; ");
  throw new Error(`tag-manager validation failed: ${head}`);
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function buildRemoteSyncNotice(args) {
  const base = String(args.sourceLabel || "").trim();
  if (args.status === "unconfigured") {
    return "GitHub sync not configured; Tag Manager is running in local-only mode.";
  }
  if (args.status === "subscribed") {
    return `Subscribed remote vocabulary from ${base}.`;
  }
  if (args.status === "subscribe-failed") {
    return `GitHub subscribe failed for ${base}; last successful remote snapshot fallback is in use. ${String(
      args.reason || "",
    ).trim()}`;
  }
  if (args.status === "configured") {
    return `GitHub sync configured for ${base}.`;
  }
  if (args.status === "publish-pending") {
    return `Queued staged vocabulary publish to ${base}.`;
  }
  if (args.status === "publishing") {
    return `Publishing vocabulary to ${base}...`;
  }
  if (args.status === "publish-succeeded") {
    return `Published vocabulary to ${base}.`;
  }
  if (args.status === "publish-failed") {
    return `GitHub publish failed for ${base}; staged entries remain pending. ${String(
      args.reason || "",
    ).trim()}`;
  }
  if (args.status === "save-publish-failed") {
    return `GitHub publish failed for ${base}; controlled draft is preserved for retry. ${String(
      args.reason || "",
    ).trim()}`;
  }
  if (args.status === "controlled-dirty") {
    return String(args.reason || "Save or discard controlled edits before opening staged tags.");
  }
  return String(args.reason || "").trim();
}

function appendTagManagerSyncLog(input) {
  return appendWorkflowRuntimeLog(input);
}

function showTagManagerSyncToast(args) {
  showWorkflowToast(args);
}

function showSubscriptionPublishToast(args) {
  const action = String(args?.action || "publish").trim() || "publish";
  const success = args?.success === true;
  const count = Number(args?.count || 0);
  const reason = String(args?.reason || "").trim();
  if (success) {
    const suffix = count > 0 ? ` (${count} tag${count === 1 ? "" : "s"})` : "";
    showTagManagerSyncToast({
      text: `Tag Manager ${action} succeeded${suffix}`,
      type: "success",
    });
    return;
  }
  showTagManagerSyncToast({
    text: `Tag Manager ${action} failed${reason ? `: ${reason}` : ""}`,
    type: "error",
  });
}

async function appendTagToParentItem(parentItemId, tag) {
  const numericParentId = Number(parentItemId);
  const normalizedTag = String(tag || "").trim();
  if (!Number.isFinite(numericParentId) || numericParentId <= 0 || !normalizedTag) {
    return false;
  }
  const item = requireHostItems().get(Math.trunc(numericParentId));
  if (!item || typeof item.addTag !== "function" || typeof item.getTags !== "function") {
    return false;
  }
  const currentTags = Array.isArray(item.getTags()) ? item.getTags() : [];
  if (
    currentTags.some(
      (entry) => String(entry?.tag || "").trim().toLowerCase() === normalizedTag.toLowerCase(),
    )
  ) {
    return false;
  }
  item.addTag(normalizedTag);
  await item.saveTx();
  return true;
}

async function appendTagsToBoundParentItems(args) {
  const workflowId = String(args?.workflowId || TAG_MANAGER_WORKFLOW_ID).trim();
  const bindingsByTag = args?.bindingsByTag instanceof Map ? args.bindingsByTag : new Map();
  let appliedCount = 0;
  for (const [loweredTag, parentBindings] of bindingsByTag.entries()) {
    const normalizedTag = String(loweredTag || "").trim();
    if (!normalizedTag) {
      continue;
    }
    for (const parentItemId of Array.isArray(parentBindings) ? parentBindings : []) {
      try {
        const changed = await appendTagToParentItem(parentItemId, normalizedTag);
        if (changed) {
          appliedCount += 1;
        }
      } catch (error) {
        appendTagManagerSyncLog({
          level: "warn",
          scope: "hook",
          workflowId,
          stage: "staged-parent-bindings-apply-failed",
          message: "tag-manager failed to append committed tag to bound parent item",
          details: {
            parent_item_id: Number(parentItemId || 0) || undefined,
            tag: normalizedTag,
          },
          error,
        });
      }
    }
  }
  appendTagManagerSyncLog({
    level: "info",
    scope: "hook",
    workflowId,
    stage: "staged-parent-bindings-applied-to-items",
    message: "tag-manager applied committed tags to bound parent items",
    details: {
      bound_tag_count: bindingsByTag.size,
      applied_item_tag_count: appliedCount,
    },
  });
  return appliedCount;
}

function readRawPref(key) {
  const raw = requireHostPrefs().get(String(key || "").trim(), true);
  return typeof raw === "string" ? raw.trim() : "";
}

function loadValidatedEntriesStateFromRaw(raw) {
  if (!raw) {
    return {
      corrupted: false,
      entries: [],
      issues: [],
    };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      corrupted: true,
      entries: [],
      issues: [{ code: "INVALID_JSON", message: "persisted payload is invalid JSON" }],
    };
  }
  const candidateEntries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.entries)
      ? parsed.entries
      : null;
  if (!candidateEntries) {
    return {
      corrupted: true,
      entries: [],
      issues: [{ code: "INVALID_PAYLOAD", message: "persisted payload shape is invalid" }],
    };
  }
  const normalized = sortEntries(normalizeEntriesInput(candidateEntries));
  const issues = collectValidationIssues(normalized);
  if (issues.length > 0) {
    return {
      corrupted: true,
      entries: [],
      issues,
    };
  }
  return {
    corrupted: false,
    entries: normalized,
    issues: [],
  };
}

function loadStagedEntriesStateFromRaw(raw) {
  if (!raw) {
    return {
      corrupted: false,
      entries: [],
      issues: [],
    };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      corrupted: true,
      entries: [],
      issues: [
        { code: "INVALID_JSON", message: "persisted staged payload is invalid JSON" },
      ],
    };
  }
  const candidateEntries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.entries)
      ? parsed.entries
      : null;
  if (!candidateEntries) {
    return {
      corrupted: true,
      entries: [],
      issues: [
        {
          code: "INVALID_PAYLOAD",
          message: "persisted staged payload shape is invalid",
        },
      ],
    };
  }
  return {
    corrupted: false,
    entries: sortStagedEntries(normalizeStagedEntriesInput(candidateEntries)),
    issues: [],
  };
}

function syncActiveCommittedProjection(entries) {
  return syncActiveCommittedProjectionCore(entries);
}

function persistLocalCommittedEntries(entries) {
  const normalized = sortEntries(normalizeEntriesInput(entries));
  assertNoValidationIssues(normalized);
  return persistLocalCommittedEntriesCore(normalized);
}

function persistRemoteCommittedEntries(entries) {
  const normalized = sortEntries(normalizeEntriesInput(entries));
  assertNoValidationIssues(normalized);
  return persistRemoteCommittedEntriesCore(normalized);
}

function loadLocalCommittedState() {
  return loadLocalCommittedStateCore({
    loadValidatedEntriesStateFromRaw,
  });
}

function loadRemoteCommittedState() {
  return loadRemoteCommittedStateCore({
    loadValidatedEntriesStateFromRaw,
  });
}

function loadPersistedState(args) {
  return loadPersistedStateCore({
    workflowId: TAG_MANAGER_WORKFLOW_ID,
    syncConfig: args?.syncConfig,
    loadValidatedEntriesStateFromRaw,
  });
}

function persistEntries(entries, args) {
  const normalized = sortEntries(normalizeEntriesInput(entries));
  assertNoValidationIssues(normalized);
  return persistEntriesCore(normalized, {
    workflowId: TAG_MANAGER_WORKFLOW_ID,
    syncConfig: args?.syncConfig,
    mode: args?.mode,
  });
}

function persistStagedEntries(entries) {
  const normalized = sortStagedEntries(normalizeStagedEntriesInput(entries));
  return persistStagedEntriesCore(normalized);
}

function loadPersistedStagedState() {
  return loadPersistedStagedStateCore({
    loadStagedEntriesStateFromRaw,
  });
}

async function subscribeRemoteVocabulary(args) {
  const config = args?.config || {};
  const workflowId = String(args?.workflowId || "").trim();
  return subscribeRemoteVocabularyCore({
    workflowId,
    config,
    log: (event) =>
      appendTagManagerSyncLog({
        level: String(event?.level || "info").trim() || "info",
        scope: "hook",
        workflowId,
        stage: String(event?.stage || "subscribe").trim() || "subscribe",
        message: `tag-manager remote vocabulary ${String(event?.stage || "subscribe").trim()}`,
        details: event?.details || {},
        error: event?.error,
      }),
  });
}

async function publishRemoteVocabulary(args) {
  const config = args?.config || {};
  const workflowId = String(args?.workflowId || "").trim();
  const normalizedEntries = sortEntries(normalizeEntriesInput(args?.entries));
  assertNoValidationIssues(normalizedEntries);
  return publishRemoteVocabularyCore({
    workflowId,
    config,
    entries: normalizedEntries,
    log: (event) =>
      appendTagManagerSyncLog({
        level: String(event?.level || "info").trim() || "info",
        scope: "hook",
        workflowId,
        stage: String(event?.stage || "publish").trim() || "publish",
        message: `tag-manager remote vocabulary ${String(event?.stage || "publish").trim()}`,
        details: event?.details || {},
        error: event?.error,
      }),
  });
}

async function commitControlledEntries(args) {
  const workflowId = String(args?.workflowId || TAG_MANAGER_WORKFLOW_ID).trim();
  const syncConfig = args?.config || resolveGitHubSyncConfig(TAG_MANAGER_WORKFLOW_ID);
  const mode = args?.mode || resolveTagManagerMode(syncConfig);
  const nextEntries = normalizeEntriesInput(args?.entries);
  if (mode !== "subscription") {
    const committed = persistLocalCommittedEntries(nextEntries);
    syncActiveCommittedProjection(committed.entries);
    return {
      mode,
      entries: committed.entries,
    };
  }
  const published = await publishRemoteVocabulary({
    workflowId,
    config: syncConfig,
    entries: nextEntries,
  });
  const committed = persistRemoteCommittedEntries(published.tags);
  syncActiveCommittedProjection(committed.entries);
  return {
    mode,
    entries: committed.entries,
  };
}

function mergeUniqueEntriesByTag(entries) {
  const next = [];
  const indexByLower = new Map();
  for (const entry of sortEntries(normalizeEntriesInput(entries))) {
    const lowered = String(entry.tag || "").trim().toLowerCase();
    if (!lowered) {
      continue;
    }
    if (indexByLower.has(lowered)) {
      next[indexByLower.get(lowered)] = entry;
      continue;
    }
    indexByLower.set(lowered, next.length);
    next.push(entry);
  }
  return next;
}

function sameNormalizedEntries(left, right) {
  const leftSnapshot = JSON.stringify(sortEntries(normalizeEntriesInput(left)));
  const rightSnapshot = JSON.stringify(sortEntries(normalizeEntriesInput(right)));
  return leftSnapshot === rightSnapshot;
}

async function commitStagedEntriesBatch(args) {
  const workflowId = String(args?.workflowId || TAG_MANAGER_WORKFLOW_ID).trim();
  const config = args?.config || {};
  const requestedTags = new Set(
    (Array.isArray(args?.tags) ? args.tags : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );
  if (requestedTags.size === 0) {
    return {
      entries: loadRemoteCommittedState().entries,
      promotedTags: [],
    };
  }

  const stagedLoaded = loadPersistedStagedState();
  const selectedEntries = stagedLoaded.entries.filter((entry) =>
    requestedTags.has(String(entry.tag || "").trim().toLowerCase()),
  );
  const selectedBindingsByTag = collectParentBindingsByTag(selectedEntries);
  const tagTextByLower = new Map(
    selectedEntries.map((entry) => [
      String(entry.tag || "").trim().toLowerCase(),
      String(entry.tag || "").trim(),
    ]),
  );
  if (selectedEntries.length === 0) {
    return {
      entries: loadRemoteCommittedState().entries,
      promotedTags: [],
    };
  }

  appendTagManagerSyncLog({
    level: "info",
    scope: "hook",
    workflowId,
    stage: "staged-batch-publish-start",
    message: "tag-manager staged batch publish started",
    details: {
      owner: config.githubOwner,
      repo: config.githubRepo,
      file_path: config.filePath,
      tag_count: selectedEntries.length,
    },
  });

  const committedLoaded = loadRemoteCommittedState();
  const nextEntries = mergeUniqueEntriesByTag([
    ...committedLoaded.entries,
    ...selectedEntries,
  ]);

  try {
    const published = await publishRemoteVocabulary({
      workflowId,
      config,
      entries: nextEntries,
    });
    const committed = persistRemoteCommittedEntries(published.tags);
    syncActiveCommittedProjection(committed.entries);
    await appendTagsToBoundParentItems({
      workflowId,
      bindingsByTag: new Map(
        [...selectedBindingsByTag.entries()].map(([loweredTag, parentBindings]) => [
          tagTextByLower.get(loweredTag) || loweredTag,
          parentBindings,
        ]),
      ),
    });
    removeStagedEntriesByTags(selectedEntries.map((entry) => entry.tag));
    appendTagManagerSyncLog({
      level: "info",
      scope: "hook",
      workflowId,
      stage: "staged-batch-publish-succeeded",
      message: "tag-manager staged batch publish succeeded",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
        tag_count: selectedEntries.length,
      },
    });
    showSubscriptionPublishToast({
      action: "staged publish",
      success: true,
      count: selectedEntries.length,
    });
    return {
      entries: committed.entries,
      promotedTags: selectedEntries.map((entry) => entry.tag),
    };
  } catch (error) {
    appendTagManagerSyncLog({
      level: "warn",
      scope: "hook",
      workflowId,
      stage: "staged-batch-publish-failed",
      message: "tag-manager staged batch publish failed",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
        tag_count: selectedEntries.length,
      },
      error,
    });
    showSubscriptionPublishToast({
      action: "staged publish",
      success: false,
      reason: String(error?.message || error || "unknown publish failure"),
    });
    throw error;
  }
}

function removeStagedEntriesByTags(tags) {
  const lowered = new Set(
    (Array.isArray(tags) ? tags : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter((entry) => !!entry),
  );
  const loaded = loadPersistedStagedState();
  const kept = normalizeStagedEntriesInput(loaded.entries).filter(
    (entry) => !lowered.has(String(entry.tag || "").trim().toLowerCase()),
  );
  return persistStagedEntries(kept);
}

function clearPersistedStagedEntries() {
  return persistStagedEntries([]);
}

function promoteStagedEntryToControlledVocabulary(stagedEntry) {
  const loaded = loadLocalCommittedState();
  if (loaded.corrupted) {
    return {
      ok: false,
      reason: "controlled vocabulary is corrupted",
    };
  }
  const candidate = normalizeEntry(stagedEntry);
  const nextEntries = [...loaded.entries, candidate];
  const issues = collectValidationIssues(nextEntries);
  if (issues.length > 0) {
    const targetIndex = nextEntries.length - 1;
    const targetToken = `entry[${targetIndex}]`;
    const preferred = issues.find((issue) =>
      String(issue?.message || "").includes(targetToken),
    );
    const issue = preferred || issues[0];
    return {
      ok: false,
      reason: String(issue?.message || issue?.code || "validation failed"),
    };
  }
  const persisted = persistLocalCommittedEntries(nextEntries);
  syncActiveCommittedProjection(persisted.entries);
  return {
    ok: true,
    reason: "",
    entries: persisted.entries,
  };
}

function exportTagStrings(entries) {
  return sortEntries(entries)
    .filter((entry) => !entry.deprecated)
    .map((entry) => entry.tag);
}

function buildExportText(entries) {
  return exportTagStrings(entries).join("\n");
}

function createStagedPublishCoordinator(args) {
  const workflowId = String(args?.workflowId || TAG_MANAGER_WORKFLOW_ID).trim();
  const syncConfig = args?.syncConfig || {};
  let timerHandle = null;
  let disposed = false;
  const pendingTags = new Set();

  const flush = async (patchRootState) => {
    if (disposed || pendingTags.size === 0) {
      return;
    }
    const batchTags = [...pendingTags];
    pendingTags.clear();
    persistStagedEntries(
      setPublishStateForTags(loadPersistedStagedState().entries, batchTags, "publishing", {
        defaultSourceFlow: STAGED_SOURCE_FLOW_DEFAULT,
      }),
    );
    patchRootState((draft) => {
      const stagedState = ensureStagedPanelState(draft);
      stagedState.entries = loadPersistedStagedState().entries;
      stagedState.publishInFlight = true;
      stagedState.pendingPublishTags = batchTags;
      stagedState.actionNotice = `publishing ${batchTags.length} staged tag(s)...`;
      draft.remoteSyncState = "publishing";
      draft.remoteSyncMessage = buildRemoteSyncNotice({
        status: "publishing",
        sourceLabel: syncConfig.sourceLabel,
      });
    });
    try {
      const committed = await commitStagedEntriesBatch({
        workflowId,
        config: syncConfig,
        tags: batchTags,
      });
      patchRootState((draft) => {
        const stagedState = ensureStagedPanelState(draft);
        stagedState.entries = loadPersistedStagedState().entries;
        stagedState.pendingPublishTags = [];
        stagedState.publishInFlight = false;
        stagedState.validationIssues = [];
        stagedState.actionNotice = `published ${committed.promotedTags.length} staged tag(s)`;
        draft.committedEntries = committed.entries;
        draft.entries = committed.entries;
        draft.remoteSyncState = "publish-succeeded";
        draft.remoteSyncMessage = buildRemoteSyncNotice({
          status: "publish-succeeded",
          sourceLabel: syncConfig.sourceLabel,
        });
      });
    } catch (error) {
      const reason = String(error?.message || error || "unknown publish failure").trim();
      persistStagedEntries(
        setPublishStateForTags(loadPersistedStagedState().entries, batchTags, "publish-failed", {
          defaultSourceFlow: STAGED_SOURCE_FLOW_DEFAULT,
        }),
      );
      patchRootState((draft) => {
        const stagedState = ensureStagedPanelState(draft);
        stagedState.entries = loadPersistedStagedState().entries;
        stagedState.pendingPublishTags = [];
        stagedState.publishInFlight = false;
        stagedState.validationIssues = [
          {
            code: "PUBLISH_FAILED",
            message: reason,
          },
        ];
        stagedState.actionNotice = `publish failed: ${reason}`;
        draft.remoteSyncState = "publish-failed";
        draft.remoteSyncMessage = buildRemoteSyncNotice({
          status: "publish-failed",
          sourceLabel: syncConfig.sourceLabel,
          reason,
        });
      });
    }
  };

  return {
    schedule(tag, patchRootState) {
      const normalizedTag = String(tag || "").trim();
      if (!normalizedTag || disposed) {
        return;
      }
      pendingTags.add(normalizedTag);
      persistStagedEntries(
        setPublishStateForTags(loadPersistedStagedState().entries, [normalizedTag], "pending-batch", {
          defaultSourceFlow: STAGED_SOURCE_FLOW_DEFAULT,
        }),
      );
      appendTagManagerSyncLog({
        level: "info",
        scope: "hook",
        workflowId,
        stage: "staged-batch-scheduled",
        message: "tag-manager staged batch scheduled",
        details: {
          owner: syncConfig.githubOwner,
          repo: syncConfig.githubRepo,
          file_path: syncConfig.filePath,
          pending_count: pendingTags.size,
        },
      });
      patchRootState((draft) => {
        const stagedState = ensureStagedPanelState(draft);
        stagedState.pendingPublishTags = [...new Set([...stagedState.pendingPublishTags, normalizedTag])];
        stagedState.publishInFlight = false;
        stagedState.validationIssues = [];
        stagedState.actionNotice = `queued ${stagedState.pendingPublishTags.length} staged tag(s) for publish`;
        draft.remoteSyncState = "publish-pending";
        draft.remoteSyncMessage = buildRemoteSyncNotice({
          status: "publish-pending",
          sourceLabel: syncConfig.sourceLabel,
        });
      });
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
      timerHandle = setTimeout(() => {
        timerHandle = null;
        void flush(patchRootState);
      }, STAGED_PUBLISH_DEBOUNCE_MS);
    },
    dispose() {
      disposed = true;
      if (timerHandle) {
        clearTimeout(timerHandle);
        timerHandle = null;
      }
    },
  };
}

function createInitialFacetVisibilityState() {
  const state = {};
  for (const facet of FACETS) {
    state[facet] = true;
  }
  return state;
}

function normalizeFacetVisibilityState(visibility) {
  const normalized = createInitialFacetVisibilityState();
  const source = visibility && typeof visibility === "object" ? visibility : {};
  for (const facet of FACETS) {
    if (typeof source[facet] === "boolean") {
      normalized[facet] = source[facet];
    }
  }
  return normalized;
}

function countVisibleFacets(visibility) {
  const normalized = normalizeFacetVisibilityState(visibility);
  let total = 0;
  for (const facet of FACETS) {
    if (normalized[facet] !== false) {
      total += 1;
    }
  }
  return total;
}

function entryMatchesFacetVisibility(entry, visibility) {
  const normalized = normalizeFacetVisibilityState(visibility);
  const facet = String(entry?.facet || getTagPrefix(entry?.tag || "") || "")
    .trim()
    .toLowerCase();
  if (!FACETS.includes(facet)) {
    return false;
  }
  return normalized[facet] !== false;
}

function filterEntriesByQueryAndFacet(entries, query, facetVisibility) {
  const normalizedVisibility = normalizeFacetVisibilityState(facetVisibility);
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();
  const filtered = [];
  normalizeEntriesInput(entries).forEach((entry, index) => {
    if (!entryMatchesFacetVisibility(entry, normalizedVisibility)) {
      return;
    }
    const text = `${entry.tag} ${entry.facet} ${entry.note} ${entry.source}`.toLowerCase();
    if (!normalizedQuery || text.includes(normalizedQuery)) {
      filtered.push({ entry, index });
    }
  });
  return filtered;
}

function filterStagedEntriesByQueryAndFacet(entries, query, facetVisibility) {
  const normalizedVisibility = normalizeFacetVisibilityState(facetVisibility);
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();
  const filtered = [];
  normalizeStagedEntriesInput(entries).forEach((entry, index) => {
    if (!entryMatchesFacetVisibility(entry, normalizedVisibility)) {
      return;
    }
    const text = `${entry.tag} ${entry.facet} ${entry.note} ${entry.source}`.toLowerCase();
    if (!normalizedQuery || text.includes(normalizedQuery)) {
      filtered.push({ entry, index });
    }
  });
  return filtered;
}

function getTagSuffix(tag, facet) {
  const text = String(tag || "").trim();
  if (!text) {
    return "";
  }
  const splitAt = text.indexOf(":");
  if (splitAt <= 0) {
    return text;
  }
  const prefix = text.slice(0, splitAt).trim().toLowerCase();
  const expected = String(facet || "").trim().toLowerCase();
  if (expected && prefix !== expected) {
    return text;
  }
  return text.slice(splitAt + 1).trim();
}

function composeTagFromFacetAndSuffix(facet, suffix) {
  const normalizedFacet = FACETS.includes(String(facet || "").trim().toLowerCase())
    ? String(facet || "").trim().toLowerCase()
    : "topic";
  return `${normalizedFacet}:${String(suffix || "").trim()}`;
}

function formatDuplicateStrategyLabel(value) {
  const normalized = normalizeOnDuplicate(value);
  return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
}

async function copyTextToClipboard(doc, text) {
  const value = String(text || "");
  if (!value) {
    return { ok: false, reason: "empty-export" };
  }
  const nav =
    doc?.defaultView?.navigator ||
    globalThis?.navigator ||
    null;
  if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
    try {
      await nav.clipboard.writeText(value);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: String(error) };
    }
  }
  return { ok: false, reason: "clipboard-unavailable" };
}

function confirmAction(doc, message) {
  const view = doc && doc.defaultView ? doc.defaultView : null;
  if (view && typeof view.confirm === "function") {
    try {
      return Boolean(view.confirm(String(message || "")));
    } catch {
      return false;
    }
  }
  return true;
}

function resolveEditorHostBridge() {
  const host = requireHostEditor();
  return {
    open: host.openSession,
    registerRenderer: host.registerRenderer,
  };
}

function createInitialStagedPanelState(args) {
  const loadedEntries = sortStagedEntries(
    normalizeStagedEntriesInput(args?.entries || []),
  );
  return {
    entries: loadedEntries,
    query: "",
    actionNotice: "",
    validationIssues: [],
    facetVisibility: createInitialFacetVisibilityState(),
    facetMenuRowIndex: -1,
    filterPanelOpen: false,
    queryFocus: {
      active: false,
      start: 0,
      end: 0,
    },
    editorFocus: {
      active: false,
      rowIndex: -1,
      role: "",
      start: 0,
      end: 0,
    },
    listScrollTop: 0,
    listScrollMode: "keep",
    corrupted: Boolean(args?.corrupted),
    pendingPublishTags: [],
    publishInFlight: false,
  };
}

function ensureStagedPanelState(hostState) {
  if (
    hostState &&
    typeof hostState === "object" &&
    hostState.stagedPanelState &&
    typeof hostState.stagedPanelState === "object"
  ) {
    return hostState.stagedPanelState;
  }
  const loaded = loadPersistedStagedState();
  const initial = createInitialStagedPanelState({
    entries: loaded.entries,
    corrupted: loaded.corrupted,
  });
  if (hostState && typeof hostState === "object") {
    hostState.stagedPanelState = initial;
  }
  return initial;
}

function createTagManagerRenderer() {
  return {
    render({ doc, root, state, host, context }) {
      clearChildren(root);
      const activePanel = String(state.activePanel || "controlled");
      if (activePanel === "staged") {
        if (typeof host.setFooterVisible === "function") {
          host.setFooterVisible(false);
        }
        const panel = createHtmlElement(doc, "div");
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.gap = "8px";
        panel.style.height = "100%";
        panel.style.boxSizing = "border-box";

        const toolbar = createHtmlElement(doc, "div");
        toolbar.style.display = "flex";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "8px";

        const title = createHtmlElement(doc, "div");
        title.textContent = "Staged Tags Inbox";
        title.style.fontWeight = "600";
        title.style.fontSize = "13px";
        toolbar.appendChild(title);

        const backBtn = createHtmlElement(doc, "button");
        backBtn.type = "button";
        backBtn.textContent = "Back To Controlled";
        if (typeof backBtn.setAttribute === "function") {
          backBtn.setAttribute("data-zs-role", "staged-back-btn");
        }
        backBtn.addEventListener("click", () => {
          host.patchState((draft) => {
            draft.activePanel = "controlled";
            draft.entries = sortEntries(
              normalizeEntriesInput(
                Array.isArray(draft.committedEntries) ? draft.committedEntries : [],
              ),
            );
          });
        });
        toolbar.appendChild(backBtn);
        panel.appendChild(toolbar);

        const stagedRoot = createHtmlElement(doc, "div");
        stagedRoot.style.flex = "1 1 auto";
        stagedRoot.style.minHeight = "0";
        panel.appendChild(stagedRoot);

        const stagedRenderer = createStagedTagInboxRenderer();
        const stagedState = ensureStagedPanelState(state);
        const stagedHost = {
          rerender: () => {
            if (typeof host.rerender === "function") {
              host.rerender();
            }
          },
          patchState: (updater) => {
            host.patchState((draft) => {
              const stagedDraft = ensureStagedPanelState(draft);
              updater(stagedDraft);
              draft.stagedPanelState = stagedDraft;
            });
          },
          closeWithAction: (actionId) => {
            if (typeof host.closeWithAction === "function") {
              host.closeWithAction(actionId);
            }
          },
          setFooterVisible: (visible) => {
            if (typeof host.setFooterVisible === "function") {
              host.setFooterVisible(visible);
            }
          },
          patchRootState: (updater) => {
            host.patchState(updater);
          },
        };
        stagedRenderer.render({
          doc,
          root: stagedRoot,
          state: stagedState,
          host: stagedHost,
          context,
        });
        root.appendChild(panel);
        return;
      }
      if (typeof host.setFooterVisible === "function") {
        host.setFooterVisible(true);
      }
      state.mode = String(state.mode || "local") === "subscription" ? "subscription" : "local";
      if (!Array.isArray(state.entries)) {
        state.entries = [];
      }
      if (!Array.isArray(state.committedEntries)) {
        state.committedEntries = normalizeEntriesInput(state.entries);
      }
      const allEntries = normalizeEntriesInput(state.entries);
      state.committedEntries = normalizeEntriesInput(state.committedEntries);
      state.entries = allEntries;
      state.facetVisibility = normalizeFacetVisibilityState(state.facetVisibility);
      if (typeof state.listScrollTop !== "number") {
        state.listScrollTop = 0;
      }
      if (typeof state.listScrollMode !== "string") {
        state.listScrollMode = "keep";
      }
      if (typeof state.onDuplicateMenuOpen !== "boolean") {
        state.onDuplicateMenuOpen = false;
      }
      if (typeof state.facetMenuRowIndex !== "number") {
        state.facetMenuRowIndex = -1;
      }
      if (!state.editorFocus || typeof state.editorFocus !== "object") {
        state.editorFocus = {
          active: false,
          rowIndex: -1,
          role: "",
          start: 0,
          end: 0,
        };
      }
      const filtered = filterEntriesByQueryAndFacet(
        allEntries,
        state.query,
        state.facetVisibility,
      );
      let scrollContainerNode = null;
      const readScrollTop = () =>
        scrollContainerNode && typeof scrollContainerNode.scrollTop === "number"
          ? Number(scrollContainerNode.scrollTop || 0)
          : Number(state.listScrollTop || 0);
      const patchStateKeepingScroll = (updater, options) => {
        const scrollTop = readScrollTop();
        host.patchState((draft) => {
          draft.listScrollTop = scrollTop;
          draft.listScrollMode =
            options && options.scrollMode === "bottom" ? "bottom" : "keep";
          updater(draft);
        });
      };

      const panel = createHtmlElement(doc, "div");
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = "8px";
      panel.style.height = "100%";
      panel.style.boxSizing = "border-box";
      panel.style.position = "relative";

      if (String(state.remoteSyncMessage || "").trim()) {
        const syncNotice = createHtmlElement(doc, "div");
        syncNotice.textContent = String(state.remoteSyncMessage || "");
        syncNotice.style.fontSize = "12px";
        syncNotice.style.padding = "8px 10px";
        syncNotice.style.borderRadius = "6px";
        syncNotice.style.border =
          String(state.remoteSyncState || "").trim().includes("failed")
            ? "1px solid #d5a0a0"
            : "1px solid #d5d5d5";
        syncNotice.style.background =
          String(state.remoteSyncState || "").trim().includes("failed")
            ? "#fff6f6"
            : "#f7f7f7";
        syncNotice.style.color =
          String(state.remoteSyncState || "").trim().includes("failed")
            ? "#8f2a2a"
            : "#3b3b3b";
        if (typeof syncNotice.setAttribute === "function") {
          syncNotice.setAttribute("data-zs-role", "remote-sync-notice");
          syncNotice.setAttribute(
            "data-zs-sync-state",
            String(state.remoteSyncState || ""),
          );
        }
        panel.appendChild(syncNotice);
      }

      panel.addEventListener("click", (event) => {
        const hasDuplicateMenuOpen = Boolean(state.onDuplicateMenuOpen);
        const hasFacetMenuOpen = Number(state.facetMenuRowIndex) >= 0;
        if (!hasDuplicateMenuOpen && !hasFacetMenuOpen) {
          return;
        }
        const target = event ? event.target : null;
        const duplicateScopeRoles = [
          "on-duplicate-select",
          "on-duplicate-menu",
          "on-duplicate-option",
        ];
        const facetScopeRoles = ["facet-select", "facet-menu", "facet-option"];
        const keepDuplicateOpen = isNodeWithinRoles(target, panel, duplicateScopeRoles);
        const keepFacetOpen = isNodeWithinRoles(target, panel, facetScopeRoles);
        if (
          (hasDuplicateMenuOpen && !keepDuplicateOpen) ||
          (hasFacetMenuOpen && !keepFacetOpen)
        ) {
          patchStateKeepingScroll((draft) => {
            if (!keepDuplicateOpen) {
              draft.onDuplicateMenuOpen = false;
            }
            if (!keepFacetOpen) {
              draft.facetMenuRowIndex = -1;
            }
          });
        }
      });

      const toolbar = createHtmlElement(doc, "div");
      toolbar.style.display = "flex";
      toolbar.style.gap = "12px";
      toolbar.style.flexWrap = "wrap";
      toolbar.style.alignItems = "center";

      const mainActions = createHtmlElement(doc, "div");
      mainActions.style.display = "flex";
      mainActions.style.gap = "8px";
      mainActions.style.flexWrap = "wrap";
      mainActions.style.alignItems = "center";
      if (typeof mainActions.setAttribute === "function") {
        mainActions.setAttribute("data-zs-role", "main-actions-group");
      }

      const queryInput = createHtmlElement(doc, "input");
      queryInput.type = "search";
      queryInput.value = String(state.query || "");
      queryInput.placeholder = "Search tag/facet/source/note";
      queryInput.style.minWidth = "320px";
      queryInput.addEventListener("input", () => {
        const start =
          typeof queryInput.selectionStart === "number"
            ? queryInput.selectionStart
            : String(queryInput.value || "").length;
        const end =
          typeof queryInput.selectionEnd === "number"
            ? queryInput.selectionEnd
            : start;
        patchStateKeepingScroll((draft) => {
          draft.query = String(queryInput.value || "");
          draft.queryFocus = {
            active: true,
            start,
            end,
          };
        });
      });
      mainActions.appendChild(queryInput);

      const filterBtn = createHtmlElement(doc, "button");
      filterBtn.type = "button";
      filterBtn.textContent = "Filter";
      filterBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          draft.filterPanelOpen = !Boolean(draft.filterPanelOpen);
        });
      });
      mainActions.appendChild(filterBtn);

      const stagedBtn = createHtmlElement(doc, "button");
      stagedBtn.type = "button";
      stagedBtn.textContent = "Staged Tags";
      stagedBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          if (
            String(draft.mode || "local") === "subscription" &&
            !sameNormalizedEntries(draft.entries, draft.committedEntries)
          ) {
            draft.remoteSyncState = "controlled-dirty";
            draft.remoteSyncMessage = buildRemoteSyncNotice({
              status: "controlled-dirty",
              reason:
                "Save or discard controlled edits before opening staged tags in subscription mode.",
            });
            return;
          }
          draft.activePanel = "staged";
          ensureStagedPanelState(draft);
        });
      });
      mainActions.appendChild(stagedBtn);

      const addBtn = createHtmlElement(doc, "button");
      addBtn.type = "button";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          const list = normalizeEntriesInput(draft.entries);
          list.push({
            tag: "topic:new-tag",
            facet: "topic",
            source: "manual",
            note: "",
            deprecated: false,
          });
          draft.entries = list;
        }, { scrollMode: "bottom" });
      });
      mainActions.appendChild(addBtn);

      const validateBtn = createHtmlElement(doc, "button");
      validateBtn.type = "button";
      validateBtn.textContent = "Validate";
      validateBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          draft.validationIssues = collectValidationIssues(
            normalizeEntriesInput(draft.entries),
          );
        });
      });
      mainActions.appendChild(validateBtn);

      const exportBtn = createHtmlElement(doc, "button");
      exportBtn.type = "button";
      exportBtn.textContent = "Export";
      exportBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          const list = normalizeEntriesInput(draft.entries);
          draft.exportText = buildExportText(list);
          draft.exportNotice = "";
        });
      });
      mainActions.appendChild(exportBtn);
      toolbar.appendChild(mainActions);

      const importControls = createHtmlElement(doc, "div");
      importControls.style.display = "inline-flex";
      importControls.style.alignItems = "center";
      importControls.style.gap = "8px";
      importControls.style.paddingLeft = "12px";
      importControls.style.borderLeft = "1px solid #d5d5d5";
      if (typeof importControls.setAttribute === "function") {
        importControls.setAttribute("data-zs-role", "import-controls-group");
      }

      const duplicateControl = createHtmlElement(doc, "div");
      duplicateControl.style.position = "relative";
      duplicateControl.style.display = "inline-flex";
      duplicateControl.style.alignItems = "center";

      const duplicateTrigger = createHtmlElement(doc, "button");
      duplicateTrigger.type = "button";
      duplicateTrigger.textContent = `${formatDuplicateStrategyLabel(state.importOnDuplicate)} ▾`;
      if (typeof duplicateTrigger.setAttribute === "function") {
        duplicateTrigger.setAttribute("data-zs-role", "on-duplicate-select");
      }
      duplicateTrigger.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          draft.onDuplicateMenuOpen = !Boolean(draft.onDuplicateMenuOpen);
          draft.facetMenuRowIndex = -1;
        });
      });
      duplicateControl.appendChild(duplicateTrigger);

      if (state.onDuplicateMenuOpen) {
        const duplicateMenu = createHtmlElement(doc, "div");
        duplicateMenu.style.position = "absolute";
        duplicateMenu.style.top = "calc(100% + 4px)";
        duplicateMenu.style.left = "0";
        duplicateMenu.style.minWidth = "120px";
        duplicateMenu.style.display = "flex";
        duplicateMenu.style.flexDirection = "column";
        duplicateMenu.style.gap = "2px";
        duplicateMenu.style.padding = "4px";
        duplicateMenu.style.background = "#fff";
        duplicateMenu.style.border = "1px solid #cfcfcf";
        duplicateMenu.style.borderRadius = "4px";
        duplicateMenu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        duplicateMenu.style.zIndex = "40";
        if (typeof duplicateMenu.setAttribute === "function") {
          duplicateMenu.setAttribute("data-zs-role", "on-duplicate-menu");
        }
        duplicateMenu.addEventListener("click", (event) => {
          if (event && typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
        });
        for (const optionValue of ON_DUPLICATE_OPTIONS) {
          const optionBtn = createHtmlElement(doc, "button");
          optionBtn.type = "button";
          optionBtn.textContent = formatDuplicateStrategyLabel(optionValue);
          if (typeof optionBtn.setAttribute === "function") {
            optionBtn.setAttribute("data-zs-role", "on-duplicate-option");
            optionBtn.setAttribute("data-zs-option", optionValue);
          }
          optionBtn.addEventListener("click", () => {
            patchStateKeepingScroll((draft) => {
              draft.importOnDuplicate = normalizeOnDuplicate(optionValue);
              draft.onDuplicateMenuOpen = false;
            });
          });
          duplicateMenu.appendChild(optionBtn);
        }
        duplicateControl.appendChild(duplicateMenu);
      }

      const dryRunLabel = createHtmlElement(doc, "label");
      dryRunLabel.style.display = "inline-flex";
      dryRunLabel.style.alignItems = "center";
      dryRunLabel.style.gap = "4px";
      const dryRunInput = createHtmlElement(doc, "input");
      dryRunInput.type = "checkbox";
      dryRunInput.checked = Boolean(state.importDryRun);
      dryRunInput.addEventListener("change", () => {
        patchStateKeepingScroll((draft) => {
          draft.importDryRun = Boolean(dryRunInput.checked);
        });
      });
      const dryRunText = createHtmlElement(doc, "span");
      dryRunText.textContent = "Dry Run";
      dryRunLabel.appendChild(dryRunText);
      dryRunLabel.appendChild(dryRunInput);

      const importBtn = createHtmlElement(doc, "button");
      importBtn.type = "button";
      importBtn.textContent = "Import YAML";
      const importFileInput = createHtmlElement(doc, "input");
      importFileInput.type = "file";
      importFileInput.accept = ".yaml,.yml,text/yaml,application/x-yaml";
      importFileInput.style.display = "none";
      importFileInput.addEventListener("change", () => {
        const files = importFileInput.files;
        const selectedFile = files && files.length > 0 ? files[0] : null;
        if (!selectedFile) {
          patchStateKeepingScroll((draft) => {
            draft.importReport = {
              ...createImportReport(),
              aborted: true,
              errors: [
                {
                  tag: "",
                  code: "PARSE_ERROR",
                  message: "No file selected.",
                },
              ],
            };
          });
          return;
        }
        void (async () => {
          try {
            const text = await readTextFromFileObject(selectedFile);
            patchStateKeepingScroll((draft) => {
              const imported = importFromYamlText({
                existingEntries: normalizeEntriesInput(draft.entries),
                yamlText: text,
                options: {
                  onDuplicate: draft.importOnDuplicate,
                  source: "import",
                  dryRun: Boolean(draft.importDryRun),
                },
              });
              draft.entries = imported.nextEntries;
              draft.importReport = imported.report;
              draft.validationIssues = collectValidationIssues(
                normalizeEntriesInput(draft.entries),
              );
            });
          } catch (error) {
            patchStateKeepingScroll((draft) => {
              draft.importReport = {
                ...createImportReport(),
                aborted: true,
                errors: [
                  {
                    tag: "",
                    code: "PARSE_ERROR",
                    message: String(error),
                  },
                ],
              };
            });
          } finally {
            importFileInput.value = "";
          }
        })();
      });
      importBtn.addEventListener("click", () => {
        if (typeof importFileInput.click === "function") {
          importFileInput.click();
        }
      });

      const duplicateLabel = createHtmlElement(doc, "span");
      duplicateLabel.textContent = "On Duplicate:";
      if (typeof duplicateLabel.setAttribute === "function") {
        duplicateLabel.setAttribute("data-zs-role", "on-duplicate-label");
      }

      importControls.appendChild(importBtn);
      importControls.appendChild(dryRunLabel);
      importControls.appendChild(duplicateLabel);
      importControls.appendChild(duplicateControl);
      importControls.appendChild(importFileInput);
      toolbar.appendChild(importControls);
      panel.appendChild(toolbar);

      const list = createHtmlElement(doc, "div");
      list.style.flex = "1 1 auto";
      list.style.overflowY = "auto";
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "0";
      list.style.border = "1px solid #d5d5d5";
      list.style.borderRadius = "4px";
      list.style.background = "#fff";
      if (typeof list.setAttribute === "function") {
        list.setAttribute("data-zs-role", "tag-table-scroll");
      }
      scrollContainerNode = list;

      const headerRow = createHtmlElement(doc, "div");
      headerRow.style.display = "grid";
      headerRow.style.gridTemplateColumns =
        "88px minmax(220px,2fr) minmax(110px,0.9fr) minmax(220px,2fr) 90px 90px";
      headerRow.style.gap = "6px";
      headerRow.style.padding = "6px";
      headerRow.style.position = "sticky";
      headerRow.style.top = "0";
      headerRow.style.zIndex = "2";
      headerRow.style.background = "#f6f6f6";
      headerRow.style.borderBottom = "1px solid #e1e1e1";
      if (typeof headerRow.setAttribute === "function") {
        headerRow.setAttribute("data-zs-role", "tag-table-header");
      }
      const headerLabels = ["Facet", "Tag", "Source", "Note", "Deprecated", "Delete"];
      for (const labelText of headerLabels) {
        const headerCell = createHtmlElement(doc, "div");
        headerCell.textContent = labelText;
        headerCell.style.fontWeight = "600";
        headerCell.style.fontSize = "12px";
        headerCell.style.color = "#333";
        headerRow.appendChild(headerCell);
      }
      list.appendChild(headerRow);

      const rowsContainer = createHtmlElement(doc, "div");
      rowsContainer.style.display = "flex";
      rowsContainer.style.flexDirection = "column";
      rowsContainer.style.gap = "6px";
      rowsContainer.style.padding = "6px";

      for (const row of filtered) {
        const rowNode = createHtmlElement(doc, "div");
        rowNode.style.display = "grid";
        rowNode.style.gridTemplateColumns = "88px minmax(220px,2fr) minmax(110px,0.9fr) minmax(220px,2fr) 90px 90px";
        rowNode.style.gap = "6px";
        if (typeof rowNode.setAttribute === "function") {
          rowNode.setAttribute("data-zs-role", "tag-row");
          rowNode.setAttribute("data-zs-row-index", String(row.index));
        }

        const facetCell = createHtmlElement(doc, "div");
        facetCell.style.display = "flex";
        facetCell.style.alignItems = "center";
        facetCell.style.gap = "1px";
        facetCell.style.position = "relative";

        const facetTrigger = createHtmlElement(doc, "button");
        facetTrigger.type = "button";
        facetTrigger.textContent = "";
        facetTrigger.style.width = "76px";
        facetTrigger.style.display = "inline-flex";
        facetTrigger.style.alignItems = "center";
        facetTrigger.style.justifyContent = "space-between";
        facetTrigger.style.padding = "0 6px";
        facetTrigger.style.overflow = "hidden";
        facetTrigger.style.textOverflow = "ellipsis";
        facetTrigger.style.whiteSpace = "nowrap";
        const facetLabel = createHtmlElement(doc, "span");
        facetLabel.textContent = row.entry.facet;
        facetLabel.style.overflow = "hidden";
        facetLabel.style.textOverflow = "ellipsis";
        facetLabel.style.whiteSpace = "nowrap";
        facetTrigger.appendChild(facetLabel);

        const facetArrow = createHtmlElement(doc, "span");
        facetArrow.textContent = "▾";
        facetArrow.style.flex = "0 0 auto";
        facetArrow.style.marginLeft = "4px";
        facetTrigger.appendChild(facetArrow);
        if (typeof facetTrigger.setAttribute === "function") {
          facetTrigger.setAttribute("data-zs-role", "facet-select");
          facetTrigger.setAttribute("data-zs-row-index", String(row.index));
        }
        facetTrigger.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            draft.facetMenuRowIndex =
              Number(draft.facetMenuRowIndex) === row.index ? -1 : row.index;
            draft.onDuplicateMenuOpen = false;
          });
        });
        facetCell.appendChild(facetTrigger);

        const facetHint = createHtmlElement(doc, "span");
        facetHint.textContent = ":";
        if (typeof facetHint.setAttribute === "function") {
          facetHint.setAttribute("data-zs-role", "facet-display-prefix");
          facetHint.setAttribute("data-zs-row-index", String(row.index));
        }
        facetCell.appendChild(facetHint);

        if (Number(state.facetMenuRowIndex) === row.index) {
          const facetMenu = createHtmlElement(doc, "div");
          facetMenu.style.position = "absolute";
          facetMenu.style.top = "calc(100% + 4px)";
          facetMenu.style.left = "0";
          facetMenu.style.minWidth = "120px";
          facetMenu.style.display = "flex";
          facetMenu.style.flexDirection = "column";
          facetMenu.style.gap = "2px";
          facetMenu.style.padding = "4px";
          facetMenu.style.background = "#fff";
          facetMenu.style.border = "1px solid #cfcfcf";
          facetMenu.style.borderRadius = "4px";
          facetMenu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
          facetMenu.style.zIndex = "40";
          if (typeof facetMenu.setAttribute === "function") {
            facetMenu.setAttribute("data-zs-role", "facet-menu");
            facetMenu.setAttribute("data-zs-row-index", String(row.index));
          }
          facetMenu.addEventListener("click", (event) => {
            if (event && typeof event.stopPropagation === "function") {
              event.stopPropagation();
            }
          });
          for (const facetValue of FACETS) {
            const optionBtn = createHtmlElement(doc, "button");
            optionBtn.type = "button";
            optionBtn.textContent = facetValue;
            if (typeof optionBtn.setAttribute === "function") {
              optionBtn.setAttribute("data-zs-role", "facet-option");
              optionBtn.setAttribute("data-zs-row-index", String(row.index));
              optionBtn.setAttribute("data-zs-facet", facetValue);
            }
            optionBtn.addEventListener("click", () => {
              patchStateKeepingScroll((draft) => {
                const next = normalizeEntriesInput(draft.entries);
                const previous = next[row.index] || {
                  facet: "topic",
                  tag: "topic:",
                };
                const suffix = getTagSuffix(previous.tag, previous.facet);
                next[row.index] = normalizeEntry({
                  ...previous,
                  facet: facetValue,
                  tag: composeTagFromFacetAndSuffix(facetValue, suffix),
                });
                draft.entries = next;
                draft.facetMenuRowIndex = -1;
              });
            });
            facetMenu.appendChild(optionBtn);
          }
          facetCell.appendChild(facetMenu);
        }
        rowNode.appendChild(facetCell);

        const tagInput = createHtmlElement(doc, "input");
        tagInput.type = "text";
        tagInput.value = getTagSuffix(row.entry.tag, row.entry.facet);
        if (typeof tagInput.setAttribute === "function") {
          tagInput.setAttribute("data-zs-role", "tag-suffix-input");
          tagInput.setAttribute("data-zs-row-index", String(row.index));
        }
        tagInput.addEventListener("input", () => {
          const start =
            typeof tagInput.selectionStart === "number"
              ? tagInput.selectionStart
              : String(tagInput.value || "").length;
          const end =
            typeof tagInput.selectionEnd === "number"
              ? tagInput.selectionEnd
              : start;
          patchStateKeepingScroll((draft) => {
            const next = normalizeEntriesInput(draft.entries);
            const current = next[row.index] || {
              facet: "topic",
              source: "manual",
              note: "",
              deprecated: false,
            };
            next[row.index] = normalizeEntry({
              ...current,
              tag: composeTagFromFacetAndSuffix(current.facet, tagInput.value),
            });
            draft.entries = next;
            draft.editorFocus = {
              active: true,
              rowIndex: row.index,
              role: "tag-suffix-input",
              start,
              end,
            };
          });
        });
        rowNode.appendChild(tagInput);

        const sourceReadonly = createHtmlElement(doc, "div");
        sourceReadonly.textContent = String(row.entry.source || "manual");
        sourceReadonly.style.display = "flex";
        sourceReadonly.style.alignItems = "center";
        sourceReadonly.style.padding = "0 8px";
        sourceReadonly.style.border = "1px solid #ddd";
        sourceReadonly.style.background = "#f7f7f7";
        sourceReadonly.style.fontSize = "12px";
        if (typeof sourceReadonly.setAttribute === "function") {
          sourceReadonly.setAttribute("data-zs-role", "source-readonly");
          sourceReadonly.setAttribute("data-zs-row-index", String(row.index));
        }
        rowNode.appendChild(sourceReadonly);

        const noteInput = createHtmlElement(doc, "input");
        noteInput.type = "text";
        noteInput.value = row.entry.note;
        if (typeof noteInput.setAttribute === "function") {
          noteInput.setAttribute("data-zs-role", "note-input");
          noteInput.setAttribute("data-zs-row-index", String(row.index));
        }
        noteInput.addEventListener("input", () => {
          const start =
            typeof noteInput.selectionStart === "number"
              ? noteInput.selectionStart
              : String(noteInput.value || "").length;
          const end =
            typeof noteInput.selectionEnd === "number"
              ? noteInput.selectionEnd
              : start;
          patchStateKeepingScroll((draft) => {
            const next = normalizeEntriesInput(draft.entries);
            next[row.index] = normalizeEntry({
              ...next[row.index],
              note: noteInput.value,
            });
            draft.entries = next;
            draft.editorFocus = {
              active: true,
              rowIndex: row.index,
              role: "note-input",
              start,
              end,
            };
          });
        });
        rowNode.appendChild(noteInput);

        const deprecatedBtn = createHtmlElement(doc, "button");
        deprecatedBtn.type = "button";
        deprecatedBtn.textContent = row.entry.deprecated ? "Restore" : "Deprecate";
        deprecatedBtn.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            const next = normalizeEntriesInput(draft.entries);
            next[row.index] = normalizeEntry({
              ...next[row.index],
              deprecated: !next[row.index].deprecated,
            });
            draft.entries = next;
          });
        });
        rowNode.appendChild(deprecatedBtn);

        const deleteBtn = createHtmlElement(doc, "button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            const next = normalizeEntriesInput(draft.entries);
            next.splice(row.index, 1);
            draft.entries = next;
          });
        });
        rowNode.appendChild(deleteBtn);

        rowsContainer.appendChild(rowNode);
      }
      list.appendChild(rowsContainer);
      panel.appendChild(list);

      const exportText = String(state.exportText || "");
      if (exportText.trim()) {
        const exportPanel = createHtmlElement(doc, "div");
        exportPanel.style.display = "flex";
        exportPanel.style.flexDirection = "column";
        exportPanel.style.gap = "6px";
        exportPanel.style.border = "1px solid #d5d5d5";
        exportPanel.style.borderRadius = "4px";
        exportPanel.style.padding = "8px";
        if (typeof exportPanel.setAttribute === "function") {
          exportPanel.setAttribute("data-zs-role", "export-panel");
        }

        const exportLabel = createHtmlElement(doc, "div");
        exportLabel.textContent = "Exported tags (facet:value)";
        exportLabel.style.fontWeight = "600";
        exportLabel.style.fontSize = "12px";
        exportPanel.appendChild(exportLabel);

        const exportArea = createHtmlElement(doc, "textarea");
        exportArea.readOnly = true;
        exportArea.value = exportText;
        exportArea.style.width = "100%";
        exportArea.style.minHeight = "120px";
        exportArea.style.fontFamily = "Consolas, Monaco, monospace";
        if (typeof exportArea.setAttribute === "function") {
          exportArea.setAttribute("data-zs-role", "export-textarea");
        }
        exportPanel.appendChild(exportArea);

        const exportActions = createHtmlElement(doc, "div");
        exportActions.style.display = "flex";
        exportActions.style.gap = "8px";
        exportActions.style.flexWrap = "wrap";

        const copyBtn = createHtmlElement(doc, "button");
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", () => {
          void (async () => {
            const copied = await copyTextToClipboard(doc, exportText);
            patchStateKeepingScroll((draft) => {
              draft.exportNotice = copied.ok
                ? "export copied to clipboard"
                : `copy failed: ${copied.reason}`;
            });
          })();
        });
        exportActions.appendChild(copyBtn);
        exportPanel.appendChild(exportActions);

        if (String(state.exportNotice || "").trim()) {
          const exportNotice = createHtmlElement(doc, "div");
          exportNotice.textContent = String(state.exportNotice || "");
          exportNotice.style.fontSize = "12px";
          exportNotice.style.color = "#3b3b3b";
          exportPanel.appendChild(exportNotice);
        }

        panel.appendChild(exportPanel);
      }

      const issues = Array.isArray(state.validationIssues)
        ? state.validationIssues
        : [];
      if (issues.length > 0 || state.corrupted) {
        const warning = createHtmlElement(doc, "div");
        warning.style.fontSize = "12px";
        warning.style.color = "#8f2a2a";
        const topLine = state.corrupted
          ? "Persisted vocabulary is corrupted; editing starts from empty fallback."
          : "";
        const issueLine = issues
          .slice(0, 3)
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join(" | ");
        warning.textContent = [topLine, issueLine].filter(Boolean).join(" ");
        panel.appendChild(warning);
      }

      const importReport = state.importReport;
      if (importReport && typeof importReport === "object") {
        const reportText = createHtmlElement(doc, "div");
        reportText.style.fontSize = "12px";
        reportText.style.color = "#2f2f2f";
        const errorCount = Array.isArray(importReport.errors)
          ? importReport.errors.length
          : 0;
        reportText.textContent = [
          `imported=${(importReport.imported || []).length}`,
          `skipped=${(importReport.skipped || []).length}`,
          `overwritten=${(importReport.overwritten || []).length}`,
          `errors=${errorCount}`,
          importReport.aborted ? "aborted=true" : "aborted=false",
        ].join(" ");
        panel.appendChild(reportText);
      }

      if (state.filterPanelOpen) {
        const overlay = createHtmlElement(doc, "div");
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.bottom = "0";
        overlay.style.background = "rgba(0,0,0,0.05)";
        overlay.style.zIndex = "19";
        if (typeof overlay.setAttribute === "function") {
          overlay.setAttribute("data-zs-role", "facet-filter-overlay");
        }
        overlay.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            draft.filterPanelOpen = false;
          });
        });

        const popup = createHtmlElement(doc, "div");
        popup.style.position = "absolute";
        popup.style.top = "42px";
        popup.style.right = "12px";
        popup.style.maxWidth = "420px";
        popup.style.maxHeight = "76%";
        popup.style.overflowY = "auto";
        popup.style.background = "#ffffff";
        popup.style.border = "1px solid #cfcfcf";
        popup.style.borderRadius = "6px";
        popup.style.padding = "10px";
        popup.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
        popup.style.zIndex = "20";
        if (typeof popup.setAttribute === "function") {
          popup.setAttribute("data-zs-role", "facet-filter-popup");
        }
        popup.addEventListener("click", (event) => {
          if (event && typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
        });

        const popupTitle = createHtmlElement(doc, "div");
        popupTitle.textContent = "Filter Facets";
        popupTitle.style.fontWeight = "600";
        popupTitle.style.marginBottom = "8px";
        popup.appendChild(popupTitle);

        for (const facet of FACETS) {
          const optionLabel = createHtmlElement(doc, "label");
          optionLabel.style.display = "flex";
          optionLabel.style.alignItems = "center";
          optionLabel.style.gap = "6px";
          optionLabel.style.fontSize = "12px";
          optionLabel.style.padding = "2px 0";

          const optionInput = createHtmlElement(doc, "input");
          optionInput.type = "checkbox";
          optionInput.checked = state.facetVisibility[facet] !== false;
          if (typeof optionInput.setAttribute === "function") {
            optionInput.setAttribute("data-zs-role", "facet-visibility-toggle");
            optionInput.setAttribute("data-zs-facet", facet);
          }
          optionInput.addEventListener("change", () => {
            patchStateKeepingScroll((draft) => {
              const nextVisibility = normalizeFacetVisibilityState(draft.facetVisibility);
              nextVisibility[facet] = Boolean(optionInput.checked);
              draft.facetVisibility = nextVisibility;
            });
          });
          optionLabel.appendChild(optionInput);

          const optionText = createHtmlElement(doc, "span");
          optionText.textContent = facet;
          optionLabel.appendChild(optionText);
          popup.appendChild(optionLabel);
        }

        overlay.appendChild(popup);
        panel.appendChild(overlay);
      }

      root.appendChild(panel);
      if (state.listScrollMode === "bottom") {
        if (typeof list.scrollHeight === "number" && Number.isFinite(list.scrollHeight)) {
          list.scrollTop = Number(list.scrollHeight || 0);
        } else {
          list.scrollTop = Number.MAX_SAFE_INTEGER;
        }
      } else {
        list.scrollTop = Number(state.listScrollTop || 0);
      }
      state.listScrollTop = Number(list.scrollTop || 0);
      state.listScrollMode = "keep";

      const editorFocus = state.editorFocus;
      if (editorFocus && editorFocus.active) {
        const target = findNodeByRoleAndRowIndex(
          root,
          editorFocus.role,
          editorFocus.rowIndex,
        );
        if (target && typeof target.focus === "function") {
          target.focus();
          if (typeof target.setSelectionRange === "function") {
            const start = Math.max(0, Number(editorFocus.start || 0));
            const end = Math.max(start, Number(editorFocus.end || start));
            target.setSelectionRange(start, end);
          }
        }
        state.editorFocus = {
          active: false,
          rowIndex: -1,
          role: "",
          start: 0,
          end: 0,
        };
      }

      const queryFocus = state.queryFocus;
      if (queryFocus && queryFocus.active && typeof queryInput.focus === "function") {
        queryInput.focus();
        if (typeof queryInput.setSelectionRange === "function") {
          const start = Math.max(0, Number(queryFocus.start || 0));
          const end = Math.max(start, Number(queryFocus.end || start));
          queryInput.setSelectionRange(start, end);
        }
        state.queryFocus = {
          active: false,
          start: 0,
          end: 0,
        };
      }
    },
    serialize({ state }) {
      const entries = sortEntries(normalizeEntriesInput(state.entries));
      assertNoValidationIssues(entries);
      return {
        entries,
        exportTags: exportTagStrings(entries),
      };
    },
  };
}

function createStagedTagInboxRenderer() {
  return {
    render({ doc, root, state, host, context }) {
      clearChildren(root);
      if (!Array.isArray(state.entries)) {
        state.entries = [];
      }
      const allEntries = normalizeStagedEntriesInput(state.entries);
      state.entries = allEntries;
      state.pendingPublishTags = Array.isArray(state.pendingPublishTags)
        ? state.pendingPublishTags.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [];
      state.publishInFlight = state.publishInFlight === true;
      state.facetVisibility = normalizeFacetVisibilityState(state.facetVisibility);
      if (typeof state.listScrollTop !== "number") {
        state.listScrollTop = 0;
      }
      if (typeof state.listScrollMode !== "string") {
        state.listScrollMode = "keep";
      }
      if (typeof state.facetMenuRowIndex !== "number") {
        state.facetMenuRowIndex = -1;
      }
      if (!state.editorFocus || typeof state.editorFocus !== "object") {
        state.editorFocus = {
          active: false,
          rowIndex: -1,
          role: "",
          start: 0,
          end: 0,
        };
      }

      const filtered = filterStagedEntriesByQueryAndFacet(
        allEntries,
        state.query,
        state.facetVisibility,
      );
      const pendingPublishLowerSet = new Set(
        state.pendingPublishTags.map((entry) => String(entry || "").trim().toLowerCase()),
      );
      let scrollContainerNode = null;
      const readScrollTop = () =>
        scrollContainerNode && typeof scrollContainerNode.scrollTop === "number"
          ? Number(scrollContainerNode.scrollTop || 0)
          : Number(state.listScrollTop || 0);
      const patchStateKeepingScroll = (updater, options) => {
        const scrollTop = readScrollTop();
        const beforeEntriesSnapshot = JSON.stringify(
          sortStagedEntries(normalizeStagedEntriesInput(state.entries)),
        );
        host.patchState((draft) => {
          draft.listScrollTop = scrollTop;
          draft.listScrollMode =
            options && options.scrollMode === "bottom" ? "bottom" : "keep";
          updater(draft);
          const normalizedEntries = sortStagedEntries(
            normalizeStagedEntriesInput(draft.entries),
          );
          draft.entries = normalizedEntries;
          const afterEntriesSnapshot = JSON.stringify(normalizedEntries);
          if (beforeEntriesSnapshot !== afterEntriesSnapshot) {
            try {
              persistStagedEntries(normalizedEntries);
            } catch (error) {
              draft.validationIssues = [
                {
                  code: "STAGED_PERSIST_FAILED",
                  message: String(
                    error?.message || error || "persist staged entries failed",
                  ),
                },
              ];
              draft.actionNotice = "persist staged entries failed";
            }
          }
        });
      };

      const panel = createHtmlElement(doc, "div");
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = "8px";
      panel.style.height = "100%";
      panel.style.boxSizing = "border-box";
      panel.style.position = "relative";
      panel.addEventListener("click", (event) => {
        const hasFacetMenuOpen = Number(state.facetMenuRowIndex) >= 0;
        if (!hasFacetMenuOpen) {
          return;
        }
        const target = event ? event.target : null;
        const keepFacetOpen = isNodeWithinRoles(target, panel, [
          "facet-select",
          "facet-menu",
          "facet-option",
        ]);
        if (!keepFacetOpen) {
          patchStateKeepingScroll((draft) => {
            draft.facetMenuRowIndex = -1;
          });
        }
      });

      const toolbar = createHtmlElement(doc, "div");
      toolbar.style.display = "flex";
      toolbar.style.gap = "12px";
      toolbar.style.flexWrap = "wrap";
      toolbar.style.alignItems = "center";

      const mainActions = createHtmlElement(doc, "div");
      mainActions.style.display = "flex";
      mainActions.style.gap = "8px";
      mainActions.style.flexWrap = "wrap";
      mainActions.style.alignItems = "center";

      const queryInput = createHtmlElement(doc, "input");
      queryInput.type = "search";
      queryInput.value = String(state.query || "");
      queryInput.placeholder = "Search tag/facet/source/note";
      queryInput.style.minWidth = "320px";
      queryInput.addEventListener("input", () => {
        const start =
          typeof queryInput.selectionStart === "number"
            ? queryInput.selectionStart
            : String(queryInput.value || "").length;
        const end =
          typeof queryInput.selectionEnd === "number"
            ? queryInput.selectionEnd
            : start;
        patchStateKeepingScroll((draft) => {
          draft.query = String(queryInput.value || "");
          draft.queryFocus = {
            active: true,
            start,
            end,
          };
        });
      });
      mainActions.appendChild(queryInput);

      const filterBtn = createHtmlElement(doc, "button");
      filterBtn.type = "button";
      filterBtn.textContent = "Filter";
      filterBtn.addEventListener("click", () => {
        patchStateKeepingScroll((draft) => {
          draft.filterPanelOpen = !Boolean(draft.filterPanelOpen);
        });
      });
      mainActions.appendChild(filterBtn);

      const clearBtn = createHtmlElement(doc, "button");
      clearBtn.type = "button";
      clearBtn.textContent = "Clear";
      if (typeof clearBtn.setAttribute === "function") {
        clearBtn.setAttribute("data-zs-role", "staged-clear-btn");
      }
      clearBtn.addEventListener("click", () => {
        if (!confirmAction(doc, "Clear all staged tags?")) {
          return;
        }
        patchStateKeepingScroll((draft) => {
          draft.entries = [];
          draft.actionNotice = "staged cleared";
          draft.validationIssues = [];
        });
      });
      mainActions.appendChild(clearBtn);

      toolbar.appendChild(mainActions);
      panel.appendChild(toolbar);

      const list = createHtmlElement(doc, "div");
      list.style.flex = "1 1 auto";
      list.style.overflowY = "auto";
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "0";
      list.style.border = "1px solid #d5d5d5";
      list.style.borderRadius = "4px";
      list.style.background = "#fff";
      if (typeof list.setAttribute === "function") {
        list.setAttribute("data-zs-role", "staged-table-scroll");
      }
      scrollContainerNode = list;

      const headerRow = createHtmlElement(doc, "div");
      headerRow.style.display = "grid";
      headerRow.style.gridTemplateColumns =
        "88px minmax(220px,2fr) minmax(110px,0.9fr) minmax(220px,2fr) 72px 90px 130px 90px";
      headerRow.style.gap = "6px";
      headerRow.style.padding = "6px";
      headerRow.style.position = "sticky";
      headerRow.style.top = "0";
      headerRow.style.zIndex = "2";
      headerRow.style.background = "#f6f6f6";
      headerRow.style.borderBottom = "1px solid #e1e1e1";
      if (typeof headerRow.setAttribute === "function") {
        headerRow.setAttribute("data-zs-role", "staged-table-header");
      }
      const headerLabels = [
        "Facet",
        "Tag",
        "Source",
        "Note",
        "Parents",
        "Deprecated",
        "Join",
        "Discard",
      ];
      for (const labelText of headerLabels) {
        const headerCell = createHtmlElement(doc, "div");
        headerCell.textContent = labelText;
        headerCell.style.fontWeight = "600";
        headerCell.style.fontSize = "12px";
        headerCell.style.color = "#333";
        headerRow.appendChild(headerCell);
      }
      list.appendChild(headerRow);

      const rowsContainer = createHtmlElement(doc, "div");
      rowsContainer.style.display = "flex";
      rowsContainer.style.flexDirection = "column";
      rowsContainer.style.gap = "6px";
      rowsContainer.style.padding = "6px";

      for (const row of filtered) {
        const rowNode = createHtmlElement(doc, "div");
        rowNode.style.display = "grid";
        rowNode.style.gridTemplateColumns =
          "88px minmax(220px,2fr) minmax(110px,0.9fr) minmax(220px,2fr) 72px 90px 130px 90px";
        rowNode.style.gap = "6px";
        if (typeof rowNode.setAttribute === "function") {
          rowNode.setAttribute("data-zs-role", "staged-row");
          rowNode.setAttribute("data-zs-row-index", String(row.index));
        }

        const facetCell = createHtmlElement(doc, "div");
        facetCell.style.display = "flex";
        facetCell.style.alignItems = "center";
        facetCell.style.gap = "1px";
        facetCell.style.position = "relative";

        const facetTrigger = createHtmlElement(doc, "button");
        facetTrigger.type = "button";
        facetTrigger.textContent = "";
        facetTrigger.style.width = "76px";
        facetTrigger.style.display = "inline-flex";
        facetTrigger.style.alignItems = "center";
        facetTrigger.style.justifyContent = "space-between";
        facetTrigger.style.padding = "0 6px";
        facetTrigger.style.overflow = "hidden";
        facetTrigger.style.textOverflow = "ellipsis";
        facetTrigger.style.whiteSpace = "nowrap";
        const facetLabel = createHtmlElement(doc, "span");
        facetLabel.textContent = row.entry.facet;
        facetLabel.style.overflow = "hidden";
        facetLabel.style.textOverflow = "ellipsis";
        facetLabel.style.whiteSpace = "nowrap";
        facetTrigger.appendChild(facetLabel);

        const facetArrow = createHtmlElement(doc, "span");
        facetArrow.textContent = "▾";
        facetArrow.style.flex = "0 0 auto";
        facetArrow.style.marginLeft = "4px";
        facetTrigger.appendChild(facetArrow);
        if (typeof facetTrigger.setAttribute === "function") {
          facetTrigger.setAttribute("data-zs-role", "facet-select");
          facetTrigger.setAttribute("data-zs-row-index", String(row.index));
        }
        facetTrigger.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            draft.facetMenuRowIndex =
              Number(draft.facetMenuRowIndex) === row.index ? -1 : row.index;
          });
        });
        facetCell.appendChild(facetTrigger);

        const facetHint = createHtmlElement(doc, "span");
        facetHint.textContent = ":";
        facetCell.appendChild(facetHint);

        if (Number(state.facetMenuRowIndex) === row.index) {
          const facetMenu = createHtmlElement(doc, "div");
          facetMenu.style.position = "absolute";
          facetMenu.style.top = "calc(100% + 4px)";
          facetMenu.style.left = "0";
          facetMenu.style.minWidth = "120px";
          facetMenu.style.display = "flex";
          facetMenu.style.flexDirection = "column";
          facetMenu.style.gap = "2px";
          facetMenu.style.padding = "4px";
          facetMenu.style.background = "#fff";
          facetMenu.style.border = "1px solid #cfcfcf";
          facetMenu.style.borderRadius = "4px";
          facetMenu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
          facetMenu.style.zIndex = "40";
          if (typeof facetMenu.setAttribute === "function") {
            facetMenu.setAttribute("data-zs-role", "facet-menu");
            facetMenu.setAttribute("data-zs-row-index", String(row.index));
          }
          facetMenu.addEventListener("click", (event) => {
            if (event && typeof event.stopPropagation === "function") {
              event.stopPropagation();
            }
          });
          for (const facetValue of FACETS) {
            const optionBtn = createHtmlElement(doc, "button");
            optionBtn.type = "button";
            optionBtn.textContent = facetValue;
            if (typeof optionBtn.setAttribute === "function") {
              optionBtn.setAttribute("data-zs-role", "facet-option");
              optionBtn.setAttribute("data-zs-row-index", String(row.index));
              optionBtn.setAttribute("data-zs-facet", facetValue);
            }
            optionBtn.addEventListener("click", () => {
              patchStateKeepingScroll((draft) => {
                const next = normalizeStagedEntriesInput(draft.entries);
                const previous = next[row.index] || {
                  facet: "topic",
                  tag: "topic:",
                };
                const suffix = getTagSuffix(previous.tag, previous.facet);
                next[row.index] = normalizeStagedEntry({
                  ...previous,
                  facet: facetValue,
                  tag: composeTagFromFacetAndSuffix(facetValue, suffix),
                  updatedAt: nowIsoTimestamp(),
                });
                draft.entries = next;
                draft.facetMenuRowIndex = -1;
              });
            });
            facetMenu.appendChild(optionBtn);
          }
          facetCell.appendChild(facetMenu);
        }
        rowNode.appendChild(facetCell);

        const tagInput = createHtmlElement(doc, "input");
        tagInput.type = "text";
        tagInput.value = getTagSuffix(row.entry.tag, row.entry.facet);
        if (typeof tagInput.setAttribute === "function") {
          tagInput.setAttribute("data-zs-role", "staged-tag-suffix-input");
          tagInput.setAttribute("data-zs-row-index", String(row.index));
        }
        tagInput.addEventListener("input", () => {
          const start =
            typeof tagInput.selectionStart === "number"
              ? tagInput.selectionStart
              : String(tagInput.value || "").length;
          const end =
            typeof tagInput.selectionEnd === "number" ? tagInput.selectionEnd : start;
          patchStateKeepingScroll((draft) => {
            const next = normalizeStagedEntriesInput(draft.entries);
            const current = next[row.index] || {
              facet: "topic",
              source: "manual",
              note: "",
              deprecated: false,
              sourceFlow: STAGED_SOURCE_FLOW_DEFAULT,
            };
            next[row.index] = normalizeStagedEntry({
              ...current,
              tag: composeTagFromFacetAndSuffix(current.facet, tagInput.value),
              updatedAt: nowIsoTimestamp(),
            });
            draft.entries = next;
            draft.editorFocus = {
              active: true,
              rowIndex: row.index,
              role: "staged-tag-suffix-input",
              start,
              end,
            };
          });
        });
        rowNode.appendChild(tagInput);

        const sourceReadonly = createHtmlElement(doc, "div");
        sourceReadonly.textContent = String(row.entry.source || "manual");
        sourceReadonly.style.display = "flex";
        sourceReadonly.style.alignItems = "center";
        sourceReadonly.style.padding = "0 8px";
        sourceReadonly.style.border = "1px solid #ddd";
        sourceReadonly.style.background = "#f7f7f7";
        sourceReadonly.style.fontSize = "12px";
        rowNode.appendChild(sourceReadonly);

        const noteInput = createHtmlElement(doc, "input");
        noteInput.type = "text";
        noteInput.value = row.entry.note;
        if (typeof noteInput.setAttribute === "function") {
          noteInput.setAttribute("data-zs-role", "staged-note-input");
          noteInput.setAttribute("data-zs-row-index", String(row.index));
        }
        noteInput.addEventListener("input", () => {
          const start =
            typeof noteInput.selectionStart === "number"
              ? noteInput.selectionStart
              : String(noteInput.value || "").length;
          const end =
            typeof noteInput.selectionEnd === "number"
              ? noteInput.selectionEnd
              : start;
          patchStateKeepingScroll((draft) => {
            const next = normalizeStagedEntriesInput(draft.entries);
            next[row.index] = normalizeStagedEntry({
              ...next[row.index],
              note: noteInput.value,
              updatedAt: nowIsoTimestamp(),
            });
            draft.entries = next;
            draft.editorFocus = {
              active: true,
              rowIndex: row.index,
              role: "staged-note-input",
              start,
              end,
            };
          });
        });
        rowNode.appendChild(noteInput);

        const parentCount = createHtmlElement(doc, "div");
        parentCount.textContent = String(
          Array.isArray(row.entry.parentBindings) ? row.entry.parentBindings.length : 0,
        );
        parentCount.style.display = "flex";
        parentCount.style.alignItems = "center";
        parentCount.style.justifyContent = "center";
        parentCount.style.fontSize = "12px";
        if (typeof parentCount.setAttribute === "function") {
          parentCount.setAttribute("data-zs-role", "staged-parent-count");
          parentCount.setAttribute("data-zs-row-index", String(row.index));
        }
        rowNode.appendChild(parentCount);

        const deprecatedBtn = createHtmlElement(doc, "button");
        deprecatedBtn.type = "button";
        deprecatedBtn.textContent = row.entry.deprecated ? "Restore" : "Deprecate";
        deprecatedBtn.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            const next = normalizeStagedEntriesInput(draft.entries);
            next[row.index] = normalizeStagedEntry({
              ...next[row.index],
              deprecated: !next[row.index].deprecated,
              updatedAt: nowIsoTimestamp(),
            });
            draft.entries = next;
          });
        });
        rowNode.appendChild(deprecatedBtn);

        const joinBtn = createHtmlElement(doc, "button");
        joinBtn.type = "button";
        const currentLowerTag = String(row.entry.tag || "").trim().toLowerCase();
        const isPendingPublish = pendingPublishLowerSet.has(currentLowerTag);
        joinBtn.textContent = isPendingPublish ? "发布中..." : "加入受控词表";
        joinBtn.disabled = isPendingPublish || state.publishInFlight === true;
        if (typeof joinBtn.setAttribute === "function") {
          joinBtn.setAttribute("data-zs-role", "staged-accept-btn");
          joinBtn.setAttribute("data-zs-row-index", String(row.index));
        }
        joinBtn.addEventListener("click", async () => {
          const rootPatch =
            typeof host.patchRootState === "function" ? host.patchRootState : host.patchState;
          const current = normalizeStagedEntriesInput(state.entries)[row.index];
          if (!current) {
            return;
          }
          if (String(context?.mode || "local") === "subscription") {
            if (
              !context ||
              !context.stagedPublishCoordinator ||
              typeof context.stagedPublishCoordinator.schedule !== "function"
            ) {
              rootPatch((draft) => {
                const stagedDraft = ensureStagedPanelState(draft);
                stagedDraft.validationIssues = [
                  {
                    code: "PUBLISH_COORDINATOR_MISSING",
                    message: "staged publish coordinator is unavailable",
                  },
                ];
                stagedDraft.actionNotice =
                  "publish failed: staged publish coordinator is unavailable";
              });
              return;
            }
            rootPatch((draft) => {
              const stagedDraft = ensureStagedPanelState(draft);
              stagedDraft.validationIssues = [];
              stagedDraft.actionNotice = `queued: ${current.tag}`;
              stagedDraft.pendingPublishTags = [
                ...new Set([...stagedDraft.pendingPublishTags, current.tag]),
              ];
            });
            context.stagedPublishCoordinator.schedule(current.tag, rootPatch);
            return;
          }
          if (typeof host.patchRootState === "function") {
            const promoted = promoteStagedEntryToControlledVocabulary(current);
            if (!promoted.ok) {
              rootPatch((draft) => {
                const stagedDraft = ensureStagedPanelState(draft);
                stagedDraft.validationIssues = [
                  {
                    code: "PROMOTE_FAILED",
                    message: String(promoted.reason || "validation failed"),
                  },
                ];
                stagedDraft.actionNotice = `join failed: ${String(
                  promoted.reason || "validation failed",
                )}`;
              });
              return;
            }
            await appendTagsToBoundParentItems({
              workflowId: TAG_MANAGER_WORKFLOW_ID,
              bindingsByTag: new Map([[String(current.tag || ""), current.parentBindings || []]]),
            });
            const next = normalizeStagedEntriesInput(loadPersistedStagedState().entries).filter(
              (entry) =>
                String(entry.tag || "").trim().toLowerCase() !==
                String(current.tag || "").trim().toLowerCase(),
            );
            persistStagedEntries(next);
            rootPatch((draft) => {
              const stagedDraft = ensureStagedPanelState(draft);
              stagedDraft.entries = next;
              stagedDraft.validationIssues = [];
              stagedDraft.actionNotice = `joined: ${current.tag}`;
              draft.committedEntries = promoted.entries || loadLocalCommittedState().entries;
              draft.entries = draft.committedEntries;
            });
            return;
          }
          const promoted = promoteStagedEntryToControlledVocabulary(current);
          if (!promoted.ok) {
            host.patchState((draft) => {
              draft.validationIssues = [
                {
                  code: "PROMOTE_FAILED",
                  message: String(promoted.reason || "validation failed"),
                },
              ];
              draft.actionNotice = `join failed: ${String(
                promoted.reason || "validation failed",
              )}`;
            });
            return;
          }
          await appendTagsToBoundParentItems({
            workflowId: TAG_MANAGER_WORKFLOW_ID,
            bindingsByTag: new Map([[String(current.tag || ""), current.parentBindings || []]]),
          });
          const next = normalizeStagedEntriesInput(loadPersistedStagedState().entries).filter(
            (entry) =>
              String(entry.tag || "").trim().toLowerCase() !==
              String(current.tag || "").trim().toLowerCase(),
          );
          persistStagedEntries(next);
          host.patchState((draft) => {
            draft.entries = next;
            draft.validationIssues = [];
            draft.actionNotice = `joined: ${current.tag}`;
          });
        });
        rowNode.appendChild(joinBtn);

        const discardBtn = createHtmlElement(doc, "button");
        discardBtn.type = "button";
        discardBtn.textContent = "Discard";
        if (typeof discardBtn.setAttribute === "function") {
          discardBtn.setAttribute("data-zs-role", "staged-discard-btn");
          discardBtn.setAttribute("data-zs-row-index", String(row.index));
        }
        discardBtn.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            const next = normalizeStagedEntriesInput(draft.entries);
            const removed = next[row.index];
            if (!removed) {
              return;
            }
            next.splice(row.index, 1);
            draft.entries = next;
            draft.validationIssues = [];
            draft.actionNotice = `discarded: ${removed.tag}`;
          });
        });
        rowNode.appendChild(discardBtn);

        rowsContainer.appendChild(rowNode);
      }
      list.appendChild(rowsContainer);
      panel.appendChild(list);

      const issues = Array.isArray(state.validationIssues)
        ? state.validationIssues
        : [];
      if (issues.length > 0 || state.corrupted) {
        const warning = createHtmlElement(doc, "div");
        warning.style.fontSize = "12px";
        warning.style.color = "#8f2a2a";
        const topLine = state.corrupted
          ? "Persisted staged payload is corrupted; editing starts from empty fallback."
          : "";
        const issueLine = issues
          .slice(0, 3)
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join(" | ");
        warning.textContent = [topLine, issueLine].filter(Boolean).join(" ");
        panel.appendChild(warning);
      }

      if (String(state.actionNotice || "").trim()) {
        const actionNotice = createHtmlElement(doc, "div");
        actionNotice.textContent = String(state.actionNotice || "");
        actionNotice.style.fontSize = "12px";
        actionNotice.style.color = "#2f2f2f";
        panel.appendChild(actionNotice);
      }

      if (state.filterPanelOpen) {
        const overlay = createHtmlElement(doc, "div");
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.bottom = "0";
        overlay.style.background = "rgba(0,0,0,0.05)";
        overlay.style.zIndex = "19";
        if (typeof overlay.setAttribute === "function") {
          overlay.setAttribute("data-zs-role", "facet-filter-overlay");
        }
        overlay.addEventListener("click", () => {
          patchStateKeepingScroll((draft) => {
            draft.filterPanelOpen = false;
          });
        });

        const popup = createHtmlElement(doc, "div");
        popup.style.position = "absolute";
        popup.style.top = "42px";
        popup.style.right = "12px";
        popup.style.maxWidth = "420px";
        popup.style.maxHeight = "76%";
        popup.style.overflowY = "auto";
        popup.style.background = "#ffffff";
        popup.style.border = "1px solid #cfcfcf";
        popup.style.borderRadius = "6px";
        popup.style.padding = "10px";
        popup.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
        popup.style.zIndex = "20";
        if (typeof popup.setAttribute === "function") {
          popup.setAttribute("data-zs-role", "facet-filter-popup");
        }
        popup.addEventListener("click", (event) => {
          if (event && typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
        });

        const popupTitle = createHtmlElement(doc, "div");
        popupTitle.textContent = "Filter Facets";
        popupTitle.style.fontWeight = "600";
        popupTitle.style.marginBottom = "8px";
        popup.appendChild(popupTitle);

        for (const facet of FACETS) {
          const optionLabel = createHtmlElement(doc, "label");
          optionLabel.style.display = "flex";
          optionLabel.style.alignItems = "center";
          optionLabel.style.gap = "6px";
          optionLabel.style.fontSize = "12px";
          optionLabel.style.padding = "2px 0";

          const optionInput = createHtmlElement(doc, "input");
          optionInput.type = "checkbox";
          optionInput.checked = state.facetVisibility[facet] !== false;
          if (typeof optionInput.setAttribute === "function") {
            optionInput.setAttribute("data-zs-role", "facet-visibility-toggle");
            optionInput.setAttribute("data-zs-facet", facet);
          }
          optionInput.addEventListener("change", () => {
            patchStateKeepingScroll((draft) => {
              const nextVisibility = normalizeFacetVisibilityState(draft.facetVisibility);
              nextVisibility[facet] = Boolean(optionInput.checked);
              draft.facetVisibility = nextVisibility;
            });
          });
          optionLabel.appendChild(optionInput);

          const optionText = createHtmlElement(doc, "span");
          optionText.textContent = facet;
          optionLabel.appendChild(optionText);
          popup.appendChild(optionLabel);
        }

        overlay.appendChild(popup);
        panel.appendChild(overlay);
      }

      root.appendChild(panel);
      if (state.listScrollMode === "bottom") {
        if (typeof list.scrollHeight === "number" && Number.isFinite(list.scrollHeight)) {
          list.scrollTop = Number(list.scrollHeight || 0);
        } else {
          list.scrollTop = Number.MAX_SAFE_INTEGER;
        }
      } else {
        list.scrollTop = Number(state.listScrollTop || 0);
      }
      state.listScrollTop = Number(list.scrollTop || 0);
      state.listScrollMode = "keep";

      const editorFocus = state.editorFocus;
      if (editorFocus && editorFocus.active) {
        const target = findNodeByRoleAndRowIndex(
          root,
          editorFocus.role,
          editorFocus.rowIndex,
        );
        if (target && typeof target.focus === "function") {
          target.focus();
          if (typeof target.setSelectionRange === "function") {
            const start = Math.max(0, Number(editorFocus.start || 0));
            const end = Math.max(start, Number(editorFocus.end || start));
            target.setSelectionRange(start, end);
          }
        }
        state.editorFocus = {
          active: false,
          rowIndex: -1,
          role: "",
          start: 0,
          end: 0,
        };
      }

      const queryFocus = state.queryFocus;
      if (queryFocus && queryFocus.active && typeof queryInput.focus === "function") {
        queryInput.focus();
        if (typeof queryInput.setSelectionRange === "function") {
          const start = Math.max(0, Number(queryFocus.start || 0));
          const end = Math.max(start, Number(queryFocus.end || start));
          queryInput.setSelectionRange(start, end);
        }
        state.queryFocus = {
          active: false,
          start: 0,
          end: 0,
        };
      }
    },
    serialize({ state }) {
      return {
        entries: sortStagedEntries(normalizeStagedEntriesInput(state.entries)),
      };
    },
  };
}

async function openTagManagerEditor(args) {
  const host = resolveEditorHostBridge();
  if (typeof host.registerRenderer === "function") {
    host.registerRenderer(RENDERER_ID, createTagManagerRenderer());
  }
  const mode = String(args.mode || "local") === "subscription" ? "subscription" : "local";
  const stagedPublishCoordinator =
    mode === "subscription"
      ? createStagedPublishCoordinator({
          workflowId: args.workflowId || TAG_MANAGER_WORKFLOW_ID,
          syncConfig: args.syncConfig || resolveGitHubSyncConfig(TAG_MANAGER_WORKFLOW_ID),
        })
      : null;
  try {
    return await host.open({
      rendererId: RENDERER_ID,
      title: String(args.title || "Tag Manager"),
      context: {
        mode,
        stagedPublishCoordinator,
      },
      initialState: {
        entries: sortEntries(normalizeEntriesInput(args.entries)),
        committedEntries: sortEntries(
          normalizeEntriesInput(args.committedEntries || args.entries),
        ),
        mode,
        query: "",
        exportText: buildExportText(normalizeEntriesInput(args.entries)),
        exportNotice: "",
        validationIssues: [],
        importOnDuplicate: "skip",
        importDryRun: false,
        importReport: null,
        facetVisibility: createInitialFacetVisibilityState(),
        onDuplicateMenuOpen: false,
        facetMenuRowIndex: -1,
        filterPanelOpen: false,
        queryFocus: {
          active: false,
          start: 0,
          end: 0,
        },
        editorFocus: {
          active: false,
          rowIndex: -1,
          role: "",
          start: 0,
          end: 0,
        },
        listScrollTop: 0,
        listScrollMode: "keep",
        corrupted: Boolean(args.corrupted),
        remoteSyncState: String(args.remoteSyncState || ""),
        remoteSyncMessage: String(args.remoteSyncMessage || ""),
        activePanel: "controlled",
        stagedPanelState: null,
      },
      layout: {
        width: 1180,
        height: 780,
        minWidth: 980,
        minHeight: 620,
        maxWidth: 1500,
        maxHeight: 1080,
        padding: 6,
      },
      labels: {
        save: "Save",
        cancel: "Cancel",
      },
    });
  } finally {
    if (
      stagedPublishCoordinator &&
      typeof stagedPublishCoordinator.dispose === "function"
    ) {
      stagedPublishCoordinator.dispose();
    }
  }
}

function normalizeEditorEntries(editorResult, fallbackEntries) {
  if (!editorResult || editorResult.saved !== true) {
    return null;
  }
  const fromResult = editorResult.result;
  const entries = Array.isArray(fromResult)
    ? fromResult
    : Array.isArray(fromResult?.entries)
      ? fromResult.entries
      : Array.isArray(editorResult.entries)
        ? editorResult.entries
        : fallbackEntries;
  return sortEntries(normalizeEntriesInput(entries));
}

async function applyResultImpl({ manifest, runtime }) {
  const workflowId = String(manifest?.id || TAG_MANAGER_WORKFLOW_ID).trim() || TAG_MANAGER_WORKFLOW_ID;
  const syncConfig = resolveGitHubSyncConfig(workflowId);
  const mode = resolveTagManagerMode(syncConfig);
  const loaded =
    mode === "subscription" ? loadRemoteCommittedState() : loadLocalCommittedState();
  let committedEntries = loaded.entries;
  let editorEntries = committedEntries;
  let remoteSyncState = mode === "subscription" ? "configured" : "unconfigured";
  let remoteSyncMessage = buildRemoteSyncNotice({
    status: remoteSyncState,
    sourceLabel: syncConfig.sourceLabel,
  });

  if (mode === "subscription") {
    try {
      const remoteVocabulary = await subscribeRemoteVocabulary({
        workflowId,
        config: syncConfig,
      });
      const committed = persistRemoteCommittedEntries(remoteVocabulary.tags);
      syncActiveCommittedProjection(committed.entries);
      committedEntries = committed.entries;
      editorEntries = committed.entries;
      remoteSyncState = "subscribed";
      remoteSyncMessage = buildRemoteSyncNotice({
        status: remoteSyncState,
        sourceLabel: syncConfig.sourceLabel,
      });
    } catch (error) {
      syncActiveCommittedProjection(committedEntries);
      remoteSyncState = "subscribe-failed";
      remoteSyncMessage = buildRemoteSyncNotice({
        status: remoteSyncState,
        sourceLabel: syncConfig.sourceLabel,
        reason: String(error?.message || error || ""),
      });
    }
  } else {
    syncActiveCommittedProjection(committedEntries);
  }

  while (true) {
    const openResult = await openTagManagerEditor({
      workflowId,
      syncConfig,
      mode,
      title: String(manifest?.label || "Tag Manager").trim() || "Tag Manager",
      entries: editorEntries,
      committedEntries,
      corrupted: loaded.corrupted,
      remoteSyncState,
      remoteSyncMessage,
    });

    const nextEntries = normalizeEditorEntries(openResult, editorEntries);
    if (!nextEntries) {
      const reason = String(openResult?.reason || "canceled").trim();
      throw new Error(`tag-manager canceled by user: ${reason}`);
    }

    if (mode === "local") {
      const saved = persistLocalCommittedEntries(nextEntries);
      syncActiveCommittedProjection(saved.entries);
      return {
        total: saved.entries.length,
        exported: exportTagStrings(saved.entries).length,
      };
    }

    try {
      const published = await publishRemoteVocabulary({
        workflowId,
        config: syncConfig,
        entries: nextEntries,
      });
      const committed = persistRemoteCommittedEntries(published.tags);
      syncActiveCommittedProjection(committed.entries);
      showSubscriptionPublishToast({
        action: "remote publish",
        success: true,
        count: committed.entries.length,
      });
      return {
        total: committed.entries.length,
        exported: exportTagStrings(committed.entries).length,
      };
    } catch (error) {
      const reason = String(error?.message || error || "unknown publish failure").trim();
      showSubscriptionPublishToast({
        action: "remote publish",
        success: false,
        reason,
      });
      editorEntries = nextEntries;
      committedEntries = loadRemoteCommittedState().entries;
      remoteSyncState = "save-publish-failed";
      remoteSyncMessage = buildRemoteSyncNotice({
        status: remoteSyncState,
        sourceLabel: syncConfig.sourceLabel,
        reason,
      });
    }
  }
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}

export const __tagManagerTestOnly = {
  buildGitHubContentsApiUrl,
  buildGitHubRawUrl,
  buildPublishedVocabularyPayload,
  buildExportText,
  buildRemoteSyncNotice,
  clearPersistedStagedEntries,
  commitStagedEntriesBatch,
  commitControlledEntries,
  composeTagFromFacetAndSuffix,
  collectValidationIssues,
  countVisibleFacets,
  createInitialFacetVisibilityState,
  createStagedTagInboxRenderer,
  createTagManagerRenderer,
  entryMatchesFacetVisibility,
  exportTagStrings,
  filterEntriesByQueryAndFacet,
  getTagSuffix,
  importFromYamlText,
  loadLocalCommittedState,
  loadPersistedState,
  loadPersistedStagedState,
  loadRemoteCommittedState,
  mergeUniqueEntriesByTag,
  normalizeRemoteVocabularyPayload,
  normalizeFacetVisibilityState,
  normalizeStagedEntriesInput,
  parseYamlTagEntries,
  publishRemoteVocabulary,
  persistLocalCommittedEntries,
  persistEntries,
  persistRemoteCommittedEntries,
  persistStagedEntries,
  promoteStagedEntryToControlledVocabulary,
  removeStagedEntriesByTags,
  resolveGitHubSyncConfig,
  resolveLocalCommittedPrefsKey,
  resolvePrefsKey,
  resolveRemoteCommittedPrefsKey,
  resolveStagedPrefsKey,
  resolveWorkflowSettingsPrefsKey,
  resolveTagManagerMode,
  sameNormalizedEntries,
  subscribeRemoteVocabulary,
};
