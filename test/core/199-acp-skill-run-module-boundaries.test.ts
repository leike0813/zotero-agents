import { assert } from "chai";
import {
  archiveAcpSkillRun,
  cancelAcpSkillRun,
} from "../../src/modules/acpSkillRunActions";
import {
  hasAcpSkillRunController,
  registerAcpSkillRunController,
} from "../../src/modules/acpSkillRunControllerRegistry";
import {
  resolveAcpSkillRunPermissionRequest,
  setAcpSkillRunPermissionRequest,
} from "../../src/modules/acpSkillRunPermissionQueue";
import {
  getAcpSkillRunRuntimeCatalog,
  setAcpSkillRunRuntimeCatalog,
} from "../../src/modules/acpSkillRunRuntimeCatalog";
import {
  isActiveAcpSkillRunStatus,
  isTerminalAcpSkillRunStatus,
} from "../../src/modules/acpSkillRunStatus";
import {
  getSelectedAcpSkillRunRequestId,
  selectAcpSkillRun,
} from "../../src/modules/acpSkillRunWorkspaceSelection";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";

describe("ACP skill run module boundaries", function () {
  beforeEach(function () {
    resetAcpSkillRunsForTests();
  });

  it("keeps status predicates pure and store-backed", function () {
    assert.isFalse(isTerminalAcpSkillRunStatus("running"));
    assert.isTrue(isActiveAcpSkillRunStatus("running"));
  });

  it("owns controller registry through the focused module", function () {
    const controller = { cancel: async () => undefined };
    registerAcpSkillRunController("request-controller", controller);
    assert.isTrue(hasAcpSkillRunController("request-controller"));
    registerAcpSkillRunController("request-controller", null);
    assert.isFalse(hasAcpSkillRunController("request-controller"));
  });

  it("owns permission queue through the focused module", function () {
    upsertAcpSkillRun({
      requestId: "request-permission",
      status: "running",
      backendId: "acp",
      backendType: "acp",
    });
    setAcpSkillRunPermissionRequest("request-permission", {
      requestId: "permission-1",
      sessionId: "session-1",
      toolCallId: "permission-1",
      toolTitle: "Write",
      approvalKind: "zotero-write",
      source: "zotero-mcp-write",
      summary: "Write an item",
      options: [{ optionId: "approve", name: "Approve" }],
      resolve: () => undefined,
    });
    assert.equal(
      getAcpSkillRunRecord("request-permission")?.pendingPermission?.requestId,
      "permission-1",
    );
    resolveAcpSkillRunPermissionRequest({
      runRequestId: "request-permission",
      outcome: "cancelled",
    });
    assert.isNull(
      getAcpSkillRunRecord("request-permission")?.pendingPermission,
    );
  });

  it("owns runtime catalog through the focused module", function () {
    upsertAcpSkillRun({
      requestId: "request-catalog",
      status: "running",
      backendId: "acp",
      backendType: "acp",
    });
    setAcpSkillRunRuntimeCatalog("request-catalog", {
      modeOptions: [{ id: "mode-1", label: "Mode 1" }],
      modelOptions: [],
      reasoningEffortOptions: [],
    });
    assert.equal(
      getAcpSkillRunRuntimeCatalog("request-catalog")?.modeOptions[0]?.id,
      "mode-1",
    );
  });

  it("owns workspace selection through the focused module", async function () {
    upsertAcpSkillRun({
      requestId: "request-selected",
      status: "succeeded",
      statusReason: "validation_succeeded",
      backendId: "acp",
      backendType: "acp",
      conversationState: "ended",
    });
    await selectAcpSkillRun("request-selected");
    assert.equal(getSelectedAcpSkillRunRequestId(), "request-selected");
  });

  it("routes archive through the actions module", function () {
    upsertAcpSkillRun({
      requestId: "request-archive",
      status: "succeeded",
      statusReason: "validation_succeeded",
      backendId: "acp",
      backendType: "acp",
      conversationState: "ended",
    });
    archiveAcpSkillRun("request-archive");
    assert.isOk(getAcpSkillRunRecord("request-archive")?.archivedAt);
  });
});
