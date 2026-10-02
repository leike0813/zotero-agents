
# scripts/system-e2e/fixture.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/fixture.ts -->

E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。
源码：[scripts/system-e2e/fixture.ts](../../../../../scripts/system-e2e/fixture.ts)

## 符号（7）
<!-- node: function:scripts/system-e2e/fixture.ts:canRetireFixtureRevision -->
<!-- node: function:scripts/system-e2e/fixture.ts:materializeCommittedSeed -->
<!-- node: function:scripts/system-e2e/fixture.ts:readFixtureRegistry -->
<!-- node: function:scripts/system-e2e/fixture.ts:validateCommittedSeed -->
<!-- node: function:scripts/system-e2e/fixture.ts:validateFixturePrivacy -->
<!-- node: function:scripts/system-e2e/fixture.ts:validateFixtureRegistry -->
<!-- node: function:scripts/system-e2e/fixture.ts:validateStructuralFacts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canRetireFixtureRevision | 函数 | 273–285 | 简单 | 治理、fixture、退役判定 | 0 | 判断某 fixture 修订是否可退役，需无活跃引用且已有替代修订。 |
| materializeCommittedSeed | 函数 | 317–339 | 中等 | 物化、seed、只读工作区 | 1 | 把已提交 seed 物化为 `.scaffold/test` 下的只读测试工作区副本。 |
| readFixtureRegistry | 函数 | 311–315 | 简单 | 读取、注册表、fixture | 1 | 读取并重建 fixture 注册表文档。 |
| validateCommittedSeed | 函数 | 226–271 | 中等 | validation、seed、金例 | 0 | 校验已提交 seed 与注册表一致，包含身份、平台与内容摘要。 |
| validateFixturePrivacy | 函数 | 300–309 | 简单 | 隐私、validation、门禁 | 0 | 扫描 fixture 文件树，确认不含标题、作者、正文或本地路径等敏感内容。 |
| validateFixtureRegistry | 函数 | 178–204 | 中等 | validation、注册表、fixture | 0 | 校验注册表条目唯一、引用可解析且每个 fixture 都带齐必需元数据。 |
| validateStructuralFacts | 函数 | 88–176 | 复杂 | validation、结构契约、fixture | 0 | 逐字段校验 fixture 的结构事实：类型、必填项、引用完整性与数值范围。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [manifest.ts](manifest.ts.md) | scripts/system-e2e/manifest.ts | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [run-zotero-test-with-mock.ts](../run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [zotero-plugin.config.ts](../../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canRetireFixtureRevision | 函数 | 273–285 | 判断某 fixture 修订是否可退役，需无活跃引用且已有替代修订。 |
| materializeCommittedSeed | 函数 | 317–339 | 把已提交 seed 物化为 `.scaffold/test` 下的只读测试工作区副本。 |
| readFixtureRegistry | 函数 | 311–315 | 读取并重建 fixture 注册表文档。 |
| validateCommittedSeed | 函数 | 226–271 | 校验已提交 seed 与注册表一致，包含身份、平台与内容摘要。 |
| validateFixturePrivacy | 函数 | 300–309 | 扫描 fixture 文件树，确认不含标题、作者、正文或本地路径等敏感内容。 |
| validateFixtureRegistry | 函数 | 178–204 | 校验注册表条目唯一、引用可解析且每个 fixture 都带齐必需元数据。 |
