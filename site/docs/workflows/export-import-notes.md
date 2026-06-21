# 导出/导入笔记

## 用途

导出和导入 `literature-analysis` 生成的三种结构化笔记（摘要、参考文献、引文分析），方便在 Zotero 实例之间迁移。

:::info 编辑分析结果
[文献分析](literature-analysis)生成的笔记内容是从后台数据**渲染**出来的，直接修改笔记内容不会改变后台数据。如果你需要修改分析结果，正确的做法是：**导出笔记** → 修改导出的文件 → 使用**导入笔记**重新导入。
:::

## export-notes（导出笔记）

### 适用场景

- 将文献分析结果分享给协作者
- 在另一个 Zotero 实例中导入分析结果
- 备份文献分析产物

### 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 父条目（parent） |
| 选择方式 | 支持父条目与三类 note 混选 |
| 多选行为 | 多选时只弹一次导出目录选择窗口 |

### 导出产物

| 文件 | 说明 |
|------|------|
| `digest.md` | 文献摘要 Markdown |
| `references.json` | 参考文献列表 JSON |
| `citation_analysis.json` | 引文分析数据 JSON |
| `citation_analysis.md` | 引文分析报告 Markdown |
| `representative_image.jpg` | 代表图（如 digest note 含 embedded-image 时） |

代表图以 `zs:representative-image:v1` Markdown 注释块插入 `digest.md`，使用同目录相对路径引用。图片导出失败不会阻塞文本与 JSON 产物的导出。

## import-notes（导入笔记）

### 适用场景

- 在其他 Zotero 实例中恢复文献分析结果
- 导入协作者分享的分析产物

### 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 单条父条目（parent） |
| 导入方式 | 选择包含导出产物的目录 |

### 导入流程

```
1. 选择导入目录
   └── 目录中应包含 digest.md、references.json、citation_analysis.json

2. 结构校验
   └── references.json 和 citation_analysis.json 在进入候选前完成结构校验
       └── 校验失败会给出提示，不会阻塞其他产物的导入

3. 图片解析
   └── 如果 digest.md 中包含 zs:representative-image:v1 标记块
       └── 自动解析同目录代表图
       └── 用户也可以手动选择或清除代表图

4. 写入
   └── 在父条目下创建/更新对应的 note
```

图片导入失败不会阻塞 digest note 的导入。

## 依赖

- 不需要后端连接
- 仅依赖 Zotero 本地存储

## 相关工作流

- [文献分析](literature-analysis) — 生成可导出的三类笔记
