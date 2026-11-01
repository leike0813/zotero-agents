import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";

export type ProfileSpan = {
  name: string;
  startMs: number;
  durationMs: number;
  kind?: string;
  file?: string;
  status?: string;
  pid?: number;
  scope?: string;
  cpuMs?: number;
  peakRssBytes?: number;
  [key: string]: unknown;
};

export function recordProfileSpan(
  span: ProfileSpan,
  directory = process.env.ZOTERO_TEST_PROFILE_DIR,
) {
  if (!directory) return;
  const root = path.join(directory, "profile");
  fs.mkdirSync(root, { recursive: true });
  fs.appendFileSync(
    path.join(root, `${process.pid}.jsonl`),
    `${JSON.stringify({
      pid: process.pid,
      scope: process.env.ZOTERO_TEST_REPORT_SCOPE,
      ...span,
    })}\n`,
  );
}

export async function profileSpan<T>(
  name: string,
  action: () => T | Promise<T>,
  details: { kind?: string; file?: string } = {},
): Promise<T> {
  if (!process.env.ZOTERO_TEST_PROFILE_DIR) return action();
  const start = performance.now();
  const cpu = process.cpuUsage();
  let status = "passed";
  let result: T | undefined;
  let failure: unknown;
  try {
    result = await action();
  } catch (error) {
    status = "failed";
    failure = error;
  }
  {
    const used = process.cpuUsage(cpu);
    try {
      recordProfileSpan({
        name,
        ...details,
        startMs: performance.timeOrigin + start,
        durationMs: performance.now() - start,
        status,
        cpuMs: (used.user + used.system) / 1000,
        peakRssBytes: process.resourceUsage().maxRSS * 1024,
      });
    } catch (error) {
      if (status === "passed") throw error;
    }
  }
  if (status === "failed") throw failure;
  return result as T;
}

export function summarizeProfileSpans(
  spans: Pick<ProfileSpan, "startMs" | "durationMs">[],
) {
  let coveredMs = 0;
  let end = -Infinity;
  for (const span of [...spans].sort((a, b) => a.startMs - b.startMs)) {
    const nextEnd = span.startMs + span.durationMs;
    coveredMs += Math.max(0, nextEnd - Math.max(end, span.startMs));
    end = Math.max(end, nextEnd);
  }
  return {
    coveredMs,
    totalWorkMs: spans.reduce((sum, span) => sum + span.durationMs, 0),
  };
}

export function writeProfileMetadata(
  directory: string,
  extra: Record<string, unknown> = {},
) {
  let revision: string | null = null;
  try {
    revision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    /* Fixture directories need no Git checkout. */
  }
  fs.writeFileSync(
    path.join(directory, "profile-metadata.json"),
    JSON.stringify(
      {
        revision,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model,
        availableParallelism: os.availableParallelism(),
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        cachePolicy: "existing caches preserved",
        ...extra,
      },
      null,
      2,
    ),
  );
}

export function writeTestProfile(directory: string) {
  const spans: ProfileSpan[] = [];
  const incompleteFiles: string[] = [];
  const profileRoot = path.join(directory, "profile");
  if (fs.existsSync(profileRoot))
    for (const name of fs
      .readdirSync(profileRoot)
      .filter((name) => name.endsWith(".jsonl"))) {
      for (const line of fs
        .readFileSync(path.join(profileRoot, name), "utf8")
        .split("\n")
        .filter(Boolean)) {
        try {
          const span = JSON.parse(line);
          if (Number.isFinite(span.startMs) && Number.isFinite(span.durationMs))
            spans.push(span);
          else incompleteFiles.push(name);
        } catch {
          incompleteFiles.push(name);
        }
      }
    }
  const resultsRoot = path.join(directory, "results");
  const inventory: Record<string, unknown>[] = [];
  if (fs.existsSync(resultsRoot))
    for (const name of fs.readdirSync(resultsRoot)) {
      if (name.endsWith(".events.jsonl")) {
        for (const line of fs
          .readFileSync(path.join(resultsRoot, name), "utf8")
          .split("\n")
          .filter(Boolean)) {
          try {
            const event = JSON.parse(line);
            if (event.timing && Number.isFinite(event.timing.durationMs))
              spans.push({
                ...event.timing,
                scope: name.slice(0, -13),
                sessionId: event.sessionId,
                name:
                  event.data?.fulltest ||
                  event.data?.fullTitle ||
                  event.data?.title ||
                  event.type,
                kind: `zotero-${event.timing.kind}`,
                startMs: (event.timeOrigin || 0) + event.timing.startMs,
              });
          } catch {
            incompleteFiles.push(name);
          }
        }
      }
      if (!name.endsWith(".mocha.json")) continue;
      try {
        const mocha = JSON.parse(
          fs.readFileSync(path.join(resultsRoot, name), "utf8"),
        );
        if (!mocha.stats || !Array.isArray(mocha.tests)) {
          incompleteFiles.push(name);
          continue;
        }
        inventory.push({
          scope: name.slice(0, -11),
          stats: mocha.stats,
          tests: mocha.tests,
        });
      } catch {
        incompleteFiles.push(name);
      }
    }
  const ranked = [...spans].sort((a, b) => b.durationMs - a.durationMs);
  const kinds = [...new Set(spans.map((span) => span.kind || "other"))];
  const summary = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      summarizeProfileSpans(
        spans.filter((span) => (span.kind || "other") === kind),
      ),
    ]),
  );
  fs.writeFileSync(
    path.join(directory, "profile.json"),
    JSON.stringify(
      {
        summary,
        incompleteFiles: [...new Set(incompleteFiles)],
        inventory,
        spans,
      },
      null,
      2,
    ),
  );
  const lines = [
    "# Test performance profile",
    "",
    "Durations use monotonic clocks. CPU/RSS belong to the recording process; nested and concurrent CPU intervals must not be added. Missing resource metrics are unavailable. Timing work is distinct from elapsed wall time.",
    "",
  ];
  for (const kind of kinds) {
    lines.push(
      `## ${kind}`,
      "",
      "| Duration (ms) | Scope | File | Work |",
      "| ---: | --- | --- | --- |",
    );
    for (const span of ranked
      .filter((span) => (span.kind || "other") === kind)
      .slice(0, 40))
      lines.push(
        `| ${span.durationMs.toFixed(1)} | ${span.scope || ""} | ${span.file || ""} | ${span.name.replaceAll("|", "\\|").replaceAll("\n", " ")} |`,
      );
    lines.push("");
  }
  if (incompleteFiles.length)
    lines.push(
      `Incomplete timing records: ${[...new Set(incompleteFiles)].join(", ")}`,
    );
  fs.writeFileSync(path.join(directory, "profile.md"), lines.join("\n"));
}
