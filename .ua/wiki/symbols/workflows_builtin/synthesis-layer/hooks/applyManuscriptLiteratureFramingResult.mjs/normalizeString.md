
# normalizeString
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:normalizeString -->

把任意值规范化为去除首尾空白的字符串，缺失或假值统一落为空串。
类型：函数  
复杂度：简单  
入边数：4  
标签：utility、normalization、defensive-parsing  
所属文件：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md)
源码：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:60](../../../../../../../workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs#L60)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:124–171 | hook 主入口：判定运行成功且类型为手稿文献框架时读取产物清单并向 productStorage 注册产品，返回 recorded/skipped 状态与资产统计。 |
| [buildProductAssets](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:115–122 | 按预置的八个产品资产定义解析实际路径，优先取 manifest 记录，缺失时回退到旧版 assets 字段。 |
| [readArtifactManifest](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:87–113 | 读取并校验产物清单：解析 manifest JSON，要求是对象且每个资产路径非空，否则抛出明确错误。 |
| [readArtifactText](readArtifactText.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:68–85 | 读取产物文本：优先委派给运行时的 readArtifactText，缺失时回退到 bundleReader 读取 raw/fallback 路径，路径不可用则抛错。 |

## 调用

该符号没有记录对外调用。
