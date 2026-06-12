import {
  DEFAULT_GITHUB_FILE_PATH,
  DEFAULT_GITHUB_REPO,
  DEFAULT_PREFS_PREFIX,
  TAG_VOCAB_LOCAL_COMMITTED_PREF_SUFFIX,
  TAG_VOCAB_PREF_SUFFIX,
  TAG_VOCAB_REMOTE_COMMITTED_PREF_SUFFIX,
  TAG_VOCAB_STAGED_PREF_SUFFIX,
  WORKFLOW_SETTINGS_PREF_SUFFIX,
} from "./model.mjs";
import {
  requireHostPrefs,
  resolveAddonConfig,
} from "./runtime.mjs";

export function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function resolvePrefsPrefix() {
  const config = resolveAddonConfig();
  return String(config?.prefsPrefix || "").trim() || DEFAULT_PREFS_PREFIX;
}

export function resolvePrefsKey() {
  return `${resolvePrefsPrefix()}.${TAG_VOCAB_PREF_SUFFIX}`;
}

export function resolveLocalCommittedPrefsKey() {
  return `${resolvePrefsPrefix()}.${TAG_VOCAB_LOCAL_COMMITTED_PREF_SUFFIX}`;
}

export function resolveRemoteCommittedPrefsKey() {
  return `${resolvePrefsPrefix()}.${TAG_VOCAB_REMOTE_COMMITTED_PREF_SUFFIX}`;
}

export function resolveStagedPrefsKey() {
  return `${resolvePrefsPrefix()}.${TAG_VOCAB_STAGED_PREF_SUFFIX}`;
}

export function resolveWorkflowSettingsPrefsKey() {
  return `${resolvePrefsPrefix()}.${WORKFLOW_SETTINGS_PREF_SUFFIX}`;
}

export function readRawPref(key, runtime) {
  const raw = requireHostPrefs(runtime).get(String(key || "").trim(), true);
  return typeof raw === "string" ? raw.trim() : "";
}

export function readWorkflowSettingsParams(workflowId, runtime) {
  const text = readRawPref(resolveWorkflowSettingsPrefsKey(), runtime);
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) {
      return {};
    }
    const workflowEntry = parsed[String(workflowId || "").trim()];
    if (!isRecord(workflowEntry)) {
      return {};
    }
    return isRecord(workflowEntry.workflowParams) ? workflowEntry.workflowParams : {};
  } catch {
    return {};
  }
}

export function resolveGitHubSyncConfig(workflowId, runtime) {
  const params = readWorkflowSettingsParams(workflowId, runtime);
  const githubOwner = String(params.github_owner || "").trim();
  const githubRepo =
    String(params.github_repo || "").trim() || DEFAULT_GITHUB_REPO;
  const filePath =
    (String(params.file_path || "").trim() || DEFAULT_GITHUB_FILE_PATH).replace(
      /^\/+/,
      "",
    );
  const githubToken = String(params.github_token || "").trim();
  const configured = Boolean(githubOwner && githubRepo && filePath && githubToken);
  return {
    githubOwner,
    githubRepo,
    filePath,
    githubToken,
    configured,
    sourceLabel:
      githubOwner && githubRepo && filePath
        ? `${githubOwner}/${githubRepo}@main/${filePath}`
        : "",
  };
}

export function resolveTagVocabularyMode(syncConfig) {
  return (syncConfig || {}).configured ||
    (syncConfig?.githubOwner &&
      syncConfig?.githubRepo &&
      syncConfig?.filePath &&
      syncConfig?.githubToken)
    ? "subscription"
    : "local";
}

export function resolveActiveCommittedPrefsKey(options = {}) {
  const syncConfig =
    options.syncConfig ||
    resolveGitHubSyncConfig(options.workflowId || "tag-manager", options.runtime);
  return resolveTagVocabularyMode(syncConfig) === "subscription"
    ? resolveRemoteCommittedPrefsKey()
    : resolveLocalCommittedPrefsKey();
}

