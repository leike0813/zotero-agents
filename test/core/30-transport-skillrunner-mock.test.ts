import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { isFullTestMode } from "./testMode";
import {
  fixturePath,
  workflowsPath,
} from "./workflow-test-utils";

const MOCK_SKILLRUNNER_BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.ZOTERO_TEST_SKILLRUNNER_ENDPOINT) ||
  "http://127.0.0.1:8030";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function isMockSkillRunnerReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${baseUrl}/v1/jobs`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

describe("transport: skillrunner mock", function () {
  this.timeout(15000);
  const itFullOnly = isFullTestMode() ? it : it.skip;

  it("executes literature-analysis request against mock skill-runner", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Transport Parent" },
      });
      const mdFile = fixturePath("literature-analysis", "example.md");
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: mdFile,
        title: "example.md",
        mimeType: "text/markdown",
      });
      const selectionContext = await buildSelectionContext([attachment]);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "workflow literature-analysis not found");
      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext,
      })) as unknown[];
      assert.lengthOf(requests, 1);

      const request = requests[0] as {
        poll?: { interval_ms?: number; timeout_ms?: number };
      };
      request.poll = {
        interval_ms: 40,
        timeout_ms: 5000,
      };

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const result = await provider.execute({
        requestKind: workflow!.manifest.request!.kind,
        request,
      });

      assert.equal(result.status, "succeeded");
      assert.instanceOf(result.bundleBytes, Uint8Array);
      assert.isAbove(result.bundleBytes.length, 0);
      assert.isString(result.requestId);
    } catch (error) {
      console.error(
        `[transport: skillrunner mock] executes literature-analysis request failed\n${formatError(error)}`,
      );
      throw error;
    }
  });

  it("fails fast when mock poll reaches canceled terminal status", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Transport Canceled Parent" },
      });
      const mdFile = fixturePath("literature-analysis", "example.md");
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: mdFile,
        title: "example.md",
        mimeType: "text/markdown",
      });
      const selectionContext = await buildSelectionContext([attachment]);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "workflow literature-analysis not found");
      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext,
      })) as Array<{
        poll?: { interval_ms?: number; timeout_ms?: number };
        parameter?: Record<string, unknown>;
      }>;
      assert.lengthOf(requests, 1);

      const request = requests[0];
      request.poll = {
        interval_ms: 40,
        timeout_ms: 5000,
      };
      request.parameter = {
        ...(request.parameter || {}),
        __mock_final_status: "canceled",
      };

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });

      let thrown: unknown = null;
      try {
        await provider.execute({
          requestKind: workflow!.manifest.request!.kind,
          request,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown);
      assert.match(String(thrown), /terminal failure/i);
      assert.match(String(thrown), /status=canceled/i);
    } catch (error) {
      console.error(
        `[transport: skillrunner mock] canceled terminal test failed\n${formatError(error)}`,
      );
      throw error;
    }
  });

  itFullOnly("supports result fetch step without requiring bundle download", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Transport Result Parent" },
      });
      const mdFile = fixturePath("literature-analysis", "example.md");
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: mdFile,
        title: "example.md",
        mimeType: "text/markdown",
      });
      const selectionContext = await buildSelectionContext([attachment]);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "workflow literature-analysis not found");
      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext,
      })) as unknown[];
      assert.lengthOf(requests, 1);

      const request = requests[0] as {
        poll?: { interval_ms?: number; timeout_ms?: number };
        fetch_type?: "bundle" | "result";
      };
      request.poll = {
        interval_ms: 40,
        timeout_ms: 5000,
      };
      request.fetch_type = "result";

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const result = await provider.execute({
        requestKind: workflow!.manifest.request!.kind,
        request,
      });

      assert.equal(result.status, "succeeded");
      assert.isUndefined(result.bundleBytes);
      const resultEnvelope = result.resultJson as {
        request_id?: string;
        result?: {
          status?: string;
          data?: {
            digest_path?: string;
            references_path?: string;
            citation_analysis_path?: string;
          };
        };
      };
      assert.equal(resultEnvelope.request_id, result.requestId);
      assert.equal(resultEnvelope.result?.status, "success");
      assert.match(
        String(resultEnvelope.result?.data?.digest_path || ""),
        /digest\.md$/,
      );
      assert.match(
        String(resultEnvelope.result?.data?.references_path || ""),
        /references\.json$/,
      );
      assert.match(
        String(resultEnvelope.result?.data?.citation_analysis_path || ""),
        /citation_analysis\.json$/,
      );
    } catch (error) {
      console.error(
        `[transport: skillrunner mock] supports result fetch step failed\n${formatError(error)}`,
      );
      throw error;
    }
  });
});
