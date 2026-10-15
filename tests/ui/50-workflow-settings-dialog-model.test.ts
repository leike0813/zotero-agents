import { assert } from "chai";
import {
  isWorkflowSettingsStructuralRefreshChange,
  normalizeWorkflowSettingsDraftChangeOrigin,
  resolveWorkflowSettingsDialogLayout,
} from "../../src/modules/workflow/settings/workflowSettingsDialogModel";

describe("workflow Host settings dialog model", function () {
  it("preserves editable text controls while keeping choice-driven structural refreshes", function () {
    assert.equal(normalizeWorkflowSettingsDraftChangeOrigin("text"), "text");
    assert.equal(
      normalizeWorkflowSettingsDraftChangeOrigin("unknown"),
      "choice",
    );
    assert.isFalse(
      isWorkflowSettingsStructuralRefreshChange({
        changedSection: "providerOptions",
        changedKey: "model",
        origin: "text",
      }),
    );
    assert.isTrue(
      isWorkflowSettingsStructuralRefreshChange({
        changedSection: "providerOptions",
        changedKey: "model",
        origin: "choice",
      }),
    );
    for (const changedKey of [
      "provider_id",
      "acpModelProvider",
      "acpModelId",
    ]) {
      assert.isTrue(
        isWorkflowSettingsStructuralRefreshChange({
          changedSection: "providerOptions",
          changedKey,
          origin: "choice",
        }),
      );
      assert.isFalse(
        isWorkflowSettingsStructuralRefreshChange({
          changedSection: "providerOptions",
          changedKey,
          origin: "text",
        }),
      );
    }
    assert.isTrue(
      isWorkflowSettingsStructuralRefreshChange({
        changedSection: "backend",
        changedKey: "backendId",
        origin: "choice",
      }),
    );
    assert.isFalse(
      isWorkflowSettingsStructuralRefreshChange({
        changedSection: "providerOptions",
        changedKey: "temperature",
        origin: "choice",
      }),
    );
  });

  it("shows the preview and Host maximum only as one supported multi-unit region", function () {
    const twoUnits = Object.freeze({
      status: "success" as const,
      units: Object.freeze([
        Object.freeze({ unitId: "unit-1", taskName: "First", memberCount: 1 }),
        Object.freeze({ unitId: "unit-2", taskName: "Second", memberCount: 1 }),
      ]),
    });
    const oneUnit = Object.freeze({
      status: "success" as const,
      units: Object.freeze([
        Object.freeze({ unitId: "unit-1", taskName: "Only", memberCount: 3 }),
      ]),
    });

    assert.deepEqual(
      resolveWorkflowSettingsDialogLayout({
        hostQueueSupported: true,
        executionUnitPreview: twoUnits,
      }),
      {
        mode: "multi-unit",
        showExecutionUnitPreview: true,
        showHostMaximumConcurrency: true,
      },
    );
    for (const args of [
      {
        hostQueueSupported: true,
        executionUnitPreview: oneUnit,
      },
      {
        hostQueueSupported: true,
        executionUnitPreview: {
          status: "failure" as const,
          reasonCode: "preview-unavailable",
        },
      },
      {
        hostQueueSupported: false,
        executionUnitPreview: twoUnits,
      },
    ]) {
      assert.deepEqual(resolveWorkflowSettingsDialogLayout(args), {
        mode: "single-region",
        showExecutionUnitPreview: false,
        showHostMaximumConcurrency: false,
      });
    }
  });
});