export function seedCommittedPrefFromLegacyIfMissing(args) {
  const prefs = requireHostPrefs(args?.runtime);
  const normalizedTargetKey = String(args?.targetKey || "").trim();
  if (!normalizedTargetKey || readRawPref(normalizedTargetKey, args?.runtime)) {
    return;
  }
  const loadState =
    typeof args?.loadValidatedEntriesStateFromRaw === "function"
      ? args.loadValidatedEntriesStateFromRaw
      : null;
  if (!loadState) {
    return;
  }
  const legacyLoaded = loadState(readRawPref(resolvePrefsKey(), args?.runtime));
  if (legacyLoaded.corrupted || legacyLoaded.entries.length === 0) {
    return;
  }
  prefs.set(
    normalizedTargetKey,
    JSON.stringify({
      version: 1,
      entries: legacyLoaded.entries,
    }),
    true,
  );
}

export function buildCommittedPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

export function buildProjectionPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

export function buildStagedPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

export function syncActiveCommittedProjection(entries, runtime) {
  const payload = buildProjectionPayload(entries);
  requireHostPrefs(runtime).set(resolvePrefsKey(), JSON.stringify(payload), true);
  return payload;
}

export function persistLocalCommittedEntries(entries, runtime) {
  const payload = buildCommittedPayload(entries);
  requireHostPrefs(runtime).set(
    resolveLocalCommittedPrefsKey(),
    JSON.stringify(payload),
    true,
  );
  return payload;
}

export function persistRemoteCommittedEntries(entries, runtime) {
  const payload = buildCommittedPayload(entries);
  requireHostPrefs(runtime).set(
    resolveRemoteCommittedPrefsKey(),
    JSON.stringify(payload),
    true,
  );
  return payload;
}

export function persistStagedEntries(entries, runtime) {
  const payload = buildStagedPayload(entries);
  requireHostPrefs(runtime).set(
    resolveStagedPrefsKey(),
    JSON.stringify(payload),
    true,
  );
  return payload;
}

export function loadLocalCommittedState(args) {
  seedCommittedPrefFromLegacyIfMissing({
    targetKey: resolveLocalCommittedPrefsKey(),
    runtime: args?.runtime,
    loadValidatedEntriesStateFromRaw: args?.loadValidatedEntriesStateFromRaw,
  });
  return args?.loadValidatedEntriesStateFromRaw?.(
    readRawPref(resolveLocalCommittedPrefsKey(), args?.runtime),
  );
}

export function loadRemoteCommittedState(args) {
  seedCommittedPrefFromLegacyIfMissing({
    targetKey: resolveRemoteCommittedPrefsKey(),
    runtime: args?.runtime,
    loadValidatedEntriesStateFromRaw: args?.loadValidatedEntriesStateFromRaw,
  });
  return args?.loadValidatedEntriesStateFromRaw?.(
    readRawPref(resolveRemoteCommittedPrefsKey(), args?.runtime),
  );
}

export function loadPersistedState(args) {
  const syncConfig =
    args?.syncConfig ||
    resolveGitHubSyncConfig(args?.workflowId || "tag-manager", args?.runtime);
  const mode = resolveTagVocabularyMode(syncConfig);
  const loaded =
    mode === "subscription"
      ? loadRemoteCommittedState(args)
      : loadLocalCommittedState(args);
  return {
    ...(loaded || { corrupted: false, entries: [], issues: [] }),
    mode,
  };
}

export function persistEntries(entries, args) {
  const syncConfig =
    args?.syncConfig ||
    resolveGitHubSyncConfig(args?.workflowId || "tag-manager", args?.runtime);
  const mode = args?.mode || resolveTagVocabularyMode(syncConfig);
  const payload =
    mode === "subscription"
      ? persistRemoteCommittedEntries(entries, args?.runtime)
      : persistLocalCommittedEntries(entries, args?.runtime);
  syncActiveCommittedProjection(payload.entries, args?.runtime);
  return payload;
}

export function loadPersistedStagedState(args) {
  return args?.loadStagedEntriesStateFromRaw?.(
    readRawPref(resolveStagedPrefsKey(), args?.runtime),
  );
}
