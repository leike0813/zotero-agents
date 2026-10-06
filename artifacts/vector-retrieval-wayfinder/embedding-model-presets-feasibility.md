# Embedding 模型预设可行性

**查阅日期：** 2026-10-04  
**范围：** 为预设调研选取的候选系列及其官方模型卡、官方仓库用法、Ollama 与 OpenAI API 文档。
未调用 embedding API、未运行模型；没有质量或性能实测。本文只提供预设配置依据，
不代表已实测 preset，也不指定唯一默认模型。

## 预设边界

模型预处理决定 tokenizer 实际收到的文本；HTTP API 决定如何提交文本、指定模型、
请求维度及读取响应。这是两个独立层。尤其不能从 OpenAI-compatible 这个名称推断
服务会自动添加模型要求的 query/document 前缀。

预设可填来源明确的模型标识、query/document 文本格式、原生维度、模型声明的
长度与语言、官方服务名，以及必要的格式说明。对 API 是否支持某模型的变维、
服务端是否自动加前缀、实际部署别名/revision/量化、tokenizer 截断行为、返回维度、
归一化与质量均应标为待部署验证。不要把预设扩成通用模板引擎。

中英文及跨语言检索是主要验收轴；模型卡的语言覆盖声明不等于本项目质量结论。
CPU、Tesla P4、RTX 4090 只作为开发阶段性能测试参考，不决定预设默认值。

产品模型身份按 [模型 ID 身份 Q12 修订](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979907505)：生效模型 ID 与索引记录一致即可，不以固定版本证明作为准入条件。候选预设仍须核查实际服务模型 ID、响应维度及 query/document 编码设置，并完成部署适配与质量/性能验证。

## 候选配置依据

### multilingual-e5-small / base

