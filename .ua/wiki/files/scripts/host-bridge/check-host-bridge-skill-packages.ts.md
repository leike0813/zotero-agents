
# scripts/host-bridge/check-host-bridge-skill-packages.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-host-bridge-skill-packages.ts -->

Host Bridge Skill 包治理门禁：统计每个 SKILL.md 的实质指令行数与 prose 字符数，与固定 baseline 比对厚度，检查重复段落、直接引用深度与生成的命令卡片迁移状态。
源码：[scripts/host-bridge/check-host-bridge-skill-packages.ts](../../../../../scripts/host-bridge/check-host-bridge-skill-packages.ts)

## 符号（10）
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:duplicatedProse -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:frontmatter -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:inspectDepth -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:inspectGeneratedCommandCards -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:inspectHostBridgeSkillPackages -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:inspectRelativeBaseline -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:inspectSkillRoot -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:instructionMetrics -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:resolveBaselinePackagePath -->
<!-- node: function:scripts/host-bridge/check-host-bridge-skill-packages.ts:substantiveProseBlocks -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| duplicatedProse | 函数 | 253–271 | 简单 | validation、duplication、governance、skills | 0 | 跨文件检测重复的指令段落，识别在多个 Skill 包间被复制的语义单元。 |
| frontmatter | 函数 | 34–43 | 简单 | parsing、skills、host-bridge、yaml | 0 | 解析 SKILL.md 的 YAML frontmatter，抽取 name、description 等 Skill 元数据。 |
| inspectDepth | 函数 | 458–481 | 中等 | validation、governance、references、skills | 0 | 校验 reference 直接引用的绝对深度限制，防止 SKILL.md 指令被过度分散到深层引用。 |
| inspectGeneratedCommandCards | 函数 | 73–217 | 复杂 | validation、governance、host-bridge、migration | 0 | 审查生成的命令卡片与命令目录链接的一致性，并跟踪 Host Bridge 命令卡片迁移进度。 |
| inspectHostBridgeSkillPackages | 函数 | 616–630 | 简单 | governance、orchestration、skills、host-bridge | 0 | 遍历所有 Host Bridge Skill 包根目录并汇总审查结果。 |
| inspectRelativeBaseline | 函数 | 374–456 | 复杂 | validation、baseline、governance、comparison | 0 | 与 baseline 版本做逐文件相对比较，输出厚度变化、删除项与未映射语义单元分类。 |
| inspectSkillRoot | 函数 | 483–614 | 复杂 | validation、governance、skills、host-bridge | 0 | 对单个 Skill 包根目录执行完整治理审查：元数据、厚度、重复段落、引用深度与命令卡片状态。 |
| instructionMetrics | 函数 | 293–338 | 中等 | metrics、governance、validation、skills | 0 | 计算 materialized 文档的实质指令行数与归一化 prose 字符数，作为厚度门禁的度量。 |
| resolveBaselinePackagePath | 函数 | 352–372 | 中等 | git、baseline、path-resolution、governance | 0 | 按参考包映射在固定 baseline ref 中定位对应路径，支持跨包相对基线比较。 |
| substantiveProseBlocks | 函数 | 224–251 | 中等 | parsing、markdown、metrics、governance | 0 | 从 Markdown 中提取实质指令段落，过滤标题、代码块与元信息行以计算真实指令厚度。 |
