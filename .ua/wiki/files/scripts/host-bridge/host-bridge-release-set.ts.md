
# scripts/host-bridge/host-bridge-release-set.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-release-set.ts -->

维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。
源码：[scripts/host-bridge/host-bridge-release-set.ts](../../../../../scripts/host-bridge/host-bridge-release-set.ts)

## 符号（6）
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:buildHostBridgeReleaseSet -->
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:classifyHostBridgeReleaseChanges -->
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:contentDigest -->
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:resolvedGeneratedSkillRoots -->
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:stableJson -->
<!-- node: function:scripts/host-bridge/host-bridge-release-set.ts:verifyHostBridgeReleaseSetSurfaces -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildHostBridgeReleaseSet | 函数 | 191–300 | 复杂 | release、data-model、aggregation | 0 | 构建 release set：合并发布身份、surface 版本、变更分类与内容摘要，产出单一发布事实源。 |
| classifyHostBridgeReleaseChanges | 函数 | 108–174 | 复杂 | release、classification、orchestration | 0 | 将变更文件归类为 surface、契约、CLI 二进制等发布域，决定本次发布需要触达的产物。 |
| contentDigest | 函数 | 338–347 | 简单 | checksum、release、utility | 0 | 计算受治理内容的稳定摘要，用于发布前后比对与回执。 |
| resolvedGeneratedSkillRoots | 函数 | 351–363 | 简单 | discovery、filesystem、release | 0 | 解析全部生成型 skill 根目录，保证摘要覆盖到所有生成产物。 |
| stableJson | 函数 | 176–185 | 简单 | serialization、determinism、utility | 0 | 稳定 JSON 序列化，保证 release set 内容在不同机器上可复现。 |
| verifyHostBridgeReleaseSetSurfaces | 函数 | 302–327 | 中等 | release、validation、consistency | 0 | 校验 release set 声明的 surface 与磁盘实际物化结果一致，防止发布清单漂移。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-release-plan.ts](host-bridge-release-plan.ts.md) | scripts/host-bridge/host-bridge-release-plan.ts | 计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。 |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildHostBridgeReleaseSet | 函数 | 191–300 | 构建 release set：合并发布身份、surface 版本、变更分类与内容摘要，产出单一发布事实源。 |
| classifyHostBridgeReleaseChanges | 函数 | 108–174 | 将变更文件归类为 surface、契约、CLI 二进制等发布域，决定本次发布需要触达的产物。 |
| contentDigest | 函数 | 338–347 | 计算受治理内容的稳定摘要，用于发布前后比对与回执。 |
| verifyHostBridgeReleaseSetSurfaces | 函数 | 302–327 | 校验 release set 声明的 surface 与磁盘实际物化结果一致，防止发布清单漂移。 |
