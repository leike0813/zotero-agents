
# scripts/host-bridge/render-host-bridge-release-set.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/render-host-bridge-release-set.ts -->

渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。
源码：[scripts/host-bridge/render-host-bridge-release-set.ts](../../../../../scripts/host-bridge/render-host-bridge-release-set.ts)

## 符号（3）
<!-- node: function:scripts/host-bridge/render-host-bridge-release-set.ts:main -->
<!-- node: function:scripts/host-bridge/render-host-bridge-release-set.ts:renderHostBridgeReleaseSet -->
<!-- node: function:scripts/host-bridge/render-host-bridge-release-set.ts:sourceCommit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 92–117 | 中等 | entry-point、cli、rendering | 0 | 命令行入口：解析参数、调用渲染并把结果落盘到约定路径。 |
| renderHostBridgeReleaseSet | 函数 | 30–90 | 复杂 | rendering、release、documentation | 0 | 渲染 release set 文档：组合发布身份、surface 版本、变更分类与 CLI 二进制信息。 |
| sourceCommit | 函数 | 14–28 | 简单 | git、traceability、release | 0 | 解析发布来源 commit，写入 release set 渲染上下文以保证可追溯。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-agent-surface.ts](host-bridge-agent-surface.ts.md) | scripts/host-bridge/host-bridge-agent-surface.ts | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [host-bridge-release-set.ts](host-bridge-release-set.ts.md) | scripts/host-bridge/host-bridge-release-set.ts | 维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。 |
| [host-bridge-surface-catalog.ts](host-bridge-surface-catalog.ts.md) | scripts/host-bridge/host-bridge-surface-catalog.ts | 枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。 |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |
| [materialize-host-bridge-surfaces.ts](materialize-host-bridge-surfaces.ts.md) | scripts/host-bridge/materialize-host-bridge-surfaces.ts | 把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。 |
| [zotero-bridge-cli-release.ts](zotero-bridge-cli-release.ts.md) | scripts/host-bridge/zotero-bridge-cli-release.ts | 声明 Host Bridge CLI 预编译二进制的发布身份（七平台目录与身份文件），供 release set 渲染与校验引用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderHostBridgeReleaseSet | 函数 | 30–90 | 渲染 release set 文档：组合发布身份、surface 版本、变更分类与 CLI 二进制信息。 |
