
# scripts/host-bridge/render-host-bridge-surfaces.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/render-host-bridge-surfaces.ts -->

Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。
源码：[scripts/host-bridge/render-host-bridge-surfaces.ts](../../../../../scripts/host-bridge/render-host-bridge-surfaces.ts)

## 符号（28）
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:applyContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:capabilityCategoryTable -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:capabilityFlags -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:capabilityInputFields -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:capabilityTable -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:commandForDocSort -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:commandReferencePaths -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:copyTree -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:coreSkillContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:genericSkillContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:hostedSkillContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:libraryDocGuidance -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:mappingTable -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:parameterTable -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:partitionCommands -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:pluginSkillBundleContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:profileContent -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:profileDistribution -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:renderCommandCard -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:renderCommandCatalog -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:renderCommandReferences -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:renderDocSurface -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:renderHostBridgeSurfaces -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:replaceGeneratedSection -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:resolverDocGuidance -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:sortedDocCapabilities -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:usageToken -->
<!-- node: function:scripts/host-bridge/render-host-bridge-surfaces.ts:workflowDocGuidance -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyContent | 函数 | 1220–1251 | 中等 | filesystem、codegen、idempotence | 0 | 把渲染结果写入目标文件，内容未变时跳过写入以保持工作区稳定。 |
| capabilityCategoryTable | 函数 | 428–448 | 简单 | rendering、table、documentation | 0 | 渲染按分类聚合的能力表，便于代理按域检索。 |
| capabilityFlags | 函数 | 386–399 | 简单 | capability、metadata、rendering | 0 | 计算能力在 surface 上的展示标记，例如是否需要审批或是否幂等。 |
| capabilityInputFields | 函数 | 467–482 | 简单 | schema、capability、documentation | 0 | 汇总各能力可接受的输入字段，供文档与 schema 描述对齐。 |
| capabilityTable | 函数 | 410–426 | 简单 | rendering、table、documentation | 0 | 渲染能力总览表，列出命令、作用域与审批要求。 |
| commandForDocSort | 函数 | 330–348 | 简单 | sorting、utility、rendering | 0 | 计算命令在文档中的排序权重，兼顾分类次序与名称稳定性。 |
| commandReferencePaths | 函数 | 612–630 | 简单 | rendering、path、structure | 0 | 规划命令 reference 文档的分区路径，满足绝对深度门禁。 |
| copyTree | 函数 | 56–68 | 简单 | filesystem、utility、assets | 0 | 递归复制目录树，把模板与静态资产带入渲染输出。 |
| coreSkillContent | 函数 | 1015–1067 | 中等 | rendering、skill、codegen | 0 | 生成 core profile 的 SKILL.md 主体内容。 |
| genericSkillContent | 函数 | 1069–1125 | 中等 | rendering、skill、codegen | 0 | 生成通用 profile 的 SKILL.md 主体内容，覆盖后端无关的通用能力面。 |
| hostedSkillContent | 函数 | 1127–1146 | 简单 | rendering、skill、codegen | 0 | 生成 hosted profile 的 SKILL.md 内容，聚焦托管后端场景。 |
| libraryDocGuidance | 函数 | 484–512 | 中等 | rendering、documentation、guidance | 0 | 渲染 library 相关文档指引段落，解释选库、分页与锁定的语义约束。 |
| mappingTable | 函数 | 450–465 | 简单 | rendering、table、cli | 0 | 渲染 MCP 方法与 CLI 命令之间的映射表。 |
| parameterTable | 函数 | 632–671 | 中等 | rendering、table、schema | 0 | 渲染命令参数表，包含类型、必填性、审批属性与示例。 |
| partitionCommands | 函数 | 891–938 | 中等 | rendering、partitioning、structure | 0 | 按深度门禁把命令分配到多个 reference 分区，控制单文件规模。 |
| pluginSkillBundleContent | 函数 | 89–163 | 复杂 | rendering、skill、security | 0 | 渲染 Host Bridge 内置插件 skill bundle 说明：校验 bundle 路径安全并给出内容摘要。 |
| profileContent | 函数 | 1181–1218 | 中等 | rendering、profile、codegen | 0 | 按 profile 生成差异化文档内容，避免各 profile 之间复制同一段指令。 |
| profileDistribution | 函数 | 1148–1179 | 中等 | distribution、profile、rendering | 0 | 计算各 profile 的 surface 分布，确定每个 profile 暴露哪些命令与文档。 |
| renderCommandCard | 函数 | 685–889 | 复杂 | rendering、documentation、agent-surface | 0 | 渲染单条命令的完整卡片：语义、参数、证据要求、完成条件、失败与恢复路径。 |
| renderCommandCatalog | 函数 | 970–1013 | 中等 | rendering、index、documentation | 0 | 渲染命令总览目录页，作为 reference 集合的索引入口。 |
| renderCommandReferences | 函数 | 940–968 | 中等 | rendering、reference、codegen | 0 | 渲染全部分区 reference 文档，输出到各自约定路径。 |
| renderDocSurface | 函数 | 557–595 | 中等 | rendering、documentation、reference | 0 | 渲染单个 reference 文档的完整内容：能力表、映射表与指引段落。 |
| renderHostBridgeSurfaces | 函数 | 1261–1393 | 复杂 | rendering、entry-point、agent-surface | 0 | 渲染总入口：构建 surface 目录、渲染各 profile 的 SKILL.md 与 reference，并写入 Host Bridge 内置 skill 包。 |
| replaceGeneratedSection | 函数 | 597–610 | 简单 | rendering、codegen、safety | 0 | 替换文档中的生成区块，同时保留人工维护部分不被覆盖。 |
| resolverDocGuidance | 函数 | 523–532 | 简单 | rendering、documentation、guidance | 0 | 渲染 resolver 文档指引段落，说明解析顺序与优先级。 |
| sortedDocCapabilities | 函数 | 357–384 | 中等 | sorting、rendering、determinism | 0 | 输出按文档顺序排布的能力列表，保证多次渲染结果一致。 |
| usageToken | 函数 | 673–683 | 简单 | rendering、utility、documentation | 0 | 生成命令用法片段中的占位 token，保持文档示例与真实参数一致。 |
| workflowDocGuidance | 函数 | 534–546 | 简单 | rendering、workflow、guidance | 0 | 渲染工作流文档指引段落，说明工作流与 Host Bridge 能力的对接方式。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-agent-surface.ts](host-bridge-agent-surface.ts.md) | scripts/host-bridge/host-bridge-agent-surface.ts | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [host-bridge-surface-catalog.ts](host-bridge-surface-catalog.ts.md) | scripts/host-bridge/host-bridge-surface-catalog.ts | 枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。 |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |
| [host-bridge-workflow-catalog.ts](host-bridge-workflow-catalog.ts.md) | scripts/host-bridge/host-bridge-workflow-catalog.ts | 构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。 |
| [hostBridgePluginSkillBundleContract.ts](../../src/shared/hostBridgePluginSkillBundleContract.ts.md) | src/shared/hostBridgePluginSkillBundleContract.ts | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| pluginSkillBundleContent | 函数 | 89–163 | 渲染 Host Bridge 内置插件 skill bundle 说明：校验 bundle 路径安全并给出内容摘要。 |
| renderHostBridgeSurfaces | 函数 | 1261–1393 | 渲染总入口：构建 surface 目录、渲染各 profile 的 SKILL.md 与 reference，并写入 Host Bridge 内置 skill 包。 |
