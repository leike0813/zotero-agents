
# workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/hooks](../../../../modules/workflows_builtin/synthesis-layer/hooks.md)
<!-- node: file:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs -->

Synthesis 层 hook：读取手稿文献框架阶段的产物清单与文本，组装产品资产并把 applyResult 结果写回工作流状态。
源码：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs](../../../../../../workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs)

## 符号（6）
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:buildProductAssets -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:isRecord -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:normalizeString -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:readArtifactManifest -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:readArtifactText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 124–171 | 中等 | hook、entry-point、async、synthesis | 0 | hook 主入口：判定运行成功且类型为手稿文献框架时读取产物清单并向 productStorage 注册产品，返回 recorded/skipped 状态与资产统计。 |
| buildProductAssets | 函数 | 115–122 | 简单 | product-asset、fallback、mapping | 1 | 按预置的八个产品资产定义解析实际路径，优先取 manifest 记录，缺失时回退到旧版 assets 字段。 |
| [isRecord](../../../../symbols/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs/isRecord.md) | 函数 | 64–66 | 简单 | utility、type-guard、validation | 2 | 判定值是否为普通对象记录，排除 null 与数组。 |
| [normalizeString](../../../../symbols/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs/normalizeString.md) | 函数 | 60–62 | 简单 | utility、normalization、defensive-parsing | 4 | 把任意值规范化为去除首尾空白的字符串，缺失或假值统一落为空串。 |
| readArtifactManifest | 函数 | 87–113 | 中等 | artifact-reader、validation、json-parsing | 1 | 读取并校验产物清单：解析 manifest JSON，要求是对象且每个资产路径非空，否则抛出明确错误。 |
| [readArtifactText](../../../../symbols/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs/readArtifactText.md) | 函数 | 68–85 | 简单 | artifact-reader、fallback、async | 2 | 读取产物文本：优先委派给运行时的 readArtifactText，缺失时回退到 bundleReader 读取 raw/fallback 路径，路径不可用则抛错。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflow.json](../create-topic-synthesis/workflow.json.md) | workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json | create-topic-synthesis 工作流声明：任务命名模板、参数定义、选择校验与请求模板，驱动主题综述的生成。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 124–171 | hook 主入口：判定运行成功且类型为手稿文献框架时读取产物清单并向 productStorage 注册产品，返回 recorded/skipped 状态与资产统计。 |
