## TL;DR

本文提出CAFe-DINO，一种面向遥感影像的开放词汇语义分割模型，基于DINOv3骨干网络，结合代价聚合（Cost Aggregation）与特征上采样（Feature Upsampling），无需在遥感数据上微调即可实现高性能分割。

CAFe-DINO仅在COCO-Stuff的遥感目标子集上训练，在Potsdam、Vaihingen、OpenEarthMap和LoveDA四个遥感数据集上均达到最先进性能，平均mIoU达56.5%，显著优于需遥感数据训练的现有方法。

## 研究问题与贡献

- 研究问题：如何利用在自然图像上大规模预训练的DINOv3模型，实现无需遥感数据微调的遥感影像开放词汇语义分割？

- 提出CAFe-DINO架构，结合代价聚合模块与AnyUp特征上采样，解锁DINOv3在遥感影像上的开放词汇分割能力

- 仅在COCO-Stuff的遥感目标子集（41类）上训练，无需任何遥感数据监督或自监督训练

- 在四个遥感多类分割数据集上达到SOTA性能，平均mIoU达56.5%，大幅领先已有方法

## 方法要点

- 以DINOv3.txt为骨干，生成文本-图像相似度代价卷（cost volume）作为初始分割信号

- 设计代价聚合网络，用Swin Transformer块对每个代价图进行空间细化，再用通道注意力块建模类间依赖关系

- 引入AnyUp进行特征感知上采样，将聚合后的深层特征直接上采样至原图分辨率，无需微调

- 训练策略：仅微调DINOv3的最后两个ViT块和代价聚合网络，AnyUp上采样器完全冻结

- 训练数据：从COCO-Stuff中精选41个遥感相关语义类别的子集，显著优于随机抽样

## 关键结果

- CAFe-DINO在Potsdam上mIoU达66.8%，Vaihingen达54.4%，OEM达39.6%，LoveDA达65.3%，平均56.5%

- 相比次优方法SegEarth-OV（平均48.0%），CAFe-DINO提升8.5个百分点，且无需遥感训练

- 代价聚合使DINOv3.txt的平均mIoU从28.8%大幅提升至56.5%，验证了架构设计的核心有效性

- 微调DINOv3视觉块比微调文本编码器更有效（56.5% vs 53.2%），表明自然-遥感图像的域差距更大

- 保留深层聚合特征维度再进行上采样至关重要，降维后上采样导致mIoU显著下降

## 局限与可复现性线索

- 代价聚合的内存消耗随语义类别数线性增长，在大规模开放词汇场景下可能受限

- 在乡村场景（如OpenEarthMap）上区分纹理相似的地物类别（草地与作物）能力较弱

- 训练所用的COCO-Stuff遥感子集为人工筛选，未必是最优语义集合

- 代码与数据公开于https://github.com/rfaulk/DINO_Soars

## 分章节总结

### Abstract

- 遥感领域缺乏密集标注数据集，亟需无需监督微调的分割模型

- DINOv3在GEO-bench上超越遥感基础模型，DINO.txt实现了基于DINOv3的开放词汇分割

- CAFe-DINO利用代价聚合与免训练上采样，在遥感子集COCO-Stuff上训练，达到SOTA性能

### 1. Introduction

- 遥感影像缺乏像自然图像那样丰富的密集标注数据集

- 开放词汇语义分割（OVSS）模型利用视觉-语言模型实现任意类别的零样本分割

- DINOv3在遥感任务上表现出色，仅用RGB波段即超越多光谱遥感基础模型

- DINOv3.txt直接应用于遥感影像效果不佳（Fig. 2），需额外改进

- 本文通过代价聚合模块和AnyUp特征上采样解锁DINOv3的遥感能力，无需遥感微调

### 2. Related Work

- OVSS以CLIP为基础，结合掩码提案、代价聚合等技术逐步提升性能

- 遥感OVSS方法（GSNet、AerOSeg、OVRS、SegEarth-OV）均需遥感数据训练或自监督训练

- DINOv3是7B参数ViT自监督模型，在GEO-Bench上超越遥感领域基础模型

- DINOv3.txt冻结图像编码器，仅训练文本编码器，产生密集特征表示

- 代价聚合（CAT-Seg）将相似度分数视为代价图，交替进行空间细化和类间依赖建模

- AnyUp是特征无关的上采样器，可对未见骨干网络的特征进行高保真上采样

### 3. Method

- 从DINOv3.txt生成M个语义类别的代价卷V ∈ R^(h×w×M)

- 代价聚合网络：Class-Wise Projection → Swin Transformer空间聚合 → 通道注意力类间聚合，共6个聚合块

- 用AnyUp将聚合后特征上采样至原图分辨率H×W，再用1×1卷积降维为单通道概率图

- 最终通过argmax跨类别维度生成分割预测

### 4. Experiments

- 在COCO-Stuff的41类遥感目标子集上训练，显著优于5组随机子集

- 使用ViT-L变体，代价聚合网络全量可训练，上采样器冻结

- 在四个数据集上评估：Potsdam(66.8%)、Vaihingen(54.4%)、OEM(39.6%)、LoveDA(65.3%)

- 相比DINOv3.txt（28.8%），CAFe-DINO（56.5%）性能翻倍

- 微调视觉块效果最佳，同时微调视觉和文本块收益有限

- 乡村场景（OEM）性能较低，反映自然图像预训练模型在纹理区分上的固有限制

### 5. Conclusion

- CAFe-DINO证明了在自然图像上预训练的DINOv3可用于遥感OVSS，无需遥感数据微调

- 局限性：内存随类别数线性增长、乡村场景纹理区分弱、COCO-Stuff子集非最优