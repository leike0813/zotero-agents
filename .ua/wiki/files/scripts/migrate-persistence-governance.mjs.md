
# scripts/migrate-persistence-governance.mjs
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/migrate-persistence-governance.mjs -->

持久化治理迁移脚本：检测遗留镜像目录，计划文件与目录的受控复制，校验目标可写性并对变更前后摘要做一致性检查。
源码：[scripts/migrate-persistence-governance.mjs](../../../../scripts/migrate-persistence-governance.mjs)

## 符号（7）
<!-- node: function:scripts/migrate-persistence-governance.mjs:collectFiles -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:detectLegacyMirror -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:ensureTargetWritable -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:main -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:parseArgs -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:planCopyDirectory -->
<!-- node: function:scripts/migrate-persistence-governance.mjs:planCopyFile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectFiles | 函数 | 177–198 | 简单 | filesystem、discovery、utility、migration | 0 | 递归收集目录下所有文件并返回排序后的相对路径列表。 |
| detectLegacyMirror | 函数 | 298–315 | 简单 | migration、detection、persistence、legacy | 0 | 探测遗留的持久化镜像目录，识别需要迁移的历史产物。 |
| ensureTargetWritable | 函数 | 200–214 | 简单 | validation、migration、filesystem、safety | 0 | 在写入前校验目标路径的类型与可写性，不满足时立即失败以避免半途损坏。 |
| main | 函数 | 40–128 | 复杂 | migration、governance、entry-point、persistence | 0 | 持久化治理迁移主流程：检测遗留镜像、生成迁移计划、确认后执行复制并输出前后摘要校验。 |
| parseArgs | 函数 | 130–147 | 简单 | parsing、migration、cli、utility | 0 | 解析迁移脚本命令行参数，得到源目录、目标目录与执行模式。 |
| planCopyDirectory | 函数 | 255–296 | 中等 | migration、planning、directory、filesystem | 0 | 遍历目录树生成整体迁移计划，汇总复制与跳过项并保持确定性顺序。 |
| planCopyFile | 函数 | 216–253 | 中等 | migration、planning、checksum、filesystem | 0 | 为单个文件生成迁移计划，比对摘要后决定复制或跳过。 |
