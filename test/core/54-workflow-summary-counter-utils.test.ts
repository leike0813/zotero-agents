import { assert } from "chai";
import {
  expectWorkflowSummaryCounter,
  hasWorkflowSummaryCounter,
} from "./workflow-test-utils";

describe("workflow summary counter utils", function () {
  it("matches canonical english summary labels", function () {
    const message =
      "Workflow Literature Digest finished. succeeded=1, failed=0, skipped=2";
    assert.isTrue(hasWorkflowSummaryCounter(message, "succeeded", 1));
    assert.isTrue(hasWorkflowSummaryCounter(message, "failed", 0));
    assert.isTrue(hasWorkflowSummaryCounter(message, "skipped", 2));
  });

  it("matches localized chinese summary labels with canonical keys", function () {
    const message =
      "\u5de5\u4f5c\u6d41 \u6587\u732e\u89e3\u6790 \u6267\u884c\u5b8c\u6210\u3002\u6210\u529f=1\uff0c\u5931\u8d25=0\uff0c\u8df3\u8fc7=2";
    assert.isTrue(hasWorkflowSummaryCounter(message, "succeeded", 1));
    assert.isTrue(hasWorkflowSummaryCounter(message, "failed", 0));
    assert.isTrue(hasWorkflowSummaryCounter(message, "skipped", 2));
  });

  it("throws with expected key/value and raw summary when required counter is missing", function () {
    const message =
      "Workflow Literature Digest finished. succeeded=0, failed=1";
    let thrown: unknown = null;
    try {
      expectWorkflowSummaryCounter(message, "succeeded", 1);
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown, "expected missing summary counter assertion to throw");
    const text = String(thrown || "");
    assert.include(text, "expected workflow summary to include succeeded=1");
    assert.include(text, message);
  });
});
