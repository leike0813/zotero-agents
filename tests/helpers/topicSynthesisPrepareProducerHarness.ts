import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {
  startHostBridgeCliFixtureHarness,
  type HostBridgeCliFixtureHarness,
  type HostBridgeCliRequest,
} from "./hostBridgeCliHarness";
import type { SynthesisProductionRouteHarness } from "./synthesisProductionRouteHarness";

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    command: string;
    input: Record<string, unknown>;
  };
}

/**
 * The generated Topic Skill invokes the real Host Bridge CLI. Route those
 * commands through the production client so the Python runtime consumes what
 * the current native Synthesis route actually returns.
 */
export async function startTopicSynthesisPrepareProducerHarness(args: {
  harness: SynthesisProductionRouteHarness;
  root: string;
}): Promise<{
  env: NodeJS.ProcessEnv;
  readRequests(): Promise<HostBridgeCliRequest[]>;
  close(): Promise<void>;
}> {
  const callback = http.createServer(async (request, response) => {
    try {
      const { command, input } = await readJsonBody(request);
      let data: unknown;
      if (command === "synthesis resolver resolve") {
        const result = await args.harness.client.topics.resolveResolver(
          input as never,
        );
        data = {
          ok: result.ok,
          errors: result.errors,
          candidates: result.papers,
          cursor: result.cursor,
          nextCursor: result.next_cursor,
          hasMore: result.has_more,
          returned: result.returned,
          total: result.total,
          limit: result.limit,
          diagnostics: result.diagnostics,
        };
      } else if (command === "synthesis graph get-metrics") {
        const result = await args.harness.client.graph.getMetrics(input);
        data = { ...result, metrics: result.items };
      } else if (command === "synthesis artifact export-filtered") {
        data = await args.harness.client.artifacts.exportFiltered(input);
      } else {
        throw new Error(`unsupported Topic producer command: ${command}`);
      }
      const body = JSON.stringify(data);
      response.writeHead(200, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });
      response.end(body);
    } catch (error) {
      const body = JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      });
      response.writeHead(500, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });
      response.end(body);
    }
  });
  await new Promise<void>((resolve) =>
    callback.listen(0, "127.0.0.1", resolve),
  );
  const address = callback.address();
  if (!address || typeof address === "string") {
    throw new Error("Topic producer callback is unavailable");
  }

  const providerPath = path.join(args.root, "topic-producer-provider.mjs");
  await fs.writeFile(
    providerPath,
    String.raw`
const context = JSON.parse(process.argv[2]);
const response = await fetch(process.env.TOPIC_PRODUCER_CALLBACK, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(context),
});
const source = await response.text();
if (!response.ok) throw new Error(source);
console.log(source);
`,
    "utf8",
  );
  let cli: HostBridgeCliFixtureHarness | undefined;
  try {
    cli = await startHostBridgeCliFixtureHarness({
      commands: [
        "synthesis resolver resolve",
        "synthesis graph get-metrics",
        "synthesis artifact export-filtered",
      ],
      providerPath,
      cwd: args.root,
      providerEnv: {
        TOPIC_PRODUCER_CALLBACK: `http://127.0.0.1:${address.port}/call`,
      },
    });
  } catch (error) {
    await new Promise<void>((resolve) => callback.close(() => resolve()));
    throw error;
  }
  return {
    env: cli.env,
    readRequests: () => cli!.readRequests(),
    async close() {
      await cli!.close();
      await new Promise<void>((resolve) => callback.close(() => resolve()));
    },
  };
}
