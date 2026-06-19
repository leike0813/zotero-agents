import { assert } from "chai";
import { readFile } from "fs/promises";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { registerPrefsScripts } from "../../src/modules/preferenceScript";
import {
  emitManagedLocalRuntimeStateChangedForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
} from "../../src/modules/skillRunnerLocalRuntimeManager";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  ensureWorkflowMenuForWindow,
  rebuildWorkflowActionPopup,
} from "../../src/modules/workflowMenu";
import {
  getDefaultSkillDirForWorkflowDir,
  getEffectiveWorkflowDir,
  getLoadedWorkflowEntries,
  getWorkflowRegistryState,
  rescanWorkflowRegistry,
} from "../../src/modules/workflowRuntime";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import { getPref, setPref } from "../../src/utils/prefs";

type Listener = (event: Record<string, unknown>) => void;

class FakeXULElement {
  private attrs = new Map<string, string>();
  private listeners = new Map<string, Listener[]>();
  private _id = "";
  private classTokens = new Set<string>();

  public style: Record<string, string> = {};
  public value = "";
  public placeholder = "";
  public textContent = "";
  public checked = false;
  public parentNode: FakeXULElement | null = null;
  public children: FakeXULElement[] = [];
  public classList = {
    add: (...tokens: string[]) => {
      for (const token of tokens) {
        const normalized = String(token || "").trim();
        if (!normalized) {
          continue;
        }
        this.classTokens.add(normalized);
      }
      this.syncClassNameFromTokens();
    },
    remove: (...tokens: string[]) => {
      for (const token of tokens) {
        const normalized = String(token || "").trim();
        if (!normalized) {
          continue;
        }
        this.classTokens.delete(normalized);
      }
      this.syncClassNameFromTokens();
    },
    contains: (token: string) =>
      this.classTokens.has(String(token || "").trim()),
  };
  public className = "";

  constructor(
    private readonly owner: FakeDocument,
    public readonly tagName: string,
  ) {}

  private syncClassNameFromTokens() {
    this.className = Array.from(this.classTokens.values()).join(" ").trim();
  }

  get id() {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
    this.attrs.set("id", value);
    this.owner.register(this);
  }

  get firstChild() {
    return this.children[0] || null;
  }

