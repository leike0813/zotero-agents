/**
 * SkillRunner workspace snapshot wire contract — single source of truth for
 * the run-dialog / skillrunner-sidebar snapshot boundary (host -> child page).
 *
 * The producer is buildRunWorkspaceSnapshot / pushSnapshot in
 * src/modules/skillRunnerRunDialog.ts (snapshots may then pass through the
 * assistant sidebar host decoration and the workspace shell forwarder); the
 * consumer is src/sidebar/runDialog.js. Both sides import this file, so the
 * validator exists exactly once (unlike the ACP publication boundary, which
 * keeps mirrored TS/JS implementations).
 *
 * This file must stay free of imports from src/modules/** so page bundles
 * never pull in privileged code.
 */

import {
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  SKILLRUNNER_LEGACY_ACTIONS,
  type RunDialogMessageType,
} from "./assistantWireContract";
import { parseAssistantPendingInteraction } from "./assistantInteractionContract";

// ---------------------------------------------------------------------------
// Wire identity
// ---------------------------------------------------------------------------

export const SKILLRUNNER_SNAPSHOT_SCHEMA =
  "zotero-agents.skillrunner-workspace-snapshot.v1" as const;

// ---------------------------------------------------------------------------
// Known-keys registries
//
// Every layer below rejects unknown keys. The field inventories derive from
// the producer types RunWorkspaceSnapshot / RunDialogSnapshot /
// RunWorkspaceGroup in src/modules/skillRunnerRunDialog.ts plus the sidebar
// host decoration (buildDecoratedSkillRunnerSnapshot in
// src/modules/assistantWorkspaceSidebar.ts and
// decorateAssistantSidebarChildSnapshot in src/modules/assistantSidebarViewModel.ts).
// ---------------------------------------------------------------------------

/**
 * Envelope top-level keys. `sidebar` / `renderHints` only appear on
 * sidebar-host-decorated snapshots; `hostMode` is forced to "sidebar" by the
 * workspace shell forwarder on that path. Everything except the required
 * subset (schema/title/labels/workspace/own session key) is optional.
 */
export const SKILLRUNNER_SNAPSHOT_ENVELOPE_KEYS: readonly string[] = [
  "schema",
  "title",
  "labels",
  "workspace",
  "session",
  "hostMode",
  "transcriptRevision",
  "transcriptPaginationVirtualizationEnabled",
  "executionDisplayMode",
  "messageCounts",
  "drawer",
  "badges",
  "selectionTasks",
  "contextHint",
  "navigation",
  "sidebar",
  "renderHints",
];

/** Session keys that must be present (with the right type) when session is non-null. */
export const SKILLRUNNER_SNAPSHOT_SESSION_REQUIRED_KEYS: readonly string[] = [
  "title",
  "backendTitle",
  "requestId",
  "status",
  "statusSemantics",
  "pendingOptions",
  "pendingRequiredFields",
  "authAvailableMethods",
  "loading",
  "messages",
  "labels",
];

/** Optional session keys (full inventory of RunDialogSnapshot's optional fields). */
export const SKILLRUNNER_SNAPSHOT_SESSION_OPTIONAL_KEYS: readonly string[] = [
  "requestAssigned",
  "backendInteractive",
  "canOpenStream",
  "canCancelBackendRun",
  "canReply",
  "canArchiveLocalRun",
  "submitPhase",
  "submitStartedAt",
  "submitTimeoutAt",
  "submitError",
  "applyState",
  "applyAttempt",
  "applyMaxAttempt",
  "applyNextRetryAt",
  "applyError",
  "applyUpdatedAt",
  "autoReplyEnabled",
  "autoReplyObserverActive",
  "autoReplyObserverSource",
  "autoReplyObserverStartedAt",
  "autoReplyObserverDeadlineAt",
  "autoReplyObserverTimeoutSeconds",
  "autoReplyObserverShowTimer",
  "autoReplyObserverRemainingSeconds",
  "updatedAt",
  "engine",
  "model",
  "pendingOwner",
  "pendingInteractionId",
  "pendingInteraction",
  "pendingKind",
  "pendingPrompt",
  "pendingUiHints",
  "pendingAskUser",
  "pendingPermission",
  "authPhase",
  "authSessionId",
  "authProviderId",
  "authEngine",
  "authPrompt",
  "authChallengeKind",
  "authAskUser",
  "authAcceptsChatInput",
  "authInputKind",
  "authUrl",
  "authUserCode",
  "authLastError",
  "authUiHints",
  "authControlPending",
  "authControlAction",
  "authControlError",
  "historyLoading",
  "error",
];

