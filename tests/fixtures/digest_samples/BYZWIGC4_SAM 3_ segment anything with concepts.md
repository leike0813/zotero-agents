## TL;DR

本文提出 SAM 3（Segment Anything Model 3），一个统一的模型，能够基于概念提示（短句短语、图像示例或两者结合）在图像和视频中检测、分割和跟踪物体。SAM 3 引入了 Promptable Concept Segmentation（PCS）任务，接受文本和/或图像示例作为输入，为所有匹配概念的物体实例预测实例掩码和唯一身份标识，同时在视频帧间保持物体身份。

为实现 PCS，作者构建了一个可扩展的数据引擎，生成了包含 4M 独特概念标签的高质量数据集（跨越图像和视频），包括困难负样本。模型由共享单一骨干网络的图像级检测器和基于内存的视频跟踪器组成，并通过 presence head 解耦识别与定位，显著提升检测精度。

实验结果表明，SAM 3 在图像和视频 PCS 任务上将现有系统的准确率提高了一倍以上，在 LVIS 零样本掩码 AP 达到 48.8（当前最佳为 38.5），在 SA-Co/Gold 基准上 cgF1 达到 54.1（是 OWLv2 的两倍多，达到人类性能的 74%）。在 H200 GPU 上，SAM 3 对单张图像（检测 100+ 物体）推理时间为 30ms。

作者开源了 SAM 3 模型、SA-Co 基准（包含 207K 独特概念、120K 图像和 1.7K 视频，比现有基准多 50 倍以上概念），以及推理代码。SA-Co/HQ 数据集包含 5.2M 图像和 4M 独特名词短语，是最大的高质量开放词汇分割数据集。

## 研究问题与贡献

- 研究问题：如何在图像和视频中实现对任意视觉概念的 promptable 分割，即根据文本短语和/或图像示例检测、分割和跟踪所有匹配的概念实例？

- 提出 PCS（Promptable Concept Segmentation）任务和 SA-Co 基准，支持短句短语和图像示例作为提示，要求模型输出所有匹配实例的掩码和唯一 ID

- 设计了解耦识别、定位和跟踪的架构，扩展 SAM 2 以解决概念分割问题，同时保留视觉分割能力

- 构建了高效的人机协同数据引擎，利用人类和 AI 标注者的互补优势，通过 AI 验证器将标注吞吐量提高一倍

- 在 SA-Co 基准上实现 SOTA，图像和视频 PCS 性能较 prior systems 提升一倍以上，LVIS 零样本掩码 AP 达 48.8

## 方法要点

- 检测器基于 DETR 架构，由 Perception Encoder 骨干网络、融合编码器和 DETR 式解码器组成，支持文本、几何和图像示例提示

- 引入 Presence Token（全局存在令牌）专门负责预测目标概念是否存在，解耦识别（what）和定位（where），proposal queries 只解决定位问题

- 检测器和跟踪器共享 PE 骨干网络，但采用解耦设计避免任务冲突：检测器无需识别身份，跟踪器专注于分离身份

- 跟踪器继承 SAM 2 架构，支持视频分割和交互式细化，使用内存库编码物体外观，通过匹配函数关联传播掩码与新检测

- 图像示例以边界框 + 二元标签（正/负）形式提供，可迭代添加以修正错误，编码后与文本提示拼接为 prompt tokens

- 采用双重监督（DAC-DETR）和对齐损失（Align loss），mask head 改编自 MaskFormer，并增加语义分割头

- 训练分为四阶段：PE 预训练、检测器预训练、检测器微调、跟踪器训练（冻结骨干）

## 关键结果

- 图像 PCS（文本提示）：SA-Co/Gold 上 cgF1=54.1（人类 72.8），是 OWLv2（17.3）的 3 倍多；LVIS 上 cgF1=37.2、AP=48.5（当前最佳 38.5）

- 少样本适应：ODinW13 零样本 AP=61.0（超越 gDino1.5-Pro 的 58.7），10 样本 AP=71.8；RF-100VL 零样本 AP=15.2、10 样本 AP=36.5

- 单示例提示（T+I 组合）：COCO AP+=78.1、LVIS AP+=78.4、ODinW13 AP+=81.8，显著超越 T-Rex2（分别 +18.3、+10.3、+20.5）

- 交互式 K 示例：3 次点击后 cgF1 提升 +21.6（超越纯文本），超越 PVS 细化 +2.0；4 次点击后性能趋于平稳

