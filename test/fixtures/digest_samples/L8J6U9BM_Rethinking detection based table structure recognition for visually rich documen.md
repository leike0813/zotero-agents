## TL;DR

本文重新审视了基于目标检测的表格结构识别（TSR）方法。作者指出，许多 detection-based TSR 模型在 COCO/mAP 等检测指标上表现不错，却在 cell-level 或 structure-only TEDS 上落后，核心原因不是单一网络能力不足，而是问题定义、检测器机制、评价指标和特征建模目标之间存在错配。

论文把现有 TSR 路线分成 image-to-sequence、graph-based 和 detection-based 三类，并重点分析 detection-based 方法。作者认为，若只检测行列或不建模 header / projected row header，会丢失复杂表格结构；而 PubTables1M 的六类定义虽然信息充分，却会出现 Row 与 Column Header / Projected Row Header 共享框的多标签检测问题，对 Cascade R-CNN 这类两阶段检测器尤其不友好。

为验证分析，作者以 Cascade R-CNN 为基础提出 TSRDet：将 PubTables1M 式多标签定义改写为单标签训练定义，引入 pseudo class 处理 Row 与 Column Header 共享框的情况；调大 RPN proposal 数量并按 TSR 数据集中极端长宽比调整 anchor aspect ratios；同时结合 deformable convolution 与 Spatial Attention Module，以同时改善局部特征和长程依赖建模。

实验覆盖 SciTSR、FinTabNet、PubTables1M，并在 PubTabNet validation set 上做跨数据集对比。TSRDet 在 structure-only TEDS 上达到 SciTSR 98.41%、FinTabNet 99.05%、PubTables1M 98.55%，在 FinTabNet 上优于若干非检测式模型；但 PubTabNet 跨数据集结果为 96.58%，说明域差异仍然重要。

消融实验支持论文的核心论点：单独使用 deformable convolution 能显著提高 mAP，却可能降低 TEDS；aspect ratio tuning 只带来较小 mAP 提升，却显著改善 TEDS；single-label formulation、Spatial Attention 与 deformable convolution 配合后，才同时改善结构识别质量与检测表现。

论文的主要价值在于把 detection-based TSR 的瓶颈拆成可操作的设计原则：检测目标要完整、问题定义要匹配检测器能力、评价不能只依赖 IoU/mAP、表格组件需要长程依赖而不只是局部边界拟合。局限也很明确：方法仍依赖矩形检测框和外部 OCR/PDF 解析，更适合规整文档表格，对旋转、扭曲或视觉形态异常的表格仍可能失败。

## 研究问题与贡献

- 研究问题：如何解释 detection-based TSR 模型在检测指标和结构识别指标之间的性能落差，并在不放弃两阶段检测器框架的前提下，通过问题定义、proposal 生成和特征建模改造提升结构级 TEDS 表现？

- 系统分析 detection-based TSR 的性能障碍，包括不完整或不匹配的问题 formulation、COCO/mAP 与 TEDS 的评价错配、两阶段/transformer-based 检测器在多标签任务上的能力差异，以及局部特征与长程依赖的平衡问题。

- 提出面向 Cascade R-CNN 的单标签化 TSR formulation：保留 Table、Column、Row、Spanning Cell、Projected Row Header、Column Header 的结构信息，同时通过删除重叠 Row 和引入 pseudo class 避免训练阶段的多标签同框问题。

- 针对 TSR 目标数量多、长宽比分布极端的特点调整 RPN，包括增加 proposals 数量，并把 anchor aspect ratios 扩展到覆盖 FinTabNet 中常见的长条形表格组件。

- 设计 Spatial Attention Module，并与 deformable convolution 结合，使模型既能改善局部边界特征，又能捕获跨表格区域分散分布的行、列、header 等组件的长程依赖。

- 在多个公开数据集与多组消融实验中验证上述分析，展示 TSRDet 在结构级 TEDS 上达到或接近 state-of-the-art，同时揭示 mAP 改善并不必然带来 TSR 结构质量改善。

## 方法要点

- 问题 formulation：训练阶段把 PubTables1M 的同框多标签定义改写为单标签检测集合；Projected Row Header 样本保留为其专门类别，Row 与 Column Header 重叠时用 pseudo class 代替，测试阶段再复制预测结果恢复原始六类评估定义。

- RPN 调参：针对 TSR 中每张图目标数量更多、组件长宽比更极端的特点，提高 pre/post NMS proposal 数量，并将 aspect ratios 设为 [0.0125, 0.025, 0.0625, 0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16, 40, 80]。