- **已验证格式：** 非对称检索 query 前加 `query: `，document 前加 `passage: `，
  中文输入也使用相同前缀；没有固定后缀。模型卡说明省略前缀会降低效果。
  tokenizer 属于各模型制品；前缀作为普通文本在 tokenization 前拼接。
  [small 卡](https://huggingface.co/intfloat/multilingual-e5-small)、
  [base 卡](https://huggingface.co/intfloat/multilingual-e5-base)
- **维度/长度/语言：** small 为 384 维，base 为 768 维；卡片未声明 MRL，
  预设使用原生维度。每条输入最多 512 tokens。模型声明支持 100 种语言，
  并提示低资源语言可能退化。
- **服务适配：** 本次未核实到 Ollama 官方库中的 intfloat 官方别名；用户部署名
  应由用户配置。`/api/embed` 有通用 `dimensions` 字段，但未承诺 E5 支持变维。
  服务是否自动添加 E5 前缀：**未知**，部署前检查模板，避免双重前缀。
  [Ollama embed API](https://docs.ollama.com/api/embed)、
  [Ollama 官方库](https://ollama.com/library)
- **预设建议：** small 与 base 作为两个候选，显式保存前缀和原生维度；别名、
  revision、量化制品与服务端模板留给部署确认。

### BAAI/bge-m3

- **已验证格式：** dense retrieval 输入原文，不加 query instruction，也无固定后缀。
  BGE-M3 同时有 sparse / multi-vector 能力；本预设只描述 dense 向量路径。
  [BAAI 模型卡](https://huggingface.co/BAAI/bge-m3)
- **维度/长度/语言：** dense 输出 1024 维；卡片未声明变维，使用原生维度。
  模型序列长度 8192 tokens，声明支持 100+ 工作语言。
- **服务适配：** Ollama 官方别名 `bge-m3`，页面列出 8K context 和量化/精度 tags。
  `/api/embed` 虽接受 `dimensions`，此模型是否实现变维未知。模型不要求加前缀；
  Ollama 部署模板是否改写输入仍须核验。
  [Ollama bge-m3](https://ollama.com/library/bge-m3)、
  [tags](https://ollama.com/library/bge-m3/tags)、
  [embed API](https://docs.ollama.com/api/embed)
- **预设建议：** 可提供官方别名及 1024 原生维度；部署量化 tag/digest 与模板
  配置应成为实际部署身份的一部分。

### Qwen3-Embedding 0.6B / 4B / 8B

- **已验证格式：** query 使用 `Instruct: {任务说明}\nQuery:{query}`；document
  直接使用正文，不加 instruction。官方示例使用 last-token pooling 并归一化。
  官方建议 instruction 按任务定制，跨语言使用时建议英文 instruction。
  [Qwen 官方仓库](https://github.com/QwenLM/Qwen3-Embedding)、
  [0.6B 模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- **维度/API：** 原生维度依次为 1024 / 2560 / 4096；系列支持 MRL，
  各模型可自定义 32 至原生维度。Ollama `/api/embed` 和其 OpenAI-compatible
  embeddings 文档都列出 `dimensions` 请求字段，但没有逐模型保证 Qwen 的可用值；
  模型支持 MRL 不等于所选 HTTP API 已实现。先用原生维度，变维须按部署验证。
  [Ollama embed API](https://docs.ollama.com/api/embed)、
  [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
- **长度/语言：** 系列模型卡声明 context 32K；官方参考代码以 8192 为
  tokenizer `max_length` 并截断。前者是模型规格，后者是参考用法值，不代表
  所有 serving API 的输入上限。声明支持 100+ 语言及跨语言检索。
- **服务适配：** Ollama 官方名 `qwen3-embedding`，提供 `:0.6b`、`:4b`、`:8b`
  等尺寸 tag；实际 tag、digest、量化和服务版本应记录。服务是否自动加 instruction：
  **未知**，不得同时在客户端和服务端注入。
  [Ollama Qwen3 Embedding](https://ollama.com/library/qwen3-embedding)、
  [model tags](https://ollama.com/library/qwen3-embedding/tags)
- **预设建议：** 三个尺寸分别列出；保存 query instruction 格式、document 原文
  格式及原生维度。若允许编辑 instruction，该值影响向量空间身份。

### Google EmbeddingGemma 300M

- **已验证格式：** query：`task: search result | query: {content}`；document：
  `title: {title 或 none} | text: {content}`。有标题时官方建议提供标题；没有固定后缀。
  [Google model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card)
- **维度/API：** 原生 768 维；模型支持 MRL 输出 512 / 256 / 128，截短后需重新
  归一化。Ollama API 有 `dimensions` 字段，却未说明该模型各尺寸可用；预设先用
  768，其他尺寸需部署验证并确认归一化行为。
- **长度/语言：** 输入上下文上限 2K tokens；训练数据覆盖 100+ 语言。
  [Google model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card)、
  [Ollama embed API](https://docs.ollama.com/api/embed)
- **服务适配：** Ollama 官方名 `embeddinggemma`，列有 `:300m-bf16`、
  `:300m-qat-q4_0` 等 tag；页面要求 Ollama v0.11.10 或更新版本。服务是否已经
  自动装配 model card prompts：**未知**，需检查模板以避免重复前缀。
  [Ollama model](https://ollama.com/library/embeddinggemma)、
  [BF16 tag](https://ollama.com/library/embeddinggemma:300m-bf16)、
  [QAT Q4 tag](https://ollama.com/library/embeddinggemma:300m-qat-q4_0)
- **预设建议：** 可列出官方模型名、prompt 格式和 768 维；量化制品与模板状态
  作为部署信息确认。

### OpenAI text-embedding-3-small / large

- **已验证格式：** API 接收原始字符串，没有 query/document 参数或模型要求的
  非对称前后缀。不要附加本地模型的 task prompt。
  [Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)
- **维度/API：** small 默认 1536，large 默认 3072。模型支持 `dimensions`；
  OpenAI `/v1/embeddings` 文档明确该字段支持 text-embedding-3 及以后版本，
  因而模型能力与该官方 API 的支持均有依据。检查实际返回长度。
  [Create API](https://developers.openai.com/api/reference/resources/embeddings/methods/create)
- **长度/语言：** 每条最多 8192 tokens，每请求合计最多 300,000 tokens。
  官方称 v3 有更好的多语言表现，但没有语言清单或中文/跨语言质量保证。
  [API reference](https://developers.openai.com/api/reference/resources/embeddings/methods/create)、
  [guide](https://developers.openai.com/api/docs/guides/embeddings)
- **服务适配：** 官方模型 ID 为 `text-embedding-3-small` 与
  `text-embedding-3-large`。其他 OpenAI-compatible 服务对模型映射及 dimensions
  的支持未知，不能从协议兼容推断模型语义相同。
  [small model](https://developers.openai.com/api/docs/models/text-embedding-3-small)、
  [large model](https://developers.openai.com/api/docs/models/text-embedding-3-large)
- **预设建议：** 两模型各自列项；默认维度取原生值，显式变维只对已核实的 OpenAI
  官方 API 开放。兼容服务要单独确认。

## 配置结论与部署待验

- 预设需区分原文、固定 query/document 格式、模型原生维度及可选模型变维能力；
  不能把 HTTP API 有 `dimensions` 字段当作所有模型都能变维。
- 已核实官方 Ollama 别名：`bge-m3`、`qwen3-embedding`、`embeddinggemma`。
  E5 没有核实到 intfloat 官方别名。用户可配置自建服务的别名。
- Ollama 与其他兼容服务的自动前缀行为，以部署模板/代码为准；资料未覆盖的标未知，
  在添加客户端格式前先确认，防止重复添加。
- source research 可填官方模型配置与服务名；具体 endpoint 是否接受该模型、revision /
  digest、量化、模板、输出维度/归一化、截断行为与错误处理均需开发期部署实测。
  中英及跨语言检索质量也需项目数据验收。本文没有 GPU 时延或显存估计。

## 一手来源索引

上述链接均于 **2026-10-04** 查阅。模型配置依据来自模型维护者页面/仓库；服务行为
依据来自 API 文档和官方 Ollama model library 页面。未使用排行榜或第三方教程作为依据。
