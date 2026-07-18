import { config } from "../package.json";
import { DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { resolveAddonRuntimeEnv } from "./utils/env";
import type { LoadedWorkflows } from "./workflows/types";
import type {
  WorkflowEditorOpenArgs,
  WorkflowEditorOpenResult,
  WorkflowEditorRenderer,
} from "./modules/workflowEditorHost";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    initialized?: boolean;
    startupError?: {
      stage: string;
      code: string;
      message: string;
      occurredAt: string;
    };
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    workflow?: {
      workflowsDir: string;
      loaded: LoadedWorkflows;
    };
    workflowEditorHost?: {
      open: (args: WorkflowEditorOpenArgs) => Promise<WorkflowEditorOpenResult>;
      registerRenderer: (
        rendererId: string,
        renderer: WorkflowEditorRenderer,
      ) => void;
      unregisterRenderer: (rendererId: string) => void;
    };
    workflowDebugProbe?: {
      run: (args: {
        selectionContext: unknown;
        workflowId?: string;
      }) => Promise<unknown>;
    };
    dialog?: DialogHelper;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: resolveAddonRuntimeEnv(),
      initialized: false,
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