  appendChild(child: FakeXULElement) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) {
      this.owner.register(child);
    }
    return child;
  }

  removeChild(child: FakeXULElement) {
    this.children = this.children.filter((entry) => entry !== child);
    child.parentNode = null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
    this.owner.unregister(this.id);
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    if (name === "id") {
      this.id = value;
    }
    if (name === "class") {
      this.className = String(value || "");
      this.classTokens = new Set(
        this.className
          .split(/\s+/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      );
    }
  }

  getAttribute(name: string) {
    return this.attrs.get(name) || null;
  }

  removeAttribute(name: string) {
    this.attrs.delete(name);
  }

  addEventListener(type: string, listener: Listener) {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  dispatch(type: string, init: Record<string, unknown> = {}) {
    const listeners = this.listeners.get(type) || [];
    const event = {
      type,
      target: this,
      ...init,
    };
    for (const listener of listeners) {
      listener(event);
    }
  }
}

class FakeDocument {
  private elements = new Map<string, FakeXULElement>();

  createXULElement(tagName: string) {
    return new FakeXULElement(this, tagName);
  }

  createElement(tagName: string) {
    return this.createXULElement(tagName);
  }

  register(element: FakeXULElement) {
    if (element.id) {
      this.elements.set(element.id, element);
    }
  }

  unregister(id: string) {
    if (!id) {
      return;
    }
    this.elements.delete(id);
  }

  getElementById(id: string) {
    return this.elements.get(id) || null;
  }

  querySelector(selector: string) {
    if (!selector.startsWith("#")) {
      return null;
    }
    return this.getElementById(selector.slice(1));
  }
}

function makeLoadedWorkflow(id: string, label: string): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "skillrunner",
      request: {
        kind: "skillrunner.job.v1",
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

function makePassThroughWorkflow(
  id: string,
  label: string,
  options?: {
    requiresSelection?: boolean;
  },
): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "pass-through",
      ...(options?.requiresSelection === false
        ? {
            trigger: {
              requiresSelection: false,
            },
          }
        : {}),
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

function makeDebugOnlyWorkflow(id: string, label: string): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "pass-through",
      debug_only: true,
      trigger: {
        requiresSelection: false,
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

function makeNoValidInputWorkflow(id: string, label: string): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "pass-through",
      validateSelection: {
        require: {
          counts: {
            parents: { exact: 2 },
          },
        },
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

function makeCountingNoValidInputWorkflow(
  id: string,
  label: string,
  _counter: { calls: number },
): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "pass-through",
      validateSelection: {
        require: {
          counts: {
            parents: { exact: 2 },
          },
        },
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

function makeExplodingBuildRequestWorkflow(
  id: string,
  label: string,
): LoadedWorkflow {
  return {
    manifest: {
      id,
      label,
      provider: "pass-through",
      hooks: {
        buildRequest: "hooks/buildRequest.js",
        applyResult: "hooks/applyResult.js",
      },
    },
    rootDir: joinPath("workflows", id),
    hooks: {
      buildRequest: async () => {
        throw new Error(
          "buildRequest should not run during workflow menu validation",
        );
      },
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "hook",
  };
}

function setWorkflowState(workflows: LoadedWorkflow[]) {
  const runtime = globalThis as {
    addon: {
      data: {
        workflow?: {
          workflowsDir: string;
          loaded: {
            workflows: LoadedWorkflow[];
            manifests: Array<LoadedWorkflow["manifest"]>;
            warnings: string[];
            errors: string[];
          };
        };
      };
    };
  };
  runtime.addon.data.workflow = {
    workflowsDir: "test-workflows",
    loaded: {
      workflows,
      manifests: workflows.map((entry) => entry.manifest),
      warnings: [],
      errors: [],
    },
  };
}

function createPrefsWindow(args?: {
  confirmResults?: boolean[];
  promptResults?: Array<string | null>;
  includeRuntimeDataControls?: boolean;
}) {
  const document = new FakeDocument();
  const confirmResults = Array.isArray(args?.confirmResults)
    ? [...args!.confirmResults!]
    : [];
  const promptResults = Array.isArray(args?.promptResults)
    ? [...args!.promptResults!]
    : [];
  const confirmMessages: string[] = [];
  const promptMessages: string[] = [];

  const workflowDirInput = document.createXULElement("input");
  workflowDirInput.id = `zotero-prefpane-${config.addonRef}-workflow-dir`;
  const skillDirInput = document.createXULElement("input");
  skillDirInput.id = `zotero-prefpane-${config.addonRef}-skill-dir`;

  const workflowBrowseButton = document.createXULElement("button");
  workflowBrowseButton.id = `zotero-prefpane-${config.addonRef}-workflow-browse`;
  const skillBrowseButton = document.createXULElement("button");
  skillBrowseButton.id = `zotero-prefpane-${config.addonRef}-skill-browse`;
  const scanButton = document.createXULElement("button");
  scanButton.id = `zotero-prefpane-${config.addonRef}-workflow-scan`;
  const workflowSettingsButton = document.createXULElement("button");
  workflowSettingsButton.id = `zotero-prefpane-${config.addonRef}-workflow-settings`;
  const workflowOpenLogsButton = document.createXULElement("button");
  workflowOpenLogsButton.id = `zotero-prefpane-${config.addonRef}-workflow-open-logs`;

  const backendManageButton = document.createXULElement("button");
  backendManageButton.id = `zotero-prefpane-${config.addonRef}-backend-manage`;
  const hostBridgeDisableWriteApprovalCheckbox =
    document.createXULElement("input");
  hostBridgeDisableWriteApprovalCheckbox.id = `zotero-prefpane-${config.addonRef}-host-bridge-disable-write-approval`;
  const runtimeDataRoot = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  if (runtimeDataRoot) {
    runtimeDataRoot.id = `zotero-prefpane-${config.addonRef}-runtime-data-root`;
  }
  const runtimeDataSummary = args?.includeRuntimeDataControls
    ? document.createXULElement("description")
    : null;
  if (runtimeDataSummary) {
    runtimeDataSummary.id = `zotero-prefpane-${config.addonRef}-runtime-data-summary`;
  }
  const runtimeDataCategories = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  if (runtimeDataCategories) {
    runtimeDataCategories.id = `zotero-prefpane-${config.addonRef}-runtime-data-categories`;
  }
  const runtimeDataIssuesToggleButton = args?.includeRuntimeDataControls
    ? document.createXULElement("button")
    : null;
  if (runtimeDataIssuesToggleButton) {
    runtimeDataIssuesToggleButton.id = `zotero-prefpane-${config.addonRef}-runtime-data-toggle-issues`;
  }
  const runtimeDataIssuesPanel = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  if (runtimeDataIssuesPanel) {
    runtimeDataIssuesPanel.id = `zotero-prefpane-${config.addonRef}-runtime-data-issues-panel`;
  }
  const runtimeDataStateDbInfo = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  if (runtimeDataStateDbInfo) {
    runtimeDataStateDbInfo.id = `zotero-prefpane-${config.addonRef}-runtime-data-state-db-info`;
  }
  const runtimeDataProgressRow = args?.includeRuntimeDataControls
    ? document.createXULElement("hbox")
    : null;
  const runtimeDataProgressmeterContainer = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  const runtimeDataProgressmeter = args?.includeRuntimeDataControls
    ? document.createXULElement("div")
    : null;
  const runtimeDataProgressText = args?.includeRuntimeDataControls
    ? document.createXULElement("span")
    : null;
  if (runtimeDataProgressRow) {
    runtimeDataProgressRow.id = `zotero-prefpane-${config.addonRef}-runtime-data-progress-row`;
  }
  if (runtimeDataProgressmeterContainer) {
    runtimeDataProgressmeterContainer.className = "custom-progress-container";
  }
  if (runtimeDataProgressmeter) {
    runtimeDataProgressmeter.id = `zotero-prefpane-${config.addonRef}-runtime-data-progressmeter`;
    runtimeDataProgressmeter.className = "custom-progress-bar";
    runtimeDataProgressmeter.style.width = "0%";
  }
  if (runtimeDataProgressText) {
    runtimeDataProgressText.id = `zotero-prefpane-${config.addonRef}-runtime-data-progress-text`;
  }
  if (
    runtimeDataProgressRow &&
    runtimeDataProgressmeterContainer &&
    runtimeDataProgressmeter &&
    runtimeDataProgressText
  ) {
    runtimeDataProgressmeterContainer.appendChild(runtimeDataProgressmeter);
    runtimeDataProgressRow.appendChild(runtimeDataProgressmeterContainer);
    runtimeDataProgressRow.appendChild(runtimeDataProgressText);
  }
  const runtimeDataRescanButton = args?.includeRuntimeDataControls
    ? document.createXULElement("button")
    : null;
  if (runtimeDataRescanButton) {
    runtimeDataRescanButton.id = `zotero-prefpane-${config.addonRef}-runtime-data-rescan`;
  }
  const runtimeDataCopyRootButton = args?.includeRuntimeDataControls
    ? document.createXULElement("button")
    : null;
  if (runtimeDataCopyRootButton) {
    runtimeDataCopyRootButton.id = `zotero-prefpane-${config.addonRef}-runtime-data-copy-root`;
  }
  const runtimeDataOpenRootButton = args?.includeRuntimeDataControls
    ? document.createXULElement("button")
    : null;
  if (runtimeDataOpenRootButton) {
    runtimeDataOpenRootButton.id = `zotero-prefpane-${config.addonRef}-runtime-data-open-root`;
  }
  const synthesisDbResetButton = args?.includeRuntimeDataControls
    ? document.createXULElement("button")
    : null;
  if (synthesisDbResetButton) {
    synthesisDbResetButton.id = `zotero-prefpane-${config.addonRef}-synthesis-db-reset`;
  }
  const synthesisDbResetStatus = args?.includeRuntimeDataControls
    ? document.createXULElement("description")
    : null;
  if (synthesisDbResetStatus) {
    synthesisDbResetStatus.id = `zotero-prefpane-${config.addonRef}-synthesis-db-reset-status`;
  }
  const localRuntimeDeployButton = document.createXULElement("button");
  localRuntimeDeployButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-deploy`;
  const localRuntimeStopButton = document.createXULElement("button");
  localRuntimeStopButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-stop`;
  const localRuntimeUninstallButton = document.createXULElement("button");
  localRuntimeUninstallButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall`;
  const localRuntimeOpenDebugConsoleButton =
    document.createXULElement("button");
  localRuntimeOpenDebugConsoleButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-open-debug-console`;
  const localRuntimeOpenManagementButton = document.createXULElement("button");
  localRuntimeOpenManagementButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-open-management`;
  const localRuntimeOpenSkillsFolderButton =
    document.createXULElement("button");
  localRuntimeOpenSkillsFolderButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-open-skills-folder`;
  const localRuntimeRefreshModelCacheButton =
    document.createXULElement("button");
  localRuntimeRefreshModelCacheButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-refresh-model-cache`;
  const localRuntimeLed = document.createXULElement("span");
  localRuntimeLed.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-runtime-led`;
  const localRuntimeAutoStartIcon = document.createXULElement("span");
  localRuntimeAutoStartIcon.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-autostart-icon`;
  const localRuntimeStatusText = document.createXULElement("description");
  localRuntimeStatusText.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-status-text`;
  const localRuntimeUninstallOptionsDialog = document.createXULElement("hbox");
  localRuntimeUninstallOptionsDialog.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-dialog`;
  const localRuntimeUninstallOptionClearData =
    document.createXULElement("checkbox");
  localRuntimeUninstallOptionClearData.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-option-clear-data`;
  localRuntimeUninstallOptionClearData.checked = false;
  const localRuntimeUninstallOptionClearAgentHome =
    document.createXULElement("checkbox");
  localRuntimeUninstallOptionClearAgentHome.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-option-clear-agent-home`;
  localRuntimeUninstallOptionClearAgentHome.checked = false;
  const localRuntimeUninstallOptionsConfirmButton =
    document.createXULElement("button");
  localRuntimeUninstallOptionsConfirmButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-confirm`;
  const localRuntimeUninstallOptionsCancelButton =
    document.createXULElement("button");
  localRuntimeUninstallOptionsCancelButton.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-cancel`;
  const localRuntimeProgressRow = document.createXULElement("hbox");
  localRuntimeProgressRow.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-progress-row`;
  const localRuntimeProgressmeterContainer = document.createXULElement("div");
  localRuntimeProgressmeterContainer.className = "custom-progress-container";
  localRuntimeProgressmeterContainer.id = "mock-progress-container";

  const localRuntimeProgressmeter = document.createXULElement("div");
  localRuntimeProgressmeter.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-progressmeter`;
  localRuntimeProgressmeter.className = "custom-progress-bar";
  localRuntimeProgressmeter.style.width = "0%";

  localRuntimeProgressmeterContainer.appendChild(localRuntimeProgressmeter);
  localRuntimeProgressRow.appendChild(localRuntimeProgressmeterContainer);

  const localRuntimeProgressText = document.createXULElement("span");
  localRuntimeProgressText.id = `zotero-prefpane-${config.addonRef}-skillrunner-local-progress-text`;
  localRuntimeProgressRow.appendChild(localRuntimeProgressText);

  return {
    window: {
      document,
      confirm: (message: string) => {
        confirmMessages.push(message);
        if (confirmResults.length > 0) {
          return confirmResults.shift() === true;
        }
        return true;
      },
      prompt: (message: string) => {
        promptMessages.push(message);
        if (promptResults.length > 0) {
          return promptResults.shift() ?? null;
        }
        return null;
      },
    } as unknown as Window,
    workflowDirInput,
    skillDirInput,
    workflowBrowseButton,
    skillBrowseButton,
    scanButton,
    workflowSettingsButton,
    workflowOpenLogsButton,
    backendManageButton,
    hostBridgeDisableWriteApprovalCheckbox,
    runtimeDataRoot,
    runtimeDataSummary,
    runtimeDataCategories,
    runtimeDataIssuesToggleButton,
    runtimeDataIssuesPanel,
    runtimeDataStateDbInfo,
    runtimeDataProgressRow,
    runtimeDataProgressmeter,
    runtimeDataProgressText,
    runtimeDataRescanButton,
    runtimeDataCopyRootButton,
    runtimeDataOpenRootButton,
    synthesisDbResetButton,
    synthesisDbResetStatus,
    localRuntimeDeployButton,
    localRuntimeStopButton,
    localRuntimeUninstallButton,
    localRuntimeOpenDebugConsoleButton,
    localRuntimeOpenManagementButton,
    localRuntimeOpenSkillsFolderButton,
    localRuntimeRefreshModelCacheButton,
    localRuntimeLed,
    localRuntimeAutoStartIcon,
    localRuntimeStatusText,
    localRuntimeUninstallOptionsDialog,
    localRuntimeUninstallOptionClearData,
    localRuntimeUninstallOptionClearAgentHome,
    localRuntimeUninstallOptionsConfirmButton,
    localRuntimeUninstallOptionsCancelButton,
    localRuntimeProgressRow,
    localRuntimeProgressmeter,
    localRuntimeProgressText,
    confirmMessages,
    promptMessages,
  };
}

function createMainWindow(selectedItems: unknown[]) {
  const document = new FakeDocument();
  const itemMenu = document.createXULElement("menupopup");
  itemMenu.id = "zotero-itemmenu";

  return {
    document,
    ZoteroPane: {
      getSelectedItems: () => selectedItems,
    },
  } as unknown as _ZoteroTypes.MainWindow;
}

async function flushTasks() {
  await Promise.resolve();
  await Promise.resolve();
}

function assertMenuLabel(
  actual: string | null,
  options: readonly string[],
  context: string,
) {
  assert.isString(actual, `${context} should be a string`);
  assert.include(options, actual as string, `${context} should match locale`);
}

const itFullOnly = isFullTestMode() ? it : it.skip;

describe("gui: preference scripts", function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  const workflowDirPrefKey = `${config.prefsPrefix}.workflowDir`;
  // eslint-disable-next-line mocha/no-setup-in-describe
  const skillDirPrefKey = `${config.prefsPrefix}.skillDir`;

  let prevAddon: unknown;
  let prevWorkflowDirPref: unknown;
  let prevSkillDirPref: unknown;

  beforeEach(function () {
    const runtime = globalThis as { addon?: unknown };
    prevAddon = runtime.addon;
    prevWorkflowDirPref = Zotero.Prefs.get(workflowDirPrefKey, true);
    prevSkillDirPref = Zotero.Prefs.get(skillDirPrefKey, true);
    runtime.addon = {
      data: {
        config,
      },
      hooks: {
        onPrefsEvent: async () => {},
      },
    };
    setDebugModeOverrideForTests(true);
    Zotero.Prefs.clear(workflowDirPrefKey, true);
    Zotero.Prefs.clear(skillDirPrefKey, true);
    resetManagedLocalRuntimeStateChangeListenersForTests();
  });

  afterEach(function () {
    if (typeof prevWorkflowDirPref === "undefined") {
      Zotero.Prefs.clear(workflowDirPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowDirPrefKey, prevWorkflowDirPref, true);
    }
    if (typeof prevSkillDirPref === "undefined") {
      Zotero.Prefs.clear(skillDirPrefKey, true);
    } else {
      Zotero.Prefs.set(skillDirPrefKey, prevSkillDirPref, true);
    }

    const runtime = globalThis as { addon?: unknown };
    runtime.addon = prevAddon;
    setDebugModeOverrideForTests();
    setPref("hostBridgeDisableWriteApproval", false);
    resetManagedLocalRuntimeStateChangeListenersForTests();
  });

  it("binds preference inputs and dispatches workflow scan/settings/log-viewer/backend manager commands", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<void>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
    };

    const {
      window,
      workflowDirInput,
      skillDirInput,
      workflowBrowseButton,
      skillBrowseButton,
      scanButton,
      workflowSettingsButton,
      workflowOpenLogsButton,
      backendManageButton,
    } = createPrefsWindow();
    await registerPrefsScripts(window);
    assert.lengthOf(calls, 1);
    assert.equal(calls[0].type, "stateSkillRunnerLocalRuntime");
    assert.deepEqual(calls[0].data, {
      window,
    });

    const defaultWorkflowDir = getEffectiveWorkflowDir();
    assert.equal(workflowDirInput.value, "");
    assert.equal(
      Zotero.Prefs.get(workflowDirPrefKey, true),
      "",
      "empty workflowDir pref should keep input empty",
    );
    assert.equal(
      workflowDirInput.placeholder,
      defaultWorkflowDir,
      "workflow default should be shown as input hint",
    );
    assert.equal(skillDirInput.value, "");
    assert.equal(Zotero.Prefs.get(skillDirPrefKey, true), "");
    assert.equal(
      skillDirInput.placeholder,
      getDefaultSkillDirForWorkflowDir(defaultWorkflowDir),
      "skill default should be shown as input hint",
    );

    workflowDirInput.value = "D:/tmp/workflows-custom";
    workflowDirInput.dispatch("input", { target: workflowDirInput });
    workflowDirInput.dispatch("change", { target: workflowDirInput });
    await flushTasks();
    assert.equal(
      workflowDirInput.value,
      "D:/tmp/workflows-custom",
      "workflowDirInput value should keep custom path after input/change",
    );
    assert.equal(
      Zotero.Prefs.get(workflowDirPrefKey, true),
      "D:/tmp/workflows-custom",
      "workflowDir pref should persist custom path after input/change",
    );
    assert.equal(
      skillDirInput.placeholder,
      getDefaultSkillDirForWorkflowDir("D:/tmp/workflows-custom"),
      "skill hint should follow the explicit workflow directory",
    );

    skillDirInput.value = "D:/tmp/skills-custom";
    skillDirInput.dispatch("input", { target: skillDirInput });
    skillDirInput.dispatch("change", { target: skillDirInput });
    await flushTasks();
    assert.equal(skillDirInput.value, "D:/tmp/skills-custom");
    assert.equal(
      Zotero.Prefs.get(skillDirPrefKey, true),
      "D:/tmp/skills-custom",
    );

    const runtime = globalThis as { ztoolkit?: unknown };
    const previousZtoolkit = runtime.ztoolkit;
    const pickerInitialDirectoryByTitle = new Map<string, string>();
    try {
      runtime.ztoolkit = {
        FilePicker: class {
          private readonly title: string;
          constructor(
            title: string,
            _mode: string,
            _filters: [string, string][],
            _suggestion: string,
            _window: Window,
            _filterMask?: string,
            directory?: string,
          ) {
            this.title = title;
            pickerInitialDirectoryByTitle.set(title, String(directory || ""));
          }
          async open() {
            return this.title === "pref-skill-dir"
              ? "D:/tmp/skills-picked"
              : "D:/tmp/workflows-picked";
          }
        },
      };
      workflowBrowseButton.dispatch("command");
      await flushTasks();
      const workflowPickerInitialDirectory =
        pickerInitialDirectoryByTitle.get("pref-workflow-dir") || "";
      if (workflowPickerInitialDirectory) {
        assert.equal(
          workflowPickerInitialDirectory,
          "D:/tmp/workflows-custom",
          "browse picker should start from current workflow dir",
        );
        assert.equal(workflowDirInput.value, "D:/tmp/workflows-picked");
        assert.equal(
          Zotero.Prefs.get(workflowDirPrefKey, true),
          "D:/tmp/workflows-picked",
        );
      } else {
        assert.equal(
          workflowDirInput.value,
          "D:/tmp/workflows-custom",
          "workflow dir should stay unchanged when picker is unavailable",
        );
        assert.equal(
          Zotero.Prefs.get(workflowDirPrefKey, true),
          "D:/tmp/workflows-custom",
          "workflowDir pref should stay unchanged when picker is unavailable",
        );
      }
      skillBrowseButton.dispatch("command");
      await flushTasks();
      const skillPickerInitialDirectory =
        pickerInitialDirectoryByTitle.get("pref-skill-dir") || "";
      if (skillPickerInitialDirectory) {
        assert.equal(
          skillPickerInitialDirectory,
          "D:/tmp/skills-custom",
          "skill browse picker should start from current skill dir",
        );
        assert.equal(skillDirInput.value, "D:/tmp/skills-picked");
        assert.equal(
          Zotero.Prefs.get(skillDirPrefKey, true),
          "D:/tmp/skills-picked",
        );
      }
    } finally {
      runtime.ztoolkit = previousZtoolkit;
    }

    const directScanWorkflowDir = "D:/tmp/workflows-scan-direct";
    workflowDirInput.value = directScanWorkflowDir;
    scanButton.dispatch("command");
    assert.equal(
      Zotero.Prefs.get(workflowDirPrefKey, true),
      directScanWorkflowDir,
    );
    assert.lengthOf(calls, 2);
    assert.equal(calls[1].type, "scanWorkflows");
    assert.deepEqual(calls[1].data, {
      window,
      workflowsDir: directScanWorkflowDir,
    });

    workflowDirInput.value = "  ";
    scanButton.dispatch("command");
    assert.lengthOf(calls, 3);
    assert.equal(calls[2].type, "scanWorkflows");
    assert.equal(
      (calls[2].data as { workflowsDir?: string }).workflowsDir,
      undefined,
    );
    assert.equal(workflowDirInput.value, "");
    assert.equal(Zotero.Prefs.get(workflowDirPrefKey, true), "");

    workflowSettingsButton.dispatch("command");
    assert.lengthOf(calls, 4);
    assert.equal(calls[3].type, "openWorkflowSettings");
    assert.deepEqual(calls[3].data, {
      window,
      source: "preferences",
    });

    backendManageButton.dispatch("command");
    assert.lengthOf(calls, 5);
    assert.equal(calls[4].type, "openBackendManager");
    assert.deepEqual(calls[4].data, {
      window,
    });

    workflowOpenLogsButton.dispatch("command");
    assert.lengthOf(calls, 6);
    assert.equal(calls[5].type, "openLogViewer");
    assert.deepEqual(calls[5].data, {
      window,
    });
  });

  it("confirms before disabling Host Bridge write approvals", async function () {
    setPref("hostBridgeDisableWriteApproval", false);
    const rejected = createPrefsWindow({
      confirmResults: [false],
    });
    await registerPrefsScripts(rejected.window);

    rejected.hostBridgeDisableWriteApprovalCheckbox.checked = true;
    rejected.hostBridgeDisableWriteApprovalCheckbox.dispatch("change");

    assert.lengthOf(rejected.confirmMessages, 1);
    assert.include(
      rejected.confirmMessages[0],
      "pref-host-bridge-disable-write-approval-confirm",
    );
    assert.isFalse(rejected.hostBridgeDisableWriteApprovalCheckbox.checked);
    assert.isFalse(getPref("hostBridgeDisableWriteApproval") === true);

    const accepted = createPrefsWindow({
      confirmResults: [true],
    });
    await registerPrefsScripts(accepted.window);

    accepted.hostBridgeDisableWriteApprovalCheckbox.checked = true;
    accepted.hostBridgeDisableWriteApprovalCheckbox.dispatch("change");

    assert.lengthOf(accepted.confirmMessages, 1);
    assert.isTrue(getPref("hostBridgeDisableWriteApproval") === true);

    accepted.hostBridgeDisableWriteApprovalCheckbox.checked = false;
    accepted.hostBridgeDisableWriteApprovalCheckbox.dispatch("change");

    assert.lengthOf(accepted.confirmMessages, 1);
    assert.isFalse(getPref("hostBridgeDisableWriteApproval") === true);
  });

  it("renders persistence governance data and dispatches issue cleanup", async function () {
    const calls: Array<{ type: string; data: any }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: any) => Promise<any>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "scanPersistenceGovernance") {
        return {
          usage: {
            root: "C:\\RuntimeRoot",
            scannedAt: "2026-04-28T00:00:00.000Z",
            totalBytes: 2048,
            categories: [
              {
                category: "logs",
                label: "Runtime logs",
                path: "C:\\RuntimeRoot\\logs",
                bytes: 2048,
                exists: true,
                cleanable: true,
              },
              {
                category: "skillrunner-ledger",
                label: "SkillRunner local ledger",
                path: "C:\\RuntimeRoot\\state\\zotero-agents.db",
                bytes: 0,
                exists: true,
                cleanable: true,
                recordCount: 2,
              },
            ],
            stateDatabase: {
              path: "C:\\RuntimeRoot\\state\\zotero-agents.db",
              bytes: 4096,
              exists: true,
            },
          },
          integrity: {
            root: "C:\\RuntimeRoot",
            issueCount: 1,
            issues: [
              {
                id: "expired_runtime_asset:1",
                type: "expired_runtime_asset",
                severity: "info",
                relativePath: "runtime/tmp/old.json",
                eligibleForCleanup: true,
                reason: "tmp asset exceeded configured TTL",
              },
            ],
          },
        };
      }
      if (type === "cleanupPersistenceGovernanceIssues") {
        return {
          cleanup: {
            ok: true,
            dryRun: data.dryRun !== false,
            removedPaths:
              data.dryRun === false
                ? ["C:\\RuntimeRoot\\runtime\\tmp\\old.json"]
                : [],
            skippedIssueIds: [],
            report: {
              root: "C:\\RuntimeRoot",
              issueCount: data.dryRun === false ? 0 : 1,
              issues:
                data.dryRun === false
                  ? []
                  : [
                      {
                        id: "expired_runtime_asset:1",
                        type: "expired_runtime_asset",
                        severity: "info",
                        relativePath: "runtime/tmp/old.json",
                        eligibleForCleanup: true,
                        reason: "tmp asset exceeded configured TTL",
                      },
                    ],
            },
          },
          usage: {
            root: "C:\\RuntimeRoot",
            scannedAt: "2026-04-28T00:01:00.000Z",
            totalBytes: 0,
            categories: [],
          },
          integrity: {
            root: "C:\\RuntimeRoot",
            issueCount: data.dryRun === false ? 0 : 1,
            issues:
              data.dryRun === false
                ? []
                : [
                    {
                      id: "expired_runtime_asset:1",
                      type: "expired_runtime_asset",
                      severity: "info",
                      relativePath: "runtime/tmp/old.json",
                      eligibleForCleanup: true,
                      reason: "tmp asset exceeded configured TTL",
                    },
                  ],
          },
        };
      }
      return {};
    };

    const {
      window,
      runtimeDataRoot,
      runtimeDataSummary,
      runtimeDataCategories,
      runtimeDataIssuesToggleButton,
      runtimeDataIssuesPanel,
      runtimeDataStateDbInfo,
      confirmMessages,
    } = createPrefsWindow({ includeRuntimeDataControls: true });
    await registerPrefsScripts(window);
    await flushTasks();

    assert.equal(runtimeDataRoot?.textContent, "C:\\RuntimeRoot");
    assert.include(String(runtimeDataSummary?.textContent || ""), "2.00 KB");
    assert.include(String(runtimeDataSummary?.textContent || ""), "1");
    assert.lengthOf(runtimeDataCategories?.children || [], 21);
    const categoryText = (runtimeDataCategories?.children || [])
      .map((entry) => entry.textContent)
      .join("\n");
    assert.include(categoryText, "Runtime logs");
    assert.include(categoryText, "SkillRunner local ledger");
    assert.include(categoryText, "Workflow products");
    assert.include(categoryText, "2");
    assert.notInclude(categoryText, "Protected durable data");
    assert.notInclude(categoryText, "State database");
    assert.include(
      String(runtimeDataStateDbInfo?.textContent || ""),
      "pref-runtime-data-state-db",
    );
    assert.include(
      String(runtimeDataStateDbInfo?.textContent || ""),
      "4.00 KB",
    );
    assert.notInclude(categoryText, "expired_runtime_asset");
    assert.isFalse(
      runtimeDataIssuesPanel?.classList.contains("is-visible") || false,
    );
    assert.equal(
      runtimeDataIssuesToggleButton?.getAttribute("aria-expanded"),
      "false",
    );

    runtimeDataIssuesToggleButton?.dispatch("command");
    await flushTasks();

    assert.isTrue(
      runtimeDataIssuesPanel?.classList.contains("is-visible") || false,
    );
    const issueGrid = runtimeDataIssuesPanel?.children[0];
    assert.include(
      (issueGrid?.children || []).map((entry) => entry.textContent).join("\n"),
      "expired_runtime_asset",
    );

    issueGrid?.children[2]?.dispatch("click");
    await flushTasks();

    assert.include(
      calls.map((entry) => entry.type),
      "cleanupPersistenceGovernanceIssues",
    );
    assert.deepEqual(
      calls.find(
        (entry) =>
          entry.type === "cleanupPersistenceGovernanceIssues" &&
          entry.data?.dryRun === true,
      )?.data,
      {
        window,
        issueIds: ["expired_runtime_asset:1"],
        dryRun: true,
      },
    );
    assert.deepEqual(
      calls.find(
        (entry) =>
          entry.type === "cleanupPersistenceGovernanceIssues" &&
          entry.data?.dryRun === false,
      )?.data,
      {
        window,
        issueIds: ["expired_runtime_asset:1"],
        dryRun: false,
      },
    );
    assert.lengthOf(confirmMessages, 1);
    assert.isFalse(
      runtimeDataIssuesPanel?.classList.contains("is-visible") || false,
    );
    assert.equal(
      runtimeDataIssuesToggleButton?.getAttribute("disabled"),
      "true",
    );
  });

  it("keeps persistence categories visible while scanning and enables category cleanup after scan", async function () {
    const calls: Array<{ type: string; data: any }> = [];
    let resolveScan:
      | ((value: {
          usage: Record<string, unknown>;
          integrity: Record<string, unknown>;
        }) => void)
      | null = null;
    let scanCalls = 0;
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: any) => Promise<any>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "scanPersistenceGovernance") {
        scanCalls += 1;
        data.onProgress?.({
          stage: "usage:logs",
          label: "Runtime logs",
          current: 2,
          total: 14,
          percent: 14,
        });
        if (scanCalls > 1) {
          return {
            usage: {
              root: "C:\\RuntimeRoot",
              scannedAt: "2026-04-28T00:02:00.000Z",
              totalBytes: 0,
              categories: [
                {
                  category: "logs",
                  label: "Runtime logs",
                  path: "C:\\RuntimeRoot\\logs",
                  bytes: 0,
                  exists: false,
                  cleanable: true,
                },
              ],
            },
            integrity: { root: "C:\\RuntimeRoot", issueCount: 0, issues: [] },
          };
        }
        return new Promise((resolve) => {
          resolveScan = resolve;
        });
      }
      if (type === "cleanupRuntimePersistenceCategory") {
        return {
          ok: true,
          category: data.category,
          removedPaths: ["C:\\RuntimeRoot\\logs"],
          details: {},
          usage: {
            root: "C:\\RuntimeRoot",
            scannedAt: "2026-04-28T00:01:00.000Z",
            totalBytes: 0,
            categories: [
              {
                category: "logs",
                label: "Runtime logs",
                path: "C:\\RuntimeRoot\\logs",
                bytes: 0,
                exists: false,
                cleanable: true,
              },
            ],
          },
        };
      }
      return {};
    };

    const {
      window,
      runtimeDataSummary,
      runtimeDataCategories,
      runtimeDataProgressRow,
      runtimeDataProgressmeter,
      runtimeDataProgressText,
      runtimeDataRescanButton,
      confirmMessages,
    } = createPrefsWindow({
      includeRuntimeDataControls: true,
      confirmResults: [true],
    });
    await registerPrefsScripts(window);

    assert.lengthOf(runtimeDataCategories?.children || [], 21);
    assert.notInclude(
      String(runtimeDataSummary?.textContent || ""),
      "pref-runtime-data-scanning",
    );
    assert.include(
      String(runtimeDataSummary?.textContent || ""),
      "pref-runtime-data-summary-idle",
    );
    assert.match(String(runtimeDataProgressRow?.className || ""), /is-visible/);
    assert.equal(runtimeDataProgressmeter?.style.width, "14%");
    assert.include(
      String(runtimeDataProgressText?.textContent || ""),
      "pref-runtime-data-scanning",
    );
    assert.include(String(runtimeDataProgressText?.textContent || ""), "2/14");
    assert.notInclude(String(runtimeDataSummary?.textContent || ""), "1/7");
    assert.notInclude(
      (runtimeDataCategories?.children || [])
        .map((entry) => entry.textContent)
        .join("\n"),
      "pref-runtime-data-scanning",
    );
    assert.notInclude(
      (runtimeDataCategories?.children || [])
        .map((entry) => entry.textContent)
        .join("\n"),
      "1/7",
    );
    assert.include(
      (runtimeDataCategories?.children || [])
        .map((entry) => entry.textContent)
        .join("\n"),
      "pref-runtime-data-not-scanned",
    );
    assert.equal(
      runtimeDataCategories?.children[2]?.getAttribute("disabled"),
      "true",
    );
    runtimeDataRescanButton?.dispatch("command");
    await flushTasks();
    assert.equal(scanCalls, 1);

    resolveScan?.({
      usage: {
        root: "C:\\RuntimeRoot",
        scannedAt: "2026-04-28T00:00:00.000Z",
        totalBytes: 2048,
        categories: [
          {
            category: "logs",
            label: "Runtime logs",
            path: "C:\\RuntimeRoot\\logs",
            bytes: 2048,
            exists: true,
            cleanable: true,
          },
        ],
      },
      integrity: { root: "C:\\RuntimeRoot", issueCount: 0, issues: [] },
    });
    await flushTasks();

    assert.notMatch(
      String(runtimeDataProgressRow?.className || ""),
      /is-visible/,
    );
    assert.equal(runtimeDataProgressmeter?.style.width, "0%");

    assert.notEqual(
      runtimeDataCategories?.children[2]?.getAttribute("disabled"),
      "true",
    );
    runtimeDataCategories?.children[2]?.dispatch("click");
    await flushTasks();

    assert.include(
      calls.map((entry) => entry.type),
      "cleanupRuntimePersistenceCategory",
    );
    assert.deepEqual(
      calls.find((entry) => entry.type === "cleanupRuntimePersistenceCategory")
        ?.data,
      {
        window,
        category: "logs",
      },
    );
    assert.lengthOf(confirmMessages, 1);
  });

  it("hides legacy runtime data from persistence categories when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: any) => Promise<any>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type) => {
      if (type === "scanPersistenceGovernance") {
        return {
          usage: {
            root: "C:\\RuntimeRoot",
            scannedAt: "2026-04-28T00:00:00.000Z",
            totalBytes: 0,
            categories: [
              {
                category: "logs",
                label: "Runtime logs",
                path: "C:\\RuntimeRoot\\logs",
                bytes: 0,
                exists: false,
                cleanable: true,
              },
              {
                category: "legacy",
                label: "Legacy runtime data",
                path: "C:\\LegacyRoot",
                bytes: 1024,
                exists: true,
                cleanable: true,
              },
            ],
          },
          integrity: { root: "C:\\RuntimeRoot", issueCount: 0, issues: [] },
        };
      }
      return {};
    };

    const { window, runtimeDataCategories } = createPrefsWindow({
      includeRuntimeDataControls: true,
    });
    await registerPrefsScripts(window);
    await flushTasks();

    assert.lengthOf(runtimeDataCategories?.children || [], 21);
    assert.notInclude(
      (runtimeDataCategories?.children || [])
        .map((entry) => entry.textContent)
        .join("\n"),
      "Legacy runtime data",
    );
  });

  it("defines the dangerous Synthesis database reset preference controls", async function () {
    const [xhtml, enLocale, zhLocale] = await Promise.all([
      readFile("addon/content/preferences.xhtml", "utf8"),
      readFile("addon/locale/en-US/preferences.ftl", "utf8"),
      readFile("addon/locale/zh-CN/preferences.ftl", "utf8"),
    ]);

    assert.include(xhtml, "synthesis-db-reset");
    assert.include(xhtml, "synthesis-db-reset-status");
    assert.include(xhtml, "pref-synthesis-db-reset-warning");
    assert.include(xhtml, "runtime-data-toggle-issues");
    assert.include(xhtml, "runtime-data-issues-panel");
    assert.include(xhtml, "runtime-data-state-db-info");
    assert.include(xhtml, "runtime-data-progress-row");
    assert.include(xhtml, "runtime-data-progressmeter");
    assert.include(xhtml, "host-bridge-disable-write-approval");
    assert.include(xhtml, "zs-host-bridge-write-approval-danger");
    assert.include(xhtml, "skill-dir");
    assert.include(xhtml, "skill-browse");
    assert.notInclude(xhtml, "pref-workflow-dir-help");
    assert.include(enLocale, "pref-runtime-data-show-issues");
    assert.include(enLocale, "pref-runtime-data-hide-issues");
    assert.include(enLocale, "pref-runtime-data-category-cleanup-confirm");
    assert.include(enLocale, "pref-runtime-data-cleaning-target");
    assert.include(enLocale, "pref-runtime-data-category-logs");
    assert.include(enLocale, "pref-runtime-data-category-workflow-products");
    assert.include(enLocale, "pref-runtime-data-category-tmp");
    assert.include(enLocale, "pref-runtime-data-state-db-idle");
    assert.include(enLocale, "pref-synthesis-db-reset-confirm-message");
    assert.include(enLocale, "pref-host-bridge-disable-write-approval");
    assert.include(enLocale, "pref-host-bridge-disable-write-approval-confirm");
    assert.include(enLocale, "pref-skill-dir");
    assert.include(enLocale, "RESET SYNTHESIS DATABASE");
    assert.include(zhLocale, "pref-runtime-data-show-issues");
    assert.include(zhLocale, "pref-runtime-data-hide-issues");
    assert.include(zhLocale, "pref-runtime-data-category-cleanup-confirm");
    assert.include(zhLocale, "pref-runtime-data-cleaning-target");
    assert.include(zhLocale, "pref-runtime-data-category-logs");
    assert.include(zhLocale, "pref-runtime-data-category-workflow-products");
    assert.include(zhLocale, "pref-runtime-data-category-tmp");
    assert.include(zhLocale, "pref-runtime-data-state-db-idle");
    assert.include(zhLocale, "pref-synthesis-db-reset-confirm-message");
    assert.include(zhLocale, "pref-host-bridge-disable-write-approval");
    assert.include(zhLocale, "pref-host-bridge-disable-write-approval-confirm");
    assert.include(zhLocale, "pref-skill-dir");
    assert.include(zhLocale, "RESET SYNTHESIS DATABASE");
  });

  it("does not dispatch Synthesis database reset when the danger confirm is cancelled", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "scanPersistenceGovernance") {
        return {
          usage: { root: "C:\\RuntimeRoot", totalBytes: 0, categories: [] },
          integrity: { root: "C:\\RuntimeRoot", issueCount: 0, issues: [] },
        };
      }
      return {};
    };

    const { window, synthesisDbResetButton, synthesisDbResetStatus } =
      createPrefsWindow({
        includeRuntimeDataControls: true,
        confirmResults: [false],
      });
    await registerPrefsScripts(window);
    await flushTasks();

    synthesisDbResetButton?.dispatch("command");
    await flushTasks();

    assert.notInclude(
      calls.map((entry) => entry.type),
      "resetSynthesisDatabase",
    );
    assert.isNotEmpty(String(synthesisDbResetStatus?.textContent || ""));
  });

  it("does not dispatch Synthesis database reset when the typed phrase mismatches", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "scanPersistenceGovernance") {
        return {
          usage: { root: "C:\\RuntimeRoot", totalBytes: 0, categories: [] },
          integrity: { root: "C:\\RuntimeRoot", issueCount: 0, issues: [] },
        };
      }
      return {};
    };

    const { window, synthesisDbResetButton, synthesisDbResetStatus } =
      createPrefsWindow({
        includeRuntimeDataControls: true,
        confirmResults: [true],
        promptResults: ["RESET"],
      });
    await registerPrefsScripts(window);
    await flushTasks();

    synthesisDbResetButton?.dispatch("command");
    await flushTasks();

    assert.notInclude(
      calls.map((entry) => entry.type),
      "resetSynthesisDatabase",
    );
    assert.isNotEmpty(String(synthesisDbResetStatus?.textContent || ""));
  });

  it("dispatches protected Synthesis database reset and refreshes persistence data", async function () {
    const calls: Array<{ type: string; data: any }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: any) => Promise<any>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "scanPersistenceGovernance") {
        return {
          usage: {
            root: "C:\\RuntimeRoot",
            scannedAt: "2026-05-28T00:00:00.000Z",
            totalBytes: 0,
            categories: [],
          },
          integrity: {
            root: "C:\\RuntimeRoot",
            issueCount: 0,
            issues: [],
          },
        };
      }
      if (type === "resetSynthesisDatabase") {
        return {
          ok: true,
          status: "reset",
          resetAt: "2026-05-28T00:00:00.000Z",
          deletedRowsByTable: {
            synt_artifact_sidecar: 1,
            synt_review_item: 2,
          },
        };
      }
      return {};
    };

    const { window, synthesisDbResetButton, synthesisDbResetStatus } =
      createPrefsWindow({
        includeRuntimeDataControls: true,
        confirmResults: [true],
        promptResults: ["RESET SYNTHESIS DATABASE"],
      });
    await registerPrefsScripts(window);
    await flushTasks();

    synthesisDbResetButton?.dispatch("command");
    await flushTasks();

    const resetCall = calls.find(
      (entry) => entry.type === "resetSynthesisDatabase",
    );
    assert.deepEqual(resetCall?.data, {
      window,
      confirmationText: "RESET SYNTHESIS DATABASE",
    });
    assert.isAtLeast(
      calls.filter((entry) => entry.type === "scanPersistenceGovernance")
        .length,
      2,
    );
    assert.include(String(synthesisDbResetStatus?.textContent || ""), "3");
  });

  it("binds local backend controls and dispatches oneclick/stop/uninstall/debug actions", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    let stateCalls = 0;
    let releaseDeploy: (() => void) | null = null;
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        stateCalls += 1;
        if (stateCalls <= 1) {
          return {
            ok: true,
            details: {
              runtimeState: "stopped",
              leaseState: "pending",
              autoStartPaused: true,
              hasRuntimeInfo: true,
              inFlightAction: "",
              monitoringState: "inactive",
            },
          };
        }
        return {
          ok: true,
          details: {
            runtimeState: "running",
            leaseState: "acquired",
            autoStartPaused: false,
            hasRuntimeInfo: true,
            inFlightAction: "",
            monitoringState: "heartbeat",
          },
        };
      }
      if (type === "planSkillRunnerLocalRuntimeOneclick") {
        return {
          ok: true,
          details: {
            plannedAction: "start",
          },
        };
      }
      if (type === "previewSkillRunnerLocalRuntimeUninstall") {
        return {
          ok: true,
          details: {
            removableTargets: [
              {
                path: "C:\\SkillRunner\\releases",
                purpose: "release artifacts",
              },
            ],
            preservedTargets: [
              { path: "C:\\SkillRunner\\data", purpose: "runtime data" },
            ],
          },
        };
      }
      if (type === "deploySkillRunnerLocalRuntime") {
        await new Promise<void>((resolve) => {
          releaseDeploy = resolve;
        });
        return {
          ok: true,
          message: "oneclick complete",
        };
      }
      return {
        ok: true,
        message: `ok-${type}`,
      };
    };

    const {
      window,
      localRuntimeDeployButton,
      localRuntimeStopButton,
      localRuntimeUninstallButton,
      localRuntimeOpenDebugConsoleButton,
      localRuntimeOpenManagementButton,
      localRuntimeOpenSkillsFolderButton,
      localRuntimeRefreshModelCacheButton,
      localRuntimeUninstallOptionsConfirmButton,
      localRuntimeLed,
      localRuntimeAutoStartIcon,
      localRuntimeStatusText,
      confirmMessages,
    } = createPrefsWindow({
      confirmResults: [true],
    });
    await registerPrefsScripts(window);

    assert.equal(
      localRuntimeOpenDebugConsoleButton.getAttribute("disabled"),
      null,
    );
    localRuntimeDeployButton.dispatch("command");
    await flushTasks();
    const statusBeforeDebugClick = localRuntimeStatusText.textContent || "";
    localRuntimeOpenDebugConsoleButton.dispatch("command");
    await flushTasks();
    assert.equal(
      localRuntimeStatusText.textContent || "",
      statusBeforeDebugClick,
    );
    releaseDeploy?.();
    await flushTasks();
    await flushTasks();
    emitManagedLocalRuntimeStateChangedForTests();
    await flushTasks();
    localRuntimeStopButton.dispatch("command");
    await flushTasks();
    localRuntimeUninstallButton.dispatch("command");
    await flushTasks();
    localRuntimeUninstallOptionsConfirmButton.dispatch("command");
    await flushTasks();
    localRuntimeOpenManagementButton.dispatch("command");
    await flushTasks();
    localRuntimeOpenSkillsFolderButton.dispatch("command");
    await flushTasks();
    localRuntimeRefreshModelCacheButton.dispatch("command");
    await flushTasks();

    const callTypes = calls.map((entry) => entry.type);
    assert.equal(callTypes[0], "stateSkillRunnerLocalRuntime");
    assert.include(callTypes, "planSkillRunnerLocalRuntimeOneclick");
    assert.include(callTypes, "deploySkillRunnerLocalRuntime");
    assert.include(callTypes, "previewSkillRunnerLocalRuntimeUninstall");
    assert.include(callTypes, "stopSkillRunnerLocalRuntime");
    assert.include(callTypes, "uninstallSkillRunnerLocalRuntime");
    assert.include(callTypes, "openSkillRunnerLocalDeployDebugConsole");
    assert.include(callTypes, "openSkillRunnerManagedBackendPage");
    assert.include(callTypes, "openSkillRunnerManagedSkillsFolder");
    assert.include(callTypes, "refreshSkillRunnerManagedModelCache");
    assert.notInclude(callTypes, "statusSkillRunnerLocalRuntime");
    assert.notInclude(callTypes, "startSkillRunnerLocalRuntime");
    assert.notInclude(callTypes, "doctorSkillRunnerLocalRuntime");
    assert.notInclude(callTypes, "copySkillRunnerLocalDeployCommands");
    assert.notInclude(callTypes, "toggleSkillRunnerLocalRuntimeAutoPull");

    const deployCall = calls.find(
      (entry) => entry.type === "deploySkillRunnerLocalRuntime",
    );
    assert.deepEqual(deployCall?.data, { window, forcedBranch: "start" });
    const stopCall = calls.find(
      (entry) => entry.type === "stopSkillRunnerLocalRuntime",
    );
    assert.deepEqual(stopCall?.data, { window });
    const uninstallCall = calls.find(
      (entry) => entry.type === "uninstallSkillRunnerLocalRuntime",
    );
    assert.deepEqual(uninstallCall?.data, {
      window,
      clearData: false,
      clearAgentHome: false,
    });
    const snapshotCalls = calls.filter(
      (entry) => entry.type === "stateSkillRunnerLocalRuntime",
    );
    assert.isAtLeast(snapshotCalls.length, 5);
    assert.match(
      localRuntimeStatusText.textContent || "",
      /Success:|成功：|pref-skillrunner-local-status-ok-prefix/,
    );
    assert.lengthOf(confirmMessages, 1);
    assert.match(
      localRuntimeLed.className,
      /is-green|is-red|is-gray|is-orange/,
    );
    assert.match(localRuntimeAutoStartIcon.className, /is-green|is-red/);
  });

  it("hides debug console control and skips debug event when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "stopped",
            autoStartPaused: true,
            hasRuntimeInfo: true,
            inFlightAction: "",
            monitoringState: "inactive",
          },
        };
      }
      return {
        ok: true,
        message: `ok-${type}`,
      };
    };

    const { window, localRuntimeOpenDebugConsoleButton } = createPrefsWindow();
    await registerPrefsScripts(window);
    await flushTasks();
    assert.equal(
      localRuntimeOpenDebugConsoleButton.getAttribute("hidden"),
      "true",
    );

    localRuntimeOpenDebugConsoleButton.dispatch("command");
    await flushTasks();
    const callTypes = calls.map((entry) => entry.type);
    assert.notInclude(callTypes, "openSkillRunnerLocalDeployDebugConsole");
  });

  it("shows deploy confirm only for deploy branch and can cancel before execution", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "stopped",
            autoStartPaused: true,
            hasRuntimeInfo: false,
            inFlightAction: "",
            monitoringState: "inactive",
          },
        };
      }
      if (type === "planSkillRunnerLocalRuntimeOneclick") {
        return {
          ok: true,
          details: {
            plannedAction: "deploy",
            installLayout: {
              paths: [
                {
                  path: "C:\\SkillRunner\\releases",
                  purpose: "release artifacts",
                },
              ],
            },
          },
        };
      }
      return {
        ok: true,
        message: `ok-${type}`,
      };
    };

    const {
      window,
      localRuntimeDeployButton,
      localRuntimeStatusText,
      confirmMessages,
    } = createPrefsWindow({
      confirmResults: [false],
    });
    await registerPrefsScripts(window);
    await flushTasks();

    localRuntimeDeployButton.dispatch("command");
    await flushTasks();

    const callTypes = calls.map((entry) => entry.type);
    assert.include(callTypes, "planSkillRunnerLocalRuntimeOneclick");
    assert.notInclude(callTypes, "deploySkillRunnerLocalRuntime");
    assert.match(
      localRuntimeStatusText.textContent || "",
      /取消|cancelled|canceled|pref-skillrunner-local-status-cancelled/,
    );
    assert.isAtLeast(confirmMessages.length, 1);
  });

  it("uses action-specific working status text for start/stop/uninstall", async function () {
    const deployDeferred = (() => {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    })();
    const stopDeferred = (() => {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    })();

    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "stopped",
            autoStartPaused: true,
            hasRuntimeInfo: true,
            inFlightAction: "",
            monitoringState: "inactive",
          },
        };
      }
      if (type === "planSkillRunnerLocalRuntimeOneclick") {
        return {
          ok: true,
          details: {
            plannedAction: "start",
          },
        };
      }
      if (type === "deploySkillRunnerLocalRuntime") {
        await deployDeferred.promise;
        return {
          ok: true,
          stage: "oneclick-start-complete",
          message: "ok-start",
        };
      }
      if (type === "stopSkillRunnerLocalRuntime") {
        await stopDeferred.promise;
        return {
          ok: true,
          stage: "stop-complete",
          message: "ok-stop",
        };
      }
      if (type === "previewSkillRunnerLocalRuntimeUninstall") {
        return {
          ok: true,
          details: {
            removableTargets: [
              {
                path: "C:\\SkillRunner\\releases",
                purpose: "release artifacts",
              },
            ],
            preservedTargets: [],
          },
        };
      }
      return {
        ok: true,
        message: `ok-${type}`,
      };
    };

    const {
      window,
      localRuntimeDeployButton,
      localRuntimeStopButton,
      localRuntimeUninstallButton,
      localRuntimeUninstallOptionsCancelButton,
      localRuntimeStatusText,
    } = createPrefsWindow();
    await registerPrefsScripts(window);
    await flushTasks();

    localRuntimeDeployButton.dispatch("command");
    await flushTasks();
    assert.match(
      localRuntimeStatusText.textContent || "",
      /Starting local backend|正在启动本地后端|pref-skillrunner-local-status-working-start/,
    );
    deployDeferred.resolve();
    await flushTasks();
    await flushTasks();

    localRuntimeStopButton.dispatch("command");
    await flushTasks();
    assert.match(
      localRuntimeStatusText.textContent || "",
      /Stopping local backend|正在停止本地后端|pref-skillrunner-local-status-working-stop/,
    );
    stopDeferred.resolve();
    await flushTasks();
    await flushTasks();

    localRuntimeUninstallButton.dispatch("command");
    await flushTasks();
    assert.match(
      localRuntimeStatusText.textContent || "",
      /Uninstalling local backend|正在卸载本地后端|pref-skillrunner-local-status-working-uninstall/,
    );
    localRuntimeUninstallOptionsCancelButton.dispatch("command");
    await flushTasks();
  });

  it("prefers stage-localized runtime status body over raw internal message", async function () {
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type) => {
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "running",
            autoStartPaused: false,
            hasRuntimeInfo: true,
            inFlightAction: "",
            monitoringState: "heartbeat",
          },
        };
      }
      if (type === "stopSkillRunnerLocalRuntime") {
        return {
          ok: false,
          stage: "stop-status-running",
          message: "runtime still running after stop chain",
        };
      }
      return {
        ok: true,
      };
    };

    const { window, localRuntimeStopButton, localRuntimeStatusText } =
      createPrefsWindow();
    await registerPrefsScripts(window);
    await flushTasks();

    localRuntimeStopButton.dispatch("command");
    await flushTasks();
    const rendered = localRuntimeStatusText.textContent || "";
    assert.match(
      rendered,
      /Runtime is still running after stop chain|停止链路后本地后端仍处于 running|pref-skillrunner-local-status-stage-stop-status-running/,
    );
  });

  it("renders inline progressmeter from runtime snapshot actionProgress", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "stopped",
            autoStartPaused: true,
            hasRuntimeInfo: true,
            inFlightAction: "oneclick-deploy-start",
            monitoringState: "inactive",
            actionProgress: {
              action: "deploy",
              current: 2,
              total: 5,
              percent: 40,
              stage: "deploy-release-download-checksum",
              label: "Download and checksum",
            },
          },
        };
      }
      return {
        ok: true,
      };
    };

    const {
      window,
      localRuntimeProgressRow,
      localRuntimeProgressmeter,
      localRuntimeProgressText,
    } = createPrefsWindow();

    // Wire up defaultView for tests since it's used directly in standard browser environments
    (window.document as any).defaultView = window;
    await registerPrefsScripts(window);
    await flushTasks();

    assert.match(localRuntimeProgressRow.className || "", /is-visible/);
    assert.equal(localRuntimeProgressmeter.style.width, "40%");
    assert.match(
      localRuntimeProgressText.textContent || "",
      /Download and checksum|下载与校验|deploy-release-download-checksum|pref-skillrunner-local-progress-deploy-step-2/,
    );
  });

  it("disables oneclick/stop/uninstall when snapshot is starting or in-flight while keeping debug enabled", async function () {
    const calls: Array<{ type: string; data: unknown }> = [];
    (
      globalThis as {
        addon: {
          hooks: {
            onPrefsEvent: (type: string, data: unknown) => Promise<unknown>;
          };
        };
      }
    ).addon.hooks.onPrefsEvent = async (type, data) => {
      calls.push({ type, data });
      if (type === "stateSkillRunnerLocalRuntime") {
        return {
          ok: true,
          details: {
            runtimeState: "starting",
            leaseState: "pending",
            autoStartPaused: false,
            hasRuntimeInfo: true,
            inFlightAction: "auto-ensure-starting",
            monitoringState: "heartbeat",
          },
        };
      }
      return {
        ok: true,
        message: `ok-${type}`,
      };
    };

    const {
      window,
      localRuntimeDeployButton,
      localRuntimeStopButton,
      localRuntimeUninstallButton,
      localRuntimeOpenDebugConsoleButton,
      localRuntimeOpenManagementButton,
      localRuntimeOpenSkillsFolderButton,
      localRuntimeRefreshModelCacheButton,
      localRuntimeStatusText,
    } = createPrefsWindow();

    await registerPrefsScripts(window);
    await flushTasks();

    assert.equal(localRuntimeDeployButton.getAttribute("disabled"), "true");
    assert.equal(localRuntimeStopButton.getAttribute("disabled"), "true");
    assert.equal(localRuntimeUninstallButton.getAttribute("disabled"), "true");
    assert.equal(
      localRuntimeOpenManagementButton.getAttribute("disabled"),
      "true",
    );
    assert.equal(
      localRuntimeOpenSkillsFolderButton.getAttribute("disabled"),
      "true",
    );
    assert.equal(
      localRuntimeRefreshModelCacheButton.getAttribute("disabled"),
      "true",
    );
    assert.equal(
      localRuntimeOpenDebugConsoleButton.getAttribute("disabled"),
      null,
    );

    const statusBeforeDebugClick = localRuntimeStatusText.textContent || "";
    localRuntimeOpenDebugConsoleButton.dispatch("command");
    await flushTasks();
    assert.equal(
      localRuntimeStatusText.textContent || "",
      statusBeforeDebugClick,
    );
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe("gui: workflow runtime scan", function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  const workflowDirPrefKey = `${config.prefsPrefix}.workflowDir`;
  let prevAddon: unknown;
  let prevWorkflowDirPref: unknown;

  beforeEach(function () {
    const runtime = globalThis as { addon?: unknown };
    prevAddon = runtime.addon;
    runtime.addon = {
      data: {
        config,
      },
    };
    prevWorkflowDirPref = Zotero.Prefs.get(workflowDirPrefKey, true);
    Zotero.Prefs.clear(workflowDirPrefKey, true);
  });

  afterEach(function () {
    if (typeof prevWorkflowDirPref === "undefined") {
      Zotero.Prefs.clear(workflowDirPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowDirPrefKey, prevWorkflowDirPref, true);
    }
    const runtime = globalThis as { addon?: unknown };
    runtime.addon = prevAddon;
  });

  it("rescans workflow registry and exposes loaded entries", async function () {
    const root = await mkTempDir("zotero-skills-gui-scan");
    const workflowRoot = joinPath(root, "gui-scan-workflow");
    await writeUtf8(
      joinPath(workflowRoot, "workflow.json"),
      JSON.stringify(
        {
          id: "gui-scan-workflow",
          label: "GUI Scan Workflow",
          provider: "skillrunner",
          request: { kind: "skillrunner.job.v1" },
          execution: {
            skillrunner_mode: "auto",
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        null,
        2,
      ),
    );
    await writeUtf8(
      joinPath(workflowRoot, "hooks", "applyResult.js"),
      "export async function applyResult(){ return { ok: true }; }",
    );

    const state = await rescanWorkflowRegistry({ workflowsDir: root });
    assert.equal(state.workflowsDir, root);
    assert.isAtLeast(state.loaded.workflows.length, 1);
    assert.lengthOf(state.loadedFromUser.workflows, 1);
    assert.equal(
      state.loadedFromUser.workflows[0].manifest.id,
      "gui-scan-workflow",
    );
    assert.notEqual(state.workflowsDir, state.builtinWorkflowsDir);

    const entries = getLoadedWorkflowEntries();
    const guiScan = entries.find(
      (entry) => entry.manifest.id === "gui-scan-workflow",
    );
    assert.isOk(guiScan);
    assert.equal(guiScan?.manifest.label, "GUI Scan Workflow");
    assert.equal(getWorkflowRegistryState().workflowsDir, root);
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  itFullOnly(
    "resolves the default workflow dir without persisting it when preference is empty",
    function () {
      const processEnv = (
        globalThis as { process?: { env?: Record<string, string | undefined> } }
      ).process?.env;
      const previousOverride = processEnv?.ZOTERO_TEST_WORKFLOW_DIR;
      try {
        if (processEnv) {
          processEnv.ZOTERO_TEST_WORKFLOW_DIR = workflowsPath();
        }
        const effectiveDir = getEffectiveWorkflowDir();
        assert.isTrue(
          /[\\/]workflows_builtin$/.test(effectiveDir),
          `effectiveDir=${effectiveDir}`,
        );
        assert.equal(Zotero.Prefs.get(workflowDirPrefKey, true), "");
      } finally {
        if (processEnv) {
          if (typeof previousOverride === "undefined") {
            delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
          } else {
            processEnv.ZOTERO_TEST_WORKFLOW_DIR = previousOverride;
          }
        }
      }
    },
  );
});

describe("gui: workflow context menu", function () {
  let prevAddon: unknown;

  beforeEach(function () {
    const runtime = globalThis as { addon?: unknown };
    prevAddon = runtime.addon;
    runtime.addon = {
      data: {
        config,
        workflow: {
          workflowsDir: "test-workflows",
          loaded: {
            workflows: [],
            manifests: [],
            warnings: [],
            errors: [],
          },
        },
      },
      hooks: {
        onPrefsEvent: async () => {},
      },
    };
  });

  afterEach(function () {
    const runtime = globalThis as { addon?: unknown };
    runtime.addon = prevAddon;
  });

  it("adds workflows root menu and shows empty state when registry is empty", async function () {
    setWorkflowState([]);
    const win = createMainWindow([]);
    ensureWorkflowMenuForWindow(win);

    const menu = win.document.getElementById(
      `${config.addonRef}-workflows-menu`,
    ) as FakeXULElement | null;
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement | null;

    assert.isOk(menu);
    assert.isOk(popup);
    popup!.dispatch("popupshowing");
    await flushTasks();

    assert.lengthOf(popup!.children, 4);
    assertMenuLabel(
      popup!.children[0].getAttribute("label"),
      ["Open Dashboard / Synthesis Workspace", "打开 Dashboard/综合工作区"],
      "workspace label",
    );
    assertMenuLabel(
      popup!.children[1].getAttribute("label"),
      ["Open Sidebar", "打开侧边栏"],
      "assistant sidebar label",
    );
    assert.equal(popup!.children[2].tagName, "menuseparator");
    assert.equal(popup!.children[3].getAttribute("disabled"), "true");
    assertMenuLabel(
      popup!.children[3].getAttribute("label"),
      ["No workflows loaded", "未加载任何 Workflow"],
      "root empty label",
    );
  });

  it("context menu respects requiresSelection and disabled rendering when no items are selected", async function () {
    const cases: Array<{
      label: string;
      workflows: LoadedWorkflow[];
      expectedLabels: RegExp[];
      expectedDisabledStates: Array<string | null>;
      expectedLength: number;
      rebuildOnly?: boolean;
    }> = [
      {
        label: "renders disabled entries for ordinary workflows",
        workflows: [
          makeLoadedWorkflow("workflow-a", "Workflow A"),
          makeLoadedWorkflow("workflow-b", "Workflow B"),
        ],
        expectedLabels: [
          /^Workflow A \((no selection|未选择条目)\)$/,
          /^Workflow B \((no selection|未选择条目)\)$/,
        ],
        expectedDisabledStates: ["true", "true"],
        expectedLength: 5,
      },
      {
        label: "keeps requiresSelection=false workflow enabled",
        workflows: [
          makePassThroughWorkflow("workflow-a", "Workflow A"),
          makePassThroughWorkflow(
            "optional-selection-workflow",
            "Optional Selection",
            {
              requiresSelection: false,
            },
          ),
        ],
        expectedLabels: [/^Optional Selection$/],
        expectedDisabledStates: [null],
        expectedLength: 5,
        rebuildOnly: true,
      },
      {
        label: "keeps pass-through workflow disabled without explicit override",
        workflows: [
          makePassThroughWorkflow("manual-pass-through", "Manual Pass-through"),
        ],
        expectedLabels: [/^Manual Pass-through \((no selection|未选择条目)\)$/],
        expectedDisabledStates: ["true"],
        expectedLength: 4,
        rebuildOnly: true,
      },
    ];

    for (const entry of cases) {
      setWorkflowState(entry.workflows);
      const win = createMainWindow([]);
      ensureWorkflowMenuForWindow(win);
      const popup = win.document.getElementById(
        `${config.addonRef}-workflows-popup`,
      ) as FakeXULElement;

      if (entry.rebuildOnly) {
        await rebuildWorkflowActionPopup(win, popup as unknown as XULElement, {
          includeTaskManagerItem: true,
        });
      } else {
        popup.dispatch("popupshowing");
        for (
          let i = 0;
          i < 20 && popup.children.length < entry.expectedLength;
          i++
        ) {
          await flushTasks();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      assert.lengthOf(popup.children, entry.expectedLength, entry.label);
      for (const [index, expectedLabel] of entry.expectedLabels.entries()) {
        const child = popup.children[index + 3];
        assert.match(
          child.getAttribute("label") || "",
          expectedLabel,
          entry.label,
        );
        assert.equal(
          child.getAttribute("disabled"),
          entry.expectedDisabledStates[index],
          `${entry.label}: disabled state mismatch for item ${index}`,
        );
      }
    }
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  itFullOnly(
    "dispatches openDashboard from context-menu dashboard action",
    async function () {
      setWorkflowState([]);
      const calls: Array<{ type: string; data: unknown }> = [];
      (
        globalThis as {
          addon: {
            hooks: {
              onPrefsEvent: (type: string, data: unknown) => Promise<void>;
            };
          };
        }
      ).addon.hooks.onPrefsEvent = async (type, data) => {
        calls.push({ type, data });
      };

      const win = createMainWindow([]);
      ensureWorkflowMenuForWindow(win);
      const popup = win.document.getElementById(
        `${config.addonRef}-workflows-popup`,
      ) as FakeXULElement;
      popup.dispatch("popupshowing");
      await flushTasks();
      popup.children[0].dispatch("command");

      assert.lengthOf(calls, 1);
      assert.equal(calls[0].type, "openDashboard");
      assert.deepEqual(calls[0].data, { window: win });
    },
  );

  it("keeps pass-through workflow menu item enabled without backend profile", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through GUI Parent" },
    });
    setWorkflowState([
      makePassThroughWorkflow("pass-through-gui", "Pass Through GUI"),
    ]);
    const win = createMainWindow([parent]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;
    popup.dispatch("popupshowing");
    for (let i = 0; i < 10; i++) {
      await flushTasks();
      if (popup.children.length > 3) {
        break;
      }
    }

    const workflowItem = popup.children.find((entry) =>
      (entry.getAttribute("label") || "").startsWith("Pass Through GUI"),
    );
    assert.isOk(workflowItem);
    assert.equal(workflowItem.getAttribute("label"), "Pass Through GUI");
    assert.equal(workflowItem.getAttribute("disabled"), null);
  });

  it("hides debug-only workflows when debug mode is disabled and shows them when enabled", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Visibility Parent" },
    });
    setWorkflowState([
      makePassThroughWorkflow("normal-workflow", "Normal Workflow"),
      makeDebugOnlyWorkflow("workflow-debug-probe", "Workflow Debug Probe"),
    ]);
    const win = createMainWindow([parent]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;

    setDebugModeOverrideForTests(false);
    popup.dispatch("popupshowing");
    for (let i = 0; i < 10; i++) {
      await flushTasks();
    }
    const labelsWhenHidden = popup.children.map(
      (entry) => entry.getAttribute("label") || "",
    );
    assert.isTrue(
      labelsWhenHidden.some((entry) => entry.startsWith("Normal Workflow")),
    );
    assert.isFalse(
      labelsWhenHidden.some((entry) =>
        entry.startsWith("Workflow Debug Probe"),
      ),
    );

    setDebugModeOverrideForTests(true);
    popup.dispatch("popupshowing");
    for (let i = 0; i < 10; i++) {
      await flushTasks();
    }
    const labelsWhenVisible = popup.children.map(
      (entry) => entry.getAttribute("label") || "",
    );
    assert.isTrue(
      labelsWhenVisible.some((entry) =>
        entry.startsWith("Workflow Debug Probe"),
      ),
    );
  });

  it("context menu shows no-valid-input hint instead of raw error names", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "No Valid Input Parent" },
    });
    const cases = [
      {
        label: "no-valid-input workflow hint",
        workflow: makeNoValidInputWorkflow("workflow-a", "Workflow A"),
        expectedLabel: /^Workflow A \((no valid input|无合法输入)\)$/,
      },
    ];

    for (const entry of cases) {
      setWorkflowState([entry.workflow]);
      const win = createMainWindow([parent]);
      ensureWorkflowMenuForWindow(win);
      const popup = win.document.getElementById(
        `${config.addonRef}-workflows-popup`,
      ) as FakeXULElement;
      popup.dispatch("popupshowing");
      for (let i = 0; i < 10; i++) {
        await flushTasks();
        if (popup.children.length > 3) {
          break;
        }
      }

      const workflowItem = popup.children.find((child) =>
        (child.getAttribute("label") || "").startsWith("Workflow A"),
      );
      assert.isOk(workflowItem, entry.label);
      assert.match(
        workflowItem.getAttribute("label") || "",
        entry.expectedLabel,
        entry.label,
      );
      assert.equal(workflowItem.getAttribute("disabled"), "true", entry.label);
    }
  });

  it("context menu keeps precise workflow validation for a single selected item", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Single Selection Precise Menu Parent" },
    });
    const counter = { calls: 0 };
    setWorkflowState([
      makeCountingNoValidInputWorkflow("workflow-a", "Workflow A", counter),
    ]);
    const win = createMainWindow([parent]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;

    await rebuildWorkflowActionPopup(win, popup as unknown as XULElement, {
      includeSkillRunnerSidebarItem: false,
      includeTaskManagerItem: false,
      includeSynthesisWorkbenchItem: false,
    });

    const workflowItem = popup.children.find((child) =>
      (child.getAttribute("label") || "").startsWith("Workflow A"),
    );
    assert.equal(counter.calls, 0);
    assert.isOk(workflowItem);
    assert.match(
      workflowItem!.getAttribute("label") || "",
      /^Workflow A \((no valid input|无合法输入)\)$/,
    );
    assert.equal(workflowItem!.getAttribute("disabled"), "true");
  });

  it("context menu lets workflow-unit parameterized workflows open settings before request build", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Unit Settings Parent" },
    });
    const workflow = makeExplodingBuildRequestWorkflow(
      "update-topic-synthesis",
      "Update Topic Synthesis",
    );
    workflow.manifest.inputs = { unit: "workflow" };
    workflow.manifest.parameters = {
      topicId: {
        type: "string",
        title: "Topic ID",
      },
    };
    setWorkflowState([workflow]);
    const win = createMainWindow([parent]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;

    await rebuildWorkflowActionPopup(win, popup as unknown as XULElement, {
      includeSkillRunnerSidebarItem: false,
      includeTaskManagerItem: false,
      includeSynthesisWorkbenchItem: false,
    });

    const workflowItem = popup.children.find((child) =>
      (child.getAttribute("label") || "").startsWith("Update Topic Synthesis"),
    );
    assert.isOk(workflowItem);
    assert.equal(workflowItem!.getAttribute("label"), "Update Topic Synthesis");
    assert.equal(workflowItem!.getAttribute("disabled"), null);
  });

  it("context menu skips request preflight for workflow-unit workflows without parameters", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Unit No Params Parent" },
    });
    const workflow = makeExplodingBuildRequestWorkflow(
      "debug-apply-single-bundle",
      "Debug Apply Single Bundle",
    );
    workflow.manifest.inputs = { unit: "workflow" };
    setWorkflowState([workflow]);
    const win = createMainWindow([parent]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;

    await rebuildWorkflowActionPopup(win, popup as unknown as XULElement, {
      includeSkillRunnerSidebarItem: false,
      includeTaskManagerItem: false,
      includeSynthesisWorkbenchItem: false,
    });

    const workflowItem = popup.children.find((child) =>
      (child.getAttribute("label") || "").startsWith(
        "Debug Apply Single Bundle",
      ),
    );
    assert.isOk(workflowItem);
    assert.equal(
      workflowItem!.getAttribute("label"),
      "Debug Apply Single Bundle",
    );
    assert.equal(workflowItem!.getAttribute("disabled"), null);
  });

  it("context menu skips workflow request preflight for multiple selected items", async function () {
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Multi Selection Lazy Menu Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Multi Selection Lazy Menu Parent B" },
    });
    setWorkflowState([
      makeExplodingBuildRequestWorkflow("workflow-a", "Workflow A"),
    ]);
    const win = createMainWindow([parentA, parentB]);
    ensureWorkflowMenuForWindow(win);
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement;

    await rebuildWorkflowActionPopup(win, popup as unknown as XULElement, {
      includeSkillRunnerSidebarItem: false,
      includeTaskManagerItem: false,
      includeSynthesisWorkbenchItem: false,
    });

    const workflowItem = popup.children.find((child) =>
      (child.getAttribute("label") || "").startsWith("Workflow A"),
    );
    assert.isOk(workflowItem);
    assert.equal(workflowItem!.getAttribute("label"), "Workflow A");
    assert.equal(workflowItem!.getAttribute("disabled"), null);
  });
});
