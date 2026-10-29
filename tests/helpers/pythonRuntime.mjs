import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export function pythonRuntimeCommand(args, env = process.env) {
  const project = path.join(env.HOME || os.homedir(), ".ar");
  return fs.existsSync(path.join(project, "pyproject.toml"))
    ? {
        command: "uv",
        args: [
          "run",
          `--project=${project}`,
          "--locked",
          "--",
          "python",
          ...args,
        ],
      }
    : { command: env.PYTHON || "python", args };
}