export const SKILLRUNNER_SNAPSHOT_SESSION_KEYS: readonly string[] = [
  ...SKILLRUNNER_SNAPSHOT_SESSION_REQUIRED_KEYS,
  ...SKILLRUNNER_SNAPSHOT_SESSION_OPTIONAL_KEYS,
];

/** Transcript message item keys (RunDialogSnapshot["messages"] items). */
export const SKILLRUNNER_SNAPSHOT_MESSAGE_KEYS: readonly string[] = [
  "seq",
  "ts",
  "role",
  "kind",
  "text",
  "displayText",
  "displayFormat",
  "attempt",
  "correlation",
];

export const SKILLRUNNER_SNAPSHOT_WORKSPACE_KEYS: readonly string[] = [
  "selectedTaskKey",
  "groups",
];

/**
 * RunWorkspaceGroup keys. Applies both to workspace.groups[] items and to
 * drawer.sections[].groups[] items (the drawer clones carry the same shape).
 * Task items inside activeTasks/finishedTasks are intentionally not
 * key-restricted: the sidebar decoration extends task objects (e.g.
 * attentionLabel, relationState) and the consumer sniffs several compat
 * aliases on them.
 */
export const SKILLRUNNER_SNAPSHOT_GROUP_KEYS: readonly string[] = [
  "backendId",
  "backendDisplayName",
  "disabled",
  "disabledReason",
  "collapsed",
  "finishedCollapsed",
  "activeTasks",
  "finishedTasks",
  "latestUpdatedAt",
];

export const SKILLRUNNER_SNAPSHOT_DRAWER_KEYS: readonly string[] = [
  "open",
  "notice",
  "truncated",
  "sections",
];

export const SKILLRUNNER_SNAPSHOT_DRAWER_SECTION_KEYS: readonly string[] = [
  "id",
  "title",
  "collapsible",
  "collapsed",
  "groups",
];

export const SKILLRUNNER_SNAPSHOT_STATUS_SEMANTICS_KEYS: readonly string[] = [
  "normalized",
  "terminal",
  "waiting",
];

// ---------------------------------------------------------------------------
// Layer-2 spot-check tables (presence-based type checks)
// ---------------------------------------------------------------------------

const SKILLRUNNER_SNAPSHOT_HOST_MODES: ReadonlySet<string> = new Set([
  "dialog",
  "sidebar",
]);

const SKILLRUNNER_SNAPSHOT_EXECUTION_DISPLAY_MODES: ReadonlySet<string> =
  new Set(["live", "boundary", "silent"]);

/** Session fields that must be boolean when present. */
const SESSION_BOOLEAN_KEYS: readonly string[] = [
  "requestAssigned",
  "backendInteractive",
  "canOpenStream",
  "canCancelBackendRun",
  "canReply",
  "canArchiveLocalRun",
  "autoReplyEnabled",
  "autoReplyObserverActive",
  "autoReplyObserverShowTimer",
  "authAcceptsChatInput",
  "authControlPending",
  "historyLoading",
];

/** Session fields that must be number when present. */
const SESSION_NUMBER_KEYS: readonly string[] = [
  "pendingInteractionId",
  "applyAttempt",
  "applyMaxAttempt",
  "autoReplyObserverTimeoutSeconds",
  "autoReplyObserverRemainingSeconds",
];

// ---------------------------------------------------------------------------
// Wire types (contract-level view; the production types live in
// src/modules/skillRunnerRunDialog.ts and must stay assignable to these)
// ---------------------------------------------------------------------------

export type SkillRunnerSnapshotWireStatusSemantics = {
  normalized: string;
  terminal: boolean;
  waiting: boolean;
};

export type SkillRunnerSnapshotWireMessage = {
  seq: number;
  role: string;
  kind: string;
  text: string;
  ts?: string;
  displayText?: string;
  displayFormat?: string | null;
  attempt?: number;
  correlation?: Record<string, unknown>;
};

