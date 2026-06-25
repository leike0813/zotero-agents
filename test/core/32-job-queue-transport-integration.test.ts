import { assert } from "chai";
import { JobQueueManager } from "../../src/jobQueue/manager";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";
import { isFullTestMode } from "./testMode";
import { fixturePath, isZoteroRuntime } from "./workflow-test-utils";

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

function makeLiteratureAnalysisJobRequest(label: string) {
  return {
    kind: "skillrunner.job.v1",
    skill_id: "literature-analysis",
    skill_source: "installed",
    input: {
      source_path: `inputs/source_path/${label}.md`,
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
  };
}

const describeJobQueueTransportSuite =
  isZoteroRuntime() || isFullTestMode() ? describe : describe.skip;

describeJobQueueTransportSuite("job-queue: transport integration", function () {
  this.timeout(20000);

  it("runs one job per valid input request with backend dispatch concurrency controlled by the queue config", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const adjustedRequests = [
        makeLiteratureAnalysisJobRequest("a"),
        makeLiteratureAnalysisJobRequest("b"),
      ];

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const queue = new JobQueueManager({
        concurrency: adjustedRequests.length,
        executeJob: async (job) =>
          provider.execute({
            requestKind: "skillrunner.job.v1",
            request: job.request,
          }),
      });

      const jobIds = adjustedRequests.map((request) =>
        queue.enqueue({
          workflowId: "literature-analysis",
          request,
          meta: {},
        }),
      );

      await queue.waitForIdle();
      for (const jobId of jobIds) {
        const job = queue.getJob(jobId);
        assert.isOk(job);
        assert.equal(job!.state, "succeeded");
        assert.equal(job!.workflowId, "literature-analysis");
      }

      const allJobs = queue.listJobs();
      assert.lengthOf(allJobs, 2);
      assert.deepEqual(
        allJobs.map((job) => job.state),
        ["succeeded", "succeeded"],
      );
    } catch (error) {
      console.error(
        `[job-queue: transport integration] FIFO test failed\n${formatError(error)}`,
      );
      throw error;
    }
  });
});
