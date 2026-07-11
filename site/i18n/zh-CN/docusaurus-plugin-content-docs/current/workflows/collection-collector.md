# Collection 文献收集器

## 用途

根据用户描述的 collection 含义、研究主题或文献范围，从同一 Zotero 库中筛选已经存在的文献，并加入指定的现有 collection。筛选依据包括文献 metadata、tags 和已有的 Synthesis Topic 归属。

## 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `collection` | 是 | 通过路径选择的现有 Zotero collection。 |
| `collectionScope` | 是 | 该 collection 表达的含义、研究主题或文献边界。 |

运行前无需选择 Zotero 条目。

## 工作过程

1. 分页读取目标 collection 所属库中的全部顶层常规文献。
2. 排除 collection 中已经存在的文献。
3. 合并 metadata/tag 词项匹配和相关 Synthesis Topic 的来源文献。
4. 最多对 250 篇候选文献分批进行语义评估，每批 20 篇。
5. 只保留相关度不低于 `0.65` 的文献，并记录每篇文献的证据和理由。
6. Apply 再次检查 collection 当前成员，将仍待收录的文献加入 collection。

该 workflow 自动执行，不包含中间确认。它不会联网搜索、导入新文献、修改 tags、创建 collection 或修改 Synthesis Topic。Topic 上下文不可用时会退化为 metadata 和 tags 筛选，并记录诊断信息。

## 输出与 Apply

运行结果包含选中文献的 Zotero ref、标题、相关度、证据类型、匹配 Topic、理由、限制和诊断。没有匹配文献时会成功返回空列表，Apply 不执行写入。运行期间 collection 成员发生变化时，Apply 会重新去重，因此可以安全重试。