- 指标分析：用 COCO mAP 与 TEDS 的定义差异说明，IoU 更高的检测框可能只是更贴合标注中的空白区域，不一定提升结构树编辑距离，甚至可能丢失表格结构所需的最小覆盖区域。

- 特征建模：deformable convolution 主要提升局部采样和边界适配，但表格组件常跨多个稀疏区域分布，因此需要 Spatial Attention Module 建立长程依赖。

- Spatial Attention Module：采用多分支大核卷积思路，使用 7x1/1x7、11x1/1x11、21x1/1x21 等空间可分离卷积和 depthwise separable convolution 控制参数量，并插入 ResNet backbone 的后几个 residual block。

- 实验协议：使用 SciTSR、FinTabNet、PubTables1M 训练/测试，并在 PubTabNet validation set 上评估跨数据集泛化；同时报告 structure-only TEDS 和 detection mAP，避免单指标结论。

## 关键结果

- structure-only TEDS：TSRDet 在 SciTSR、FinTabNet、PubTables1M 上分别达到 98.41%、99.05%、98.55%，明显高于 Cascade R-CNN baseline 的 79.09%、87.49%、83.78%。

- FinTabNet 对比非检测式方法：TSRDet 的 all structure-only TEDS 为 99.05%，高于 EDD、TableFormer、TableMaster、VAST、MTL-TabNet、TSRFormer-DQ-DETR 等表中对比方法。

- PubTabNet validation 跨数据集测试：用 PubTables1M 训练的 TSRDet 在 PubTabNet validation 上取得 96.58% all structure-only TEDS，具有竞争力但低于部分专门在 PubTabNet 训练的模型。

- 消融实验显示，aspect ratio tuning 将 Cascade R-CNN 在 FinTabNet 上的 all TEDS 从 87.49% 提升到 90.23%，而 mAP 仅从 95.23% 提升到 95.54%，说明结构指标对 proposal 形状更敏感。

- 单独使用 deformable convolution 的 Ablation 1 mAP 从 95.23% 提升到 97.22%，但 all TEDS 从 87.49% 降至 84.35%，直接支持 detection metric 与 TSR metric 不一致的论点。

- 完整 TSRDet 在消融表中达到 99.05% all TEDS 和 97.50% mAP；Spatial Attention 与 deformable convolution 配合后，比仅做部分改造的模型更稳定地提升结构识别质量。

## 局限与可复现性线索

- 方法仍属于 detection-based pipeline，需要 OCR 工具或 PDF 解析库提供文本内容；相比 image-to-sequence 模型，它并不天然端到端处理文字识别。

- 矩形 bounding box 机制限制了模型处理旋转、扭曲、非规则形状表格的能力；作者建议未来可考虑 instance segmentation 与 detection 结合。

- 跨数据集实验显示域差异显著：在一个数据集训练的模型迁移到另一个数据集时结构级 TEDS 可能大幅下降，说明数据源、标注规范和表格风格仍是泛化瓶颈。

- 失败案例包括特殊位置的 Column Header、段落式数据单元、regular row 被误判为 projected row header、边界预测偏小导致信息丢失等，提示高平均 TEDS 下仍需关注长尾边缘场景。

- 论文给出关键训练参数、数据集规模、RPN proposal 设置、NMS threshold、deformable convolution 开关等复现线索，并声明代码和预训练模型公开可用；但部分从 PDF 提取出的正文表格存在 OCR/版面噪声，阅读数值时需结合原论文表格核对。

## 分章节总结

### A B S T R A C T

- 摘要明确研究对象是 visually rich document images 中的 table structure recognition，重点关注 detection-based TSR 模型为何在 TEDS 等 cell-level 指标上表现不佳。

- 作者概括了四类阻碍因素：不合适的问题 formulation、检测指标与 TSR 指标错配、检测模型自身机制，以及局部/长程特征抽取的影响。

- 提出基于 Cascade R-CNN 的改造方案，并报告在 SciTSR、FinTabNet、PubTables1M 上相对于 base Cascade R-CNN 的 structure-only TEDS 提升。

### 1. Introduction

- 引言先说明 PDF 和扫描文档中的表格结构复杂，直接解析工具难以处理扫描件和复杂结构，因此需要面向文档图像的 TSR。

- 作者将 TSR 分成 image-to-sequence、graph-based、detection-based 三类，并指出 detection-based 方法直观但在旋转/扭曲样本和 cell-level TEDS 上存在局限。

- 引言已经提出全文主线：本文不是单纯堆叠新模块，而是从问题定义、检测器性质、proposal 生成和评价指标角度重新解释性能瓶颈。

### 1.1. Research objectives / 1.2. Contributions

