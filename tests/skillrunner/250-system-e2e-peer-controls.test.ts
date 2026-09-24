import { assert } from "chai";
import {
  literatureDigestBundlePath,
  startMockSkillRunnerServer,
} from "../mock-skillrunner/server";

const bundlePath = literatureDigestBundlePath(process.cwd());

describe("System E2E SkillRunner peer controls", function () {
  this.timeout(5_000);

  it("delays a handshake while another request completes", async function () {
    const peer = await startMockSkillRunnerServer({
      bundlePath,
      handshakeDelayMs: 150,
    });
    try {
      let handshakeDone = false;
      const handshake = fetch(`${peer.baseUrl}/v1/system/handshake`, {
        method: "POST",
      }).then((response) => {
        handshakeDone = true;
        return response;
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const ping = await fetch(`${peer.baseUrl}/v1/system/ping`);
      assert.equal(ping.status, 200);
      assert.isFalse(handshakeDone);
      assert.equal((await handshake).status, 200);
    } finally {
      await peer.close();
    }
  });

  it("enables handshake delay for one serial E2E family", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const configured = await fetch(`${peer.baseUrl}/__test/handshake-delay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delayMs: 150 }),
      });
      assert.equal(configured.status, 200);
      let complete = false;
      const handshake = fetch(`${peer.baseUrl}/v1/system/handshake`, {
        method: "POST",
      }).then((response) => {
        complete = true;
        return response;
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.equal((await fetch(`${peer.baseUrl}/v1/system/ping`)).status, 200);
      assert.isFalse(complete);
      assert.equal((await handshake).status, 200);
    } finally {
      await peer.close();
    }
  });

  it("restarts on the same port with an empty request table", async function () {
    let peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const firstUrl = peer.baseUrl;
      const firstTable = await fetch(`${firstUrl}/__test/jobs`, {
        method: "POST",
      });
      const firstInstanceId = (await firstTable.json()).instanceId;
      const created = await fetch(`${firstUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "tag-bootstrapper",
          engine: "mock",
          input: { existing_tags: [], protocol: {} },
          parameter: {},
        }),
      });
      assert.equal(created.status, 200);
      const requestId = (await created.json()).request_id;
      assert.lengthOf(peer.getJobs(), 1);
      const port = Number(new URL(firstUrl).port);
      await peer.close();
      peer = await startMockSkillRunnerServer({ bundlePath, port });
      assert.equal(peer.baseUrl, firstUrl);
      assert.isEmpty(peer.getJobs());
      const table = await fetch(`${peer.baseUrl}/__test/jobs`, {
        method: "POST",
      });
      const restartedTable = await table.json();
      assert.isNotEmpty(restartedTable.instanceId);
      assert.notEqual(restartedTable.instanceId, firstInstanceId);
      assert.deepEqual(restartedTable.requestIds, []);
      assert.equal(
        (await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`)).status,
        404,
      );
      const recreated = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "tag-bootstrapper",
          engine: "mock",
          input: { existing_tags: [], protocol: {} },
          parameter: {},
        }),
      });
      assert.notEqual((await recreated.json()).request_id, requestId);
    } finally {
      await peer.close();
    }
  });

  it("returns a debug result derived from the submitted request", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const created = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "debug-apply-result-probe",
          engine: "mock",
          input: {},
          parameter: {
            workflow_id: "debug-apply-single-result",
            step_id: "result",
            run_key: "sr-01",
            apply_mode: "result",
          },
        }),
      });
      assert.equal(created.status, 200);
      const requestId = (await created.json()).request_id;
      const response = await fetch(
        `${peer.baseUrl}/v1/jobs/${requestId}/result`,
      );
      assert.equal(response.status, 200);
      assert.deepInclude((await response.json()).result, {
        kind: "debug_apply_contract_result",
        workflow_id: "debug-apply-single-result",
        step_id: "result",
        run_key: "sr-01",
        apply_mode: "result",
      });
    } finally {
      await peer.close();
    }
  });

  it("publishes one completed assistant chat boundary for a submitted request", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const created = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "debug-apply-result-probe",
          engine: "mock",
          input: {},
          parameter: {},
        }),
      });
      const requestId = (await created.json()).request_id;
      const upload = new FormData();
      upload.set("file", new Blob(["fixture"]), "fixture.txt");
      assert.equal(
        (
          await fetch(`${peer.baseUrl}/v1/jobs/${requestId}/upload`, {
            method: "POST",
            body: upload,
          })
        ).status,
        200,
      );
      await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`);
      await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`);
      const response = await fetch(
        `${peer.baseUrl}/v1/jobs/${requestId}/chat/history?from_seq=0`,
      );
      assert.equal(response.status, 200);
      const history = await response.json();
      assert.equal(history.request_id, requestId);
      assert.deepInclude(history.events.at(-1), {
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
      });
      assert.isNotEmpty(history.events.at(-1).text);
    } finally {
      await peer.close();
    }
  });

  it("accepts a temporary Skill package and returns the debug result", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const created = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_source: "temp_upload",
          engine: "mock",
          parameter: {
            workflow_id: "debug-apply-single-result",
            step_id: "result",
            run_key: "sr-01-upload",
            apply_mode: "result",
          },
        }),
      });
      assert.equal(created.status, 200);
      const requestId = (await created.json()).request_id;
      const body = new FormData();
      body.set("skill_package", new Blob(["package"]), "skill_package.zip");
      const uploaded = await fetch(
        `${peer.baseUrl}/v1/jobs/${requestId}/upload`,
        {
          method: "POST",
          body,
        },
      );
      assert.equal(uploaded.status, 200);
      const result = await fetch(`${peer.baseUrl}/v1/jobs/${requestId}/result`);
      assert.equal(result.status, 200);
      assert.deepInclude((await result.json()).result, {
        kind: "debug_apply_contract_result",
        run_key: "sr-01-upload",
      });
    } finally {
      await peer.close();
    }
  });

  it("holds polling jobs until the peer is restarted", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      const held = await fetch(`${peer.baseUrl}/__test/hold-jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      assert.equal(held.status, 200);
      const created = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "tag-bootstrapper",
          engine: "mock",
          input: { existing_tags: [], protocol: {} },
          parameter: {},
        }),
      });
      const requestId = (await created.json()).request_id;
      for (let i = 0; i < 3; i += 1) {
        const poll = await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`);
        assert.equal((await poll.json()).status, "running");
      }
    } finally {
      await peer.close();
    }
  });

  it("exposes a running chat row before the terminal boundary when jobs are held", async function () {
    const peer = await startMockSkillRunnerServer({ bundlePath });
    try {
      await fetch(`${peer.baseUrl}/__test/hold-jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      const created = await fetch(`${peer.baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_id: "debug-apply-result-probe",
          engine: "mock",
          input: {},
          parameter: {},
        }),
      });
      const requestId = (await created.json()).request_id;
      const upload = new FormData();
      upload.set("file", new Blob(["fixture"]), "fixture.txt");
      await fetch(`${peer.baseUrl}/v1/jobs/${requestId}/upload`, {
        method: "POST",
        body: upload,
      });
      await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`);
      const running = await (
        await fetch(`${peer.baseUrl}/v1/jobs/${requestId}/chat/history`)
      ).json();
      assert.equal(running.events[0].kind, "assistant_message");
      const stream = await fetch(
        `${peer.baseUrl}/v1/jobs/${requestId}/chat?cursor=0`,
        {
          headers: { accept: "text/event-stream" },
        },
      );
      assert.equal(stream.status, 200);
      assert.include(stream.headers.get("content-type"), "text/event-stream");
      assert.include(await stream.text(), "event: snapshot");
      await fetch(`${peer.baseUrl}/__test/hold-jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      await fetch(`${peer.baseUrl}/v1/jobs/${requestId}`);
      const terminal = await (
        await fetch(`${peer.baseUrl}/v1/jobs/${requestId}/chat/history`)
      ).json();
      assert.equal(terminal.events.at(-1).kind, "assistant_final");
    } finally {
      await peer.close();
    }
  });
});