export type SkillRunnerSnapshotWireSession = {
  title: string;
  backendTitle: string;
  requestId: string;
  status: string;
  statusSemantics: SkillRunnerSnapshotWireStatusSemantics;
  pendingOptions: unknown[];
  pendingRequiredFields: unknown[];
  authAvailableMethods: unknown[];
  loading: boolean;
  messages: SkillRunnerSnapshotWireMessage[];
  labels: Record<string, unknown>;
};

export type SkillRunnerWorkspaceSnapshotWire = {
  schema: typeof SKILLRUNNER_SNAPSHOT_SCHEMA;
  title: string;
  labels: Record<string, unknown>;
  workspace: {
    selectedTaskKey: string;
    groups: Array<Record<string, unknown>>;
  };
  session: SkillRunnerSnapshotWireSession | null;
};

// ---------------------------------------------------------------------------
// Validator (single implementation shared by the TS assert and the JS gate)
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function unknownKeyFailure(
  value: Record<string, unknown>,
  knownKeys: readonly string[],
  path: string,
): string | null {
  for (const key of Object.keys(value)) {
    if (!knownKeys.includes(key)) {
      return `${path}.${key}`;
    }
  }
  return null;
}

function validateMessageItem(message: unknown, path: string): string | null {
  if (!isObject(message)) {
    return path;
  }
  const unknown = unknownKeyFailure(
    message,
    SKILLRUNNER_SNAPSHOT_MESSAGE_KEYS,
    path,
  );
  if (unknown) {
    return unknown;
  }
  if (typeof message.seq !== "number") {
    return `${path}.seq`;
  }
  for (const key of ["role", "kind", "text"] as const) {
    if (typeof message[key] !== "string") {
      return `${path}.${key}`;
    }
  }
  for (const key of ["ts", "displayText"] as const) {
    if (message[key] !== undefined && typeof message[key] !== "string") {
      return `${path}.${key}`;
    }
  }
  if (
    message.displayFormat !== undefined &&
    message.displayFormat !== null &&
    typeof message.displayFormat !== "string"
  ) {
    return `${path}.displayFormat`;
  }
  if (message.attempt !== undefined && typeof message.attempt !== "number") {
    return `${path}.attempt`;
  }
  if (message.correlation !== undefined && !isObject(message.correlation)) {
    return `${path}.correlation`;
  }
  return null;
}

function validateGroupItem(group: unknown, path: string): string | null {
  if (!isObject(group)) {
    return path;
  }
  const unknown = unknownKeyFailure(
    group,
    SKILLRUNNER_SNAPSHOT_GROUP_KEYS,
    path,
  );
  if (unknown) {
    return unknown;
  }
  for (const key of ["disabled", "collapsed", "finishedCollapsed"] as const) {
    if (group[key] !== undefined && typeof group[key] !== "boolean") {
      return `${path}.${key}`;
    }
  }
  for (const key of [
    "backendId",
    "backendDisplayName",
    "disabledReason",
    "latestUpdatedAt",
  ] as const) {
    if (group[key] !== undefined && typeof group[key] !== "string") {
      return `${path}.${key}`;
    }
  }
  for (const key of ["activeTasks", "finishedTasks"] as const) {
    if (group[key] !== undefined && !Array.isArray(group[key])) {
      return `${path}.${key}`;
    }
  }
  return null;
}

