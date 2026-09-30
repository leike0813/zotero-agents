import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { createPiConversationCoordinator } from "../../src/modules/piConversation";
import { inspectPiOwner } from "../../src/modules/piOwnerPersistence";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import { createPiTextProviderSource } from "../../src/modules/piRuntime";
import { getPref, setPref } from "../../src/utils/prefs";
import type {
  PiModelSelectionSnapshot,
  PiSelection,
} from "../../src/shared/piProviderContract";

const MAIN_MODEL: PiModelSelectionSnapshot = {
  configurationId: "deterministic",
  configurationLabel: "Deterministic",
  provider: "test",
  modelId: "test-model",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "test",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 32000,
    maxTokens: 2048,
    input: ["text"],
    supportsTools: true,
  },
};
const AUX_MODEL: PiModelSelectionSnapshot = {
  ...MAIN_MODEL,
  configurationId: "aux",
  configurationLabel: "Aux",
  provider: "aux-provider",
  modelId: "aux-title-model",
};

const AUX_CONFIGURATION = {
  id: "aux",
  label: "Aux",
  provider: "aux-provider",
  modelId: "aux-title-model",
  authVariant: "none",
  enabled: true,
  baseUrl: "https://example.test",
  api: "openai-completions",
};

function setAuxiliaryDefault(enabled: boolean) {
  setPref(
    "piProviderConfigurationJson",
    JSON.stringify({
      version: 1,
      configurations: [AUX_CONFIGURATION],
      defaults: enabled ? { auxiliary: { configurationId: "aux" } } : {},
      overlayPath: "",
    }),
  );
}

