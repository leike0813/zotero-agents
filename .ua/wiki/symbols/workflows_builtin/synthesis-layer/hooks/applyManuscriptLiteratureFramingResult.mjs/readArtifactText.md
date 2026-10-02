
# readArtifactText
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:readArtifactText -->

读取产物文本：优先委派给运行时的 readArtifactText，缺失时回退到 bundleReader 读取 raw/fallback 路径，路径不可用则抛错。
类型：函数  
复杂度：简单  
入边数：2  
标签：artifact-reader、fallback、async  
所属文件：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md)
源码：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:68](../../../../../../../workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs#L68)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:124–171 | hook 主入口：判定运行成功且类型为手稿文献框架时读取产物清单并向 productStorage 注册产品，返回 recorded/skipped 状态与资产统计。 |
| [readArtifactManifest](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:87–113 | 读取并校验产物清单：解析 manifest JSON，要求是对象且每个资产路径非空，否则抛出明确错误。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeString](normalizeString.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:60–62 | 把任意值规范化为去除首尾空白的字符串，缺失或假值统一落为空串。 |
