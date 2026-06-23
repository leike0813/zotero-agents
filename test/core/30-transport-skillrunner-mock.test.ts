import { assert } from "chai";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";
import { isFullTestMode } from "./testMode";
import { fixturePath } from "./workflow-test-utils";

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

function makeLiteratureAnalysisJobRequest(overrides: Record<string, unknown> = {}) {
  return {
    kind: "skillrunner.job.v1",
    skill_id: "literature-analysis",
    skill_source: "installed",
    input: {
      source_path: "inputs/source_path/example.md",
    },
    upload_files: [
      {
        key: "source_path",
        path: fixturePath("literature-analysis", "example.md"),
      },
    ],
    poll: {
      interval_ms: 40,
      timeout_ms: 5000,
    },
    fetch_type: "bundle",
    ...overrides,
  };
}

describe("transport: skillrunner mock", function () {
  this.timeout(15000);
  const itFullOnly = isFullTestMode() ? it : it.skip;

  it("executes literature-analysis request against mock skill-runner", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const request = makeLiteratureAnalysisJobRequest();

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const result = await provider.execute({
        requestKind: "skillrunner.job.v1",
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
      const request = makeLiteratureAnalysisJobRequest({
        parameter: {
          __mock_final_status: "canceled",
        },
      });

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });

      const result = await provider.execute({
        requestKind: "skillrunner.job.v1",
        request,
      });

      assert.equal(result.status, "canceled");
      assert.isString(result.requestId);
      assert.match(String(result.error), /mock terminal canceled/i);
      assert.isUndefined(result.bundleBytes);
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
      const request = makeLiteratureAnalysisJobRequest({
        fetch_type: "result",
      });

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const result = await provider.execute({
        requestKind: "skillrunner.job.v1",
        request,
      });

      assert.equal(result.status, "succeeded");
      assert.isUndefined(result.bundleBytes);
      const resultPayload = result.resultJson as {
        digest_path?: string;
        references_path?: string;
        citation_analysis_path?: string;
      };
      assert.match(String(resultPayload.digest_path || ""), /digest\.md$/);
      assert.match(
        String(resultPayload.references_path || ""),
        /references\.json$/,
      );
      assert.match(
        String(resultPayload.citation_analysis_path || ""),
        /citation_analysis\.json$/,
      );
      const response = result.responseJson as {
        resultResponseJson?: { request_id?: string; result?: { status?: string } };
      };
      assert.equal(response.resultResponseJson?.request_id, result.requestId);
      assert.equal(response.resultResponseJson?.result?.status, "success");
    } catch (error) {
      console.error(
        `[transport: skillrunner mock] supports result fetch step failed\n${formatError(error)}`,
      );
      throw error;
    }
  });
});