function validateSession(
  session: Record<string, unknown>,
  path: string,
): string | null {
  const unknown = unknownKeyFailure(
    session,
    SKILLRUNNER_SNAPSHOT_SESSION_KEYS,
    path,
  );
  if (unknown) {
    return unknown;
  }
  for (const key of ["title", "backendTitle", "requestId", "status"] as const) {
    if (typeof session[key] !== "string") {
      return `${path}.${key}`;
    }
  }
  const semantics = session.statusSemantics;
  if (!isObject(semantics)) {
    return `${path}.statusSemantics`;
  }
  const semanticsUnknown = unknownKeyFailure(
    semantics,
    SKILLRUNNER_SNAPSHOT_STATUS_SEMANTICS_KEYS,
    `${path}.statusSemantics`,
  );
  if (semanticsUnknown) {
    return semanticsUnknown;
  }
  if (typeof semantics.normalized !== "string") {
    return `${path}.statusSemantics.normalized`;
  }
  if (typeof semantics.terminal !== "boolean") {
    return `${path}.statusSemantics.terminal`;
  }
  if (typeof semantics.waiting !== "boolean") {
    return `${path}.statusSemantics.waiting`;
  }
  for (const key of [
    "pendingOptions",
    "pendingRequiredFields",
    "authAvailableMethods",
  ] as const) {
    if (!Array.isArray(session[key])) {
      return `${path}.${key}`;
    }
  }
  if (typeof session.loading !== "boolean") {
    return `${path}.loading`;
  }
  if (!isObject(session.labels)) {
    return `${path}.labels`;
  }
  if (!Array.isArray(session.messages)) {
    return `${path}.messages`;
  }
  if (
    session.pendingInteraction !== undefined &&
    session.pendingInteraction !== null &&
    !parseAssistantPendingInteraction(session.pendingInteraction)
  ) {
    return `${path}.pendingInteraction`;
  }
  for (let index = 0; index < session.messages.length; index += 1) {
    const failure = validateMessageItem(
      session.messages[index],
      `${path}.messages[${index}]`,
    );
    if (failure) {
      return failure;
    }
  }
  for (const key of SESSION_BOOLEAN_KEYS) {
    if (session[key] !== undefined && typeof session[key] !== "boolean") {
      return `${path}.${key}`;
    }
  }
  for (const key of SESSION_NUMBER_KEYS) {
    if (session[key] !== undefined && typeof session[key] !== "number") {
      return `${path}.${key}`;
    }
  }
  return null;
}

function validateDrawer(drawer: unknown, path: string): string | null {
  if (!isObject(drawer)) {
    return path;
  }
  const unknown = unknownKeyFailure(
    drawer,
    SKILLRUNNER_SNAPSHOT_DRAWER_KEYS,
    path,
  );
  if (unknown) {
    return unknown;
  }
  if (typeof drawer.open !== "boolean") {
    return `${path}.open`;
  }
  if (drawer.notice !== undefined && typeof drawer.notice !== "string") {
    return `${path}.notice`;
  }
  if (drawer.truncated !== undefined && typeof drawer.truncated !== "boolean") {
    return `${path}.truncated`;
  }
  if (!Array.isArray(drawer.sections)) {
    return `${path}.sections`;
  }
  for (let index = 0; index < drawer.sections.length; index += 1) {
    const sectionPath = `${path}.sections[${index}]`;
    const section = drawer.sections[index];
    if (!isObject(section)) {
      return sectionPath;
    }
    const sectionUnknown = unknownKeyFailure(
      section,
      SKILLRUNNER_SNAPSHOT_DRAWER_SECTION_KEYS,
      sectionPath,
    );
    if (sectionUnknown) {
      return sectionUnknown;
    }
    if (typeof section.id !== "string") {
      return `${sectionPath}.id`;
    }
    if (typeof section.title !== "string") {
      return `${sectionPath}.title`;
    }
    if (
      section.collapsible !== undefined &&
      typeof section.collapsible !== "boolean"
    ) {
      return `${sectionPath}.collapsible`;
    }
    if (typeof section.collapsed !== "boolean") {
      return `${sectionPath}.collapsed`;
    }
    if (!Array.isArray(section.groups)) {
      return `${sectionPath}.groups`;
    }
    for (
      let groupIndex = 0;
      groupIndex < section.groups.length;
      groupIndex += 1
    ) {
      const failure = validateGroupItem(
        section.groups[groupIndex],
        `${sectionPath}.groups[${groupIndex}]`,
      );
      if (failure) {
        return failure;
      }
    }
  }
  return null;
}

/**
 * Returns the dot path of the first contract violation, or null when the
 * value is a valid v1 SkillRunner workspace snapshot envelope.
 */
