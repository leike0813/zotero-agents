## TL;DR

本文系统评估了DINOv3（一个仅用自然图像预训练的自监督视觉Transformer）在医学成像领域的零样本迁移能力。研究覆盖2D和3D分类、分割、配准等核心任务，涉及X-ray、CT、MRI、WSI、内窥镜、电子显微镜（EM）和PET等7种成像模态、14个公开数据集。

研究发现DINOv3在结构型模态（X-ray、CT、内窥镜）上表现强劲，部分任务上超越了BiomedCLIP和CT-CLIP等医学专用基础模型，在EndoVis 2018器械分割上达到92.19% Binary IoU的新SOTA。但在域偏移较大的模态（WSI、EM、PET）上表现严重退化。

更重要的是，研究发现自然图像的缩放定律在医学领域不一致：增大模型尺寸或输入分辨率并不总能带来性能提升，不同任务呈现出截然不同的缩放行为，表明简单使用更大模型并非医学成像的可靠策略。

## 研究问题与贡献

- 研究问题：DINOv3的自然图像表征能否在医学视觉任务中表现出色？自然图像预训练的缩放能否改善医学领域性能？缩放收益能否跨不同医学任务和模态迁移？

- 设计了覆盖2D/3D分类、分割、配准的多模态医学基准，涉及7种成像模态和14个公开数据集

- 系统评估了DINOv3三种规模（S/B/L）在多种分辨率下的表现，并与医学专用基础模型全面对比

- 揭示了DINOv3在医学领域的优势（结构型模态表现强劲）、局限（WSI/EM/PET严重退化）和不一致的缩放规律

## 方法要点

- 采用冻结DINOv3编码器+轻量级任务适配的策略，确保评估结果反映的是冻结表征本身的质量

- 分类：线性探测（单一全连接层+ BCE损失）和k-NN两种协议，骨干网络完全冻结

- 2D分割：轻量自适应解码器+动态双线性上采样；3D分割：逐切片特征提取+伪3D特征体堆叠+3D卷积解码器

- 配准：PCA特征压缩+3D U-Net预测稠密形变场，遵循DINO-Reg方法

- WSI分类：采用注意力多实例学习（ABMIL）聚合patch级特征

## 关键结果

- X-ray分类：DINOv3-L在NIH-14上AUC 0.7865，超越BiomedCLIP（0.7771）

- 3D CT分类：DINOv3-B线性探测AUC 0.798，显著优于CT-CLIP（0.731）

- EndoVis 2018器械分割：DINOv3-L Binary IoU 92.19%，超越所有已有SOTA方法

- 病理学WSI分类：DINOv3仅与ResNet50基线相当，大幅落后于UNI和CONCH等病理专用模型

- EM神经分割：DINOv3误差比经典方法高一个数量级，特征过于粗糙

- PET/CT肿瘤分割：DINOv3在AutoPET-II和HECKTOR 2022上Dice接近0，完全无法识别代谢活跃区域

- 缩放规律不一致：NIH-14上性能在512x512处达峰后下降；WSI上小模型反而优于大模型

## 局限与可复现性线索

- 仅评估DINOv3模型家族，未与其他视觉基础模型（如Perception Encoder等）做对比实验

- 仅使用线性探测协议，未探索全量微调或参数高效微调（如LoRA）的潜力

- 数据集虽多样但不穷尽，未覆盖4D心脏MRI、3D重建等模态和任务

- 所有实验基于官方数据划分或既有协议，但论文未声明代码或模型权重是否开源

## 分章节总结

### 1 Motivation

- 回顾大语言模型和DINO系列的成功，指出DINOv3已将自监督视觉编码器扩展至70亿参数规模

- 提出三个核心研究问题：DINOv3自然图像表征能否在医学任务上表现出色？缩放能否改善医学性能？缩放收益能否跨任务和模态迁移？

- 分析了医学领域对强视觉表征提取器的迫切需求：模态多样、数据稀缺、长尾分布

### 2 Benchmark Setup

- 设计了覆盖2D/3D分类、分割、配准的多任务基准，涉及X-ray、超声、WSI、内窥镜、EM、CT、MRI、PET等模态

- 系统评估DINOv3-S、DINOv3-B、DINOv3-L三种规模，在多种输入分辨率下的表现

