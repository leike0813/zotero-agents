# Design

## Approach

- 将 Stage 30 `required_reads` 从 `runtime/views/filtered-paper-artifacts/` 改为：
  - `runtime/payloads/paper-artifacts-manifest-batch-1.json`
  - `runtime/payloads/artifacts/`
- 更新 guidance，说明 manifest 是索引真源，artifact 文件位置以 manifest 中 `content_file` 为准。
- 保留 runtime 从 manifest 读取 artifact 内容的现有逻辑。
- 更新 fake bridge fixture，使测试 artifact 文件也写入 `runtime/payloads/artifacts/`。
