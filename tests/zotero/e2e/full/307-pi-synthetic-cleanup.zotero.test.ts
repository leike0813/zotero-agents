import { assert } from "chai";
import {
  getPiCredentialIdentityRevision,
  listPiCredentials,
  putPiCredential,
} from "../../../../src/modules/piCredentialStore";
import {
  appendPiOwnerEntry,
  createPiOwner,
  inspectPiOwner,
  assessPiOwnerRecovery,
} from "../../../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../../../src/modules/piTranscriptStore";
import {
  getPluginMetaValue,
  setPluginMetaValue,
} from "../../../../src/modules/pluginStateStore";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { getParentPath, joinNativePath } from "../../../../src/platform/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { emitZoteroTestDebug, isSystemE2ERun } from "../../diagnosticBridge";
import {
  ensureDiagnosticsDirectory,
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsDirectory,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";

/**
 * PI-06. The narrow synthetic old-development Codex cleanup upgrade sample.
 *
 * Scope and honesty boundary: this is a synthetic development sample, not a
 * real retired account, not a remote revocation and not the fixed v0.9.0
 * baseline install chain. It seeds one retired credential/connection/card and
 * one unrelated account catalog cache entry, then lets the *installed* plugin's
 * own startup hooks perform the cleanup across two real host restarts. The
 * six-host matrix, the baseline commit/SHA, the selected capacity and the
 * numerical thresholds are untouched, and nothing here can make C20 accepted.
 *
 * Every observation is a structural count or boolean, written as a standalone
 * JSON artifact rather than as a system-e2e debug event, because a custom
 * event kind is not retained in the run manifest. No credential material,
 * masked value, token, provider response or native error text is recorded; a
 * production failure surfaces as one of this file's own coded errors.
 *
 * The case is opt-in through ZOTERO_PI_SYNTHETIC_CLEANUP=1 and skips by
 * default, because a full E2E entry runs every file in this directory and the
 * seed phase replaces the Pi configuration, credential document and catalog
 * cache of whatever profile it is pointed at. The seed additionally requires
 * an empty credential document, so it can only ever run against a fresh
 * isolated profile and never against a real account copy.
 */

const CASE_ID = "PI-06";
const OPERATION_ID = "system-e2e:pi:06";
const CLEANUP_META_KEY = "pi.chatgpt.development-cleanup.v1";
const RETIRED_CREDENTIAL = "synthetic-retired-codex";
const RETAINED_CREDENTIAL = "synthetic-retained-api";
const RETIRED_CONNECTION = "synthetic-retired-codex-connection";
const RETIRED_CARD = "synthetic-retired-codex-card";
const RETAINED_CONNECTION = "synthetic-retained-api-connection";
const RETAINED_CARD = "synthetic-retained-api-card";
const UNRELATED_CONNECTION = "synthetic-unrelated-spare-connection";
const CONVERSATION_OWNER = "synthetic-cleanup-conversation";
const SKILL_RUN_OWNER = "synthetic-cleanup-skill-run";
const RETAINED_MODEL_ID = "synthetic-retained-discovered-model";
const FICTIONAL_API_KEY = "sk-synthetic-cleanup-fixture-value";
const UNRELATED_PROFILE_TEXT = "unrelated-profile-data\n";
const SYNTHETIC_TIME = "2026-10-05T00:00:00.000Z";
const OPT_IN_ENV = "ZOTERO_PI_SYNTHETIC_CLEANUP";
const OBSERVATION_ENV = "ZOTERO_PI_SYNTHETIC_CLEANUP_OBSERVATION_PATH";
const OBSERVATION_SCHEMA = "zotero-agents.pi-synthetic-cleanup-observation.v1";

type OwnerRef = {
  kind: "conversation" | "skill_run";
  ownerId: string;
};

type ConfigurationProjection = {
  present: boolean;
  version: number;
  connectionIds: string[];
  configurationIds: string[];
  defaultPurposes: string[];
  globalDefaultCard: string;
  overlayPath: string;
};

type SeedState = {
  phase: 1 | 2;
  markerWasComplete: boolean;
  markerCleared: boolean;
  history: { conversationEntries: number; skillRunEntries: number };
  observedConfiguration: ConfigurationProjection | null;
};

type SyntheticCleanupObservation = {
  schema: typeof OBSERVATION_SCHEMA;
  sample: "synthetic-development-cleanup";
  caseId: typeof CASE_ID;
  finalAcceptance: false;
  zoteroMajor: number;
  seed?: SyntheticCleanupPhaseFacts;
  firstStartup?: SyntheticCleanupPhaseFacts;
  secondStartup?: SyntheticCleanupPhaseFacts;
};

type SyntheticCleanupPhaseFacts = {
  markerWasComplete?: boolean;
  markerCleared?: boolean;
  markerComplete?: boolean;
  installedPluginInitialized?: boolean;
  startupsObserved?: number;
  credentialIds?: string[];
  connectionIds?: string[];
  configurationIds?: string[];
  defaultPurposes?: string[];
  overlayPathPreserved?: boolean;
  catalogCacheAccountIds?: string[];
  catalogCacheLegacyFactsPresent?: boolean;
  historyEntryCounts?: { conversationEntries: number; skillRunEntries: number };
  unrelatedProfileDataPreserved?: boolean;
  workspacePreserved?: boolean;
  effectReceiptsPreserved?: boolean;
  unknownNoReplay?: boolean;
  prefsOnDisk?: {
    present: boolean;
    credentials: boolean;
    configuration: boolean;
  };
  seededCounts?: {
    credentials: number;
    connections: number;
    configurations: number;
    defaultPurposes: number;
    catalogCacheAccounts: number;
  };
};

function statePath() {
  return PathUtils.join(stateDirectory(), "pi-06-state.json");
}

function stateDirectory() {
  return PathUtils.join(Zotero.DataDirectory.dir, "system-e2e");
}

function unrelatedProfileMarker() {
  const profileDirectory = Services.dirsvc.get(
    "ProfD",
    Components.interfaces.nsIFile,
  );
  return PathUtils.join(
    profileDirectory.path,
    "synthetic-cleanup-unrelated.txt",
  );
}

function profilePrefsPath() {
  const profileDirectory = Services.dirsvc.get(
    "ProfD",
    Components.interfaces.nsIFile,
  );
  return PathUtils.join(profileDirectory.path, "prefs.js");
}

// Presence only, never a value: whether this case's own two prefs are already
// in the profile's prefs.js. It separates "the pref service never flushed the
// fixture" from "the restart restored a profile without it".
async function fixturePrefsOnDisk() {
  const path = profilePrefsPath();
  if (!(await IOUtils.exists(path)))
    return { present: false, credentials: false, configuration: false };
  const raw = await IOUtils.readUTF8(path);
  const key = "extensions.zotero.zotero-skills.";
  return {
    present: true,
    credentials: raw.includes(key + "piCredentialEncryptedJson"),
    configuration: raw.includes(key + "piProviderConfigurationJson"),
  };
}

function catalogCachePath() {
  return joinNativePath(
    getRuntimePersistencePaths().cacheDir,
    "pi-model-catalog.json",
  );
}

function installedPluginInitialized() {
  return (
    (
      Zotero as unknown as {
        ZoteroSkills?: { data?: { initialized?: boolean } };
      }
    ).ZoteroSkills?.data?.initialized === true
  );
}

function zoteroMajor() {
  return Number(String(Zotero.version || "0").split(".")[0]);
}

function optedIn() {
  return readDiagnosticsEnv(OPT_IN_ENV) === "1";
}

function configurationDocument() {
  return {
    version: 2,
    connections: [
      {
        id: RETIRED_CONNECTION,
        label: "Retired Codex (synthetic)",
        provider: "openai-codex",
        authVariant: "openai-codex",
        api: "openai-codex-responses",
        credentialRef: RETIRED_CREDENTIAL,
        enabled: true,
        baseUrl: "https://chatgpt.com/backend-api/codex",
        binding: {
          revision: 1,
          api: "openai-codex-responses",
          baseUrl: "https://chatgpt.com/backend-api/codex",
        },
      },
      {
        id: RETAINED_CONNECTION,
        label: "Retained API key (synthetic)",
        provider: "openai",
        authVariant: "api-key",
        api: "openai-responses",
        credentialRef: RETAINED_CREDENTIAL,
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        binding: {
          revision: 1,
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
      },
      {
        id: UNRELATED_CONNECTION,
        label: "Unrelated spare (synthetic)",
        provider: "anthropic",
        authVariant: "api-key",
        credentialRef: "synthetic-unrelated-key",
        enabled: false,
      },
    ],
    configurations: [
      {
        id: RETIRED_CARD,
        connectionId: RETIRED_CONNECTION,
        modelId: "gpt-codex-synthetic",
        enabled: true,
      },
      {
        id: RETAINED_CARD,
        connectionId: RETAINED_CONNECTION,
        modelId: "synthetic-api-model",
        enabled: true,
      },
    ],
    defaults: {
      // The retired purpose names the retired card, so it goes with it.
      global: { configurationId: RETIRED_CARD },
      // Unrelated purposes name a surviving card and must stay untouched.
      conversation: { configurationId: RETAINED_CARD },
      title: { configurationId: RETAINED_CARD },
    },
    overlayPath: "synthetic-overlay-retained",
  };
}

function projectConfiguration(): ConfigurationProjection {
  const raw = String(getPref("piProviderConfigurationJson") || "").trim();
  const parsed = raw ? (JSON.parse(raw) as Record<string, any>) : null;
  const defaults =
    parsed?.defaults && typeof parsed.defaults === "object"
      ? (parsed.defaults as Record<string, any>)
      : {};
  return {
    present: !!parsed,
    version: Number(parsed?.version || 0),
    connectionIds: Array.isArray(parsed?.connections)
      ? parsed.connections.map((entry: any) => String(entry?.id || ""))
      : [],
    configurationIds: Array.isArray(parsed?.configurations)
      ? parsed.configurations.map((entry: any) => String(entry?.id || ""))
      : [],
    defaultPurposes: Object.keys(defaults).sort(),
    globalDefaultCard: String(defaults.global?.configurationId || ""),
    overlayPath: String(parsed?.overlayPath || ""),
  };
}

function projectCredentials() {
  return listPiCredentials()
    .map((entry) => ({ id: String(entry.id), kind: String(entry.kind) }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function projectCatalogCache() {
  const path = catalogCachePath();
  const present = await IOUtils.exists(path);
  const raw = present ? await IOUtils.readUTF8(path) : "";
  const parsed = raw ? (JSON.parse(raw) as Record<string, any>) : null;
  const accounts =
    parsed?.accounts && typeof parsed.accounts === "object"
      ? (parsed.accounts as Record<string, any>)
      : {};
  return {
    present,
    version: Number(parsed?.version || 0),
    accountIds: Object.keys(accounts).sort(),
    accountModelIds: Object.fromEntries(
      Object.entries(accounts).map(([id, value]) => [
        id,
        Array.isArray((value as any)?.models)
          ? (value as any).models.map((model: any) => String(model?.id || ""))
          : [],
      ]),
    ),
    legacyFactsPresent: raw.includes("openai-codex"),
    epoch: Number(parsed?.epoch || 0),
  };
}

async function projectHistory() {
  const conversation = await inspectPiOwner({
    kind: "conversation",
    ownerId: CONVERSATION_OWNER,
  });
  const skillRun = await inspectPiOwner({
    kind: "skill_run",
    ownerId: SKILL_RUN_OWNER,
  });
  return {
    conversationEntries: conversation.entries.length,
    skillRunEntries: skillRun.entries.length,
  };
}

/** Entry count for a seeded owner, treating an absent owner as empty. */
async function existingHistoryEntries(ref: OwnerRef) {
  try {
    return (await inspectPiOwner(ref)).entries.length;
  } catch {
    return 0;
  }
}

async function collectFacts() {
  const owner = { kind: "conversation" as const, ownerId: CONVERSATION_OWNER };
  const conversation = await inspectPiOwner(owner);
  const recovery = await assessPiOwnerRecovery(owner);
  const workspace = PathUtils.join(
    piOwnerPaths(owner).dir,
    "workspace",
    "synthetic-retained.txt",
  );
  return {
    markerComplete: getPluginMetaValue(CLEANUP_META_KEY) === "complete",
    installedPluginInitialized: installedPluginInitialized(),
    credentials: projectCredentials(),
    configuration: projectConfiguration(),
    cache: await projectCatalogCache(),
    history: await projectHistory(),
    workspacePreserved:
      (await IOUtils.exists(workspace)) &&
      (await IOUtils.readUTF8(workspace)) === UNRELATED_PROFILE_TEXT,
    effectReceiptsPreserved: conversation.entries.some(
      (entry) =>
        entry.kind === "tool_call_receipt" &&
        (entry.payload as any).callId === "synthetic-settled-effect" &&
        (entry.payload as any).status === "completed" &&
        (entry.payload as any).effectCertainty === "confirmed_complete",
    ),
    unknownNoReplay:
      recovery.state === "state_unknown" &&
      recovery.hasHolds &&
      !recovery.safeToResume &&
      conversation.entries.filter(
        (entry) =>
          entry.kind === "tool_call_started" &&
          (entry.payload as any).callId === "synthetic-unknown-effect",
      ).length === 1 &&
      !conversation.entries.some(
        (entry) =>
          entry.kind === "tool_call_receipt" &&
          (entry.payload as any).callId === "synthetic-unknown-effect",
      ),
    prefsOnDisk: await fixturePrefsOnDisk(),
    unrelatedProfileDataPreserved:
      (await IOUtils.exists(unrelatedProfileMarker())) &&
      (await IOUtils.readUTF8(unrelatedProfileMarker())) ===
        UNRELATED_PROFILE_TEXT,
  };
}

async function seedCredentials() {
  await putPiCredential({
    id: RETAINED_CREDENTIAL,
    label: "Retained API key (synthetic)",
    material: { kind: "api-key", secret: FICTIONAL_API_KEY },
  });
  const document = JSON.parse(
    String(getPref("piCredentialEncryptedJson") || "{}"),
  ) as { version: number; records: Record<string, any> };
  const retained = document.records?.[RETAINED_CREDENTIAL];
  assert.isObject(retained, "synthetic_retained_envelope_missing");
  // The retired envelope is a real encrypted envelope cloned from the
  // retained one, so its ciphertext and IV are genuine profile material. Only
  // its development-era identity fields are synthetic.
  document.records[RETIRED_CREDENTIAL] = {
    ...retained,
    id: RETIRED_CREDENTIAL,
    label: "Retired Codex (synthetic)",
    kind: "openai-codex",
    identityRevision: "synthetic-retired-identity-revision",
    updatedAt: SYNTHETIC_TIME,
  };
  setPref("piCredentialEncryptedJson", JSON.stringify(document));
}

async function seedHistory() {
  const conversation: OwnerRef = {
    kind: "conversation",
    ownerId: CONVERSATION_OWNER,
  };
  const skillRun: OwnerRef = { kind: "skill_run", ownerId: SKILL_RUN_OWNER };
  await createPiOwner(conversation);
  await appendPiOwnerEntry(conversation, {
    entryId: "synthetic-message",
    kind: "message",
    payload: { text: "synthetic non-sensitive history" },
  });
  // These are synthetic durable facts, not actual external dispatches. Both
  // installed startups must retain the receipt and leave the unknown hold
  // unresolved; PI-05 separately observes a real interrupted dispatch.
  await appendPiOwnerEntry(conversation, {
    entryId: "synthetic-settled-start",
    kind: "tool_call_started",
    turnId: "synthetic-turn",
    payload: { callId: "synthetic-settled-effect" },
  });
  await appendPiOwnerEntry(conversation, {
    entryId: "synthetic-settled-receipt",
    kind: "tool_call_receipt",
    turnId: "synthetic-turn",
    payload: {
      callId: "synthetic-settled-effect",
      status: "completed",
      effectCertainty: "confirmed_complete",
    },
  });
  await appendPiOwnerEntry(conversation, {
    entryId: "synthetic-unknown-start",
    kind: "tool_call_started",
    turnId: "synthetic-turn",
    payload: { callId: "synthetic-unknown-effect" },
  });
  const workspace = PathUtils.join(piOwnerPaths(conversation).dir, "workspace");
  await ensureRuntimeDirectoryStrict(workspace);
  await writeRuntimeTextFile(
    PathUtils.join(workspace, "synthetic-retained.txt"),
    UNRELATED_PROFILE_TEXT,
  );
  await createPiOwner(skillRun);
  await appendPiOwnerEntry(skillRun, {
    entryId: "synthetic-admitted",
    kind: "skill_run_admitted",
    payload: { skillId: "synthetic", taskName: "Synthetic", mode: "auto" },
  });
}

async function seedCatalogCache(
  retiredRevision: string,
  retainedRevision: string,
) {
  const paths = getRuntimePersistencePaths();
  await ensureRuntimeDirectoryStrict(paths.cacheDir);
  await writeRuntimeTextFile(
    catalogCachePath(),
    JSON.stringify({
      version: 2,
      epoch: 1,
      accounts: {
        [RETIRED_CREDENTIAL]: {
          identityRevision: retiredRevision,
          // The only cached facts for the retired credential are development
          // era Codex facts, so that whole observation must disappear.
          models: [
            {
              provider: "openai-codex",
              id: "gpt-codex-synthetic",
              name: "Codex (synthetic)",
              api: "openai-codex-responses",
              baseUrl: "https://chatgpt.com/backend-api/codex",
              contextWindow: 272000,
              maxTokens: 0,
              input: ["text"],
              authVariants: ["openai-codex"],
              source: "discovered",
              credentialRef: RETIRED_CREDENTIAL,
            },
          ],
          checkedAt: SYNTHETIC_TIME,
          revision: "synthetic-legacy-revision",
        },
        [RETAINED_CREDENTIAL]: {
          identityRevision: retainedRevision,
          // An unrelated current account observation must survive.
          models: [
            {
              provider: "openai",
              id: RETAINED_MODEL_ID,
              name: "Synthetic retained model",
              api: "openai-responses",
              baseUrl: "https://api.openai.com/v1",
              contextWindow: 128000,
              maxTokens: 0,
              input: ["text"],
              authVariants: ["chatgpt"],
              source: "discovered",
              credentialRef: RETAINED_CREDENTIAL,
            },
          ],
          checkedAt: SYNTHETIC_TIME,
          revision: "synthetic-retained-revision",
        },
      },
      retired: [],
      autoUpdate: false,
      checkedAt: SYNTHETIC_TIME,
    }),
  );
}

async function readState(): Promise<SeedState> {
  const path = statePath();
  assert.isTrue(
    await IOUtils.exists(path),
    "synthetic_cleanup_state_missing_after_restart",
  );
  return JSON.parse(await IOUtils.readUTF8(path)) as SeedState;
}

async function writeState(state: SeedState) {
  await IOUtils.makeDirectory(stateDirectory(), {
    ignoreExisting: true,
  });
  await IOUtils.writeUTF8(statePath(), JSON.stringify(state));
}

/**
 * One stable artifact for the whole case. A caller-provided env path wins so
 * the main thread can collect it from a known location; otherwise the default
 * diagnostics directory holds a single fixed-name file that all three phases
 * merge into, so the seed and both startups stay in one permanent record.
 */
function observationPath() {
  const explicit = readDiagnosticsEnv(OBSERVATION_ENV);
  if (explicit) return explicit;
  return joinNativePath(
    resolveDefaultTestDiagnosticsDirectory(),
    "pi-synthetic-cleanup-observation.json",
  );
}

async function recordObservation(
  section: "seed" | "firstStartup" | "secondStartup",
  facts: SyntheticCleanupPhaseFacts,
) {
  const path = observationPath();
  let current: SyntheticCleanupObservation = {
    schema: OBSERVATION_SCHEMA,
    sample: "synthetic-development-cleanup",
    caseId: CASE_ID,
    finalAcceptance: false,
    zoteroMajor: zoteroMajor(),
    [section]: facts,
  };
  if (await IOUtils.exists(path)) {
    try {
      const previous = JSON.parse(
        await IOUtils.readUTF8(path),
      ) as SyntheticCleanupObservation;
      if (previous?.schema === OBSERVATION_SCHEMA)
        current = { ...current, ...previous, [section]: facts };
    } catch {
      // A damaged artifact is replaced by this run's own facts.
    }
  }
  await ensureDiagnosticsDirectory(getParentPath(path));
  await writeDiagnosticsText(path, `${JSON.stringify(current, null, 2)}\n`);
}

async function waitForInstalledStartup() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (
      installedPluginInitialized() &&
      getPluginMetaValue(CLEANUP_META_KEY) === "complete"
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("synthetic_cleanup_installed_startup_not_observed");
}

async function requestInstalledRestart() {
  const processId = Number(
    (
      Zotero.Utilities.Internal as unknown as {
        getProcessID?: () => number;
      }
    ).getProcessID?.() || 0,
  );
  assert.isAbove(processId, 0, "host_process_id_required_for_restart");
  // The runner hard-kills the host to reach a real installed startup, so the
  // seeded profile has to be on disk first. Everything else this case seeds
  // (owner history, catalog cache, profile marker, plugin meta) is committed
  // when it returns; only a pref write still needs the flush.
  Services.prefs.savePrefFile(null);
  // Prove the fixture reached prefs.js instead of assuming it. Without this the
  // restarted host could start from a profile that never had the synthetic
  // fixture, which would test pref crash-durability instead of the startup
  // cleanup, and the failure would surface later as a confusing empty scope.
  let onDisk = await fixturePrefsOnDisk();
  const flushDeadline = Date.now() + 5_000;
  while (
    (!onDisk.credentials || !onDisk.configuration) &&
    Date.now() < flushDeadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    onDisk = await fixturePrefsOnDisk();
  }
  assert.isTrue(
    onDisk.credentials,
    "synthetic_cleanup_credential_prefs_not_durable",
  );
  assert.isTrue(
    onDisk.configuration,
    "synthetic_cleanup_configuration_prefs_not_durable",
  );
  // The restart request is the one emission that must stay on the system-e2e
  // event sink: the runner's restart parser consumes exactly this event kind.
  // Every cleanup fact itself goes to the standalone observation artifact.
  await emitZoteroTestDebug({
    kind: "system-e2e-owner-restart-request",
    caseId: CASE_ID,
    operationId: OPERATION_ID,
    processId,
  });
  throw new Error("system_e2e_owner_restart_not_performed");
}

async function seedProfileAndRequestRestart() {
  assert.isTrue(
    installedPluginInitialized(),
    "synthetic_cleanup_requires_installed_plugin",
  );
  // Fresh isolated profile only. A reused or real account copy always has
  // credentials here, and this case must never replace them.
  assert.equal(
    listPiCredentials().length,
    0,
    "synthetic_cleanup_requires_fresh_isolated_profile",
  );
  // Owner history and the catalog cache are committed files, so they survive a
  // hard kill even when the pref write does not. A reused runtime root would
  // therefore re-seed on top of its own previous synthetic state; refuse it
  // instead, so the fixture under test is always built from nothing.
  const retainedHistory = await existingHistoryEntries({
    kind: "conversation",
    ownerId: CONVERSATION_OWNER,
  });
  const retainedSkillRunHistory = await existingHistoryEntries({
    kind: "skill_run",
    ownerId: SKILL_RUN_OWNER,
  });
  assert.isAtMost(
    retainedHistory + retainedSkillRunHistory,
    0,
    "synthetic_cleanup_requires_fresh_runtime_root",
  );
  const markerWasComplete = getPluginMetaValue(CLEANUP_META_KEY) === "complete";
  await seedCredentials();
  const retiredRevision =
    getPiCredentialIdentityRevision(RETIRED_CREDENTIAL, "model-provider") || "";
  const retainedRevision =
    getPiCredentialIdentityRevision(RETAINED_CREDENTIAL, "model-provider") ||
    "";
  assert.isNotEmpty(retiredRevision, "synthetic_retired_revision_missing");
  assert.isNotEmpty(retainedRevision, "synthetic_retained_revision_missing");
  setPref(
    "piProviderConfigurationJson",
    JSON.stringify(configurationDocument()),
  );
  await seedHistory();
  await seedCatalogCache(retiredRevision, retainedRevision);
  await IOUtils.writeUTF8(unrelatedProfileMarker(), UNRELATED_PROFILE_TEXT);
  // A reused profile may already carry the completion marker. Clearing it
  // through the shared plugin meta API makes this synthetic copy look exactly
  // like an unmigrated development profile, so the marker can only read
  // complete again because this candidate's own installed startup set it.
  setPluginMetaValue(CLEANUP_META_KEY, "");
  const markerCleared = getPluginMetaValue(CLEANUP_META_KEY) !== "complete";
  const state: SeedState = {
    phase: 1,
    markerWasComplete,
    markerCleared,
    history: await projectHistory(),
    observedConfiguration: null,
  };
  await writeState(state);
  await recordObservation("seed", {
    markerWasComplete,
    markerCleared,
    seededCounts: {
      credentials: 2,
      connections: 3,
      configurations: 2,
      defaultPurposes: 3,
      catalogCacheAccounts: 2,
    },
    historyEntryCounts: state.history,
  });
  await requestInstalledRestart();
}

/**
 * The stable post-cleanup state both installed startups must reach: the
 * retired credential, connection, card and its default purpose are gone, the
 * legacy account cache facts are gone, and every unrelated configuration,
 * default, catalog account, canonical history entry and profile file is
 * preserved. These are the retention guarantees, so both startups assert the
 * same set rather than a narrower per-phase subset.
 */
async function assertStableCleanedState(
  facts: Awaited<ReturnType<typeof collectFacts>>,
  state: SeedState,
) {
  assert.isTrue(facts.markerComplete, "synthetic_cleanup_marker_not_published");
  assert.isTrue(
    facts.installedPluginInitialized,
    "synthetic_cleanup_plugin_not_active",
  );
  assert.deepEqual(
    facts.credentials,
    [{ id: RETAINED_CREDENTIAL, kind: "api-key" }],
    "synthetic_cleanup_credential_scope_wrong",
  );
  assert.deepEqual(
    facts.configuration.connectionIds,
    [RETAINED_CONNECTION, UNRELATED_CONNECTION],
    "synthetic_cleanup_connection_scope_wrong",
  );
  assert.deepEqual(
    facts.configuration.configurationIds,
    [RETAINED_CARD],
    "synthetic_cleanup_card_scope_wrong",
  );
  assert.deepEqual(
    facts.configuration.defaultPurposes,
    ["conversation", "title"],
    "synthetic_cleanup_unrelated_defaults_lost",
  );
  assert.equal(
    facts.configuration.globalDefaultCard,
    "",
    "synthetic_cleanup_retired_default_retained",
  );
  assert.equal(
    facts.configuration.overlayPath,
    "synthetic-overlay-retained",
    "synthetic_cleanup_overlay_declaration_lost",
  );
  assert.isFalse(
    facts.cache.legacyFactsPresent,
    "synthetic_cleanup_legacy_catalog_facts_retained",
  );
  assert.isFalse(
    facts.cache.accountIds.includes(RETIRED_CREDENTIAL),
    "synthetic_cleanup_retired_account_cache_retained",
  );
  assert.deepEqual(
    facts.cache.accountModelIds[RETAINED_CREDENTIAL],
    [RETAINED_MODEL_ID],
    "synthetic_cleanup_unrelated_account_cache_lost",
  );
  assert.deepEqual(
    facts.history,
    state.history,
    "synthetic_cleanup_canonical_history_changed",
  );
  assert.isTrue(
    facts.unrelatedProfileDataPreserved,
    "synthetic_cleanup_unrelated_profile_data_lost",
  );
  assert.isTrue(facts.workspacePreserved, "synthetic_cleanup_workspace_lost");
  assert.isTrue(
    facts.effectReceiptsPreserved,
    "synthetic_cleanup_effect_receipt_lost",
  );
  assert.isTrue(
    facts.unknownNoReplay,
    "synthetic_cleanup_unknown_effect_replayed",
  );
}

function startupFacts(
  facts: Awaited<ReturnType<typeof collectFacts>>,
  state: SeedState,
): SyntheticCleanupPhaseFacts {
  return {
    markerWasComplete: state.markerWasComplete,
    markerCleared: state.markerCleared,
    markerComplete: facts.markerComplete,
    installedPluginInitialized: facts.installedPluginInitialized,
    credentialIds: facts.credentials.map((entry) => entry.id),
    connectionIds: facts.configuration.connectionIds,
    configurationIds: facts.configuration.configurationIds,
    defaultPurposes: facts.configuration.defaultPurposes,
    overlayPathPreserved:
      facts.configuration.overlayPath === "synthetic-overlay-retained",
    catalogCacheAccountIds: facts.cache.accountIds,
    catalogCacheLegacyFactsPresent: facts.cache.legacyFactsPresent,
    historyEntryCounts: facts.history,
    prefsOnDisk: facts.prefsOnDisk,
    unrelatedProfileDataPreserved: facts.unrelatedProfileDataPreserved,
    workspacePreserved: facts.workspacePreserved,
    effectReceiptsPreserved: facts.effectReceiptsPreserved,
    unknownNoReplay: facts.unknownNoReplay,
  };
}

async function assertFirstStartupAndRequestRestart(state: SeedState) {
  assert.isTrue(state.markerCleared, "synthetic_cleanup_marker_not_cleared");
  await waitForInstalledStartup();
  const facts = await collectFacts();
  await assertStableCleanedState(facts, state);
  await recordObservation("firstStartup", startupFacts(facts, state));
  await writeState({
    ...state,
    phase: 2,
    observedConfiguration: facts.configuration,
  });
  await requestInstalledRestart();
}

async function assertSecondStartup(state: SeedState) {
  assert.isTrue(state.markerCleared, "synthetic_cleanup_marker_not_cleared");
  await waitForInstalledStartup();
  const facts = await collectFacts();
  await assertStableCleanedState(facts, state);
  // Idempotence: the second installed startup finds nothing left to remove, so
  // the saved document is exactly the one the first startup left behind.
  assert.deepEqual(
    facts.configuration,
    state.observedConfiguration,
    "synthetic_cleanup_second_startup_changed_configuration",
  );
  await recordObservation("secondStartup", {
    ...startupFacts(facts, state),
    startupsObserved: 2,
  });
}

describe("Pi synthetic retired development cleanup", function () {
  this.timeout(300_000);

  before(function () {
    // Opt-in first: without the flag this case must not touch the profile at
    // all, not even to inspect it.
    if (!optedIn()) this.skip();
    assert.isTrue(isSystemE2ERun(), "runner event sink must be visible");
  });

  it("PI-06 removes only retired development Codex state across two installed startups", async function () {
    const resume = String(
      readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") || "",
    ).trim();
    if (resume && resume !== CASE_ID) this.skip();
    try {
      if (!resume) return await seedProfileAndRequestRestart();
      const state = await readState();
      if (state.phase === 1)
        return await assertFirstStartupAndRequestRestart(state);
      return await assertSecondStartup(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message === "system_e2e_owner_restart_not_performed" ||
        message.startsWith("synthetic_cleanup_")
      )
        throw error;
      // A production failure leaves this boundary as one coded fact: no native
      // error text, absolute path or credential material is printed.
      throw new Error("synthetic_cleanup_phase_failed");
    }
  });
});