- 视频 PCS：SA-Co/VEval 上 pHOTA 达 58.0-69.9（人类 70.5-78.4），BURST test mAP=36.3、YTVIS21 val mAP=57.4、OVIS val mAP=60.5

- VOS 任务：MOSEv2 val J&F=60.3（超越 prior work 6.5 点），DAVIS17 val J&F=92.2，SA-V test J&F=84.4

- 交互式图像分割（SA-37 基准）：1-click mIoU=66.1、3-clicks=81.3、5-clicks=85.1，超越 SAM 2.1

- 物体计数：CountBench MAE=0.12/Acc=93.8、PixMo-Count MAE=0.21/Acc=86.2，优于多数 MLLMs

- SAM 3 Agent（结合 MLLM）：ReasonSeg test gIoU=74.0、OmniLabel val AP=45.3，零样本超越 prior work

- 推理速度：H200 GPU 上 30ms/帧（100+ 物体），视频中间性能可维持近实时（~5 个并发物体）

## 局限与可复现性线索

- 难以泛化到域外术语，需通过自动域扩展（需要额外训练）缓解

- 文本提示限制为简单名词短语，不支持长指代表达式或需要推理的查询（但可通过 MLLM 扩展处理复杂语言）

- 示例提示无法修正低质量掩码（性能在 4 次点击后趋于平稳）

- 某些专用领域的提示超出当前范围（如 RF-100VL 中的特殊领域）

- 视频标注比图像更困难，需要更多人力集中在可能失败的情况

- 已开源 SA-Co 基准、SAM 3 检查点和推理代码（GitHub: facebookresearch/sam3）

- Demo: https://segment-anything.com; Website: https://ai.meta.com/sam3

## 分章节总结

### 1 Introduction

- SAM 系列（2023, 2024）引入 promptable 分割任务（PVS），但只支持点、框、掩码提示且每次分割单个物体，无法处理'视频中所有猫'这类概念级分割

- PCS 任务定义：给定图像或短视频（≤30 秒），根据短句短语和/或图像示例检测、分割、跟踪所有匹配实例，同时保持视频帧间身份

- 文本限制为简单名词短语（如'red apple'、'striped cat'），聚焦原子视觉概念；不支持长表达式但可结合 MLLM 处理复杂查询

- 歧义问题处理：通过 3 专家标注、评估协议允许多重解释、数据管道最小化歧义、模型内增加歧义模块

- 模型架构：检测器 + 跟踪器共享 PE 骨干，检测器为 DETR-based（ conditioned on text/geometry/exemplars），presence head 解耦识别与定位

- 数据引擎创新：(i) 更多样化媒体策划；(ii) 利用本体论和 MLLMs 生成名词短语和困难负样本；(iii) 微调 MLLMs 作为 AI 验证器使吞吐量翻倍

- 数据规模：4M 独特短语 + 52M 掩码（高质量），38M 短语 + 1.4B 掩码（合成）；SA-Co 基准含 207K 独特概念、120K 图像、1.7K 视频（>50× prior benchmarks）

- 主要结果：LVIS 零样本掩码 AP=48.8（vs 38.5）、SA-Co/Gold cgF1 超 OWLv2 两倍、H200 上 30ms/帧（100+ 物体）

### 2 Promptable Concept Segmentation (PCS)

- 任务形式化：输入为文本短语和/或图像示例，输出为所有匹配实例的实例掩码、语义掩码和唯一 ID，视频帧间保持身份

- 名词短语提示对所有帧全局有效；图像示例可在单帧提供为正/负边界框用于迭代细化

- 提示一致性要求：例如'fish'不能用'仅尾部'示例细化，需更新文本提示

- 歧义来源：多义词（'mouse'设备 vs 动物）、主观描述（'cozy'、'large'）、模糊/上下文依赖短语、边界歧义（'mirror'是否含框）、遮挡/模糊

- 应对策略：3 专家测试标注、评估协议允许多重有效解释、数据管道/指南最小化歧义、模型内歧义模块

### 3 Model

- SAM 3 是 SAM 2 的泛化，支持 PCS 和 PVS 任务，可接受概念提示（名词短语、图像示例）或视觉提示（点、框、掩码）

- 检测器架构：PE 编码图像和文本，exemplar encoder 编码图像示例，融合编码器 cross-attend prompt tokens，DETR 式解码器输出分类 logit 和边界框 delta

- 训练采用双重监督（DAC-DETR）和对齐损失（Align loss），mask head 改编自 MaskFormer，增加语义分割头预测每个像素是否属于提示

