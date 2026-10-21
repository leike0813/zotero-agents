import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function pythonRuntimeCommand(args: string[]) {
  const project = path.join(os.homedir(), ".ar");
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
    : { command: process.env.PYTHON || "python", args };
}