describe("Pi Conversation titles", function () {
  this.timeout(30_000);
  let root: string;
  let priorRoot: string | undefined;
  let priorConfig: string | undefined;

  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-conversation-titles-"));
    priorRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    priorConfig = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
  });

  afterEach(async function () {
    setPref("piProviderConfigurationJson", priorConfig ?? "");
    resetPluginStateStoreForTests();
    if (priorRoot === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = priorRoot;
    await fs.rm(root, { recursive: true, force: true });
  });

  function titleCoordinator(
    setup: {
      gate?: Promise<void>;
      capture?: (context: string) => void;
      withReadTool?: boolean;
    } = {},
  ) {
    return createPiConversationCoordinator({
      root,
      resolveModel: async (selection) =>
        selection?.configurationId === "aux" ? AUX_MODEL : MAIN_MODEL,
      execution: (selection) => {
        const isTitle = selection.configurationId === "aux";
        const built = createPiTextProviderSource({
          steps: [{ text: isTitle ? "Generated Title" : "Assistant reply" }],
        });
        return {
          model: built.model,
          source: async (request) => {
            if (isTitle) {
              setup.capture?.(JSON.stringify(request.context));
              await setup.gate;
            }
            return built.source(request);
          },
        };
      },
      definitions: async () =>
        setup.withReadTool
          ? [
              {
                capabilityId: "test.read",
                name: "read",
                description: "Read a managed file",
                schema: { type: "object", additionalProperties: false },
                minimumEffects: ["bounded-read"],
                maxResultBytes: 1024,
                classify: () => ({
                  effects: ["bounded-read"],
                  authorizationKeys: [],
                  resourceKeys: [],
                  cost: 1,
                }),
                execute: async () => ({
                  status: "completed",
                  effectCertainty: "not_applicable",
                  value: {},
                }),
              },
            ]
          : [],
    });
  }

  it("generates the title with the configured auxiliary model and records separate title usage", async function () {
    setAuxiliaryDefault(true);
    const calls: (PiSelection | undefined)[] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async (selection) => {
        calls.push(selection);
        return selection?.configurationId === "aux" ? AUX_MODEL : MAIN_MODEL;
      },
      execution: (selection) =>
        createPiTextProviderSource({
          steps: [
            {
              text:
                selection.configurationId === "aux"
                  ? "Generated Title"
                  : "Assistant reply",
            },
          ],
        }),
      definitions: async () => [],
    });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    await (
      await coordinator.send(conversationId, "Explain quantum tunneling")
    ).result;
    await coordinator.waitForTitle(conversationId);
    const view = await coordinator.readModel(conversationId);
    assert.equal(view.title, "Generated Title");
    assert.equal(view.titleSource, "agent");
    assert.isTrue(
      calls.some((selection) => selection?.configurationId === "aux"),
      "title resolves through the auxiliary selection",
    );
    assert.property(view.usage, "main");
    assert.property(view.usage, "title");
    const entries = (
      await inspectPiOwner(
        { kind: "conversation", ownerId: conversationId },
        root,
      )
    ).entries;
    const usage = entries.find((entry) => entry.kind === "title_usage");
    assert.isOk(usage, "title usage is recorded on its own fact");
    const usageRecord = usage!.payload as {
      provider?: string;
      modelId?: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    assert.equal(usageRecord.provider, AUX_MODEL.provider);
    assert.equal(usageRecord.modelId, AUX_MODEL.modelId);
    assert.isNumber(usageRecord.inputTokens);
    assert.isNumber(usageRecord.outputTokens);
    assert.isNumber(usageRecord.totalTokens);
    assert.isTrue(
      entries.some(
        (entry) =>
          entry.kind === "turn_preparation" &&
          (entry.payload as { purpose?: string }).purpose === "title",
      ),
      "auxiliary calls have a durable preparation record",
    );
    await coordinator.dispose();
  });

  const fallbackCases: Array<{ text: string; title: string; why: string }> = [
    {
      text: "Summarize battery chemistry",
      title: "Summarize battery chemistry",
      why: "a plain single line",
    },
    {
      text: "  First line  \nSecond line",
      title: "First line",
      why: "the first non-empty line",
    },
    {
      text: "😀".repeat(60),
      title: "😀".repeat(48),
      why: "48 Unicode characters",
    },
  ];
  for (const item of fallbackCases) {
    it(`uses a deterministic fallback title for ${item.why}`, async function () {
      setAuxiliaryDefault(false);
      const calls: (PiSelection | undefined)[] = [];
      const coordinator = createPiConversationCoordinator({
        root,
        resolveModel: async (selection) => {
          calls.push(selection);
          return MAIN_MODEL;
        },
        execution: (selection) => {
          assert.notEqual(
            selection.configurationId,
            "aux",
            "auxiliary model must not run without a configured auxiliary",
          );
          return createPiTextProviderSource({
            steps: [{ text: "Assistant reply" }],
          });
        },
        definitions: async () => [],
      });
      await coordinator.create();
      const conversationId = coordinator.selectedId!;
      await (
        await coordinator.send(conversationId, item.text)
      ).result;
      await coordinator.waitForTitle(conversationId);
      const view = await coordinator.readModel(conversationId);
      assert.equal(view.title, item.title);
      assert.equal(view.titleSource, "agent");
      assert.isFalse(
        calls.some((selection) => selection?.configurationId === "aux"),
      );
      await coordinator.dispose();
    });
  }

  it("keeps a manual rename made before the first send", async function () {
    setAuxiliaryDefault(true);
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async (selection) =>
        selection?.configurationId === "aux" ? AUX_MODEL : MAIN_MODEL,
      execution: (selection) =>
        createPiTextProviderSource({
          steps: [
            {
              text:
                selection.configurationId === "aux"
                  ? "Generated Title"
                  : "Assistant reply",
            },
          ],
        }),
      definitions: async () => [],
    });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    await coordinator.rename(conversationId, "My Manual Title");
    await (
      await coordinator.send(conversationId, "First message")
    ).result;
    await coordinator.waitForTitle(conversationId);
    const view = await coordinator.readModel(conversationId);
    assert.equal(view.title, "My Manual Title");
    assert.equal(view.titleSource, "user");
    await coordinator.dispose();
  });

  it("rejects a late automatic title after a manual rename", async function () {
    setAuxiliaryDefault(true);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = titleCoordinator({ gate });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    const started = await coordinator.send(conversationId, "First message");
    await started.result;
    await coordinator.rename(conversationId, "Renamed Late");
    release();
    await coordinator.waitForTitle(conversationId);
    const view = await coordinator.readModel(conversationId);
    assert.equal(view.title, "Renamed Late");
    assert.equal(view.titleSource, "user");
    await coordinator.dispose();
  });

  it("writes back a title that settles after archiving to the original owner", async function () {
    setAuxiliaryDefault(true);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = titleCoordinator({ gate });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    const started = await coordinator.send(conversationId, "First message");
    await started.result;
    await coordinator.archive(conversationId);
    release();
    await coordinator.waitForTitle(conversationId);
    const archived = await coordinator.list({ archived: true });
    assert.lengthOf(archived, 1);
    const view = await coordinator.readModel(conversationId);
    assert.equal(view.title, "Generated Title");
    assert.equal(view.titleSource, "agent");
    const entries = (
      await inspectPiOwner(
        { kind: "conversation", ownerId: conversationId },
        root,
      )
    ).entries;
    assert.isOk(
      entries.find((entry) => entry.kind === "title_usage"),
      "archived owners keep title usage accounting",
    );
    await coordinator.dispose();
  });

  it("rejects a late automatic title after permanent deletion", async function () {
    setAuxiliaryDefault(true);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = titleCoordinator({ gate });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    const started = await coordinator.send(conversationId, "First message");
    await started.result;
    await coordinator.archive(conversationId);
    await coordinator.delete(conversationId);
    release();
    await coordinator.waitForTitle(conversationId);
    assert.lengthOf(await coordinator.list({ archived: true }), 0);
    await coordinator.dispose();
  });

  it("bounds the auxiliary title input to 4000 text characters and 256 resource characters", async function () {
    setAuxiliaryDefault(true);
    const file = path.join(root, "resource.bin");
    await fs.writeFile(file, "immutable");
    let captured = "";
    const coordinator = titleCoordinator({
      capture: (context) => {
        captured = context;
      },
      withReadTool: true,
    });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    await coordinator.addFiles(conversationId, [
      { path: file, displayName: "N".repeat(256) + "NAME_TAIL" },
    ]);
    await (
      await coordinator.send(conversationId, "T".repeat(4000) + "TEXT_TAIL")
    ).result;
    await coordinator.waitForTitle(conversationId);
    assert.include(
      captured,
      "T".repeat(64),
      "bounded text reaches the auxiliary call",
    );
    assert.notInclude(captured, "TEXT_TAIL");
    assert.include(
      captured,
      "N".repeat(64),
      "resource text reaches the auxiliary call",
    );
    assert.notInclude(captured, "NAME_TAIL");
    await coordinator.dispose();
  });

  it("applies a settling title only to its originating owner across an owner switch", async function () {
    setAuxiliaryDefault(true);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = titleCoordinator({ gate });
    await coordinator.create();
    const origin = coordinator.selectedId!;
    const started = await coordinator.send(origin, "First message");
    await started.result;
    await coordinator.create();
    const other = coordinator.selectedId!;
    assert.notEqual(other, origin);
    release();
    await coordinator.waitForTitle(origin);
    assert.equal(
      (await coordinator.readModel(origin)).title,
      "Generated Title",
    );
    assert.notEqual(
      (await coordinator.readModel(other)).title,
      "Generated Title",
    );
    await coordinator.dispose();
  });

  it("falls back to the deterministic title when the auxiliary model fails", async function () {
    setAuxiliaryDefault(true);
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async (selection) =>
        selection?.configurationId === "aux" ? AUX_MODEL : MAIN_MODEL,
      execution: (selection) => {
        if (selection.configurationId === "aux")
          throw new Error("aux_provider_unavailable");
        return createPiTextProviderSource({
          steps: [{ text: "Assistant reply" }],
        });
      },
      definitions: async () => [],
    });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    await (
      await coordinator.send(conversationId, "Failure fallback subject")
    ).result;
    await coordinator.waitForTitle(conversationId);
    const view = await coordinator.readModel(conversationId);
    assert.equal(view.title, "Failure fallback subject");
    assert.equal(view.titleSource, "agent");
    const entries = (
      await inspectPiOwner(
        { kind: "conversation", ownerId: conversationId },
        root,
      )
    ).entries;
    const usage = entries.find((entry) => entry.kind === "title_usage");
    assert.equal(
      (usage?.payload as { failure?: string } | undefined)?.failure,
      "title_failed",
    );
    await coordinator.dispose();
  });
});