- 研究目标包括揭示 detection-based TSR 性能受限的原因、构建在 COCO 和 structure-only TEDS 上表现强的检测式方案，以及总结可迁移的模型设计要点。

- 贡献部分把论文定位为分析驱动的模型改造：先复盘和诊断，再对 Cascade R-CNN 做三类简单但针对性的修改。

- 实验贡献覆盖多个数据集和多类 baselines，用结果验证每个设计判断，而不是只展示最终模型分数。

### 2.1. Object detection models

- 本节回顾一阶段、两阶段和 end-to-end/transformer-based 检测器，强调 Cascade R-CNN 依赖 RPN proposal，而 DETR / Sparse R-CNN 使用 query 或 learnable proposal。

- 作者把 detection model 的机制差异和 TSR 的多标签同框问题联系起来：两阶段检测器的单个 proposal 特征难以同时分类为多个类别，而 Sparse R-CNN 的 learnable proposal feature 更容易应对多标签场景。

- 该节为后文解释为什么同样的 PubTables1M formulation 对 Cascade R-CNN 和 Sparse R-CNN 难度不同提供基础。

### 2.2. Table structure recognition

- 本节比较 image-to-sequence、detection-based 和 graph-based TSR。image-to-sequence 可直接输出 HTML 或结构序列，但可能有自回归错误累积和 OCR 泛化问题。

- detection-based 方法通过检测行、列、spanning cell、header 等组件后用规则后处理重建结构；优点是直接，缺点是非端到端且容易受 formulation 信息缺失影响。

- graph-based 方法先定位单元格或网格，再通过图关系建模合并与结构关系，适合处理更复杂布局，但引入额外图建模复杂度。

### 3.1. Preliminaries

- 作者用 Cascade R-CNN 和 Sparse R-CNN 作为两阶段检测器与 transformer-based 检测器代表，解释两者在 proposal、feature、classification/regression head 上的差异。

- Cascade R-CNN 的 RPN、ROI pooling 和 cascade heads 使单个 proposal 的分类特征由图像与 proposal box 决定，因此不适合同一框多类别的训练目标。

- Sparse R-CNN 通过 learnable proposal boxes/features 与动态交互 head 生成分类/回归结果，对多标签同框问题具有更自然的表达能力。

### 3.2. Rethinking problem formulations

- 作者比较 DeepTabStR、TableStrRec、Xiao 等检测式 formulation 和 PubTables1M 六类 formulation，指出前几者因缺少 header 或 projected row header 会造成信息损失。

- PubTables1M 信息最完整，但 Row 与 Column Header / Projected Row Header 可能共享 bounding box，形成多标签检测问题。

- 这一节是全文模型设计的关键依据：不是简单否定 PubTables1M，而是保留其信息完整性，同时改写训练 formulation 以适配两阶段检测器。

### 3.3. Revisiting region proposal generation

- 作者比较 COCO 与 FinTabNet 的目标数量和 aspect ratio 分布：FinTabNet 每图平均目标数约 20.73，高于 COCO 的 7.27；表格组件长宽比分布也远比 COCO 极端。

- 结论是 Cascade R-CNN 等两阶段检测器不能沿用为 COCO 调好的默认 RPN 参数，需要增加 proposal 数量并扩展 anchor aspect ratios。

- 作者也指出 transformer-based 检测器不依赖 RPN，可缓解这类参数问题，但增加 learnable queries 仍可能有帮助。

### 3.4. Rethinking detection and TSR metrics

- 本节从公式层面对比 COCO mAP / IoU 与 TEDS / tree-edit distance，说明两者优化目标不同。

- 由于 TSR 数据集标注框常大于恢复结构所需的最小框，更高 IoU 可能只是覆盖更多空白区域，而不一定提升 HTML/tree 结构。

- 作者通过预测框示意说明，某些框在 COCO 指标下更好，却可能在 TEDS 下没有收益甚至更差。

### 3.5. Rethinking feature extraction

- deformable convolution 能通过 learnable offsets 改善局部采样，但其 offset 通常由小卷积核生成，主要增强局部特征。

- 表格行列等组件常由跨表格的稀疏区域共同构成，单一局部特征增强不足以识别整体结构。

- 该分析引出后文 Spatial Attention Module：需要在增强局部特征的同时建立长程依赖，否则可能只优化检测边界而损害结构识别。

### 4. Proposed method

- 方法章节将分析结论落实为 TSRDet：以 Cascade R-CNN 为基础，分别改造训练标签、RPN 参数和 backbone 特征模块。

- 作者强调这些方法并不复杂，目的是展示前文分析可以指导 detection-based TSR 设计，而不是依赖大型新架构。

