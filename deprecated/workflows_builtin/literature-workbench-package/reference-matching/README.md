# Reference Matching

## 用途

将参考文献（References Note）中的条目与 Zotero 库中的条目进行匹配，自动填写 citekey。

该 workflow 支持三种匹配策略：显式 citekey 精确匹配、模板预测匹配、评分匹配。

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

## 运行过程

```
1. 解析 References Note
   └── 提取 JSON payload
       └── 解析 references 数组

2. 数据源准备
   └── 根据 data_source 参数选择:
       ├── zotero-api: 调用 Zotero API 搜索全库
       └── bbt-json: 调用 Better BibTeX JSON-RPC

3. 匹配策略 (按优先级顺序)
   └── 阶段1: 显式 citekey 精确匹配
       └── 检查 reference.citekey/citeKey
       └── 唯一命中则短路

   └── 阶段2: 模板预测匹配
       └── 使用 citekey_template 生成预测 CiteKey
       └── 全库精确搜索
       └── 唯一命中则短路

   └── 阶段3: 评分匹配 (TF-IDF + 规则)
       └── 标题完全匹配优先
       └── 高相似度 + 作者/年份辅助
       └── 低置信/多候选则不匹配

4. 回写结果
   └── 更新 JSON payload 中的 citekey
       └── 更新 HTML 表格中的 Citekey 列
```

### 匹配规则详解

#### 阶段1: 显式匹配

- 直接使用 reference 中已有的 `citekey` 或 `citeKey` 字段
- 在 Zotero 库中精确查找
- 唯一命中即采用

#### 阶段2: 模板预测

- 使用 `citekey_template` 从 reference 元数据生成预测 key
- 支持两种模板格式：

**Legacy 格式**:

- `{author}` - 作者姓
- `{year}` - 年份
- `{title}` - 标题词

**BBT-Lite 格式**:

- `auth` - 作者对象
- `year` - 年份对象
- `title` - 标题对象
- 支持链式方法和字符串字面量

#### 阶段3: 评分匹配

- 标题完全匹配 > 高相似度 + 辅助证据
- 必须满足高标题相似度 (≥ confidence_threshold)
- 且作者或年份至少一个辅助证据成立
- 多候选冲突时宁缺毋滥

## 运行产物

### 更新的 References Note

- **JSON payload**: 每条 reference 的 `citekey` 字段被填充
- **HTML 表格**: `Citekey` 列显示对应的 citekey

### 示例

匹配前:

```json
[{ "title": "Attention Is All You Need", "author": "Vaswani", "year": "2017" }]
```

匹配后:

```json
[
  {
    "title": "Attention Is All You Need",
    "author": "Vaswani",
    "year": "2017",
    "citekey": "vaswani2017"
  }
]
```

## 参数

| 参数                   | 类型   | 说明                         | 默认值                    |
| ---------------------- | ------ | ---------------------------- | ------------------------- |
| `data_source`          | string | 数据源 (zotero-api/bbt-json) | `zotero-api`              |
| `confidence_threshold` | number | 评分匹配置信度阈值 (0.8-1)   | `0.93`                    |
| `ambiguity_delta`      | number | 歧义 delta (0-0.2)           | `0.03`                    |
| `bbt_port`             | number | Better BibTeX 端口 (1-65535) | `23119`                   |
| `citekey_template`     | string | CiteKey 模板                 | `{author}_{title}_{year}` |

### data_source 可选值

- `zotero-api`: 使用 Zotero API 搜索全库
- `bbt-json`: 使用 Better BibTeX JSON-RPC（需要 BBT 插件）

### citekey_template 示例

- `{author}_{title}_{year}` - Legacy 格式
- `auth.lower + '_' + year` - BBT-Lite 格式
- `auth.last.lower + title.first.lower + year` - 自定义格式

## 依赖

- **zotero-api 模式**: 无额外依赖
- **bbt-json 模式**: 需要安装 Better BibTeX 插件并运行

## 相关工作流

- [reference-note-editor](../reference-note-editor/README.md): 编辑结构化参考文献
- [literature-digest](../literature-digest/README.md): 生成参考文献列表
