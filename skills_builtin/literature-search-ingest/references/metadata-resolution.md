# 元数据解析

本参考用于阶段 40 的子代理研究和主代理最终检查。metadata 搜索、直接作品身份和 canonical Zotero 字段是每篇批准论文的强制完成条件。

## 完成标准

一篇论文的 metadata 研究只有在以下事项均可判断时完成：

- 已验证用户批准的直接作品身份；
- 已确定材料类型和重要版本关系；
- 已找到适用的规范 identifier，或完成 identifier 搜索并记录未找到；
- 已从权威证据确定题名、创建者/机构、日期和容器；
- 已选择 item-type-compatible Zotero 字段；
- 已明确 remaining uncertainty 和 `needsCuration`；
- 能安全构造单篇 Host payload，或能说明为什么该 candidate 是 `not_attempted`。

metadata 搜索不能由发现阶段的候选摘要代替。

## 解析顺序

采用标识符优先的解析顺序：

1. 规范化输入中的 DOI、ISBN、PMID、arXiv 等 identifier；
2. 通过 identifier 查询权威 metadata 和 landing page；
3. 比较题名、创建者、年份、容器和材料类型；
4. identifier 不可用时，使用原文题名 + 创建者/机构 + 年份 + 材料类型进行权威题名检索；
5. 交叉核对至少一个权威或两个相互独立的高质量来源；
6. 处理版本、原文和创建者冲突；
7. 投影到 canonical Host payload。

若 identifier 指向不同作品，应优先相信直接查询结果并将候选标记为身份冲突，不能为了匹配候选而忽略冲突。

## 直接作品身份

“直接作品”是用户在阶段 30 批准的具体 bibliographic work 和 material version。判断至少考虑：

- 规范 identifier；
- 原文题名及可靠 alternate title；
- 完整创建者或机构；
- 发表/授予年份；
- 容器、会议、学校、出版社或仓储；
- item/material type；
- 权威来源明确的版本关系。

主题相关、作者相同、标题相近或引用关系都不足以证明同一直接作品。

以下通常是不同直接作品：

- conference paper 与 journal extension；
- thesis 与从中衍生的 article；
- preprint 与内容/作者发生实质变化的正式版；
- dataset、protocol、correction、editorial 与研究论文；
- book 与其中 chapter；
- report 与后续 peer-reviewed article。

当只能解析到相关但不同的作品时，该 candidate 为 `not_attempted`。主代理不能替换作品，也不能请求新的批准来绕过原身份。

## 标识符规范化

### DOI

- 去除 `https://doi.org/`、`http://dx.doi.org/` 和 `doi:` 前缀；
- 去除外围空白和明显的尾随标点；
- 比较时使用不区分大小写的规范值；
- payload 写入 `paper.identifiers.doi`，不写入 `fields.DOI` 或 `extra`。

### ISBN

- 去除空格和连字符进行比较；
- 保留适用的 ISBN-10/ISBN-13 语义；
- 确认 identifier 对应 book、chapter 或 proceedings 的正确层级；
- payload 写入 `paper.identifiers.isbn`。

### PMID

- 仅接受数字 PMID；
- 与 PubMed 记录的题名、作者、年份和期刊核对；
- payload 写入 `paper.identifiers.pmid`。

### arXiv

- 去除 `arXiv:` 前缀并规范版本后缀；
- 判断用户批准的是 preprint 本身还是正式发表版本；
- payload 写入 `paper.identifiers.arxiv`。

没有 identifier 不自动阻止入库。需要完成适用搜索，并用权威题名路径建立可追溯身份。

## 题名路径

identifier 不可用时，题名路径至少需要：

- 权威来源展示完整题名；
- 创建者或机构与候选一致；
- 年份或容器一致；
- 材料类型一致；
- 没有无法解释的同名冲突。

题名标准化仅用于比较：Unicode 规范化、空白合并、标点和大小写处理不能覆盖原始题名。payload 中保留权威来源的原文形式。

弱搜索摘要、二手引用列表和自动生成页面不能单独完成题名路径。

## 证据角色

### 权威证据

- DOI 注册机构记录；
- 出版商、期刊、会议或正式 proceedings；
- PubMed、arXiv、学位授予机构、出版社或作者正式仓储；
- 作品官方 landing page；
- 用户提供且可核验的本地原始记录。

可用于直接身份和关键 metadata。

### 高质量次要证据

- OpenAlex、Semantic Scholar、合法机构索引；
- 图书馆目录和国家级 bibliographic service；
- 引文数据库的稳定记录。

适合交叉核对和发现权威来源。关键冲突时优先权威证据。

### 弱证据

- 搜索摘要；
- 未说明来源的聚合器；
- 引用片段；
- 用户生成列表；
- 自动生成的论文介绍页面。

只能作为 lead 或搜索提示。

## 材料与版本

材料类型决定 Zotero `itemType`、字段角色和是否应作为同一 candidate：

- 期刊论文：`journalArticle`；
- 会议论文：`conferencePaper`；
- 学位论文：`thesis`；
- 图书：`book`；
- 书章：`bookSection`；
- 报告：`report`；
- preprint：使用 Host 支持且语义最合适的类型，并保留 repository/identifier；
- 其他材料：仅在 Host 支持且权威来源明确时使用。

如果用户批准的是会议论文，journal extension 即使 metadata 更完整也不能替代。若权威来源确认 preprint 与正式版只是同一作品的发布版本，仍需根据用户批准的材料和本地去重策略选择正确记录。

