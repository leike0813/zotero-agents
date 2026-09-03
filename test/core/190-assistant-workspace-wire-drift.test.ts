import { assert } from "chai";
import { wireFieldRegistry } from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
  ASSISTANT_WORKSPACE_MESSAGE_PREFIX,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
  ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
} from "../../src/shared/assistantWireContract";
import * as assistantWireContract from "../../src/shared/assistantWireContract";
import {
  ASSISTANT_PENDING_INTERACTION_FILE_LIMIT,
  ASSISTANT_PENDING_INTERACTION_OPTION_LIMIT,
  parseAssistantPendingInteraction,
  projectAssistantPendingInteraction,
} from "../../src/shared/assistantInteractionContract";
import {
  ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS as MODULE_FORBIDDEN_WIRE_FIELDS,
  ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS as MODULE_PERMISSION_REQUEST_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS as MODULE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_KINDS,
  ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS as MODULE_PUBLICATION_PAYLOAD_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA as MODULE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS as MODULE_TRANSCRIPT_DELTA_KEYS,
  ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS as MODULE_TRANSCRIPT_SNAPSHOT_KEYS,
  createAssistantWorkspaceUnownedScope,
} from "../../src/modules/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import { resolveAssistantWorkspaceAuditLogLevel } from "../../src/modules/assistantWorkspaceSidebar";
import {
  setDebugModeOverrideForTests,
  setWorkspacePublicationWireAssertOverrideForTests,
} from "../../src/modules/debugMode";
import {
  getProjectRoot,
  joinPath,
  readUtf8,
} from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  return readUtf8(joinPath(getProjectRoot(), relativePath));
}

function assertNoDuplicateKeys(label: string, keys: readonly string[]) {
  assert.deepEqual(
    keys.filter((key, index) => keys.indexOf(key) !== index),
    [],
    `${label}: duplicate wire keys`,
  );
}