function validateSkillRunnerSnapshotEnvelope(value: unknown): string | null {
  if (!isObject(value)) {
    return "snapshot";
  }
  const unknown = unknownKeyFailure(
    value,
    SKILLRUNNER_SNAPSHOT_ENVELOPE_KEYS,
    "snapshot",
  );
  if (unknown) {
    return unknown;
  }
  if (value.schema !== SKILLRUNNER_SNAPSHOT_SCHEMA) {
    return "snapshot.schema";
  }
  if (typeof value.title !== "string") {
    return "snapshot.title";
  }
  if (!isObject(value.labels)) {
    return "snapshot.labels";
  }
  if (!Object.prototype.hasOwnProperty.call(value, "session")) {
    return "snapshot.session";
  }
  if (value.session !== null) {
    if (!isObject(value.session)) {
      return "snapshot.session";
    }
    const sessionFailure = validateSession(value.session, "snapshot.session");
    if (sessionFailure) {
      return sessionFailure;
    }
  }
  const workspace = value.workspace;
  if (!isObject(workspace)) {
    return "snapshot.workspace";
  }
  const workspaceUnknown = unknownKeyFailure(
    workspace,
    SKILLRUNNER_SNAPSHOT_WORKSPACE_KEYS,
    "snapshot.workspace",
  );
  if (workspaceUnknown) {
    return workspaceUnknown;
  }
  if (typeof workspace.selectedTaskKey !== "string") {
    return "snapshot.workspace.selectedTaskKey";
  }
  if (!Array.isArray(workspace.groups)) {
    return "snapshot.workspace.groups";
  }
  for (let index = 0; index < workspace.groups.length; index += 1) {
    const failure = validateGroupItem(
      workspace.groups[index],
      `snapshot.workspace.groups[${index}]`,
    );
    if (failure) {
      return failure;
    }
  }
  if (
    value.hostMode !== undefined &&
    !SKILLRUNNER_SNAPSHOT_HOST_MODES.has(String(value.hostMode))
  ) {
    return "snapshot.hostMode";
  }
  if (
    value.transcriptRevision !== undefined &&
    typeof value.transcriptRevision !== "number"
  ) {
    return "snapshot.transcriptRevision";
  }
  if (
    value.transcriptPaginationVirtualizationEnabled !== undefined &&
    typeof value.transcriptPaginationVirtualizationEnabled !== "boolean"
  ) {
    return "snapshot.transcriptPaginationVirtualizationEnabled";
  }
  if (
    value.executionDisplayMode !== undefined &&
    !SKILLRUNNER_SNAPSHOT_EXECUTION_DISPLAY_MODES.has(
      String(value.executionDisplayMode),
    )
  ) {
    return "snapshot.executionDisplayMode";
  }
  if (value.messageCounts !== undefined && !isObject(value.messageCounts)) {
    return "snapshot.messageCounts";
  }
  if (value.drawer !== undefined) {
    const drawerFailure = validateDrawer(value.drawer, "snapshot.drawer");
    if (drawerFailure) {
      return drawerFailure;
    }
  }
  if (value.badges !== undefined) {
    if (!isObject(value.badges)) {
      return "snapshot.badges";
    }
    if (
      value.badges.waitingCount !== undefined &&
      typeof value.badges.waitingCount !== "number"
    ) {
      return "snapshot.badges.waitingCount";
    }
  }
  for (const key of [
    "selectionTasks",
    "contextHint",
    "navigation",
    "sidebar",
    "renderHints",
  ] as const) {
    if (value[key] !== undefined && !isObject(value[key])) {
      return `snapshot.${key}`;
    }
  }
  return null;
}

/**
 * Producer-side self-check (debug builds): throws an Error naming the first
 * violating field path when the snapshot leaves the wire contract.
 */
export function assertSkillRunnerWorkspaceSnapshot(
  value: unknown,
): asserts value is SkillRunnerWorkspaceSnapshotWire {
  const failure = validateSkillRunnerSnapshotEnvelope(value);
  if (failure) {
    throw new Error(`skillrunner-workspace-snapshot-invalid: ${failure}`);
  }
}

/**
 * Receiver-side gate (run-dialog page): boolean variant of the same
 * validator; invalid payloads are traced and dropped by the caller.
 */
export function validSkillRunnerSnapshotEnvelope(value: unknown): boolean {
  return validateSkillRunnerSnapshotEnvelope(value) === null;
}