- Presence Token：全局学习令牌专门预测'NP 是否存在'p(NP is present)，proposal query 只解决 p(query is match | NP present)，最终分数为两者乘积

- 图像示例：边界框 + 二元标签（正/负），可单独使用或补充文本；例如给定狗的阳性框则检测所有狗（不同于 SAM 1/2 的 PVS 只输出单个实例）

- Exemplar 编码：位置嵌入 + 标签嵌入 + ROI-pooled 视觉特征，经小型 transformer 处理后与文本提示拼接

- 视频跟踪：每帧检测器找新物体 O_t，跟踪器传播 masklets M_{t-1} 到 M̂_t，通过 IoU 匹配函数关联并添加新 masklets

- SAM 2 式传播：首帧初始化 masklet，后续帧基于前序位置预测新位置，冻结 PE 后训练跟踪器（prompt encoder、mask decoder、memory encoder、memory bank）

- 推理时仅在物体自信存在的帧保留在内存库，mask decoder 为 two-way transformer，每帧预测 3 个输出掩码+ 置信度并选择最自信的

- 时序消歧策略：(1) masklet 检测分数衡量时间窗内匹配一致性，低于阈值则抑制；(2) 用高置信检测掩码周期性重提示跟踪器以解决遮挡/干扰

- 实例细化：支持正/负点击细化单个掩码，视频中掩码经传播获得细化 masklet

- 训练四阶段：PE 预训练 → 检测器预训练 → 检测器微调 → 跟踪器训练（冻结骨干）

### 4 Data Engine

- 目标：超越现有数据集的多样性和规模，通过 SAM 3+ 人类+AI 标注者的反馈循环迭代生成标注数据

- 组件：(i) 媒体挖掘（基于策划本体论）；(ii) AI 提出名词短语；(iii) SAM 3 生成候选掩码；(iv) 两步验证（MV 掩码验证 + EV 穷尽性验证）；(v) 人工修正

- Phase 1（人类验证）：随机采样图像+NP 提议（简单 captioner+parser），SAM 2+ 开放词汇检测器生成掩码，人类验证 MV/EV；收集 4.3M image-NP 对（SA-Co/HQ 初始）

- Phase 2（人类+AI 验证）：用 Phase 1 人类标注微调 Llama 3.2 作为 AI 验证器（MV+EV 自动评分），人类聚焦困难案例；SAM 3 更新 6 次，AI 验证器使吞吐量翻倍；增加 Llama-based NP 提议（含困难负样本）；新增 122M image-NP 对

- Phase 3（扩展与域扩展）：AI 挖掘困难案例，SA-Co/HQ 扩展到 15 个数据集；从图像 alt-text 提取 NP、从 22.4M 节点 SA-Co 本体论（基于 Wikidata，17 顶层分类、72 子分类）挖掘长尾概念；SAM 3 迭代 7 次、AI 验证器 3 次；新增 19.5M image-NP 对

- Phase 4（视频标注）：用成熟图像 SAM 3 收集视频特定质量标注；应用场景/运动过滤、内容平衡、排名、针对性搜索；视频帧采样后送入图像标注流；SAM 3 视频扩展生成 masklets，经去重/移除平凡掩码后处理；SA-Co/VIDEO 含 52.5K 视频、467K masklets

### 5 Segment Anything with Concepts (SA-Co) Dataset

- 训练数据三类：(i) SA-Co/HQ（高质量，phases 1-4 收集）；(ii) SA-Co/SYN（合成，phase 3 成熟引擎无人类参与）；(iii) SA-Co/EXT（15 个外部实例掩码数据集，增强困难负样本）

- SA-Co/HQ：5.2M 图像、4M 独特 NP，最大高质量开放词汇分割数据集；SA-Co/VIDEO：52.5K 视频、24.8K 独特 NP、134K video-NP 对，平均 84.1 帧@6fps

- SA-Co 基准：207K 独特短语、121K 图像/视频、3M+ media-phrase 对（含困难负样本）；四个分割：Gold（7 域、3 专家标注）、Silver（10 域、1 标注）、Bronze/Bio（9 现有数据集）、VEval（3 域、视频）

- 评估指标：只评估置信度>0.5 的预测（强制校准）；pmF1（正微 F1）评估定位、IL_MCC（图像级 Matthews 相关系数，范围 [-1,1]）评估分类；主指标 cgF1 = 100 pmF1 IL_MCC

- 歧义处理：SA-Co/Gold 每 NP 收集 3 标注，用 oracle 准确率（选最佳匹配）评估

