# 证据交接

当另一个 Agent、框架或后续任务需要 Zotero 事实、制品、workflow handle 或写回的可审计记录时，使用证据包。

## 构建证据

准备一个输入 JSON，包含：

- `producer.surfaceVersion` 和 `producer.cliVersion`；
- `operation.kind` 和经过清理的 `operation.command` argv 数组；
- 稳定的 `subjects`，如 Zotero 条目引用、主题 ID、Product ID 或 typed run handle；
- 制品的 `path`、`role` 和 `mediaType` 条目；
- 可选的 typed `workflow` 所有权和 handle；
- `writeback.state` 以及非敏感目标或 approval 结果。

运行：

```sh
python scripts/zotero_library_agent.py evidence build --input <input.json> --output <evidence.json>
python scripts/zotero_library_agent.py evidence validate --input <evidence.json>
```

构建器计算制品的 SHA-256 摘要。验证器在本地制品路径存在时重新读取，并在摘要不匹配时拒绝。

## Workflow 包检查

检查已准备好的 agent-run 交接：

```sh
python scripts/zotero_library_agent.py workflow inspect --bundle <handoff-dir-or-zip>
```

针对一个已准备好的输出合约验证最终结果：

```sh
python scripts/zotero_library_agent.py workflow validate-result \
  --contract <output-contract.json> \
  --result <result-dir-or-zip>
```

这些检查验证确定性文件、JSON 结构、结果路径和命名空间。它们不决定结果在语义上是否正确，也不决定 apply-back 是否应继续。

## 隐私与所有权

- 在构建证据之前，移除 bearer 令牌、授权头、密码、cookie、完整 transcript 和 Agent 私有状态。
- 将本地路径视为定位器，而非持久身份；使用摘要和稳定的 Zotero 引用进行比较。
- 不要将证据包视为当前 Zotero 事实或写入授权。
- 让下游系统将证据合约转换为它们自己的制品注册表或 receipt，而不让本包拥有它们的 workflow 状态。