// ---------------------------------------------------------------------------
// Projection consumption lists
//
// Migrated verbatim from test/core/71 (layer B): the panel-model projection
// must really consume every path in REQUIRED_CONSUMED_PATHS, and every
// defensive read of a key the production snapshot does not produce must be
// curated in COMPAT_ALIAS_PATHS.
// ---------------------------------------------------------------------------

/**
 * 幻影读取（JS 侧读取了生产快照上不存在的键）必须精确等于这份策展清单。
 * 共享 assistantPanelModel.js 同时服务 ACP Chat/Skills 等不同快照形状，
 * 对字段做系统性防御性回退（snake_case 别名、可选协议字段、多源任务辅助
 * 函数），这些读取是既有架构行为；清单按来源分组，任何一侧漂移（JS 读了
 * 新字段 / 生产开始提供某字段 / JS 不再读某条）都会让 71 层 B 断言变红。
 */
export const SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS: readonly string[] = [
  // context.backendId：RunDialogSnapshot 只产 backendTitle（:1807
  // safeText(session.backendId)）。
  "session.backendId",
  // auth import 文件清单：生产经 authAskUser.files/ui_hints.files 透传，
  // session.authImportFiles 是 JS 侧额外回退（:1009）。
  "session.authImportFiles",
  // auth/pending ask_user 与 ui_hints 的可选协议字段（后端负载本身可省
  // 略，属正常回退而非契约缺失）。
  "session.authAskUser.files",
  "session.authAskUser.options",
  "session.authAskUser.ui_hints",
  "session.authUiHints.files",
  "session.authUiHints.risk_notice_required",
  // transcript 条目兼容字段：快照 messages 只产
  // seq/ts/role/kind/text/displayText/displayFormat/attempt/correlation，
  // skillRunnerMessageText/skillRunnerProcessType/buildSkillRunnerToolItem
  // 的别名链读取裸字段与 correlation 内的可选键。
  "session.messages[].messageId",
  "session.messages[].processKind",
  "session.messages[].processType",
  "session.messages[].process_type",
  "session.messages[].state",
  "session.messages[].status",
  "session.messages[].correlation.message_id",
  "session.messages[].correlation.state",
  "session.messages[].correlation.status",
  "session.messages[].correlation.summary",
  // buildSkillRunSecondaryLabel/isSequenceTask 把 session 与 envelope 根
  // 也当任务源遍历（role/sequence/step 嗅探）。
  "session.role",
  "session.sequence",
  "session.sequenceStepId",
  "session.sequenceStepIndex",
  "session.sequence_step_id",
  "session.sequence_step_index",
  "session.stepIndex",
  "session.step_index",
  "role",
  "sequence",
  "sequenceStepId",
  "sequenceStepIndex",
  "sequence_step_id",
  "sequence_step_index",
  "stepIndex",
  "step_index",
  // 任务条目（taskStatusFields/normalizeTaskApplyStatus/makeTaskEntry）
  // 的状态与选中嗅探别名；drawer section 直属 tasks 是兼容形状回退
  // （生产 sections 只产 groups）。
  "drawer.sections[].activeTasks",
  "drawer.sections[].finishedTasks",
  "drawer.sections[].groups[].title",
  "drawer.sections[].groups[].activeTasks[].active",
  "drawer.sections[].groups[].activeTasks[].applyResultState",
  "drawer.sections[].groups[].activeTasks[].apply_result_state",
  // Host queue rows carry queueId, while ordinary SkillRunner task fixtures
  // intentionally omit it; the shared projection probes it to select the
  // queue-only cancellation action.
  "drawer.sections[].groups[].activeTasks[].queueId",
  "drawer.sections[].groups[].activeTasks[].mainStatus",
  "drawer.sections[].groups[].activeTasks[].main_status",
  "drawer.sections[].groups[].activeTasks[].role",
  "drawer.sections[].groups[].activeTasks[].selected",
  "drawer.sections[].groups[].activeTasks[].sequence",
  "drawer.sections[].groups[].activeTasks[].sequence_step_id",
  "drawer.sections[].groups[].activeTasks[].sequence_step_index",
  "drawer.sections[].groups[].activeTasks[].stepIndex",
  "drawer.sections[].groups[].activeTasks[].step_index",
  "workspace.groups[].activeTasks[].role",
  "workspace.groups[].activeTasks[].sequence",
  "workspace.groups[].activeTasks[].sequence_step_id",
  "workspace.groups[].activeTasks[].sequence_step_index",
  "workspace.groups[].activeTasks[].stepIndex",
  "workspace.groups[].activeTasks[].step_index",
  // labels.assistantPanel 上不存在的可选 label（labelFrom 的 fallback
  // 机制：session.labels 有这两个键，assistantPanel labels 没有）。
  "labels.assistantPanel.authAwaiting",
  "labels.assistantPanel.authInProgress",
];