describe("assistant wire contract shared registry", function () {
  this.timeout(20_000);

  it("keeps the module-level wire constants re-exported from the shared contract", function () {
    // The module file re-exports the shared bindings, so producer and
    // consumer can never drift apart by construction.
    assert.strictEqual(
      MODULE_PUBLICATION_SCHEMA,
      ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
    );
    assert.strictEqual(
      MODULE_PUBLICATION_ENVELOPE_KEYS,
      ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
    );
    assert.strictEqual(
      MODULE_PUBLICATION_PAYLOAD_KEYS,
      ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
    );
    assert.strictEqual(
      MODULE_TRANSCRIPT_SNAPSHOT_KEYS,
      ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
    );
    assert.strictEqual(
      MODULE_TRANSCRIPT_DELTA_KEYS,
      ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
    );
    assert.strictEqual(
      MODULE_PERMISSION_REQUEST_KEYS,
      ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
    );
    assert.strictEqual(
      MODULE_FORBIDDEN_WIRE_FIELDS,
      ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
    );
  });

  it("classifies Assistant Workspace audit levels from the shared action vocabulary", function () {
    const cases = [
      {
        tab: "shell" as const,
        action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
        result: "ok" as const,
        expected: null,
      },
      {
        tab: "shell" as const,
        action: ASSISTANT_WORKSPACE_SHELL_ACTIONS.READY,
        result: "ok" as const,
        expected: "info",
      },
      ...Object.values(ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS)
        .filter(
          (action) =>
            action !== ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY,
        )
        .map((action) => ({
          tab: "acp-chat" as const,
          action,
          result: "ok" as const,
          expected: null,
        })),
      {
        tab: "acp-skills" as const,
        action: ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY,
        result: "ok" as const,
        expected: "info",
      },
      {
        tab: "skillrunner" as const,
        action: ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.LOAD_TRANSCRIPT_PAGE,
        result: "error" as const,
        expected: "warn",
      },
    ];

    for (const testCase of cases) {
      assert.equal(
        resolveAssistantWorkspaceAuditLogLevel(testCase),
        testCase.expected,
        `${testCase.tab}/${testCase.action}/${testCase.result}`,
      );
    }
  });

  it("covers every publication kind exactly once", function () {
    const payloadKinds = Object.keys(
      ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
    ).sort();
    const expectedKinds = ASSISTANT_WORKSPACE_PUBLICATION_KINDS.filter(
      (kind) => kind !== "transcript",
    ).sort();
    assert.deepEqual(
      payloadKinds,
      expectedKinds,
      "payload key map must cover every non-transcript publication kind",
    );
    for (const [kind, keys] of Object.entries(
      ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
    )) {
      assertNoDuplicateKeys(`payload:${kind}`, keys);
    }
  });

  it("keeps wire key lists free of duplicates and forbidden intersections", function () {
    assertNoDuplicateKeys(
      "envelope",
      ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
    );
    assertNoDuplicateKeys(
      "transcript-snapshot",
      ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
    );
    assertNoDuplicateKeys(
      "transcript-delta",
      ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
    );
    assertNoDuplicateKeys(
      "permission-request",
      ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
    );
    for (const key of ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS) {
      assert.isFalse(
        ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS.has(key),
        `forbidden wire field must not overlap the envelope key: ${key}`,
      );
    }
  });

  it("exposes the shared wire registry to the ACP child page bundle", function () {
    const registry = wireFieldRegistry;
    assert.ok(registry, "acp child must re-export the wire field registry");
    assert.strictEqual(
      registry.envelopeKeys,
      ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
    );
    assert.strictEqual(
      registry.payloadKeysByKind,
      ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
    );
    assert.strictEqual(
      registry.transcriptSnapshotKeys,
      ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
    );
    assert.strictEqual(
      registry.transcriptDeltaKeys,
      ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
    );
    assert.strictEqual(
      registry.permissionRequestKeys,
      ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
    );
    assert.strictEqual(
      registry.forbiddenWireFields,
      ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
    );
  });

  it("keeps message type, bridge key, and action vocabularies coherent", function () {
    for (const type of Object.values(ASSISTANT_WORKSPACE_MESSAGE_TYPES)) {
      assert.isTrue(
        type.startsWith(ASSISTANT_WORKSPACE_MESSAGE_PREFIX),
        `message type must carry the assistant-workspace prefix: ${type}`,
      );
    }
    assert.notProperty(ASSISTANT_WORKSPACE_MESSAGE_TYPES, "CHILD_SNAPSHOT");
    assert.equal(
      ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
      "__zsAssistantWorkspaceBridge",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
      "__zsAssistantWorkspaceAcpBridge",
    );
    assert.equal(ASSISTANT_WORKSPACE_SHELL_ACTIONS.READY, "ready");
    assert.equal(ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB, "set-tab");
    assert.equal(
      ASSISTANT_WORKSPACE_SHELL_ACTIONS.CLOSE_SIDEBAR,
      "close-sidebar",
    );
    assert.equal(ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY, "ready");
    assert.equal(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_ACK,
      "publication-ack",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_RENDER_OBSERVATION,
      "publication-render-observation",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.LOAD_TRANSCRIPT_PAGE,
      "load-transcript-page",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.REQUEST_OWNER_DETAILS,
      "request-owner-details",
    );
    assert.notProperty(assistantWireContract, "SKILLRUNNER_LEGACY_ACTIONS");
    assert.notProperty(
      assistantWireContract,
      "SKILLRUNNER_LEGACY_ACTION_ALIASES",
    );
  });

  it("bounds and validates the shared pending-interaction DTO", function () {
    const optionValue = { approved: true, mode: "deep" };
    const interaction = projectAssistantPendingInteraction({
      inputKind: "choose_one",
      prompt: "Choose a mode",
      hint: "The value remains typed",
      options: [
        {
          label: "Deep review",
          description: "Run every check",
          value: optionValue,
        },
        { label: "Skip", value: false },
      ],
      files: [],
      fileReply: {
        supported: false,
        maxFiles: 8,
        maxFileBytes: 32 * 1024 * 1024,
        maxTotalBytes: 64 * 1024 * 1024,
      },
    });

    assert.isOk(interaction);
    assert.deepEqual(interaction?.options[0].value, optionValue);
    assert.strictEqual(interaction?.options[1].value, false);
    assert.deepEqual(
      parseAssistantPendingInteraction(interaction),
      interaction,
    );
    // Non-auth projections carry a null auth block; the exact wire parse
    // accepts both the auth-less legacy shape and the auth-carrying one.
    assert.isNull(interaction?.auth);
    const legacyShape: Record<string, unknown> = { ...interaction! };
    delete legacyShape.auth;
    assert.isOk(parseAssistantPendingInteraction(legacyShape));

    const authed = projectAssistantPendingInteraction({
      inputKind: "open_text",
      prompt: null,
      hint: null,
      options: [],
      files: [],
      fileReply: {
        supported: false,
        maxFiles: 8,
        maxFileBytes: 32 * 1024 * 1024,
        maxTotalBytes: 64 * 1024 * 1024,
      },
      auth: {
        phase: "challenge_active",
        challengeKind: "auth_code_or_url",
        prompt: "Authorize the backend",
        hint: null,
        inputKind: "auth_code",
        acceptsChatInput: true,
        authUrl: "https://example.com/auth",
        userCode: "UC-1",
        lastError: null,
        actionPending: false,
        actionKind: null,
        methods: [
          { label: "Device code", value: "auth_code", description: null },
        ],
        importFiles: [
          { name: "token.json", required: true, hint: null, accept: ".json" },
        ],
        importRiskNoticeRequired: false,
      },
    });
    assert.isOk(authed);
    assert.deepEqual(
      parseAssistantPendingInteraction(authed),
      authed,
      "auth-carrying DTO round-trips through the exact wire parse",
    );
    assert.isNull(
      parseAssistantPendingInteraction({
        ...authed,
        auth: { ...authed!.auth, unknownField: true },
      }),
      "auth block is exact-key validated on the wire",
    );
    assert.isNull(
      projectAssistantPendingInteraction({
        ...authed,
        auth: { ...authed!.auth, acceptsChatInput: "yes" },
      }),
      "auth booleans stay typed",
    );
    assert.isNull(
      parseAssistantPendingInteraction({
        ...interaction,
        interactionToken: "removed-field",
      }),
    );
    assert.isNull(
      projectAssistantPendingInteraction({
        inputKind: "choose_one",
        options: Array.from(
          { length: ASSISTANT_PENDING_INTERACTION_OPTION_LIMIT + 1 },
          (_, index) => ({ label: String(index), value: index }),
        ),
      }),
    );
    assert.isNull(
      projectAssistantPendingInteraction({
        inputKind: "upload_files",
        files: Array.from(
          { length: ASSISTANT_PENDING_INTERACTION_FILE_LIMIT + 1 },
          (_, index) => ({ name: `slot-${index}`, required: false }),
        ),
      }),
    );
  });

  it("keeps hardcoded assistant-workspace message literals out of both bridge sides", async function () {
    // Regression guard: message envelope types must be referenced through the
    // shared contract, never re-hardcoded. Import specifiers and comments are
    // allowed; quoted message literals are not.
    const sidebarSources = [
      "src/sidebar/acpChildApp.js",
      "src/sidebar/assistantPanelModel.js",
      "src/sidebar/assistantPanelRenderer.js",
      "src/sidebar/assistantTranscriptRenderer.js",
      "src/sidebar/assistantWorkspaceAcpChild.js",
      "src/sidebar/assistantWorkspaceApp.js",
      "src/sidebar/assistantWorkspaceShell.js",
    ];
    const moduleSources = [
      "src/modules/assistantWorkspaceSidebar.ts",
      "src/modules/skillRunnerRunDialog.ts",
    ];
    for (const relativePath of [...sidebarSources, ...moduleSources]) {
      const source = await readProjectFile(relativePath);
      assert.notMatch(
        source,
        /["'`]assistant-workspace:[a-z-]+["'`]/,
        `${relativePath} must reference assistant-workspace message types via src/shared/assistantWireContract`,
      );
      assert.notMatch(
        source,
        /["'`]assistant-panel:[a-z-]+["'`]/,
        `${relativePath} must not use the retired assistant-panel: message prefix`,
      );
    }
  });
});

describe("workspace publication producer self-check", function () {
  this.timeout(20_000);

  afterEach(function () {
    setWorkspacePublicationWireAssertOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
  });

  function createCapturingCoordinator(captured: unknown[]) {
    return new AssistantWorkspacePublicationCoordinator({
      scopeKey: "wire-assert-test",
      getActiveOwner: () => null,
      post: (publication) => {
        captured.push(publication);
        return true;
      },
    });
  }

  function publishServiceStatus(
    coordinator: AssistantWorkspacePublicationCoordinator,
    payload: unknown,
  ) {
    coordinator.publishRegion({
      owner: createAssistantWorkspaceUnownedScope("acp-skills"),
      publicationKind: "service-status",
      cause: "initialization",
      payload: payload as never,
    });
  }

  it("passes valid publications when the wire assert is enabled", function () {
    setDebugModeOverrideForTests(true);
    setWorkspacePublicationWireAssertOverrideForTests(true);
    const captured: unknown[] = [];
    publishServiceStatus(createCapturingCoordinator(captured), { items: [] });
    assert.lengthOf(captured, 1);
  });

  it("throws on malformed publications when the wire assert is enabled", function () {
    setDebugModeOverrideForTests(true);
    setWorkspacePublicationWireAssertOverrideForTests(true);
    const coordinator = createCapturingCoordinator([]);
    assert.throws(
      () => publishServiceStatus(coordinator, { items: [], bogus: true }),
      /service-status/,
    );
  });

  it("does not assert when the wire assert is disabled", function () {
    setDebugModeOverrideForTests(true);
    setWorkspacePublicationWireAssertOverrideForTests(false);
    const captured: unknown[] = [];
    publishServiceStatus(createCapturingCoordinator(captured), {
      items: [],
      bogus: true,
    });
    assert.lengthOf(captured, 1);
  });

  it("does not assert outside debug mode", function () {
    setDebugModeOverrideForTests(false);
    setWorkspacePublicationWireAssertOverrideForTests(true);
    const captured: unknown[] = [];
    publishServiceStatus(createCapturingCoordinator(captured), {
      items: [],
      bogus: true,
    });
    assert.lengthOf(captured, 1);
  });
});
