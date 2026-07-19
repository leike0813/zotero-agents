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
  RUN_DIALOG_BRIDGE_TYPES,
  RUN_DIALOG_PHASES,
  SKILLRUNNER_LEGACY_ACTIONS,
  SKILLRUNNER_LEGACY_ACTION_ALIASES,
  SKILLRUNNER_SIDEBAR_BRIDGE_KEY,
  resolveRunDialogMessageType,
} from "../../src/shared/assistantWireContract";
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
    assert.equal(
      ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
      "__zsAssistantWorkspaceBridge",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
      "__zsAssistantWorkspaceAcpBridge",
    );
    assert.equal(
      SKILLRUNNER_SIDEBAR_BRIDGE_KEY,
      "__zsSkillRunnerSidebarBridge",
    );
    assert.deepEqual(
      [...RUN_DIALOG_BRIDGE_TYPES],
      ["run-dialog", "skillrunner-sidebar"],
    );
    assert.deepEqual([...RUN_DIALOG_PHASES], ["init", "snapshot", "action"]);
    assert.equal(
      resolveRunDialogMessageType("skillrunner-sidebar", "snapshot"),
      "skillrunner-sidebar:snapshot",
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
    assert.equal(SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN, "reply-run");
    assert.equal(SKILLRUNNER_LEGACY_ACTIONS.CANCEL_RUN, "cancel-run");
    assert.equal(
      SKILLRUNNER_LEGACY_ACTION_ALIASES.reply,
      SKILLRUNNER_LEGACY_ACTIONS.REPLY_RUN,
    );
    assert.equal(
      SKILLRUNNER_LEGACY_ACTION_ALIASES.cancel,
      SKILLRUNNER_LEGACY_ACTIONS.CANCEL_RUN,
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
      "src/sidebar/chatThinkingCore.js",
      "src/sidebar/runDialog.js",
      "src/sidebar/runDialogApp.js",
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
