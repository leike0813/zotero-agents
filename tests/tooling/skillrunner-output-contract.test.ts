import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";

describe("SkillRunner output contract", function () {
  it("rejects an artifact outside the run directory without moving it", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-output-contract-"),
    );
    const runDir = path.join(tempRoot, "run");
    const skillDir = path.join(tempRoot, "skill");
    const externalPath = path.join(tempRoot, "external.txt");
    await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(externalPath, "keep me", "utf8");
    await fs.writeFile(
      path.join(skillDir, "assets", "output.schema.json"),
      JSON.stringify({
        type: "object",
        properties: {
          optional_path: { type: "string", "x-type": "artifact" },
        },
      }),
      "utf8",
    );

    const script = [
      "import json, sys",
      "from pathlib import Path",
      "from skill_runner_contract.artifact import resolve_output_artifact_paths",
      "from skill_runner_contract.skill import SkillManifest",
      "result = resolve_output_artifact_paths(skill=SkillManifest(id='test', path=Path(sys.argv[2])), run_dir=Path(sys.argv[1]), output_data={'optional_path': sys.argv[3]})",
      "print(json.dumps({'output': result.output_data, 'warnings': result.warnings, 'missing': result.missing_required_fields}))",
    ].join("\n");
    const arProject = path.join(os.homedir(), ".ar");
    const args = ["-c", script, runDir, skillDir, externalPath];
    const env = {
      ...process.env,
      PYTHONPATH: path.resolve("assets/skillrunner-output-contract"),
    };
    const output = fsSync.existsSync(path.join(arProject, "pyproject.toml"))
      ? execFileSync(
          "uv",
          [
            "run",
            `--project=${arProject}`,
            "--locked",
            "--",
            "python",
            ...args,
          ],
          { encoding: "utf8", env },
        )
      : execFileSync(process.env.PYTHON || "python", args, {
          encoding: "utf8",
          env,
        });
    const result = JSON.parse(output);

    assert.deepEqual(result.output, {});
    assert.include(result.warnings, "OUTPUT_ARTIFACT_PATH_INVALID");
    assert.strictEqual(await fs.readFile(externalPath, "utf8"), "keep me");
    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