/**
 * 关键字段必达：投影必须真实消费这些生产字段（否则 TS 侧改名字段时无任
 * 何测试变红）。注意 envelope.title 与 session.messages[].text 是有意的
 * fallback 读取（session.title / displayText 优先，生产快照里它们始终非
 * 空），不在此清单中。
 */
export const SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS: readonly string[] = [
  "labels",
  "messageCounts",
  "executionDisplayMode",
  "workspace",
  "workspace.selectedTaskKey",
  "workspace.groups",
  "drawer",
  "drawer.sections",
  "drawer.notice",
  "drawer.sections[].groups[].activeTasks[].backendStatus",
  "drawer.sections[].groups[].activeTasks[].applyState",
  "session",
  "session.status",
  "session.title",
  "session.requestId",
  "session.backendTitle",
  "session.engine",
  "session.model",
  "session.updatedAt",
  "session.loading",
  "session.historyLoading",
  "session.statusSemantics",
  "session.statusSemantics.terminal",
  "session.statusSemantics.waiting",
  "session.requestAssigned",
  "session.backendInteractive",
  "session.canCancelBackendRun",
  "session.canReply",
  "session.pendingPermission",
  "session.messages",
  "session.messages[].seq",
  "session.messages[].kind",
  "session.messages[].role",
  "session.messages[].displayText",
  "session.messages[].ts",
  "session.messages[].correlation",
  "session.pendingInteractionId",
  "session.pendingKind",
  "session.pendingPrompt",
  "session.pendingOptions",
  "session.pendingRequiredFields",
  "session.pendingAskUser",
  "session.pendingUiHints",
  "session.authPhase",
  "session.authSessionId",
  "session.authProviderId",
  "session.authEngine",
  "session.authChallengeKind",
  "session.authInputKind",
  "session.authAcceptsChatInput",
  "session.authUrl",
  "session.authUserCode",
  "session.authLastError",
  "session.authAvailableMethods",
  "session.authAskUser",
  "session.authUiHints",
  "session.authControlPending",
  "session.authControlAction",
  "session.authControlError",
];

// ---------------------------------------------------------------------------
// SkillRunner legacy action payloads (child page -> host, edge C action phase)
//
// Compile-time layer only: the host handlers keep their defensive runtime
// reads (String()/Number()/isObject() on every field). Payload interfaces
// carry an index signature because the wire is open; the named keys document
// the shape each action actually consumes.
// ---------------------------------------------------------------------------

export type SkillRunnerLegacyActionName =
  (typeof SKILLRUNNER_LEGACY_ACTIONS)[keyof typeof SKILLRUNNER_LEGACY_ACTIONS];

/** reply-run in auth mode (mode discriminator: "auth"). */
export type SkillRunnerReplyRunAuthPayload = {
  mode: "auth";
  requestId?: string;
  /** Method selection payload; mutually exclusive with submission. */
  selection?: Record<string, unknown>;
  /** Auth submission payload; mutually exclusive with selection. */
  submission?: Record<string, unknown>;
  authSessionId?: string;
  replyKind?: string;
  replyText?: string;
  [key: string]: unknown;
};

/** reply-run in interaction mode (default when mode is absent). */
export type SkillRunnerReplyRunInteractionPayload = {
  mode?: "interaction";
  requestId?: string;
  interactionId?: number;
  replyText?: string;
  responseValue?: unknown;
  option?: unknown;
  responseObject?: unknown;
  [key: string]: unknown;
};

export type SkillRunnerReplyRunPayload =
  | SkillRunnerReplyRunAuthPayload
  | SkillRunnerReplyRunInteractionPayload;

export type SkillRunnerSubmitInteractionFilesPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerSelectTaskPayload = {
  taskKey?: string;
  runKey?: string;
  [key: string]: unknown;
};