## 原始文字

优先保留作品正式使用的原文题名、创建者和容器名称：

- 中文作品保留正式中文题名；
- 日文、韩文、阿拉伯文等保留权威原脚本；
- romanization 或翻译可作为 alternate title 或内部匹配信息；
- 不用英文翻译覆盖可确认的原文题名；
- 不凭搜索引擎翻译创建者姓名。

当权威来源本身只提供英文正式题名时，可以使用该题名，但应说明它是来源记录的正式形式，而非自动翻译。

## 创建者完整性

创建者列表必须保留来源顺序和角色：

- person creators 使用 `firstName`/`lastName` 或 `name`，依据 Host 支持的 creator 结构；
- institutional creator 使用单字段 `name`；
- `creatorType` 与 item type 兼容，如 `author`、`editor`；
- 不省略中间作者；
- 不把“et al.”写为 creator；
- 不根据单一引文摘要猜测完整列表。

若完整创建者无法验证：

- direct work 仍可明确时，标记 `needsCuration: true` 并保留可验证信息；
- 创建者冲突影响身份时，记录 `not_attempted`。

## 条目类型与字段

`paper.fields` 只包含所选 `itemType` 支持且语义正确的 Zotero 字段。常见字段：

- `title`；
- `abstractNote`；
- `date`；
- `publicationTitle`；
- `proceedingsTitle`；
- `university`；
- `publisher`；
- `place`；
- `volume`、`issue`、`pages`；
- `language`；
- `series`、`edition`、`reportType`、`thesisType` 等适用字段。

字段名 canonical 并不代表适用于所有 item type。主代理应确认容器语义：

- work title 只能放 `title`；
- journal/container title 放对应容器字段；
- abstract 只能放 `abstractNote`；
- identifiers、creators 和 URLs 使用专属结构。

## 标识符与 URL

专属结构：

```json
{
  "identifiers": {
    "doi": "10.0000/example",
    "isbn": "9780000000000",
    "pmid": "12345678",
    "arxiv": "2401.01234"
  },
  "landingUrl": "https://doi.org/10.0000/example",
  "pdfUrl": "https://example.org/example.pdf"
}
```

- DOI 不放 `extra`；
- landing URL 是作品权威页面，不是 PDF 的替代；
- PDF URL 仅在完成 PDF 验证后设置；
- 不把搜索结果页、登录页或临时下载 token 当作 landing URL；
- URL 冲突时保留最权威、稳定且与直接作品匹配的地址。

## Host payload 投影

metadata-qualified 论文写入：

```json
{
  "paper": {
    "itemType": "journalArticle",
    "fields": {
      "title": "权威原文题名",
      "abstractNote": "经来源支持的摘要",
      "date": "2024",
      "publicationTitle": "期刊名称"
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "三",
        "lastName": "张"
      }
    ],
    "identifiers": {
      "doi": "10.0000/example"
    },
    "landingUrl": "https://doi.org/10.0000/example",
    "pdfUrl": "https://example.org/example.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": ""
}
```

没有可信 abstract 时省略 `abstractNote`，不能用论文介绍、搜索摘要或模型总结填充。没有 PDF 时省略 `pdfUrl`；metadata 仍可入库。

## 整理与无法入库状态

### Qualified

- 直接作品身份明确；
- 最低 metadata 足够；
- payload 可安全提交；
- `needsCuration` 反映非身份性缺口。

### Needs curation

适用于：

- identifier 未找到但权威题名路径完整；
- 部分非身份关键字段缺失；
- 创建者格式或容器细节仍需人工整理；
- Host 返回 metadata warning。

### Not attempted

适用于：

- direct-work identity 无法确认；
- material version 冲突；
- 题名/作者/年份指向不同作品；
- 最低 metadata 不足以构造安全记录；
- 只能解析到相关但不同的作品。

`not_attempted` 不生成 Host mutation payload。

## 主代理检查

主代理逐篇检查：

1. candidate id 和批准范围；
2. direct-work identity 和材料版本；
3. authoritative source 与 identifier；
4. original-script title；
5. creator 完整性和角色；
6. itemType/field compatibility；
7. `abstractNote` 与专属结构；
8. landing/PDF URL 角色；
9. target collection；
10. `needsCuration` 或 `not_attempted` 结论。

子代理可以在 stdout 报告来源和不确定性。主代理可以据此复核，但是否保存内部审计不影响 payload 的业务状态。

## 示例与反例

### 接受：权威中文记录

DOI、中文期刊页面和完整中文作者一致。payload 保留中文题名和作者，DOI 写入 `identifiers.doi`。

### 接受但需整理：无 identifier 的学位论文

学位授予机构页面提供完整题名、作者、年份和论文类型，但无 DOI。使用权威题名路径入库，标记 `needsCuration`。

### 拒绝：英文翻译覆盖原文题名

权威页面有中文题名，索引提供英文翻译。`fields.title` 应使用中文正式题名。

### 拒绝：部分创建者列表

搜索摘要只显示第一作者和 “et al.”。继续查询权威记录；不能把该摘要当作完整 creators。

### 拒绝：相关材料替换直接作品

批准的是学位论文，只解析到其衍生期刊论文。学位论文 candidate 为 `not_attempted`。

### 拒绝：字段角色混淆

DOI 放入 `extra`、abstract 放入 `abstract`、期刊名放入 `title` 或 PDF 放入 landing URL 都必须在 Host mutation 前修复。
