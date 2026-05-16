import { assert } from "chai";
import { config } from "../../package.json";
import { ensureWorkflowRegistryAndMenu } from "../../src/hooks";
import { getWorkflowRegistryState } from "../../src/modules/workflowRuntime";
import { joinPath, mkTempDir, workflowsPath } from "./workflow-test-utils";

type Listener = (event: Record<string, unknown>) => void;

class FakeXULElement {
  private attrs = new Map<string, string>();
  private listeners = new Map<string, Listener[]>();
  private _id = "";

  public parentNode: FakeXULElement | null = null;
  public children: FakeXULElement[] = [];

  constructor(private readonly owner: FakeDocument) {}

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
  }

  getAttribute(name: string) {
    return this.attrs.get(name) || null;
  }

  addEventListener(type: string, listener: Listener) {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  dispatch(type: string) {
    const listeners = this.listeners.get(type) || [];
    const event = {
      type,
      target: this,
    };
    for (const listener of listeners) {
      listener(event);
    }
  }
}

class FakeDocument {
  private elements = new Map<string, FakeXULElement>();

  createXULElement() {
    return new FakeXULElement(this);
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
}

function createMainWindow() {
  const document = new FakeDocument();
  const itemMenu = document.createXULElement();
  itemMenu.id = "zotero-itemmenu";
  return {
    document,
    ZoteroPane: {
      getSelectedItems: () => [],
    },
  } as unknown as _ZoteroTypes.MainWindow;
}

function createMainWindowWithoutMenu() {
  const document = new FakeDocument();
  return {
    document,
    ZoteroPane: {
      getSelectedItems: () => [],
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

describe("startup workflow scan + menu init", function () {
  const workflowDirPrefKey = `${config.prefsPrefix}.workflowDir`;

  let prevAddon: unknown;
  let prevWorkflowDirPref: unknown;
  let prevDataDirectory: unknown;
  let prevTestWorkflowDirEnv: string | undefined;
  let prevDisableWorkflowDirOverride: boolean | undefined;

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

    prevDataDirectory = (Zotero as unknown as { DataDirectory?: unknown }).DataDirectory;
    prevTestWorkflowDirEnv =
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env?.ZOTERO_TEST_WORKFLOW_DIR;
    prevDisableWorkflowDirOverride = (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride;
  });

  afterEach(function () {
    if (typeof prevWorkflowDirPref === "undefined") {
      Zotero.Prefs.clear(workflowDirPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowDirPrefKey, prevWorkflowDirPref, true);
    }

    const runtime = globalThis as { addon?: unknown };
    runtime.addon = prevAddon;

    const zoteroRuntime = Zotero as unknown as { DataDirectory?: unknown };
    zoteroRuntime.DataDirectory = prevDataDirectory as
      | { dir?: string }
      | undefined;

    const processEnv =
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
    if (processEnv) {
      if (typeof prevTestWorkflowDirEnv === "undefined") {
        delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
      } else {
        processEnv.ZOTERO_TEST_WORKFLOW_DIR = prevTestWorkflowDirEnv;
      }
    }
    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride =
      prevDisableWorkflowDirOverride;
  });

  it("scans default data-directory workflow path once and still initializes menu when no workflows are found", async function () {
    const processEnv =
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
    if (processEnv) {
      delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
    }

    const dataDir = await mkTempDir("zotero-skills-startup-empty");
    (Zotero as unknown as { DataDirectory?: { dir?: string } }).DataDirectory = {
      dir: dataDir,
    };
    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride = true;

    const win = createMainWindow();
    await ensureWorkflowRegistryAndMenu(win);

    const state = getWorkflowRegistryState();
    const expectedDir = joinPath(dataDir, "zotero-skills", "workflows");
    assert.equal(state.workflowsDir, expectedDir);
    assert.equal(Zotero.Prefs.get(workflowDirPrefKey, true), expectedDir);
    assert.lengthOf(state.loaded.workflows, 0);
    assert.isAtLeast(state.loaded.errors.length, 1);

    const menu = win.document.getElementById(`${config.addonRef}-workflows-menu`) as FakeXULElement | null;
    const popup = win.document.getElementById(
      `${config.addonRef}-workflows-popup`,
    ) as FakeXULElement | null;
    assert.isOk(menu);
    assert.isOk(popup);

    popup!.dispatch("popupshowing");
    await flushTasks();
    assert.lengthOf(popup!.children, 5);
    assertMenuLabel(
      popup!.children[0].getAttribute("label"),
      ["Open SkillRunner Sidebar...", "打开 SkillRunner 侧边栏..."],
      "skillrunner sidebar label",
    );
    assertMenuLabel(
      popup!.children[1].getAttribute("label"),
      ["Open Dashboard...", "打开 Dashboard..."],
      "task-manager label",
    );
    assert.equal(popup!.children[1].getAttribute("disabled"), null);
    assertMenuLabel(
      popup!.children[2].getAttribute("label"),
      ["Open Synthesis Workbench..."],
      "synthesis workbench label",
    );
    assert.equal(popup!.children[2].getAttribute("disabled"), null);
    assert.equal(popup!.children[3].getAttribute("label"), null);
    assert.equal(popup!.children[4].getAttribute("disabled"), "true");
    assertMenuLabel(
      popup!.children[4].getAttribute("label"),
      ["No workflows loaded", "未加载任何 Workflow"],
      "empty label",
    );
  });

  it("retries menu initialization when item menu appears late", async function () {
    const processEnv =
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
    if (processEnv) {
      processEnv.ZOTERO_TEST_WORKFLOW_DIR = workflowsPath();
    }

    const win = createMainWindowWithoutMenu();
    setTimeout(() => {
      const itemMenu = (win.document as unknown as FakeDocument).createXULElement();
      itemMenu.id = "zotero-itemmenu";
    }, 2);

    await ensureWorkflowRegistryAndMenu(win, {
      retryIntervalMs: 1,
      maxMenuRetryAttempts: 40,
    });

    const menu = (win.document as unknown as FakeDocument).getElementById(
      `${config.addonRef}-workflows-menu`,
    ) as FakeXULElement | null;
    assert.isOk(menu);
  });
});