### 6 Experiments

- 图像 PCS（文本）：LVIS 上 SAM 3 cgF1=37.2/AP=48.5（当前最佳 38.5）；SA-Co/Gold cgF1=54.1（OWLv2 17.3 的 3 倍，人类 72.8 的 74%）；ADE-847/PC-59/Cityscapes 语义分割 mIoU 超越 APE

- 少样本适应：ODinW13 零样本 AP=61.0（gDino1.5-Pro 58.7）、10 样本 71.8（gDino1.5-Pro 67.9）；RF-100VL 零样本 15.2、10 样本 36.5（适应效率更高）

- 单示例提示：COCO T=56.4/I=76.8/T+I=78.1；LVIS T=52.4/I=76.0/T+I=78.4；ODinW13 T=61.1/I=82.2/T+I=81.8；全面超越 T-Rex2

- 交互式 K 示例：3 点击 cgF1 +21.6（超越文本）、+2.0（超越 PVS）；4 点击后平稳（示例无法修正低质掩码）；混合切换至 PVS 有增益

- 物体计数：CountBench MAE=0.12/Acc=93.8（优于 DINO-X/Qwen2.5-VL/Molmo/Gemini）；PixMo-Count MAE=0.21/Acc=86.2；同时提供 MLLMs 无法提供的分割

- 视频 PCS：SA-Co/VEval pHOTA=58.0-69.9（人类 70.5-78.4 的 80%+）；BURST test mAP=36.3、YTVIS21=57.4、OVIS=60.5；大幅超越 GLEE/LLMDet+SAM3 Tracker/SAM3 Detector+T-by-D

- PVS（VOS）：MOSEv2 J&F=60.3（+6.5）、DAVIS17=92.2、LVOSv2=88.5、SA-V test=84.4、YTVOS19=89.7；全面超越 SAM 2.1/SAMURAI/SAM2Long/SeC

- 交互式图像分割（SA-37）：1-click=66.1/3-clicks=81.3/5-clicks=85.1，超越 SAM 2.1（66.4/80.3/84.3）

- SAM 3 Agent（MLLM+SAM 3 工具）：ReasonSeg test gIoU=74.0（Qwen2.5-VL 72B）、OmniLabel val AP=45.3；零样本超越 X-SAM/SegZero/RSVP；可结合多种 MLLM（Qwen/Llama/Gemini）

- 消融实验：presence head +1.5 cgF1、IL_MCC +0.05；困难负样本 IL_MCC 0.44→0.68；合成数据 +8.8 cgF1、HQ 标注 +14.6 cgF1；AI 验证器（EV+MV）填补 SAM 3 与人类性能差距的一半

### 7 Related Work

- Promptable/交互式分割：SAM（2023）引入交互式细化，SAM 2（2024）扩展到视频；SAM 3 继承几何分割同时扩展到文本/图像示例提示

- 开放词汇检测/分割：基于 CLIP 等方法（Gu et al. 2021; Minderer et al. 2022; Ding et al. 2022; Liang et al. 2023）处理未见类别；DETR 限于闭集，MDETR 进化到原始文本查询；图像示例（DINOv、T-Rex2）不如文本有效传达抽象概念

- 视觉定位：GLIP/GroundingDino 将检测统一为短语定位，MQ-GLIP 增加图像示例；GLEE 支持文本/指代表达式/视觉提示但不支持示例/交互式细化；LISA/OMG-LLaVa/GLaMM 支持推理式分割；MLLMs（Gemini2.5、Molmo）可输出框/掩码

- 多物体跟踪分割：tracking-by-detection（SORT、Tracktor、ByteTrack、SAM2MOT、OC-SORT）先检测后关联；端到端（TrackFormer、TransTrack、MOTR）联合检测关联；挑战是检测（语义）与跟踪（身份解耦）的冲突；SAM 3 是强检测器 + 紧密集成跟踪器

### 8 Conclusion

- 主要贡献：(i) PCS 任务和 SA-Co 基准；(ii) 解耦识别/定位/跟踪的架构，扩展 SAM 2 解决概念分割同时保留视觉分割能力；(iii) 高效人机协同数据引擎

- 结果：SA-Co 图像和视频 PCS 性能较 prior systems 翻倍

- 局限：域外术语泛化困难（需自动域扩展/额外训练）；讨论见§B

- 展望：SAM 3 和 SA-Co 基准将是重要里程碑，推动计算机视觉未来研究和应用