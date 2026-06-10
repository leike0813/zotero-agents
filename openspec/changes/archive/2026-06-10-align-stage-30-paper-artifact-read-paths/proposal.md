# 对齐 Stage 30 Paper Artifact 读取路径

## Summary

Stage 30 gate 和 `SKILL.md` 当前要求读取 `runtime/views/filtered-paper-artifacts/`，但当前 Host Bridge filtered artifact export 的实际落盘目录是 `runtime/payloads/artifacts/`，并通过 `runtime/payloads/paper-artifacts-manifest-batch-1.json` 暴露 `content_file`。本 change 对齐 Stage 30 的 required reads 与真实 runtime 产物。

## Goals

- Stage 30 gate JSON 返回真实存在的 paper artifact manifest 和 artifact directory。
- Generated `SKILL.md` 指令说明先读 manifest，再按 `content_file` 读取 artifact 内容。
- 测试 fixture 使用同一 artifact 路径。

## Non-Goals

- 不改变 Host Bridge artifact export 行为。
- 不改变 paper triage payload schema。
- 不改变 prepare handoff 或 context view 生成逻辑。
