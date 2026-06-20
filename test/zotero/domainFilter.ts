import type { TestDomain, TestMode } from "./testMode";
import { getTestMode } from "./testMode";

const CORE_PATH_RE = /(^|\/)test\/core\//;
const UI_PATH_RE = /(^|\/)test\/ui\//;
const WORKFLOW_PATH_RE = /(^|\/)test\/workflow-/;
const NODE_MOCK_RUNTIME = "node-mock";

const ZOTERO_LITE_ALLOWLIST: Record<
  Exclude<TestDomain, "all">,
  RegExp[]
> = {
  core: [
    /(^|\/)test\/core\/00-startup\.test\.ts$/,
    /(^|\/)test\/core\/11-selection-context-rebuild\.test\.ts$/,
    /(^|\/)test\/core\/32-job-queue-transport-integration\.test\.ts$/,
    /(^|\/)test\/core\/41-workflow-scan-registration\.test\.ts$/,
    /(^|\/)test\/core\/42-hooks-startup-template-cleanup\.test\.ts$/,
    /(^|\/)test\/core\/45-runtime-log-manager\.test\.ts$/,
    /(^|\/)test\/core\/47-workflow-log-instrumentation\.test\.ts$/,
    /(^|\/)test\/core\/52-runtime-bridge\.test\.ts$/,
    /(^|\/)test\/core\/87-workflow-package-runtime-diagnostics\.test\.ts$/,
    /(^|\/)test\/core\/88-workflow-runtime-scope-diagnostics\.test\.ts$/,
    /(^|\/)test\/core\/89-workflow-debug-probe\.test\.ts$/,
    /(^|\/)test\/core\/102-acp-zotero-mcp-server\.integration\.test\.ts$/,
    /(^|\/)test\/core\/104-acp-zotero-opencode\.integration\.test\.ts$/,
  ],
  ui: [
    /(^|\/)test\/ui\/01-startup-workflow-menu-init\.test\.ts$/,
    /(^|\/)test\/ui\/35-workflow-settings-execution\.test\.ts$/,
    /(^|\/)test\/ui\/40-gui-preferences-menu-scan\.test\.ts$/,
    /(^|\/)test\/ui\/50-workflow-settings-dialog-model\.test\.ts$/,
    /(^|\/)test\/ui\/99-acp-runtime-dependency-probe\.zotero\.test\.ts$/,
  ],
  workflow: [
    /(^|\/)test\/workflow-literature-analysis\/21-workflow-literature-analysis\.test\.ts$/,
    /(^|\/)test\/workflow-literature-explainer\/21-workflow-literature-explainer\.test\.ts$/,
    /(^|\/)test\/workflow-literature-workbench-package\/45-workflow-note-import-export\.test\.ts$/,
    /(^|\/)test\/workflow-mineru\/39-workflow-mineru\.test\.ts$/,
    /(^|\/)test\/workflow-tag-regulator\/64a-workflow-tag-regulator-request-building\.test\.ts$/,
    /(^|\/)test\/workflow-tag-regulator\/64b-workflow-tag-regulator-apply-intake\.test\.ts$/,
  ],
};

const ZOTERO_FULL_EXTRA_ALLOWLIST: Record<
  Exclude<TestDomain, "all">,
  RegExp[]
> = {
  core: [
    /(^|\/)test\/core\/42-task-runtime\.test\.ts$/,
    /(^|\/)test\/core\/55-workflow-apply-seam-risk-regression\.test\.ts$/,
    /(^|\/)test\/core\/60-task-dashboard-history\.test\.ts$/,
    /(^|\/)test\/core\/62-task-dashboard-snapshot\.test\.ts$/,
    /(^|\/)test\/core\/63-job-queue-progress\.test\.ts$/,
    /(^|\/)test\/core\/70a-skillrunner-task-reconciler-state-restore\.test\.ts$/,
    /(^|\/)test\/core\/70b-skillrunner-task-reconciler-apply-bundle-retry\.test\.ts$/,
    /(^|\/)test\/core\/70c-skillrunner-task-reconciler-ledger-reconcile\.test\.ts$/,
    /(^|\/)test\/core\/71-skillrunner-run-dialog-ui-e2e-alignment\.test\.ts$/,
    /(^|\/)test\/core\/83-skillrunner-run-dialog-waiting-auth-observer\.test\.ts$/,
  ],
  ui: [],
  workflow: [],
};

