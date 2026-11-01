const fs = require("node:fs");
const process = require("node:process");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const JSONReporter = require("mocha/lib/reporters/json");

module.exports = class ProfileReporter extends JSONReporter {
  constructor(runner, options) {
    super(runner, options);
    const directory = process.env.ZOTERO_TEST_PROFILE_DIR;
    if (!directory) return;
    const root = path.join(directory, "profile");
    fs.mkdirSync(root, { recursive: true });
    const file = path.join(root, `${process.pid}.mocha.jsonl`);
    let sequence = 0;
    const starts = new Map();
    const write = (record) =>
      fs.appendFileSync(
        file,
        JSON.stringify({
          pid: process.pid,
          scope: process.env.ZOTERO_TEST_PROFILE_SCOPE,
          ...record,
        }) + "\n",
      );
    const begin = (item) =>
      starts.set(item, {
        at: performance.now(),
        cpu: process.cpuUsage(),
        id: ++sequence,
      });
    const finish = (item, kind) => {
      const start = starts.get(item);
      if (!start) return;
      const cpu = process.cpuUsage(start.cpu);
      write({
        id: start.id,
        kind,
        name: item.fullTitle(),
        file: item.file,
        startMs: performance.timeOrigin + start.at,
        durationMs: performance.now() - start.at,
        cpuMs: (cpu.user + cpu.system) / 1000,
        peakRssBytes: process.resourceUsage().maxRSS * 1024,
        status: item.state || (item.err ? "failed" : "passed"),
      });
      starts.delete(item);
    };
    runner.on("start", () =>
      write({
        name: "process and file loading",
        kind: "load",
        startMs: performance.timeOrigin,
        durationMs: performance.now(),
      }),
    );
    runner.on("test", begin);
    runner.on("pending", (test) => {
      if (!starts.has(test)) begin(test);
    });
    runner.on("hook", begin);
    runner.on("hook end", (hook) => finish(hook, "hook"));
    // Mocha's test interval includes beforeEach: body duration comes from Runnable.
    runner.on("test end", (test) => {
      const start = starts.get(test);
      if (!start) return;
      write({
        id: start.id,
        kind: "test",
        name: test.fullTitle(),
        file: test.file,
        startMs:
          performance.timeOrigin + performance.now() - (test.duration || 0),
        durationMs: test.duration || 0,
        status: test.state || "pending",
      });
      starts.delete(test);
    });
    runner.on("fail", (item) => {
      if (item.type === "hook") finish(item, "hook");
    });
    runner.on("end", () => {
      for (const [item, start] of starts)
        write({
          id: start.id,
          kind: item.type,
          name: item.fullTitle(),
          file: item.file,
          startMs: performance.timeOrigin + start.at,
          durationMs: performance.now() - start.at,
          status: "incomplete",
        });
      write({
        name: "process resources",
        kind: "resource",
        startMs: performance.timeOrigin,
        durationMs: performance.now(),
        cpuMs:
          Object.values(process.cpuUsage()).reduce((a, b) => a + b, 0) / 1000,
        peakRssBytes: process.resourceUsage().maxRSS * 1024,
      });
    });
  }
};