export type SkillRunnerArchiveRunPayload = {
  runKey?: string;
  [key: string]: unknown;
};

export type SkillRunnerCancelRunPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerCopyRequestIdPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerCopyDiagnosticsPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerToggleGroupCollapsePayload = {
  backendId?: string;
  collapsed?: boolean;
  [key: string]: unknown;
};

export type SkillRunnerToggleFinishedCollapsePayload = {
  backendId?: string;
  [key: string]: unknown;
};

export type SkillRunnerOpenAuthUrlPayload = {
  url?: string;
  [key: string]: unknown;
};

export type SkillRunnerResolvePermissionPayload = {
  requestId?: string;
  permissionRequestId?: string;
  outcome?: string;
  optionId?: string;
  [key: string]: unknown;
};

export type SkillRunnerAuthImportFilePayload = {
  name?: string;
  contentBase64?: string;
  [key: string]: unknown;
};

export type SkillRunnerAuthImportRunPayload = {
  requestId?: string;
  providerId?: string;
  files?: SkillRunnerAuthImportFilePayload[];
  error?: string;
  [key: string]: unknown;
};

/** Payload per known action on the run-dialog / skillrunner-sidebar bridge. */
export type SkillRunnerRunDialogActionPayloadMap = {
  [ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY]: Record<string, unknown>;
  [SKILLRUNNER_LEGACY_ACTIONS.SELECT_TASK]: SkillRunnerSelectTaskPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.SUBMIT_INTERACTION_FILES]: SkillRunnerSubmitInteractionFilesPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.TOGGLE_DRAWER]: Record<string, unknown>;
  [SKILLRUNNER_LEGACY_ACTIONS.CLOSE_DRAWER]: Record<string, unknown>;
  [SKILLRUNNER_LEGACY_ACTIONS.TOGGLE_GROUP_COLLAPSE]: SkillRunnerToggleGroupCollapsePayload;
  [SKILLRUNNER_LEGACY_ACTIONS.TOGGLE_FINISHED_COLLAPSE]: SkillRunnerToggleFinishedCollapsePayload;
  [SKILLRUNNER_LEGACY_ACTIONS.OPEN_AUTH_URL]: SkillRunnerOpenAuthUrlPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.CLOSE_DIALOG]: Record<string, unknown>;
  [SKILLRUNNER_LEGACY_ACTIONS.AUTH_IMPORT_RUN]: SkillRunnerAuthImportRunPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN]: SkillRunnerReplyRunPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.RESOLVE_PERMISSION]: SkillRunnerResolvePermissionPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.CANCEL_RUN]: SkillRunnerCancelRunPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.CANCEL_QUEUED_WORKFLOW_UNIT]: {
    queueId?: string;
    [key: string]: unknown;
  };
  [SKILLRUNNER_LEGACY_ACTIONS.ARCHIVE_RUN]: SkillRunnerArchiveRunPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.COPY_REQUEST_ID]: SkillRunnerCopyRequestIdPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.COPY_DIAGNOSTICS]: SkillRunnerCopyDiagnosticsPayload;
  [SKILLRUNNER_LEGACY_ACTIONS.OPEN_BACKEND_MANAGER]: Record<string, unknown>;
  [SKILLRUNNER_LEGACY_ACTIONS.OPEN_WORKSPACE]: Record<string, unknown>;
};

export type SkillRunnerRunDialogKnownAction =
  keyof SkillRunnerRunDialogActionPayloadMap;

/** Envelope for the registry-known bridge actions (discriminated by `action`). */
export type RunDialogKnownActionEnvelope = {
  [A in SkillRunnerRunDialogKnownAction]: {
    type: RunDialogMessageType;
    action: A;
    payload?: SkillRunnerRunDialogActionPayloadMap[A];
  };
}[SkillRunnerRunDialogKnownAction];

/**
 * Bridge action envelope. The open fallback member keeps host-side call
 * sites that forward an opaque child action (`action: string`) assignable;
 * narrowing on a known action literal still yields the typed payload.
 */
export type RunDialogActionEnvelope =
  | RunDialogKnownActionEnvelope
  | {
      type: RunDialogMessageType;
      action: string;
      payload?: Record<string, unknown>;
    };
