# Reference Note Editor

## 用途

结构化参考文献条目的图形化编辑界面，提供直观的字段编辑、增删条目、顺序调整等功能。

该 workflow 为纯本地执行 (pass-through)，用于手动编辑或修正参考文献数据。

## 输入约束

| 约束类型 | 说明                                                                                        |
| -------- | ------------------------------------------------------------------------------------------- |
| 输入单元 | References Note 或父条目                                                                    |
| 判定规则 | - `data-zs-note-kind="references"`<br>- 或 payload 标记 `data-zs-payload="references-json"` |
| 展开逻辑 | 选中父条目时，自动查找其子 note 中的 references note                                        |

### 触发方式

- 直接选中一个 references note
- 选中父条目，在其子 note 中存在 references note

### 过滤规则

- 非 references note 会被过滤
- 若过滤后无合法输入，workflow 跳过执行

### 多输入处理

- 多个合法输入时，按顺序逐个打开编辑窗体
- 非并行，确保一次只编辑一个 note

## 运行过程

```
1. 解析 References Note
   └── 提取 JSON payload
       └── 解析 references 数组

2. 打开编辑窗体
   └── 显示父条目上下文（标题）
   └── 渲染参考文献表格

3. 用户编辑操作
   └── 字段编辑
   │   ├── title      - 标题
   │   ├── year       - 年份
   │   ├── author     - 作者
   │   ├── citekey    - CiteKey
   │   ├── rawText    - 原始引用文本
   │   └── 扩展元数据
   │       ├── publicationTitle
   │       ├── conferenceName
   │       ├── university
   │       ├── archiveID
   │       ├── volume
   │       ├── issue
   │       ├── pages
   │       └── place

   └── 调整顺序
   │   ├── 上移
   │   └── 下移

   └── 条目操作
   │   ├── 增加条目
   │   └── 删除条目

4. 保存
   └── 重建 JSON payload
   └── 重建 HTML 表格
   └── 覆盖回写同一 note
```

## 运行产物

### 更新的 References Note

- JSON payload (`data-zs-payload="references-json"`) 被更新
- HTML 表格 (`data-zs-note-kind="references"`) 被同步更新
- 保留 note 的外层结构（wrapper/header 等非目标区域）

### 编辑后的数据结构

```json
{
  "references": [
    {
      "title": "Attention Is All You Need",
      "year": "2017",
      "author": "Vaswani, Ashish",
      "citekey": "vaswani2017",
      "rawText": "Vaswani, A. (2017). Attention Is All You Need...",
      "publicationTitle": "Advances in Neural Information Processing Systems",
      "volume": "30",
      "pages": "5998-6008"
    }
  ]
}
```

## 表格列映射

| 列名    | 数据来源                                                           |
| ------- | ------------------------------------------------------------------ |
| #       | 序号                                                               |
| Citekey | `citekey`                                                          |
| Year    | `year`                                                             |
| Title   | `title`                                                            |
| Authors | `author`                                                           |
| Source  | `publicationTitle` > `conferenceName` > `university` > `archiveID` |
| Locator | `Vol. {volume}; No. {issue}; pp. {pages}; {place}`                 |

## 依赖

- 无外部依赖（纯本地执行）

## 相关工作流

- [reference-matching](../reference-matching/README.md): 自动匹配 citekey
- [literature-digest](../literature-digest/README.md): 生成参考文献列表
