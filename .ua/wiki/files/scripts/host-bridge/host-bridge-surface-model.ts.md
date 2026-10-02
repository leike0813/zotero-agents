
# scripts/host-bridge/host-bridge-surface-model.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-surface-model.ts -->

Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。
源码：[scripts/host-bridge/host-bridge-surface-model.ts](../../../../../scripts/host-bridge/host-bridge-surface-model.ts)

## 符号（8）
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:bumpHostBridgeSurfacePatch -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:formatHostBridgeSurfaceVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:hostBridgeSkillGeneratedRoot -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:inspectHostBridgeSurfaceVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:readCliVersion -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:resolveHostBridgeSurface -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:validateHostBridgeSurfaceDefinitions -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:writeHostBridgeSurfaceDefinitions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bumpHostBridgeSurfacePatch | 函数 | 315–336 | 简单 | versioning、mutation、utility | 1 | 将 surface 版本 patch 位递增，为内容变更后的版本推进提供唯一入口。 |
| formatHostBridgeSurfaceVersion | 函数 | 256–268 | 简单 | versioning、formatting、utility | 0 | 把版本结构格式化为语义化版本字符串，供文档与清单引用。 |
| hostBridgeSkillGeneratedRoot | 函数 | 49–58 | 简单 | path、utility、agent-surface | 0 | 计算生成型 skill 的输出根目录，所有物化路径以此为基准。 |
| inspectHostBridgeSurfaceVersion | 函数 | 292–313 | 简单 | versioning、inspection、validation | 1 | 检查 surface 当前版本与期望版本，给出是否需要 bump 的结论。 |
| readCliVersion | 函数 | 270–290 | 简单 | versioning、cli、loading | 0 | 读取 CLI 版本标识，用于 surface 版本与二进制发布的一致性比较。 |
| [resolveHostBridgeSurface](../../../symbols/scripts/host-bridge/host-bridge-surface-model.ts/resolveHostBridgeSurface.md) | 函数 | 217–254 | 中等 | lookup、contract、validation | 2 | 按身份解析 surface 定义，未命中时报错而不是静默回退。 |
| validateHostBridgeSurfaceDefinitions | 函数 | 69–189 | 复杂 | validation、contract、invariant | 0 | 校验 surface 定义文件的 schema、深度、条目语义与版本字段不变量。 |
| writeHostBridgeSurfaceDefinitions | 函数 | 200–215 | 简单 | serialization、persistence、contract | 0 | 以稳定序列化回写 surface 定义文件，避免无意义的格式抖动。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-host-bridge-agent-language.ts](check-host-bridge-agent-language.ts.md) | scripts/host-bridge/check-host-bridge-agent-language.ts | 治理校验脚本：检查 Host Bridge 面向代理的 surface 文案是否符合 agent 语言规范（可执行指令、证据要求、完成条件等），是 AGENTS.md 中 agent-facing surface 硬约束的自动化闸门。 |
| [check-plugin-host-bridge-assets.ts](check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [host-bridge-release-set.ts](host-bridge-release-set.ts.md) | scripts/host-bridge/host-bridge-release-set.ts | 维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。 |
| [host-bridge-review-mirror.ts](host-bridge-review-mirror.ts.md) | scripts/host-bridge/host-bridge-review-mirror.ts | 构建 Host Bridge surface 的审阅镜像：把物化后的 skill/reference 文档与基线做逐条映射，统计 unmapped、downgraded、unauthorized dropped 与重复项，支撑语义 parity 审阅。 |
| [host-bridge-surface-version.ts](host-bridge-surface-version.ts.md) | scripts/host-bridge/host-bridge-surface-version.ts | 基于 surface model 推导 Host Bridge surface 版本号与变更标识，供 release set 和渲染层判断是否需要重建。 |
| [materialize-host-bridge-surfaces.ts](materialize-host-bridge-surfaces.ts.md) | scripts/host-bridge/materialize-host-bridge-surfaces.ts | 把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。 |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |
| [render-host-bridge-surfaces.ts](render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bumpHostBridgeSurfacePatch | 函数 | 315–336 | 将 surface 版本 patch 位递增，为内容变更后的版本推进提供唯一入口。 |
| formatHostBridgeSurfaceVersion | 函数 | 256–268 | 把版本结构格式化为语义化版本字符串，供文档与清单引用。 |
| inspectHostBridgeSurfaceVersion | 函数 | 292–313 | 检查 surface 当前版本与期望版本，给出是否需要 bump 的结论。 |
| [resolveHostBridgeSurface](../../../symbols/scripts/host-bridge/host-bridge-surface-model.ts/resolveHostBridgeSurface.md) | 函数 | 217–254 | 按身份解析 surface 定义，未命中时报错而不是静默回退。 |
| validateHostBridgeSurfaceDefinitions | 函数 | 69–189 | 校验 surface 定义文件的 schema、深度、条目语义与版本字段不变量。 |
| writeHostBridgeSurfaceDefinitions | 函数 | 200–215 | 以稳定序列化回写 surface 定义文件，避免无意义的格式抖动。 |
