import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { JobQueueManager } from "../../src/jobQueue/manager";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { isFullTestMode } from "./testMode";
import {
  fixturePath,
  isZoteroRuntime,
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

const describeJobQueueTransportSuite =
  isZoteroRuntime() || isFullTestMode() ? describe : describe.skip;

describeJobQueueTransportSuite("job-queue: transport integration", function () {
  this.timeout(20000);

  it("runs one job per valid input request with backend dispatch concurrency controlled by the queue config", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
    try {
      const parentA = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Queue Parent A" },
      });
      const parentB = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Queue Parent B" },
      });
      const mdFile = fixturePath("literature-analysis", "example.md");
      const attachmentA = await handlers.attachment.createFromPath({
        parent: parentA,
        path: mdFile,
        title: "a.md",
        mimeType: "text/markdown",
      });
      const attachmentB = await handlers.attachment.createFromPath({
        parent: parentB,
        path: mdFile,
        title: "b.md",
        mimeType: "text/markdown",
      });

      const selectionContext = await buildSelectionContext([attachmentA, attachmentB]);
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "workflow literature-analysis not found");
      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext,
      })) as unknown[];
      assert.lengthOf(requests, 2);

      const adjustedRequests = requests.map((request) => {
        const typed = request as {
          poll?: { interval_ms?: number; timeout_ms?: number };
        };
        typed.poll = {
          interval_ms: 40,
          timeout_ms: 5000,
        };
        return typed;
      });

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const queue = new JobQueueManager({
        concurrency: adjustedRequests.length,
        executeJob: async (job) =>
          provider.execute({
            requestKind: workflow!.manifest.request!.kind,
            request: job.request,
          }),
      });

      const jobIds = adjustedRequests.map((request) =>
        queue.enqueue({
          workflowId: workflow!.manifest.id,
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
