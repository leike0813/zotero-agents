
# workflows_builtin/workflow-debug-probe
> 目录聚合页：3 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/workflow-debug-probe/README.md](../../files/workflows_builtin/workflow-debug-probe/README.md.md) | 文档 | 0 | 调试探针工作流包的说明文档，介绍 debug_only 探针工作流（Host Bridge 连通性、sequence 编排、apply 契约）以及 debug-apply-existing-parent-bundle 对已选父条目的附加语义。 |
| [workflows_builtin/workflow-debug-probe/workflow-package.json](../../files/workflows_builtin/workflow-debug-probe/workflow-package.json.md) | 配置 | 0 | 调试探针包清单（id workflow-debug-probe，version 0.2.0），以相对路径枚举根工作流与 18 个 debug-* 子工作流定义。 |
| [workflows_builtin/workflow-debug-probe/workflow.json](../../files/workflows_builtin/workflow-debug-probe/workflow.json.md) | 配置 | 0 | 根调试探针工作流定义（schemaVersion 2，provider pass-through，debug_only），声明 selection 型输入、无需选择即可触发，并挂载 applyResult 钩子。 |

## 子目录
- [debug-apply-bundle-then-result](workflow-debug-probe/debug-apply-bundle-then-result.md)、[debug-apply-existing-parent-bundle](workflow-debug-probe/debug-apply-existing-parent-bundle.md)、[debug-apply-manifest-bundle](workflow-debug-probe/debug-apply-manifest-bundle.md)、[debug-apply-result-then-bundle](workflow-debug-probe/debug-apply-result-then-bundle.md)、[debug-apply-sequence-bundle](workflow-debug-probe/debug-apply-sequence-bundle.md)、[debug-apply-sequence-result](workflow-debug-probe/debug-apply-sequence-result.md)、[debug-apply-single-bundle](workflow-debug-probe/debug-apply-single-bundle.md)、[debug-apply-single-result](workflow-debug-probe/debug-apply-single-result.md)、[debug-host-bridge-connectivity-probe](workflow-debug-probe/debug-host-bridge-connectivity-probe.md)、[debug-host-bridge-connectivity-sequence-probe](workflow-debug-probe/debug-host-bridge-connectivity-sequence-probe.md)、[debug-host-queue-probe](workflow-debug-probe/debug-host-queue-probe.md)、[debug-interactive-choice-probe](workflow-debug-probe/debug-interactive-choice-probe.md)、[debug-interactive-then-result](workflow-debug-probe/debug-interactive-then-result.md)、[debug-sequence-context-isolation-probe](workflow-debug-probe/debug-sequence-context-isolation-probe.md)、[debug-sequence-countdown-probe](workflow-debug-probe/debug-sequence-countdown-probe.md)、[debug-sequence-file-handoff-probe](workflow-debug-probe/debug-sequence-file-handoff-probe.md)、[debug-sequence-linear-probe](workflow-debug-probe/debug-sequence-linear-probe.md)、[debug-sequence-workspace-reuse-probe](workflow-debug-probe/debug-sequence-workspace-reuse-probe.md)、[hooks](workflow-debug-probe/hooks.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/workflow-debug-probe/debug-apply-bundle-then-result](workflow-debug-probe/debug-apply-bundle-then-result.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-existing-parent-bundle](workflow-debug-probe/debug-apply-existing-parent-bundle.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-manifest-bundle](workflow-debug-probe/debug-apply-manifest-bundle.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-result-then-bundle](workflow-debug-probe/debug-apply-result-then-bundle.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-sequence-bundle](workflow-debug-probe/debug-apply-sequence-bundle.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-sequence-result](workflow-debug-probe/debug-apply-sequence-result.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-single-bundle](workflow-debug-probe/debug-apply-single-bundle.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-apply-single-result](workflow-debug-probe/debug-apply-single-result.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-host-bridge-connectivity-probe](workflow-debug-probe/debug-host-bridge-connectivity-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-host-bridge-connectivity-sequence-probe](workflow-debug-probe/debug-host-bridge-connectivity-sequence-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-host-queue-probe](workflow-debug-probe/debug-host-queue-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-interactive-choice-probe](workflow-debug-probe/debug-interactive-choice-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-interactive-then-result](workflow-debug-probe/debug-interactive-then-result.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-sequence-context-isolation-probe](workflow-debug-probe/debug-sequence-context-isolation-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-sequence-countdown-probe](workflow-debug-probe/debug-sequence-countdown-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-sequence-file-handoff-probe](workflow-debug-probe/debug-sequence-file-handoff-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe](workflow-debug-probe/debug-sequence-linear-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/debug-sequence-workspace-reuse-probe](workflow-debug-probe/debug-sequence-workspace-reuse-probe.md) | 1 |
| [workflows_builtin/workflow-debug-probe/hooks](workflow-debug-probe/hooks.md) | 1 |