### 4.1. Proposed problem formulation

- 训练阶段保留六类表格组件的结构表达能力，但将 Projected Row Header 与 Row 的同框关系、Column Header 与 Row 的同框关系转为单标签训练问题。

- Row 与 Column Header 共享框时引入 pseudo class；测试阶段再复制 pseudo-class 预测为对应的 Row 和 Header，以匹配原始评估定义。

- 该设计直接针对 Cascade R-CNN 不适合同框多标签分类的问题，同时避免丢失 header 和 projected row header 信息。

### 4.2. Tuning parameters of RPN

- 作者将 anchor aspect ratios 从常见的 0.5/1.0/2.0 扩展到覆盖极端细长组件的 13 个值，并增加 RPN proposals。

- 参数选择来自训练集统计而非复杂搜索，因此可复现性较强，也保留了后续进一步调参空间。

- 该节强调 TSR 不是普通 object detection：表格组件的形状和数量分布决定了 proposal generation 必须被重新设计。

### 4.3. Spatial attention and deformable convolution

- Spatial Attention Module 使用多分支大卷积核和空间/深度可分离卷积，降低参数量同时扩大感受野。

- 模块插入 ResNet backbone 的后几个 residual blocks 后，通过 element-wise multiplication 将 spatial attention 应用于原特征。

- deformable convolution 与 Spatial Attention 分工互补：前者改善局部特征，后者增强跨区域依赖。

### 5. Experiments

- 实验使用 SciTSR、FinTabNet、PubTables1M 和 PubTabNet validation，既报告 detection metrics，也报告 structure-only TEDS。

- 数据集设置说明 SciTSR、FinTabNet、PubTables1M 的规模与来源差异，并使用清洗版本的 SciTSR / FinTabNet 以减少噪声标注影响。

- 训练参数包括 SyncBN、MultiStepLR、较高 NMS threshold、更多 pre/post NMS proposals，以及 backbone 各 stage 的 deformable convolution 开关。

### 5.2 / 5.3. Experimental results and comparison

- TSRDet 在三个主数据集上 structure-only TEDS 均达到高水平，尤其显著改善 Cascade R-CNN baseline。

- 与 Deformable-DETR、Sparse R-CNN 比较时，TSRDet 的优势体现为把两阶段检测器通过 formulation 和 feature/proposal 改造拉回到竞争区间。

- 与非检测式方法比较时，TSRDet 在 FinTabNet 上表现很强；但论文也承认 detection-based 方法仍依赖外部文本抽取，适用场景更偏向规整文档表格。

### 5.4. Ablation study

- 消融实验把 aspect ratio tuning、single-label formulation、deformable convolution、Spatial Attention 分开验证，揭示每个组件对 mAP 与 TEDS 的不同影响。

- 最关键的现象是 deformable convolution 单独提升 mAP 却降低 TEDS，说明检测指标改善不等于结构识别改善。

- single-label formulation 和 Spatial Attention 对结构级指标贡献显著，支持作者关于问题定义和长程依赖的分析。

### 6. Discussions and analysis

- 讨论部分把实验现象回扣到第 3 节：transformer-based 检测器更能处理多标签问题，Cascade R-CNN 需要改 formulation；mAP/TEDS 不一致在多个表格和样例中重复出现。

- 跨数据集实验显示不同数据集之间存在明显 domain gap，FinTabNet 训练模型在部分迁移场景下泛化较好，而 SciTSR 训练模型泛化最弱。

- 失败案例分析指出高平均分并不覆盖长尾：特殊 header 位置、段落式单元格、projected row header 与 regular row 混淆等仍需额外处理。

### 6.7. Summary of insights

- 作者总结出 detection-based TSR 的设计原则：目标组件定义要完整，problem formulation 要匹配检测器能力，评价指标要覆盖结构级质量，局部与长程特征建模都不可缺。

- 两阶段检测器与 transformer-based 检测器有不同优劣：前者可以通过 dense/tunable proposals 在小目标上有优势，后者更容易应对多标签同框和 proposal 调参问题。

- 该节将 TSRDet 定位为这些原则的一个示范性实现，而非唯一解。

### 7. Conclusion and future work / Appendix

- 结论重申论文先分析再建模的思路：通过简单改造 Cascade R-CNN，detection-based TSR 也可以达到很强的 structure-only TEDS。

- 未来方向包括使用 vision transformers 建模长程依赖、考虑 Sparse R-CNN 等 transformer-based detectors 作为基础模型，以及用 instance segmentation 处理不规则表格。

- 附录补充更多失败样例，说明即便模型平均表现强，在边界预测、header 分类和低分辨率样本上仍有实际风险。