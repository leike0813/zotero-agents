# 辅助脚本合约

辅助工具执行确定性的证据构建和 workflow 包验证。它不选择 Host Bridge 命令、不解读 Zotero 事实、不决定 approval，也不判断证据是否充分。

## 构建证据

从 `assets/evidence-input.example.json` 开始。记录产生方的 surface 和 CLI 版本、精确的已清理命令 argv、稳定主体、本地制品、typed workflow handle（如存在）以及写回状态。然后运行：

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
```

输入和输出遵循 `assets/evidence-bundle.schema.json`。辅助工具拒绝凭据类字段，读取每个声明的本地制品，计算其 SHA-256 摘要和字节数，并写入一个确定性的证据 JSON 文件。成功时打印包含输出路径和证据摘要的 JSON 结果。失败时打印结构化错误，不产生有效的证据记录。

## 验证证据

在交接之前，验证生成的记录并重新读取任何本地制品：

```sh
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

验证拒绝模式违规、凭据类字段、缺失制品以及摘要或字节数不匹配。不要手动编辑 `evidence.json` 后声称其已通过验证；更新源输入并重新构建。

## 检查 agent-run 交接

仅对 `zotero-bridge workflow agent-run` 生成的包使用 workflow 系列命令：

```sh
python scripts/zotero_library_agent.py workflow inspect --bundle handoff-dir-or.zip
python scripts/zotero_library_agent.py workflow validate-result \
  --contract output-contract.json \
  --result result-dir-or.zip
```

`workflow inspect` 返回在准备好的交接中发现的 `agentRunId`、请求标识符和合约位置。对每个最终确定的请求结果及其对应的 `workflow validate-result` 分别运行 `output-contract.json`。这些命令验证确定性结构和命名空间；它们不授权 apply-back，也不证明语义正确性。

如果任何辅助命令失败，保留其结构化错误，修正输入或包，然后重新运行同一命令。不要使用辅助工具伪造缺失的 Host Bridge 证据、规范化不兼容的 handle 类型，或绕过 `workflow agent-apply` 的 approval 和 receipt 规则。