const ZOTERO_LITE_TITLE_ALLOWLIST: Record<
  Exclude<TestDomain, "all">,
  string[]
> = {
  core: [
    "startup ",
    "selection-context rebuild rebuilds selection-context-mix-all-top3-parents.json",
    "job-queue: transport integration runs one job per valid input request with backend dispatch concurrency controlled by the queue config",
    "workflow scan + registry integration ",
    "hooks startup template cleanup ",
    "runtime log manager ",
    "workflow runtime log instrumentation ",
    "runtime bridge ",
    "workflow package runtime diagnostics ",
    "workflow runtime scope diagnostics ",
    "workflow debug probe ",
    "embedded Zotero MCP server in Zotero runtime ",
    "real OpenCode ACP against Zotero MCP server in Zotero runtime ",
  ],
  ui: [
    "startup workflow scan + menu init ",
    "workflow settings execution applies persisted workflow params/provider options/profile to request build",
    "workflow settings execution resolves local pass-through execution context without backend profile",
    "gui: workflow runtime scan rescans workflow registry and exposes loaded entries",
    "gui: workflow context menu context menu respects requiresSelection and disabled rendering when no items are selected",
    "gui: workflow context menu keeps pass-through workflow menu item enabled without backend profile",
    "workflow settings dialog model keeps provider_id field for provider-scoped qwen engine and hides it for gemini",
    "workflow settings dialog model enables effort choices for codex models that advertise supported_effort",
    "ACP runtime dependency probe in Zotero ",
  ],
  workflow: [
    "workflow: literature-analysis builds request from selected markdown attachment",
    "workflow: literature-analysis applies bundle by creating digest/references/citation-analysis child notes",
    "workflow: literature-analysis skips build for core idempotent note shapes",
    "workflow: literature-explainer builds request from selected markdown attachment",
    "workflow: literature-explainer creates a conversation note when note_path is bundle-relative",
    "workflow: literature-workbench import/export notes exports decoded note artifacts into parent title + itemKey folders",
    "workflow: literature-workbench import/export notes requires exactly one parent item for import-notes",
    "workflow: mineru builds one request per selected pdf attachment",
    "workflow: mineru materializes full.md/images, rewrites image paths, and attaches markdown to parent",
    "workflow: mineru filters out inputs when sibling markdown target already exists",
    "workflow: tag-regulator request building loads tag-regulator workflow manifest with buildRequest/applyResult hooks",
    "workflow: tag-regulator request building builds one mixed-input request per selected parent with valid_tags upload",
    "workflow: tag-regulator apply intake runs parent pipeline from buildRequest to applyResult and mutates tags conservatively",
  ],
};

const ZOTERO_FULL_EXTRA_TITLE_ALLOWLIST: Record<
  Exclude<TestDomain, "all">,
  string[]
> = {
  core: [
    "selection-context rebuild rebuilds selection-context-mix-all.json",
    "task runtime ",
    "workflow apply seam risk regression ",
    "task dashboard history ",
    "task dashboard snapshot ",
    "job queue progress writes requestId into running job meta through progress callback",
    "job queue progress maps deferred provider result to waiting_user state and releases queue idle",
    "job queue progress keeps request-created skillrunner job non-terminal when later dispatch steps fail",
    "job queue progress ",
    "skillrunner task reconciler: state restore ",
    "skillrunner task reconciler: apply bundle retry ",
    "skillrunner task reconciler: ledger reconcile ",
    "skillrunner run dialog ui e2e alignment ",
    "skillrunner run dialog waiting auth observer ",
    "skillrunner task reconciler restores pending contexts from sqlite store on start",
    "skillrunner task reconciler preserves existing non-terminal context when a request-created job later reports local failed state",
    "skillrunner task reconciler applies interactive bundle success for a real literature-explainer built request",
  ],
  ui: [
    "workflow settings execution ",
    "gui: preference scripts ",
    "gui: workflow runtime scan ",
    "gui: workflow context menu ",
    "workflow settings execution applies per-submit execution overrides without mutating persisted settings",
    "workflow settings execution persists explicit A->B updates for default settings",
    "workflow settings execution shows provider-scoped qwen settings using provider_id + model",
    "workflow settings execution builds configurable pass-through descriptor without requiring backend profile",
    "gui: preference scripts binds local backend controls and dispatches oneclick/stop/uninstall/debug actions",
    "gui: preference scripts uses action-specific working status text for start/stop/uninstall",
    "gui: preference scripts disables oneclick/stop/uninstall when snapshot is starting or in-flight while keeping debug enabled",
  ],
  workflow: [
    "workflow: literature-analysis ",
    "workflow: literature-explainer ",
    "workflow: literature-workbench import/export notes ",
    "workflow: mineru ",
    "workflow: tag-regulator apply intake ",
    "workflow: literature-explainer creates a conversation note from backend-shaped result/result.json payload",
    "workflow: literature-workbench import/export notes exports conversation notes through the unified markdown-backed note codec",
    "workflow: tag-regulator apply intake does not open suggest-tags dialog or write vocabulary when suggest_tags is empty",
  ],
};

