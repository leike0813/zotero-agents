
# scripts/update-skillrunner-runtime-feed.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/update-skillrunner-runtime-feed.ts -->

更新 SkillRunner 运行时 feed 的脚本，规范化版本与插件版本区间后重写 feed 条目并输出变更记录。
源码：[scripts/update-skillrunner-runtime-feed.ts](../../../../scripts/update-skillrunner-runtime-feed.ts)

## 符号（8）
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:argValue -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:buildRevision -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:normalizeFeed -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:normalizePluginRange -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:normalizeSkillRunnerVersion -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:normalizeString -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:readFeed -->
<!-- node: function:scripts/update-skillrunner-runtime-feed.ts:updateSkillRunnerRuntimeFeed -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| argValue | 函数 | 21–29 | 简单 | script、tooling、build-system | 0 | 从命令行参数表中取出指定键的值。 |
| buildRevision | 函数 | 52–59 | 简单 | script、tooling、build-system | 0 | 基于 feed 内容计算稳定修订号，使未变更时不产生新版本。 |
| normalizeFeed | 函数 | 61–78 | 简单 | script、tooling、build-system | 0 | 规范化 feed 结构，补齐缺省字段并去除重复条目。 |
| normalizePluginRange | 函数 | 44–50 | 简单 | script、tooling、build-system | 0 | 规范化插件版本区间为统一的 semver range 表达。 |
| normalizeSkillRunnerVersion | 函数 | 35–42 | 简单 | script、tooling、build-system | 0 | 规范化 SkillRunner 版本号，剥离构建后缀与前导 v。 |
| normalizeString | 函数 | 31–33 | 简单 | script、tooling、build-system | 0 | 对字符串参数做去空白与空值归一。 |
| readFeed | 函数 | 80–94 | 简单 | script、tooling、build-system | 0 | 读取并解析现有 feed 文件，文件缺失时返回空 feed。 |
| updateSkillRunnerRuntimeFeed | 函数 | 96–130 | 中等 | script、tooling、build-system | 0 | 更新 feed 的主体逻辑，规范化版本与插件区间后合并进既有条目并写回。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| updateSkillRunnerRuntimeFeed | 函数 | 96–130 | 更新 feed 的主体逻辑，规范化版本与插件区间后合并进既有条目并写回。 |
