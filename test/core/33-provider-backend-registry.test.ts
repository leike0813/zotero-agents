import { assert } from "chai";
import { config } from "../../package.json";
import {
  listBackendsForWorkflow,
  loadBackendsRegistry,
  resolveBackendForWorkflow,
  syncBackendReferenceState,
} from "../../src/backends/registry";
import {
  executeWithProvider,
  registerProvider,
  resolveProvider,
  resolveProviderById,
} from "../../src/providers/registry";
import { ProviderRequestContractError } from "../../src/providers/requestContracts";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { parseWorkflowManifestFromText } from "../../src/workflows/loaderContracts";
import type { LoadedWorkflow } from "../../src/workflows/types";
import type { Provider } from "../../src/providers/types";
import { workflowsPath } from "./workflow-test-utils";
import {
  ACP_PROMPT_REQUEST_KIND,
  ACP_SKILL_RUN_REQUEST_KIND,
  GENERIC_HTTP_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
  PASS_THROUGH_REQUEST_KIND,
} from "../../src/config/defaults";
import { resolveWorkflowExecutionContext } from "../../src/modules/workflowSettings";

function buildWorkflow(args: {
  id: string;
  provider?: string;
  requestKind: string;
}): LoadedWorkflow {
  return {
    manifest: {
      id: args.id,
      label: args.id,
      ...(args.provider ? { provider: args.provider } : {}),
      request: {
        kind: args.requestKind,
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
    } as LoadedWorkflow["manifest"],
    rootDir: "test-workflow",
    hooks: {
      applyResult: async () => ({ ok: true }),
    },
    buildStrategy: "declarative",
  };
}

describe("provider/backend registry", function () {
  const backendsConfigPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  const endpointPrefKey = `${config.prefsPrefix}.skillRunnerEndpoint`;
  const workflowSettingsPrefKey = `${config.prefsPrefix}.workflowSettingsJson`;
  let prevBackendsConfigPref: unknown;
  let prevEndpointPref: unknown;
  let prevWorkflowSettingsPref: unknown;

  function setBackendsConfig(configValue: unknown) {
    Zotero.Prefs.set(backendsConfigPrefKey, JSON.stringify(configValue), true);
  }

  function readPersistedBackendsConfig() {
    return JSON.parse(
      String(Zotero.Prefs.get(backendsConfigPrefKey, true) || "{}"),
    ) as {
      schemaVersion?: number;
      backends?: Array<Record<string, unknown>>;
    };
  }

  beforeEach(function () {
    prevBackendsConfigPref = Zotero.Prefs.get(backendsConfigPrefKey, true);
    prevEndpointPref = Zotero.Prefs.get(endpointPrefKey, true);
    prevWorkflowSettingsPref = Zotero.Prefs.get(workflowSettingsPrefKey, true);

    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
          defaults: {
            headers: {},
            timeout_ms: 600000,
          },
        },
        {
          id: "generic-http-local",
          type: "generic-http",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
          defaults: {
            headers: {},
            timeout_ms: 600000,
          },
        },
      ],
    });
    Zotero.Prefs.set(endpointPrefKey, "http://127.0.0.1:8030", true);
  });

  afterEach(function () {
    if (typeof prevBackendsConfigPref === "undefined") {
      Zotero.Prefs.clear(backendsConfigPrefKey, true);
    } else {
      Zotero.Prefs.set(backendsConfigPrefKey, prevBackendsConfigPref, true);
    }
    if (typeof prevEndpointPref === "undefined") {
      Zotero.Prefs.clear(endpointPrefKey, true);
    } else {
      Zotero.Prefs.set(endpointPrefKey, prevEndpointPref, true);
    }
    if (typeof prevWorkflowSettingsPref === "undefined") {
      Zotero.Prefs.clear(workflowSettingsPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowSettingsPrefKey, prevWorkflowSettingsPref, true);
    }
  });

  it("loads backends from prefs and keeps valid entries", async function () {
    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.isAtLeast(loaded.backends.length, 2);
    assert.isOk(
      loaded.backends.find((entry) => entry.id === "skillrunner-primary"),
    );
    assert.isOk(
      loaded.backends.find((entry) => entry.id === "generic-http-local"),
    );
  });

  it("loads optional management_auth for skillrunner backend", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
          management_auth: {
            kind: "basic",
            username: "admin",
            password: "secret",
          },
        },
      ],
    });

    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.lengthOf(loaded.backends, 2);
    const matched = loaded.backends.find(
      (entry) => entry.id === "skillrunner-primary",
    );
    assert.isOk(matched);
    assert.deepEqual(matched?.management_auth, {
      kind: "basic",
      username: "admin",
      password: "secret",
    });
  });

  it("loads governed backend types and rejects unknown backend type entries", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "generic-http-local",
          type: GENERIC_HTTP_BACKEND_TYPE,
          baseUrl: "http://127.0.0.1:18030",
          auth: { kind: "none" },
        },
        {
          id: "acp-local",
          type: "acp",
          command: "npx",
          args: ["codex", "acp"],
        },
        {
          id: "pass-through-local",
          type: PASS_THROUGH_BACKEND_TYPE,
          baseUrl: "local://pass-through",
          auth: { kind: "none" },
        },
        {
          id: "typo-backend",
          type: "skill-runner",
          baseUrl: "http://127.0.0.1:9999",
          auth: { kind: "none" },
        },
      ],
    });

    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.includeMembers(
      loaded.backends.map((entry) => entry.id),
      [
        "skillrunner-primary",
        "generic-http-local",
        "acp-local",
        "pass-through-local",
      ],
    );
    assert.notInclude(
      loaded.backends.map((entry) => entry.id),
      "typo-backend",
    );
    assert.match(loaded.invalidBackends["typo-backend"], /type/i);
  });

  it("accepts acp backend entries without http baseUrl and normalizes local launch metadata", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "acp-opencode-dev",
          type: "acp",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
          env: {
            OPENAI_API_KEY: "test-key",
          },
        },
      ],
    });

    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.lengthOf(loaded.backends, 2);
    const matched = loaded.backends.find(
      (entry) => entry.id === "acp-opencode-dev",
    );
    assert.isOk(matched);
    assert.equal(matched?.type, "acp");
    assert.equal(matched?.baseUrl, "local://acp-opencode-dev");
    assert.equal(matched?.command, "npx");
    assert.deepEqual(matched?.args, ["opencode-ai@latest", "acp"]);
    assert.deepEqual(matched?.env, {
      OPENAI_API_KEY: "test-key",
    });
  });

  it("keeps user-edited acp-opencode profile and only seeds builtin when missing", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "acp-opencode",
          displayName: "Stale ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "opencode",
          args: ["acp"],
          env: {
            OPENAI_API_KEY: "stale-key",
          },
        },
      ],
    });

    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.lengthOf(
      loaded.backends.filter((entry) => entry.id === "acp-opencode"),
      1,
    );
    const matched = loaded.backends.find(
      (entry) => entry.id === "acp-opencode",
    );
    assert.isOk(matched);
    assert.equal(matched?.displayName, "Stale ACP");
    assert.equal(matched?.command, "opencode");
    assert.deepEqual(matched?.args, ["acp"]);
    assert.deepEqual(matched?.env, {
      OPENAI_API_KEY: "stale-key",
    });

    const persisted = readPersistedBackendsConfig();
    const persistedAcp = (persisted.backends || []).find(
      (entry) => String(entry.id || "").trim() === "acp-opencode",
    );
    assert.isOk(persistedAcp);
    assert.equal(persistedAcp?.displayName, "Stale ACP");
    assert.equal(persistedAcp?.command, "opencode");
    assert.deepEqual(persistedAcp?.args, ["acp"]);
    assert.deepEqual(persistedAcp?.env, {
      OPENAI_API_KEY: "stale-key",
    });
  });

  it("resolves first provider-compatible backend when no preferred profile is set", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "workflow literature-analysis not found");

    const backend = await resolveBackendForWorkflow(workflow!);
    assert.equal(backend.id, "skillrunner-primary");
    assert.equal(backend.type, "skillrunner");
    assert.equal(backend.baseUrl, "http://127.0.0.1:8030");
  });

  it("resolves provider by request kind and backend type", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "workflow literature-analysis not found");

    const backend = await resolveBackendForWorkflow(workflow!);
    const provider = resolveProvider({
      requestKind: workflow!.manifest.request!.kind,
      backend,
    });

    assert.equal(provider.id, "skillrunner");
  });

  it("resolves providers for all governed backend type pairs", function () {
    const cases = [
      {
        requestKind: "skillrunner.job.v1",
        providerId: "skillrunner",
        backend: {
          id: "skillrunner-primary",
          type: "skillrunner" as const,
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" as const },
        },
      },
      {
        requestKind: ACP_PROMPT_REQUEST_KIND,
        providerId: "acp",
        backend: {
          id: "acp-local",
          type: "acp" as const,
          baseUrl: "local://acp-local",
          command: "npx",
          args: ["codex", "acp"],
        },
      },
      {
        requestKind: "generic-http.request.v1",
        providerId: GENERIC_HTTP_BACKEND_TYPE,
        backend: {
          id: "generic-http-local",
          type: GENERIC_HTTP_BACKEND_TYPE,
          baseUrl: "http://127.0.0.1:18030",
          auth: { kind: "none" as const },
        },
      },
      {
        requestKind: PASS_THROUGH_REQUEST_KIND,
        providerId: PASS_THROUGH_BACKEND_TYPE,
        backend: {
          id: "pass-through-local",
          type: PASS_THROUGH_BACKEND_TYPE,
          baseUrl: "local://pass-through",
          auth: { kind: "none" as const },
        },
      },
    ];

    for (const entry of cases) {
      const provider = resolveProvider({
        requestKind: entry.requestKind,
        backend: entry.backend,
      });
      assert.equal(provider.id, entry.providerId);
    }
  });

  it("throws when no provider supports request kind for backend", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "workflow literature-analysis not found");

    const backend = await resolveBackendForWorkflow(workflow!);
    assert.throws(
      () =>
        resolveProvider({
          requestKind: "unsupported.kind",
          backend,
        }),
      /request_kind_unsupported|unsupported_request_kind/i,
    );
  });

  it("throws normalized contract error when request kind and backend type mismatch", async function () {
    let thrown: unknown;
    try {
      resolveProvider({
        requestKind: PASS_THROUGH_REQUEST_KIND,
        backend: {
          id: "generic-http-local",
          type: "generic-http",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
      });
    } catch (error) {
      thrown = error;
    }
    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "provider_backend_mismatch");
    assert.equal(typed.reason, "backend_type_mismatch");
  });

  it("remaps backend references inside versioned workflow settings document", function () {
    Zotero.Prefs.set(
      workflowSettingsPrefKey,
      JSON.stringify({
        schemaVersion: 1,
        workflows: {
          "literature-analysis": {
            backendId: "old-backend",
            workflowParams: { language: "zh-CN" },
            providerOptions: { engine: "codex" },
          },
          "tag-regulator": {
            backendId: "removed-backend",
            workflowParams: { language: "en-US" },
          },
        },
      }),
      true,
    );

    const changed = syncBackendReferenceState({
      idMapping: new Map([["old-backend", "new-backend"]]),
      removedIds: ["removed-backend"],
    });

    assert.isTrue(changed);
    const persisted = JSON.parse(
      String(Zotero.Prefs.get(workflowSettingsPrefKey, true) || "{}"),
    ) as {
      schemaVersion?: number;
      workflows?: Record<string, { backendId?: string }>;
    };
    assert.equal(persisted.schemaVersion, 1);
    assert.equal(
      persisted.workflows?.["literature-analysis"]?.backendId,
      "new-backend",
    );
    assert.isUndefined(persisted.workflows?.["tag-regulator"]?.backendId);
  });

  it("validates request payload contract before provider dispatch", async function () {
    const originalProvider = resolveProviderById("generic-http");
    let executeCalled = 0;
    const stubProvider: Provider = {
      id: "generic-http",
      supports: ({ requestKind, backend }) =>
        backend.type === "generic-http" &&
        (requestKind === "generic-http.request.v1" ||
          requestKind === "generic-http.steps.v1"),
      execute: async () => {
        executeCalled += 1;
        return {
          status: "succeeded",
          requestId: "stub",
          fetchType: "result",
          resultJson: {},
          responseJson: {},
        };
      },
    };
    registerProvider(stubProvider);

    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: "generic-http.steps.v1",
        backend: {
          id: "generic-http-local",
          type: "generic-http",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        request: {
          kind: "generic-http.steps.v1",
          steps: [],
        },
      });
    } catch (error) {
      thrown = error;
    } finally {
      registerProvider(originalProvider);
    }

    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "request_payload_invalid");
    assert.equal(typed.reason, "invalid_request_payload");
    assert.equal(executeCalled, 0, "provider.execute should not be called");
  });

  it("validates acp.prompt.v1 payload contract before provider dispatch", async function () {
    const originalProvider = resolveProviderById("acp");
    let executeCalled = 0;
    const stubProvider: Provider = {
      id: "acp",
      supports: ({ requestKind, backend }) =>
        backend.type === "acp" && requestKind === ACP_PROMPT_REQUEST_KIND,
      execute: async () => {
        executeCalled += 1;
        return {
          status: "succeeded",
          requestId: "stub-acp",
          fetchType: "result",
          resultJson: {},
          responseJson: {},
        };
      },
    };
    registerProvider(stubProvider);

    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: ACP_PROMPT_REQUEST_KIND,
        backend: {
          id: "acp-opencode",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        },
        request: {
          kind: ACP_PROMPT_REQUEST_KIND,
          message: "",
        },
      });
    } catch (error) {
      thrown = error;
    } finally {
      registerProvider(originalProvider);
    }

    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "request_payload_invalid");
    assert.equal(typed.reason, "invalid_request_payload");
    assert.match(String(typed.detail || ""), /message/i);
    assert.equal(executeCalled, 0, "provider.execute should not be called");
  });

  it("does not dispatch skillrunner.job.v1 directly to ACP backends", function () {
    assert.throws(
      () =>
        resolveProvider({
          requestKind: "skillrunner.job.v1",
          backend: {
            id: "acp-claude",
            type: "acp",
            baseUrl: "local://acp-claude",
            command: "claude",
            args: ["acp"],
          },
        }),
      /backend_type_mismatch|provider_backend_mismatch/i,
    );
  });

  it("resolves acp.skill.run.v1 to ACP provider", function () {
    const provider = resolveProvider({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: {
        id: "acp-claude",
        type: "acp",
        baseUrl: "local://acp-claude",
        command: "claude",
        args: ["acp"],
      },
    });

    assert.equal(provider.id, "acp");
  });

  it("rejects acp.skill.run.v1 payloads with upload-relative input paths", async function () {
    const originalProvider = resolveProviderById("acp");
    let executeCalled = 0;
    const stubProvider: Provider = {
      id: "acp",
      supports: ({ requestKind, backend }) =>
        backend.type === "acp" && requestKind === ACP_SKILL_RUN_REQUEST_KIND,
      execute: async () => {
        executeCalled += 1;
        return {
          status: "succeeded",
          requestId: "stub-acp-skill",
          fetchType: "result",
          resultJson: {},
          responseJson: {},
        };
      },
    };
    registerProvider(stubProvider);

    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: {
          id: "acp-claude",
          type: "acp",
          baseUrl: "local://acp-claude",
          command: "claude",
          args: ["acp"],
        },
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "literature-analysis",
          input: {
            source_path: "inputs/source_path/example.md",
          },
        },
      });
    } catch (error) {
      thrown = error;
    } finally {
      registerProvider(originalProvider);
    }

    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "request_payload_invalid");
    assert.match(String(typed.detail || ""), /upload-relative|absolute path/i);
    assert.equal(executeCalled, 0);
  });

  it("rejects acp.skill.run.v1 payloads that still carry upload_files", async function () {
    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: {
          id: "acp-claude",
          type: "acp",
          baseUrl: "local://acp-claude",
          command: "claude",
          args: ["acp"],
        },
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "literature-analysis",
          upload_files: [{ key: "source_path", path: "D:/real/example.md" }],
          input: {
            source_path: "D:/real/example.md",
          },
        },
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ProviderRequestContractError);
    assert.match(
      String((thrown as ProviderRequestContractError).detail || ""),
      /upload_files is not allowed/i,
    );
  });

  it("accepts optional inline input object for skillrunner.job.v1 payload", async function () {
    const originalProvider = resolveProviderById("skillrunner");
    let executeCalled = 0;
    let capturedRequest: unknown;
    const stubProvider: Provider = {
      id: "skillrunner",
      supports: ({ requestKind, backend }) =>
        backend.type === "skillrunner" && requestKind === "skillrunner.job.v1",
      execute: async (args) => {
        executeCalled += 1;
        capturedRequest = args.request;
        return {
          status: "succeeded",
          requestId: "stub-skillrunner",
          fetchType: "result",
          resultJson: {},
          responseJson: {},
        };
      },
    };
    registerProvider(stubProvider);

    try {
      const result = await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend: {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          runtime_options: { execution_mode: "auto" },
          upload_files: [{ key: "md_path", path: "D:/fixtures/example.md" }],
          parameter: { language: "zh-CN" },
          input: {
            metadata: { itemKey: "AAA111" },
            tags: ["A", "B"],
            md_path: "inputs/md_path/example.md",
          },
        },
      });
      assert.equal(result.status, "succeeded");
    } finally {
      registerProvider(originalProvider);
    }

    assert.equal(executeCalled, 1, "provider.execute should be called once");
    assert.deepEqual(
      (capturedRequest as { input?: unknown })?.input,
      {
        metadata: { itemKey: "AAA111" },
        tags: ["A", "B"],
        md_path: "inputs/md_path/example.md",
      },
      `capturedRequest=${JSON.stringify(capturedRequest)}`,
    );
  });

  it("validates optional skillrunner skill_source values", async function () {
    const originalProvider = resolveProviderById("skillrunner");
    const stubProvider: Provider = {
      id: "skillrunner",
      supports: ({ requestKind, backend }) =>
        backend.type === "skillrunner" && requestKind === "skillrunner.job.v1",
      execute: async () => ({
        status: "succeeded",
        requestId: "stub-skillrunner-source",
        fetchType: "result",
        resultJson: {},
        responseJson: {},
      }),
    };
    registerProvider(stubProvider);
    const backend = {
      id: "skillrunner-primary",
      type: "skillrunner" as const,
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" as const },
    };

    try {
      const localResult = await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend,
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          runtime_options: { execution_mode: "auto" },
          skill_source: "local-package",
        },
      });
      const installedResult = await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend,
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          runtime_options: { execution_mode: "auto" },
          skill_source: "installed",
        },
      });

      assert.equal(localResult.status, "succeeded");
      assert.equal(installedResult.status, "succeeded");

      let thrown: unknown = null;
      try {
        await executeWithProvider({
          requestKind: "skillrunner.job.v1",
          backend,
          request: {
            kind: "skillrunner.job.v1",
            skill_id: "tag-regulator",
            runtime_options: { execution_mode: "auto" },
            skill_source: "backend",
          },
        });
      } catch (error) {
        thrown = error;
      }

      assert.instanceOf(thrown, ProviderRequestContractError);
      assert.match(
        String((thrown as ProviderRequestContractError).detail || ""),
        /skill_source/i,
      );
    } finally {
      registerProvider(originalProvider);
    }
  });

  it("accepts skillrunner.job.v1 payload when inline input is primitive or array JSON", async function () {
    const originalProvider = resolveProviderById("skillrunner");
    let executeCalled = 0;
    const capturedInputs: unknown[] = [];
    const stubProvider: Provider = {
      id: "skillrunner",
      supports: ({ requestKind, backend }) =>
        backend.type === "skillrunner" && requestKind === "skillrunner.job.v1",
      execute: async (args) => {
        executeCalled += 1;
        capturedInputs.push((args.request as { input?: unknown }).input);
        return {
          status: "succeeded",
          requestId: "stub-skillrunner",
          fetchType: "result",
          resultJson: {},
          responseJson: {},
        };
      },
    };
    registerProvider(stubProvider);

    try {
      const backend = {
        id: "skillrunner-primary",
        type: "skillrunner" as const,
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" as const },
      };
      const baseRequest = {
        kind: "skillrunner.job.v1" as const,
        skill_id: "tag-regulator",
        runtime_options: { execution_mode: "auto" },
      };
      const stringResult = await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend,
        request: {
          ...baseRequest,
          input: "inline-text",
        },
      });
      const arrayResult = await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend,
        request: {
          ...baseRequest,
          input: ["A", "B"],
        },
      });
      assert.equal(stringResult.status, "succeeded");
      assert.equal(arrayResult.status, "succeeded");
    } finally {
      registerProvider(originalProvider);
    }

    assert.equal(executeCalled, 2, "provider.execute should be called twice");
    assert.deepEqual(capturedInputs, ["inline-text", ["A", "B"]]);
  });

  it("rejects skillrunner.job.v1 payload when upload file key has no input path mapping", async function () {
    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: "skillrunner.job.v1",
        backend: {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          runtime_options: { execution_mode: "auto" },
          input: {
            metadata: { itemKey: "AAA111" },
          },
          upload_files: [
            { key: "valid_tags", path: "D:/fixtures/valid_tags.yaml" },
          ],
        },
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "request_payload_invalid");
    assert.equal(typed.reason, "invalid_request_payload");
    assert.match(String(typed.detail || ""), /input\.valid_tags/i);
  });

  it("validates single-request payload contract for generic-http.request.v1", async function () {
    let thrown: unknown;
    try {
      await executeWithProvider({
        requestKind: "generic-http.request.v1",
        backend: {
          id: "generic-http-local",
          type: "generic-http",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        request: {
          kind: "generic-http.request.v1",
          request: {
            method: "POST",
          },
        },
      });
    } catch (error) {
      thrown = error;
    }
    assert.instanceOf(thrown, ProviderRequestContractError);
    const typed = thrown as ProviderRequestContractError;
    assert.equal(typed.category, "request_payload_invalid");
    assert.equal(typed.reason, "invalid_request_payload");
    assert.match(String(typed.detail || ""), /request\.path/i);
  });

  it("resolves and executes pass-through provider with unified result model", async function () {
    const provider = resolveProvider({
      requestKind: PASS_THROUGH_REQUEST_KIND,
      backend: {
        id: "pass-through-local",
        type: "pass-through",
        baseUrl: "local://pass-through",
        auth: { kind: "none" },
      },
    });
    assert.equal(provider.id, "pass-through");

    const result = await provider.execute({
      requestKind: PASS_THROUGH_REQUEST_KIND,
      backend: {
        id: "pass-through-local",
        type: "pass-through",
        baseUrl: "local://pass-through",
        auth: { kind: "none" },
      },
      request: {
        kind: PASS_THROUGH_REQUEST_KIND,
        targetParentID: 10,
        taskName: "pass-through-test",
        sourceAttachmentPaths: [],
        selectionContext: {
          selectionType: "parent",
          items: { parents: [{ item: { id: 10 } }] },
        },
        parameter: {
          foo: "bar",
        },
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.fetchType, "result");
    assert.isObject(result.resultJson);
    assert.equal(
      (result.resultJson as { kind?: string }).kind,
      PASS_THROUGH_REQUEST_KIND,
    );
    assert.deepEqual(
      (result.resultJson as { parameter?: Record<string, unknown> }).parameter,
      { foo: "bar" },
    );
  });

  it("blocks all workflows when backends prefs JSON is invalid", async function () {
    Zotero.Prefs.set(backendsConfigPrefKey, "{invalid", true);
    const workflow = buildWorkflow({
      id: "invalid-backends-check",
      provider: "skillrunner",
      requestKind: "skillrunner.job.v1",
    });

    let thrown: unknown;
    try {
      await resolveBackendForWorkflow(workflow);
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown);
    assert.match(String(thrown), /Invalid backends JSON/);
  });

  it("derives ACP-only compatible backends from an ACP workflow provider", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp-local",
          command: "npx",
          args: ["codex", "acp"],
          auth: { kind: "none" },
        },
      ],
    });
    const workflow = buildWorkflow({
      id: "acp-only-skillrunner-request",
      provider: "acp",
      requestKind: "skillrunner.job.v1",
    });

    const backends = await listBackendsForWorkflow(workflow);
    assert.sameMembers(
      Array.from(new Set(backends.map((entry) => entry.type))),
      ["acp"],
    );
    assert.include(
      backends.map((entry) => entry.id),
      "acp-local",
    );
    assert.notInclude(
      backends.map((entry) => entry.id),
      "skillrunner-primary",
    );

    let thrown: unknown;
    try {
      await resolveBackendForWorkflow(workflow, {
        preferredBackendId: "skillrunner-primary",
      });
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown);
    assert.match(String(thrown), /incompatible backendId/);
  });

  it("lets ACP-provider sequence workflows run through ACP or SkillRunner backends", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp-local",
          command: "npx",
          args: ["codex", "acp"],
          auth: { kind: "none" },
        },
      ],
    });
    const workflow = buildWorkflow({
      id: "acp-sequence-compatible",
      provider: "acp",
      requestKind: "skillrunner.sequence.v1",
    });

    const backends = await listBackendsForWorkflow(workflow);
    assert.sameMembers(
      Array.from(new Set(backends.map((entry) => entry.type))),
      ["acp", "skillrunner"],
    );
    const backendIds = backends.map((entry) => entry.id);
    assert.includeMembers(backendIds, ["acp-local", "skillrunner-primary"]);
    assert.isBelow(
      backendIds.indexOf("acp-local"),
      backendIds.indexOf("skillrunner-primary"),
    );

    const skillrunnerBackend = await resolveBackendForWorkflow(workflow, {
      preferredBackendId: "skillrunner-primary",
    });
    assert.equal(skillrunnerBackend.type, "skillrunner");
    const skillrunnerContext = await resolveWorkflowExecutionContext({
      workflow,
      executionOptionsOverride: {
        backendId: "skillrunner-primary",
      },
    });
    assert.equal(skillrunnerContext.backend.id, "skillrunner-primary");
    assert.equal(skillrunnerContext.providerId, "skillrunner");
    assert.equal(skillrunnerContext.requestKind, "skillrunner.sequence.v1");

    const acpBackend = await resolveBackendForWorkflow(workflow, {
      preferredBackendId: "acp-local",
    });
    assert.equal(acpBackend.type, "acp");
    const acpContext = await resolveWorkflowExecutionContext({
      workflow,
      executionOptionsOverride: {
        backendId: "acp-local",
      },
    });
    assert.equal(acpContext.backend.id, "acp-local");
    assert.equal(acpContext.providerId, "acp");
    assert.equal(acpContext.requestKind, "skillrunner.sequence.v1");
  });

  it("lets SkillRunner-provider workflows run through SkillRunner or ACP backends", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp-local",
          command: "npx",
          args: ["codex", "acp"],
          auth: { kind: "none" },
        },
      ],
    });
    const workflow = buildWorkflow({
      id: "skillrunner-compatible",
      provider: "skillrunner",
      requestKind: "skillrunner.job.v1",
    });

    const backends = await listBackendsForWorkflow(workflow);
    assert.sameMembers(
      Array.from(new Set(backends.map((entry) => entry.type))),
      ["skillrunner", "acp"],
    );

    const skillrunnerBackend = await resolveBackendForWorkflow(workflow, {
      preferredBackendId: "skillrunner-primary",
    });
    assert.equal(skillrunnerBackend.type, "skillrunner");

    const acpBackend = await resolveBackendForWorkflow(workflow, {
      preferredBackendId: "acp-local",
    });
    assert.equal(acpBackend.type, "acp");
  });

  it("prefers SkillRunner backend for SkillRunner-provider workflows by default", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp-local",
          command: "npx",
          args: ["codex", "acp"],
          auth: { kind: "none" },
        },
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
      ],
    });
    const workflow = buildWorkflow({
      id: "skillrunner-default-preferred",
      provider: "skillrunner",
      requestKind: "skillrunner.job.v1",
    });

    const backends = await listBackendsForWorkflow(workflow);
    assert.deepEqual(backends.map((entry) => entry.id).slice(0, 2), [
      "skillrunner-primary",
      "acp-local",
    ]);

    const backend = await resolveBackendForWorkflow(workflow);
    assert.equal(backend.id, "skillrunner-primary");
  });

  it("does not infer backend compatibility from request.kind when provider is missing", async function () {
    const workflow = buildWorkflow({
      id: "missing-provider-skillrunner-request",
      requestKind: "skillrunner.job.v1",
    });

    const backends = await listBackendsForWorkflow(workflow);
    assert.deepEqual(backends, []);

    let backendError: unknown;
    try {
      await resolveBackendForWorkflow(workflow);
    } catch (error) {
      backendError = error;
    }
    assert.isOk(backendError);
    assert.match(String(backendError), /does not declare provider/);

    let settingsError: unknown;
    try {
      await resolveWorkflowExecutionContext({ workflow });
    } catch (error) {
      settingsError = error;
    }
    assert.isOk(settingsError);
    assert.match(String(settingsError), /does not declare provider/);
  });

  it("rejects execution.supportedBackends in workflow manifests", function () {
    const result = parseWorkflowManifestFromText({
      manifestPath: "workflow.json",
      raw: JSON.stringify({
        id: "legacy-supported-backends",
        label: "Legacy Supported Backends",
        provider: "acp",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "legacy-supported-backends",
            mode: "interactive",
          },
        },
        execution: {
          supportedBackends: ["acp"],
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      }),
    });

    assert.isNull(result.manifest);
    assert.equal(result.diagnostic?.category, "manifest_validation_error");
    assert.include(
      String(result.diagnostic?.reason || ""),
      "supportedBackends",
    );
  });

  it("only disables workflows that bind to invalid backend entries", async function () {
    setBackendsConfig({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "generic-http-local",
          type: "generic-http",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "broken-backend",
          type: "generic-http",
          auth: { kind: "none" },
        },
      ],
    });
    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.isAtLeast(loaded.errors.length, 1);
    assert.isOk(loaded.invalidBackends["broken-backend"]);

    const validWorkflow = buildWorkflow({
      id: "generic-http-ok",
      provider: "generic-http",
      requestKind: "generic-http.request.v1",
    });
    const validBackend = await resolveBackendForWorkflow(validWorkflow, {
      preferredBackendId: "generic-http-local",
    });
    assert.equal(validBackend.id, "generic-http-local");

    const invalidWorkflow = buildWorkflow({
      id: "generic-http-broken",
      provider: "generic-http",
      requestKind: "generic-http.request.v1",
    });
    let thrown: unknown;
    try {
      await resolveBackendForWorkflow(invalidWorkflow, {
        preferredBackendId: "broken-backend",
      });
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown);
    assert.match(String(thrown), /is invalid|Unknown backendId/);
  });

  it("does not auto-create default skillrunner backend when backend prefs are empty", async function () {
    Zotero.Prefs.clear(backendsConfigPrefKey, true);
    Zotero.Prefs.set(endpointPrefKey, "http://127.0.0.1:18030", true);

    const loaded = await loadBackendsRegistry();
    assert.isUndefined(loaded.fatalError);
    assert.lengthOf(loaded.backends, 1);
    assert.equal(loaded.backends[0].id, "acp-opencode");
    assert.equal(loaded.backends[0].type, "acp");
    assert.equal(loaded.backends[0].command, "npx");
    assert.deepEqual(loaded.backends[0].args, ["opencode-ai@latest", "acp"]);

    const persisted = readPersistedBackendsConfig();
    assert.equal(persisted.schemaVersion, 2);
    assert.lengthOf(persisted.backends || [], 1);
    assert.equal(persisted.backends?.[0]?.id, "acp-opencode");
    assert.equal(persisted.backends?.[0]?.command, "npx");
    assert.deepEqual(persisted.backends?.[0]?.args, [
      "opencode-ai@latest",
      "acp",
    ]);
  });

  it("rejects ACP workflows from workflow execution context resolution", async function () {
    const workflow = buildWorkflow({
      id: "acp-global-chat-blocked",
      provider: "acp",
      requestKind: ACP_PROMPT_REQUEST_KIND,
    });

    let thrown: unknown;
    try {
      await resolveWorkflowExecutionContext({
        workflow,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /acp|global chat|workflow/i);
  });
});
