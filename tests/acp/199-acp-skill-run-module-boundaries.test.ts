import { assert } from "chai";
import {
  archiveAcpSkillRun,
  cancelAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunActions";
import {
  hasAcpSkillRunController,
  registerAcpSkillRunController,
} from "../../src/modules/acp/skillRun/acpSkillRunControllerRegistry";
import { resolveAcpSkillRunPermissionRequest } from "../../src/modules/acp/skillRun/acpSkillRunPermissionQueue";
import {
  getHostBridgePermissionProjection,
  requestHostBridgePermission,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridge/permissions/hostBridgePermissionManager";
import {
  getAcpSkillRunRuntimeCatalog,
  setAcpSkillRunRuntimeCatalog,
} from "../../src/modules/acp/skillRun/acpSkillRunRuntimeCatalog";
import {
  isActiveAcpSkillRunStatus,
  isTerminalAcpSkillRunStatus,
} from "../../src/modules/acp/skillRun/acpSkillRunStatus";
import {
  getSelectedAcpSkillRunRequestId,
  selectAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunWorkspaceSelection";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunStore";

describe("ACP skill run module boundaries", function () {
  beforeEach(function () {
    resetAcpSkillRunsForTests();
    resetHostBridgePermissionManagerForTests();
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

  it("settles Host approval through the owning run permission queue", async function () {
    upsertAcpSkillRun({
      requestId: "request-permission",
      status: "running",
      backendId: "acp",
      backendType: "acp",
    });
    const approval = requestHostBridgePermission({
      action: "literature.ingest",
      title: "Write",
      source: "host-bridge-cli",
      summary: "Write an item",
      scope: { kind: "acp-skill-run", requestId: "request-permission" },
      timeoutMs: 500,
    });
    for (let attempt = 0; attempt < 50; attempt++) {
      if (getAcpSkillRunRecord("request-permission")?.pendingPermission) break;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const permissionId =
      getAcpSkillRunRecord("request-permission")?.pendingPermission?.requestId;
    assert.isString(permissionId);
    assert.equal(
      getHostBridgePermissionProjection(permissionId!)?.state,
      "pending",
    );
    resolveAcpSkillRunPermissionRequest({
      runRequestId: "request-permission",
      permissionRequestId: permissionId,
      outcome: "selected",
      optionId: "approve_once",
    });
    assert.equal((await approval).outcome, "approved");
    assert.equal(
      getHostBridgePermissionProjection(permissionId!)?.state,
      "approved",
    );
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