- 2D分类涵盖NIH-14、RSNA-Pneumonia（X-ray）、Camelyon16/17、BCNB（WSI）、Kvasir-Capsule（胶囊内窥镜）、AutoLaparo（腹腔镜）

- 3D分类使用CT-RATE数据集（47k CT体积，18种异常标注）

- 3D分割涵盖MSD（10个子任务）、CREMI、AC3/4（EM）、AutoPET-II和HECKTOR 2022（PET/CT）

- 配准任务包括2D超声CAMUS和3D心脏MRI ACDC数据集

### 3 Task Adaptation

- 分类：以线性探测为主协议，冻结DINOv3骨干，仅训练单一全连接层（学习率0.005，batch 1024，50轮）

- WSI分类：采用ABMIL范式，patch特征经线性投影后注意力聚合，骨干冻结

- 2D分割：冻结编码器+轻量自适应解码器（动态双线性上采样）+分割头

- 3D分割：逐切片冻结特征提取，堆叠为伪3D特征体，3D卷积解码器+Dice+CE损失

- 配准：逐切片特征提取→PCA降维→3D U-Net预测稠密形变场

### 4.1 2D Classification Results

- X-ray：DINOv3-L在NIH-14上AUC 0.7865超越BiomedCLIP；RSNA上BiomedCLIP仍领先

- X-ray缩放行为异常：性能在512x512处达峰后下降，大模型不保证更好结果

- 病理学WSI：DINOv3仅与ResNet50相当，大幅落后于UNI和CONCH，自然图像特征不适用于细粒度纹理分析

- 内窥镜：Kvasir-Capsule上DINOv3不及VAPCaps等专用SOTA；AutoLaparo手术阶段识别中DINOv3-L在Precision和Jaccard上超越STSANet

### 4.2 2D Segmentation Results

- EndoVis 2018：DINOv3-L Binary IoU 92.19%，超越所有单任务、多任务和prompt-based方法

- EDD 2020：DINOv3-S在息肉分割上Dice 93.93%领先，但专用EAT模型在整体mIoU上更高

### 4.3 3D Classification Results

- CT-RATE：DINOv3-B线性探测AUC 0.798，显著优于CT-CLIP（0.731）和CT-Net（0.629）

- k-NN协议也表现强劲（DINOv3-B AUC 0.737），证明2D特征在CT体积上高度有效

### 4.4 3D Segmentation Results

- MSD：DINOv3表现参差，在Lung和Spleen等个别任务上超越nnU-Net，但整体平均落后

- EM神经分割（CREMI/AC3/4）：DINOv3误差比经典方法高一个数量级，特征缺乏高频纹理细节

- PET/CT肿瘤分割：DINOv3在AutoPET-II和HECKTOR 2022上Dice接近0，功能性信息与自然图像结构模式的域偏移过大

### 4.5 2D and 3D Registration

- 2D超声配准（CAMUS）：DINOv3+ConvexAdam Dice 0.8431优于VoxelMorph和MIND+ConvexAdam

- 3D心脏MRI配准（ACDC）：DINOv3+MIND+ConvexAdam Dice 0.7593略优于VoxelMorph（0.7383），且在遮挡场景下对应关系更优

- 超声特征可视化显示DINO-B和DINO-L能提取心肌结构但仍有噪声，提示需要超声专用基础模型

### 5 Findings

- F1：DINOv3自然图像特征在部分医学任务上出色，但在域偏移大的模态上失败——归因于对象中心式预训练使其擅长结构/形状识别，但缺乏WSI细粒度纹理、EM高频细节、PET功能代谢信息的表征能力

- F2：缩放定律在医学领域不一致——增大模型或分辨率并不总提升性能，WSI上小模型反而优于大模型

- F3：缩放收益不可统一迁移——3D CT分类中缩放有益但非单调，3D分割中大模型通常更优，而2D分类则呈现反向缩放

### 5.1 Limitations of this Report

- 仅评估DINOv3家族，未与其他基础模型做对比

- 仅限线性探测，未探索全量微调或参数高效微调

- 数据集不穷尽，未覆盖4D心脏MRI、3D重建等模态和任务

### 6 Conclusion

- 总结DINOv3在CT和X-ray等类自然图像模态上是强大的现成编码器，但在WSI、EM和PET等域偏移大的领域性能显著退化

- 未来方向：参数高效微调适配新领域、开发更精细的2D-to-3D适配器、利用DINOv3特征实现3D重建多视角一致性