function normalizeFilePath(filePath: string) {
  return String(filePath || "").replace(/\\/g, "/");
}

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero?.__parity?.runtime !== NODE_MOCK_RUNTIME
  );
}

export function inferDomainFromFilePath(filePath: string): TestDomain {
  const normalized = normalizeFilePath(filePath);
  if (CORE_PATH_RE.test(normalized)) {
    return "core";
  }
  if (UI_PATH_RE.test(normalized)) {
    return "ui";
  }
  if (WORKFLOW_PATH_RE.test(normalized)) {
    return "workflow";
  }
  return "all";
}

export function shouldSkipByDomain(args: {
  selectedDomain: TestDomain;
  testDomain: TestDomain;
}) {
  if (args.selectedDomain === "all") {
    return false;
  }
  if (args.testDomain === "all") {
    return false;
  }
  return args.testDomain !== args.selectedDomain;
}

export function isZoteroRoutineAllowedFile(
  filePath: string,
  mode: TestMode = getTestMode(),
) {
  const normalized = normalizeFilePath(filePath);
  const testDomain = inferDomainFromFilePath(normalized);
  if (testDomain === "all") {
    return true;
  }
  const patterns =
    mode === "full"
      ? [
          ...ZOTERO_LITE_ALLOWLIST[testDomain],
          ...ZOTERO_FULL_EXTRA_ALLOWLIST[testDomain],
        ]
      : ZOTERO_LITE_ALLOWLIST[testDomain];
  return patterns.some((pattern) =>
    pattern.test(normalized),
  );
}

export function isZoteroRoutineAllowedTitle(args: {
  selectedDomain: TestDomain;
  testDomain: TestDomain;
  fullTitle: string;
  mode?: TestMode;
}) {
  const fullTitle = String(args.fullTitle || "").trim();
  if (!fullTitle) {
    return true;
  }
  const mode = args.mode || getTestMode();
  const domains: Array<Exclude<TestDomain, "all">> =
    args.testDomain !== "all"
      ? [args.testDomain]
      : args.selectedDomain !== "all"
        ? [args.selectedDomain]
        : ["core", "ui", "workflow"];
  return domains.some((domain) => {
    const prefixes =
      mode === "full"
        ? [
            ...ZOTERO_LITE_TITLE_ALLOWLIST[domain],
            ...ZOTERO_FULL_EXTRA_TITLE_ALLOWLIST[domain],
          ]
        : ZOTERO_LITE_TITLE_ALLOWLIST[domain];
    return prefixes.some((prefix) => fullTitle.startsWith(prefix));
  });
}

export function shouldSkipByZoteroRoutineAllowlist(args: {
  selectedDomain: TestDomain;
  testDomain: TestDomain;
  fullTitle: string;
  filePath: string;
}) {
  if (!isRealZoteroRuntime()) {
    return false;
  }
  const fullTitle = String(args.fullTitle || "").trim();
  if (fullTitle) {
    return !isZoteroRoutineAllowedTitle({
      selectedDomain: args.selectedDomain,
      testDomain: args.testDomain,
      fullTitle,
    });
  }
  if (args.filePath && !isZoteroRoutineAllowedFile(args.filePath)) {
    return true;
  }
  return false;
}
