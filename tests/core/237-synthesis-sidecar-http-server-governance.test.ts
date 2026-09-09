import { assert } from "chai";
import fs from "node:fs";
import net from "node:net";
import {
  startSynthesisProductionRouteHarness,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

type SocketRecord = {
  socket: net.Socket;
  closed: boolean;
  response: string;
};

type RawResponse = {
  status: number;
  body: Record<string, any>;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitUntil(
  check: () => boolean,
  timeoutMs: number,
  intervalMs = 20,
) {
  const startedAt = Date.now();
  while (!check()) {
    if (Date.now() - startedAt >= timeoutMs) return false;
    await delay(intervalMs);
  }
  return true;
}

function readThreadCount(pid: number | undefined) {
  if (process.platform !== "linux" || !pid) return null;
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = /^Threads:\s+(\d+)$/m.exec(status);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function openPartialSocket(port: number, source: string) {
  return new Promise<SocketRecord>((resolve, reject) => {
    const record: SocketRecord = {
      socket: new net.Socket(),
      closed: false,
      response: "",
    };
    const socket = net.createConnection({ host: "127.0.0.1", port });
    record.socket = socket;
    const onInitialError = (error: Error) => reject(error);
    socket.once("error", onInitialError);
    socket.on("data", (chunk: Buffer) => {
      record.response += chunk.toString("utf8");
    });
    socket.once("close", () => {
      record.closed = true;
    });
    socket.once("connect", () => {
      socket.off("error", onInitialError);
      socket.on("error", () => undefined);
      socket.write(source, () => resolve(record));
    });
  });
}

async function rawExchange(
  port: number,
  source: string,
  timeoutMs = 3_000,
): Promise<RawResponse> {
  const record = await openPartialSocket(port, source);
  const complete = await waitUntil(
    () => record.closed || record.response.includes("\r\n\r\n"),
    timeoutMs,
  );
  if (!complete) {
    record.socket.destroy();
    throw new Error("raw HTTP response timed out");
  }
  if (!record.closed) {
    await waitUntil(() => record.closed, 500);
  }
  record.socket.destroy();
  const separator = record.response.indexOf("\r\n\r\n");
  if (separator < 0) throw new Error("raw HTTP response header missing");
  const status = /^HTTP\/1\.1\s+(\d{3})\b/.exec(record.response)?.[1];
  if (!status) throw new Error("raw HTTP response status missing");
  const bodySource = record.response.slice(separator + 4);
  return {
    status: Number(status),
    body: JSON.parse(bodySource || "{}") as Record<string, any>,
  };
}

async function healthReady(harness: SynthesisProductionRouteHarness) {
  try {
    const response = await fetch(
      `http://127.0.0.1:${harness.port}/synthesis/v1/health`,
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

describe("Synthesis sidecar HTTP server governance", function () {
  this.timeout(30_000);

  it("bounds partial connection admission and recovers capacity", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "http-admission",
    });
    const records: SocketRecord[] = [];
    let trickle: ReturnType<typeof setInterval> | undefined;
    try {
      const beforeThreads = readThreadCount(harness.pid);
      records.push(
        ...(await Promise.all(
          Array.from({ length: 100 }, () =>
            openPartialSocket(
              harness.port,
              "GET /synthesis/v1/health HTTP/1.1\r\nX-Partial: ",
            ),
          ),
        )),
      );
      trickle = setInterval(() => {
        for (const record of records) {
          if (!record.closed && !record.socket.destroyed) {
            record.socket.write("x", () => undefined);
          }
        }
      }, 100);
      await delay(1_000);

      const openConnections = records.filter((record) => !record.closed);
      const overloads = records.filter((record) =>
        record.response.startsWith("HTTP/1.1 503"),
      );
      assert.isAtMost(openConnections.length, 16);
      assert.isAtLeast(overloads.length, 1);
      const afterThreads = readThreadCount(harness.pid);
      if (beforeThreads !== null && afterThreads !== null) {
        assert.isAtMost(afterThreads - beforeThreads, 16);
      }

      clearInterval(trickle);
      trickle = undefined;
      for (const record of records) record.socket.destroy();
      assert.isTrue(await waitUntil(() => healthReady(harness), 2_000));
      const recoveredThreads = readThreadCount(harness.pid);
      if (beforeThreads !== null && recoveredThreads !== null) {
        assert.isAtMost(recoveredThreads - beforeThreads, 1);
      }
    } finally {
      if (trickle) clearInterval(trickle);
      for (const record of records) record.socket.destroy();
      await harness.stop();
    }
  });

  it("bounds framing and read time without poisoning the listener", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "http-framing",
    });
    try {
      const requestLine = await rawExchange(
        harness.port,
        `GET /${"x".repeat(8 * 1024)} HTTP/1.1\r\n\r\n`,
      );
      assert.equal(requestLine.status, 431);
      assert.equal(requestLine.body.error.code, "invalid_request");

      const headerBlock = Array.from(
        { length: 9 },
        (_, index) => `X-Bounded-${index}: ${"x".repeat(8_000)}\r\n`,
      ).join("");
      const headers = await rawExchange(
        harness.port,
        `GET /synthesis/v1/health HTTP/1.1\r\n${headerBlock}\r\n`,
      );
      assert.equal(headers.status, 431);
      assert.equal(headers.body.error.code, "invalid_request");

      const body = await rawExchange(
        harness.port,
        `POST /synthesis/v1/call HTTP/1.1\r\nContent-Length: ${8 * 1024 * 1024 + 1}\r\n\r\n`,
      );
      assert.equal(body.status, 413);
      assert.equal(body.body.error.code, "request_body_too_large");

      const timeout = await rawExchange(
        harness.port,
        "GET /synthesis/v1/health HTTP/1.1\r\nX-Partial: ",
        2_000,
      );
      assert.equal(timeout.status, 408);
      assert.equal(timeout.body.error.code, "request_timeout");
      assert.isTrue(await healthReady(harness));
    } finally {
      await harness.stop();
    }
  });

  it("interrupts a partial request during stdin shutdown", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "http-shutdown",
    });
    const beforeThreads = readThreadCount(harness.pid);
    const partial = await openPartialSocket(
      harness.port,
      "GET /synthesis/v1/health HTTP/1.1\r\nX-Partial: ",
    );
    const trickle = setInterval(() => {
      if (!partial.closed && !partial.socket.destroyed) {
        partial.socket.write("x", () => undefined);
      }
    }, 100);
    if (beforeThreads === null) {
      await delay(200);
    } else {
      assert.isTrue(
        await waitUntil(
          () => (readThreadCount(harness.pid) || 0) > beforeThreads,
          1_000,
        ),
      );
    }
    let stopCompleted = false;
    const stopped = harness.stop().then(() => {
      stopCompleted = true;
    });
    const completedInTime = await waitUntil(() => stopCompleted, 1_500);
    clearInterval(trickle);
    if (!completedInTime) partial.socket.destroy();
    await stopped;
    partial.socket.destroy();
    assert.isTrue(completedInTime);
    assert.isTrue(partial.closed || partial.socket.destroyed);
  });

  it("flushes the lifecycle receipt before interrupting other sockets", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "http-lifecycle-shutdown",
    });
    const partial = await openPartialSocket(
      harness.port,
      "GET /synthesis/v1/health HTTP/1.1\r\nX-Partial: ",
    );
    const trickle = setInterval(() => {
      if (!partial.closed && !partial.socket.destroyed) {
        partial.socket.write("x", () => undefined);
      }
    }, 100);
    try {
      await delay(100);
      const body = JSON.stringify({
        protocol: "synthesis-sidecar.v1",
        requestId: "test:http-lifecycle-shutdown",
        profileId: "1".repeat(64),
        capability: "system.shutdown",
        payload: {},
      });
      const shutdown = await rawExchange(
        harness.port,
        `POST /synthesis/v1/call HTTP/1.1\r\nAuthorization: Bearer lifecycle-token-0123456789abcdef0123456789abcdef\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
      );
      assert.equal(shutdown.status, 200);
      assert.equal(shutdown.body.data.accepted, true);
      assert.isTrue(await waitUntil(() => partial.closed, 1_500));
      await harness.stop();
    } finally {
      clearInterval(trickle);
      partial.socket.destroy();
      await harness.stop();
    }
  });
});
