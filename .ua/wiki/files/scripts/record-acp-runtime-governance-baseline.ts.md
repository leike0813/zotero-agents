
# scripts/record-acp-runtime-governance-baseline.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/record-acp-runtime-governance-baseline.ts -->

录制 ACP 运行时性能治理基线，把当前 profiler 快照渲染成 Markdown 基线文件，用于后续回归对比。
源码：[scripts/record-acp-runtime-governance-baseline.ts](../../../../scripts/record-acp-runtime-governance-baseline.ts)

## 符号（2）
<!-- node: function:scripts/record-acp-runtime-governance-baseline.ts:recordAcpRuntimeGovernanceBaseline -->
<!-- node: function:scripts/record-acp-runtime-governance-baseline.ts:renderMarkdown -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| recordAcpRuntimeGovernanceBaseline | 函数 | 91–144 | 中等 | baseline、performance、acp、script | 0 | 读取 ACP 运行时 profiler 快照，脱敏后写出基线 Markdown 与机器可读 JSON，供后续漂移比对。 |
| renderMarkdown | 函数 | 32–80 | 中等 | formatting、baseline、reporting、markdown | 0 | 把基线记录渲染为稳定的 Markdown 表格，保证多次录制结果可逐行 diff。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceBaseline.ts](../src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts | ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| recordAcpRuntimeGovernanceBaseline | 函数 | 91–144 | 读取 ACP 运行时 profiler 快照，脱敏后写出基线 Markdown 与机器可读 JSON，供后续漂移比对。 |
