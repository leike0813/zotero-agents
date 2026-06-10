专刊：空间科学大数据智能算法模型与工具

Special Issue: Artificially Intelligent Models and Tools for Space Science Big Data

ISSN 2096-742X

CN 10-1649/TP

![](Images_ARIXDK7Z/c4bf1d97edca3dc114a3b175e7545cc719a8f6311a4d25c0af1a93de8a7be854.jpg)

ePIcoO Persistent Identifiers for eResearch

文献CSTR:32002.14.jfdc.CN10-1649/TP.2025.04.011

文献DOI：

10.11871/jfdc.issn.

2096-742X.2025.

04.011

页码：129-142

获取全文

![](Images_ARIXDK7Z/1d67f2923b699d0f4e9331e0bbec8623316fcb9764429c3f54e48f55fa407f47.jpg)

# 面向标签稀缺场景的DINO特征迁移月球岩石薄片图像分类

戴旻昊1，董俊烽2，陈剑2，吕英波2，张立1\*，凌宗成2

1.山东大学，机电与信息工程学院，山东威海264209  
2. 山东大学，空间科学与技术学院，山东 威海 264209

摘 要：【应用背景】月球岩石薄片图像蕴含丰富的地质演化信息，但受限于样本稀缺、不均衡与高昂的标注成本，传统依赖监督学习的分类方法面临应用瓶颈。【方法】为此，本文提出一种基于DINO模型进行自监督对比学习，并将提取的特征搭配上不同分类器的图像特征提取与分类框架，旨在无标签条件下实现岩石图像的自动识别与分析。构建了月球岩石图像数据集，并以对比学习进行特征建模，结合多种分类器进行分类评估。【结果】实验结果显示，自监督模型提取的特征在KNN、MLP等分类器上表现优异，最高分类准确率从45.11%升至91.56%，并在样本数量差距较大的情况下未表现出类别不平衡问题。t-SNE可视化与混淆矩阵分析进一步证实了模型在特征聚类与类别判别方面的有效性。当前模型整体表现出良好的鲁棒性和泛化能力。【结论】本研究为月球岩石图像的自动化解译提供了一种可行路径，服务于月球地质演化研究和相关的深空探测任务。

关键词：月球岩石；岩石薄片图像；自监督学习；自动分类；DINO

# Lunar Rock Thin Section Image Classification in Label-Scarce Scenarios via DINO-Based Feature Transfer

DAI Minhao1 , DONG Junfeng2 , CHEN Jian2 , LYU Yingbo2 , ZHANG Li1\* , LING Zongcheng2

1. School of Space Science and Technology, Shandong University, Weihai, Shandong 264209, China 2. School of Mechanical, Electrical & Information Engineering, Shandong University, Weihai, Shandong 264209, China

Abstract: [Background] Lunar rock thin-section images contain rich information about geological evolution. However, due to limited sample availability, dataset imbalance, and high annotation costs, traditional supervised learning-based classification methods face significant application challenges. [Methods] To address this, this paper proposes a self- supervised contrastive learning framework based on the DINO model, which extracts image features and integrates them with various classifiers to enable automatic recognition and analysis without requiring labeled data. A lunar rock image dataset was constructed, and contrastive learning was employed for feature

数据与计算发展前沿（中英文），2025，7(4) 戴旻昊 等：面向标签稀缺场景的DINO特征迁移月球岩石薄片图像分类

modeling, followed by evaluation using multiple classifiers. [Results] Experimental results demonstrate that features extracted by the self-supervised model achieve outstanding performance with classifiers such as KNN and MLP, reaching a maximum classification accuracy of 91.56% from 45.11%, and it did not exhibit the problem of class imbalance even when the sample sizes were significantly different. The t-SNE visualization and confusion matrix analysis further confirm the model's effectiveness in feature clustering and category discrimination. The model exhibits strong robustness and generalization capabilities. [Conclusion] This study provides a feasible approach for automated interpretation of lunar rock images, supporting research on lunar geological evolution and related deep-space exploration missions.

Keywords: lunar rocks; rock thin section images; self-supervised learning; automated classification; DINO

## 引 言

作为地球唯一的天然卫星，月球的形成与演化历史不仅对揭示太阳系早期演化具有重要意义，同时也为理解地球自身的地质过程提供了关键线索[1]。而研究月球地质演化历史的一种重要手段就是月球岩石研究[2]。月球岩石内部结构和矿物组成中所蕴含的信息对于揭示月球的形成过程、热演化机制以及撞击改造历史等均具有重要意义[3] 。因此，对月球岩石进行准确分类至关重要，这不仅能够揭示月球岩石的矿物种类和分布特征，还能为月球的表面物质组成及其地质历史提供直接证据[4-5]。

目前，月球岩石分类多依赖于元素分析、光谱特征及样品成分分析等手段。如Lucey等[6]使用 UVVIS（Ultraviolet-Visible）相机收集的成像数据测定光谱；Chen等[7]使用可见光、近红外、X射线和伽马射线光谱数据绘制 1:2,500,000 比例尺的月球数字全球岩性图；Engelhardt等[8]使用主元素分析测定岩石种类。然而，这些方法在微观结构解析方面存在一定局限性，难以全面反映岩石的矿物共生关系和变质历史。

岩石薄片技术作为揭示岩石微观构造、矿物组成和变质演化过程的重要手段，早已广泛应用于地球地质研究领域[9]。通过对岩石薄片在偏光显微镜下的显微结构、矿物组成、颗粒排列方式及交代关系进行分析，研究者能够揭示岩石的成因类型、形成环境及其后期变质演化过程[10]。近年来，伴随图像处理和深度学习方法的兴起，岩石薄片图像的自动化识别逐渐成为智能地质分析的重要方向，在岩性分类、矿物识别及储层建模等任务中展现出强大的适应能力与精度优势。如Singh等[11]使用多层感知机提取玄武岩图像特征，周程阳等[12]基于混合专家模型进行岩石薄片图形分类，程国建等[13] 基于 SqueezeNet 卷积神经网络分类，都取得了较好的准确率。

然而，目前已有的研究主要聚焦于地球样品，如Su等[14]对地球岩石薄片的智能分类进展有细致的研究。但月球岩石薄片图像的处理与智能识别尚处于初步探索阶段，缺乏系统性研究与可复用方法体系。目前尚未有与月球岩石薄片图像分类相关的研究。一方面，月球岩石在矿物成分、结构特征及成岩过程上与地球岩石存在一定差异[15]，例如，月球岩石中常见的冲击熔岩和风化月壤等使得图像中矿物之间边界模糊、纹理复杂，导致已有的地球岩石识别模型迁移性能有限[16]；另一方面，受限于月球样品的稀缺性与高昂的专家标注成本，构建大规模、高质量的监督训练数据集面临较大困难，进一步限制了传统深度学习方法在月球岩性识别领域的适用性。此外，月球上各类别岩石样本数量不均衡[7]，极易出现数据集类别不平衡问题，影响监督训练的实际使用效果。

因此，本研究针对月球岩石薄片图像的特点，构建了一套基于图像处理与深度学习技术的系统性自动分析方法。设计一个高精度的图像特征提取与分类框架，通过引入视觉Transformer（ViT）与 DINO（self- DIstillation with NO labels）自监督模型[17]，在少监督条件下实现了月球岩石的自动识别与分类。在此基础上，设计一个轻量级多层感知机，进一步验证模型在下游任务中的实际性能表现。其稳健性和准确性较好，且在不平衡的数据集上有较强的鲁棒性，可以辅助地质专家无需大量人工标注即可深度挖掘月球岩石图像中的潜在特征表示，并为未来月球探测任务提供有力的技术支撑。

## 1 数据集与预处理

## 1.1 数据来源与采集说明

本研究所使用的岩石薄片图像数据来自美国国家航空航天局（NASA）约翰逊航天中心（Johnson Space Center，JSC）维护的 Lunar Sam-ple Curator官方数据库[18]。该数据库收录了阿波罗（Apollo）系列任务期间从月球表面采集的岩石样本及其多种形式的图像资料，涵盖了多种典型的月壤岩性类型。

为保证数据的代表性与多样性，本文选取了Ilmenite（钛铁矿岩）、Olivine（橄榄石岩）、ImpactMelt（撞击熔融岩）、Regolith（风化月壤）这四类常见的月球岩性薄片图像样本进行研究，如图1、表1所示。上述四类样本均来自Apollo任务所采集的原始实物，具有明确的编号与元数据信息[19]。每类岩石包含300\~600张高分辨率显微图像，清晰呈现了其矿物组成、纹理结构及结晶特征。另外，本研究选取的所有图像均为采用正交偏光显微镜技术（cross-polarized light）拍摄的岩石薄片图像，这些在偏振光下拍摄的图像可展现岩石矿物组分的干涉色、形态结构及结晶特征等丰富的细节特征。这类图像能够显著增强不同矿物类型之间的对比性，被广泛应用在岩石薄片分类任务中[20]，是地质岩性分类中常用的重要数据形式[21]。

![](Images_ARIXDK7Z/035c1a3dafc3780980748acf97efe8fc765f53471935680c9cfa239cb67129ea.jpg)  
(a)钛铁矿岩  
(a) Ilmenite

![](Images_ARIXDK7Z/56a323666655c85d3678f775aa064c39da6b9bb1ce34a14fb8682abaf0c35e25.jpg)  
(b)橄榄石岩  
(b) Olivine

![](Images_ARIXDK7Z/91e0b398490b74187f9b8dbe45414310ae92e02004927bef557d5c8023fd06c7.jpg)  
(c)撞击熔融岩  
(c) Impact Melt

![](Images_ARIXDK7Z/37f1b59d82cdc2923cf01303f1042922c521e1c2d7f70541a4a58af9cdf0e6e9.jpg)  
(d)风化月壤  
(d) Regolith  
图1 月球各岩石薄片图像，放大倍数为2.5x，视场范围2.85 mm

Fig.1 Lunar rock thin section image at 2.5x magnification and 2.85 mm field of view  
表1 月球岩石薄片图像信息  
Table 1 Lunar rock thin section image information
<table><tr><td>岩性类别</td><td>英文名称</td><td>所属大类</td><td>采样任务</td><td>图像类型</td><td>数量</td></tr><tr><td>钛铁矿岩</td><td>Ilmenite</td><td>玄武岩</td><td>Apollo 11-17</td><td>正交偏光薄片显微图像</td><td>683</td></tr><tr><td>撞击熔融岩</td><td>Impact Melt</td><td>角砾岩</td><td>Apollo 11-17</td><td>正交偏光薄片显微图像</td><td>623</td></tr><tr><td>橄榄石岩</td><td>Olivine</td><td>玄武岩</td><td>Apollo 11-17</td><td>正交偏光薄片显微图像</td><td>323</td></tr><tr><td>风化月壤</td><td>Regolith</td><td>角砾岩</td><td>Apollo 1-17</td><td>正交偏光薄片显微图像</td><td>611</td></tr></table>

## 1.2 图像预处理方法

本研究采用基于自监督学习的 DINO 模型进行岩石图像特征提取。通过视觉特征的自蒸馏训练方式，在无标签图像上构建具有判别能力的视觉表示，进而用于下游的监督分类任务。

为适应模型训练需求并提升模型对月球岩石图像的特征提取与识别能力，本文在模型自带的预处理功能的基础上，针对无监督预训练阶段与监督学习阶段分别设计了差异化的数据增强策略。在无监督特征提取阶段，采用包括图像旋转、仿射错切、颜色扰动及高斯模糊等较强的数据增强组合，增强模型在无标签数据上的鲁棒性与泛化能力。在监督分类训练阶段，使用温和的数据增强（如颜色扰动与轻度模糊），提升模型对真实场景图像差异的适应性。而在监督测试阶段则不进行额外图像增强，仅保留必要的标准化操作，确保评估结果的稳定性与一致性。本文所用数据增强策略均基于Tatar等人[22]对岩石薄片图像分类的研究，确保策略对结果的正向影响。

## 1.3 数据集划分策略

为模拟真实任务中大量无标签数据的典型场景，本文将数据划分为无监督训练集、监督训练集与测试集三部分。

无监督训练集：占全部图像的 70%，不使用标签，仅用于自监督训练；

监督训练集：占比 20%，用于下游分类模型的有监督训练；

验证测试集：占比 10%，用于评估模型在分类任务上的泛化性能。

该划分策略兼顾了自监督模型训练所需的大规模无标签样本和监督模型优化所需的有限标签信息，有助于验证本文方法在真实应用中的

可行性与实用性。

## 2 模型方法设计

## 2.1 自监督方法DINO：原理与适应性分析

近年来，自监督学习（Self-supervised Learn-ing，SSL）已成为计算机视觉领域的重要研究方向，在无标签数据充分、标注成本高昂的任务中展现出显著的优势[23]。DINO是一种由Caron等人[17]提出的无监督视觉特征学习框架，在无需任何人工标签的情况下，通过结构对称的学生-教师网络结构实现对图像潜在结构的建模与语义特征提取。基于视觉 Transformer（Vision Trans-former, ViT）主干结构，DINO采用了自蒸馏机制（Self-Distillation）与多视图一致性结合的训练策略。如图2所示，在该框架中的两组网络结构相同但其参数更新方式不同：学生网络通过梯度反向传播更新，而教师网络则采用学生参数的滑动平均更新，即：

$$
\theta _ { \iota } \gets \lambda \Theta _ { \iota } + \big ( 1 - \lambda \big ) \Theta _ { s }
$$

在训练过程中，原始图像会经过不同的数据增强策略，生成多个视图，其中包括两个全局视图（Global views，图像裁剪较大，输入学生网络与教师网络）和若干个局部视图（Local views，图

（1）

![](Images_ARIXDK7Z/17c8dcedbccff162de65827bb69fe1d08d308fe87776c86dcbdbc8cf5a7a3775.jpg)  
图2 DINO模型的架构图  
Fig.2 Structure of DINO model

像裁剪较小，仅输入学生网络）。经过各自网络编码后，输出特征：

$$
z _ { s } = f _ { \theta } ( v _ { s } )\tag{2}
$$

DINO采用温度调节后的softmax分布形式进行一致性对齐，学生网络的网络输出可由公式（3）描述：

$$
P _ { \mathrm { * } } \big ( x \big ) ^ { ( i ) } = \frac { \displaystyle \exp \Big ( g _ { \mathrm { \theta _ { * } } } \big ( x \big ) ^ { ( i ) } / \tau _ { s } \Big ) } { \displaystyle \sum _ { k = 1 } ^ { K } \exp \Big ( g _ { \mathrm { \theta _ { * } } } \big ( x \big ) ^ { ( k ) } / \tau _ { s } \Big ) }\tag{3}
$$

从而计算出DINO模型的loss函数：

$$
H ( a , b ) = - a \log b\tag{4}
$$

$$
L _ { \scriptscriptstyle D I N O } = m i n H \big ( P _ { \scriptscriptstyle s } ( x ) , P _ { \scriptscriptstyle t } ( x ) \big )\tag{5}
$$

这种方法不依赖标签、也无需构造负样本对，因此使得DINO在大规模无标签图像上仍能学到具有良好可分性与语义一致性的特征表示，为下游分类、检索等任务提供了强大的特征基础。

从无监督分类效果来看，根据Caron等[17]的研究显示，DINO的无监督特征提取在下游线性和KNN任务中表现均优于BYOL、MoCov2等基线模型。

## 2.2 下游分类器设计

DINO所提取的图像特征已经具有良好的聚类特性与线性可分性，因此在下游分类阶段，无需引入复杂模型即可实现较高的分类精度[24]。为兼顾分类性能与模型轻量性，本文构建了五个轻量判别模型以对DINO特征向量进行分类。本文参考Balestriero等[25] 提出的无监督训练评估策略，依次使用KNN，MLP-Rock和微调ResNet18模型，并添加了SVM及其变种，使模型呈现出复杂程度和非线性特征拟合程度的阶梯式递增，以此充分验证特征向量的分类能力。

## 2.2.1 K近邻分类器

K 近邻分类器（K-Nearest Neighbors, KNN）是一种典型的非参数方法，在无需训练的前提下即可进行推理。在本研究中，KNN直接利用DI-NO提取的特征向量进行相似度计算与最近邻搜索，输出Top-1类别预测（即选择最近邻样本的类别作为预测结果）。该方法虽不具备学习能力，但能作为无监督特征效果的初步评估工具验证DINO所提取特征的可分性与聚类效果。

## 2.2.2 支持向量机

支持向量机（Support Vector Machine, SVM）是一种高效的线性判别模型，适合处理维度较高的特征表示，尤其适用于小样本监督分类场景。本文使用线性核函数的SVM对DINO特征向量进行训练，构建决策边界，评估其在不同岩石类别上的分类能力。该方法结构简单，适用于DINO提供的近似线性可分的嵌入空间。其判别函数为：

$$
f ( x ) = \mathrm { s i g n } { \big ( } w ^ { \top } x + b { \big ) }\tag{6}
$$

其优化目标为：

$$
\begin{array} { l } { \displaystyle \operatorname* { m i n } _ { \boldsymbol { w } , \boldsymbol { b } } \frac { 1 } { 2 } \big | \boldsymbol { w } \big | ^ { 2 } + C \displaystyle \sum _ { i = 1 } ^ { N } \xi _ { i } } \\ { \displaystyle s . t . \quad y _ { i } \big ( \boldsymbol { w } ^ { \top } \boldsymbol { x } _ { i } + b \big ) \gtrsim 1 - \xi _ { i } , \xi _ { i } \gtrsim 0 } \end{array}\tag{7}
$$

## 2.2.3 混合核支持向量机

在保持轻量结构的前提下，为了增强判别边界的非线性拟合能力，本文还设计了一种混合核支持向量机（SVM-Mix）方法，即将线性核与径向基核（RBF）进行加权组合，形成混合核函数，其具体形式为：

$$
\begin{array} { r } { K \big ( x _ { i } , x _ { j } \big ) = \alpha \cdot \big \langle x _ { i } , x _ { j } \big \rangle + \beta \cdot \exp \big ( { - \gamma \big | x _ { i } - x _ { j } \big | ^ { 2 } } \big ) } \end{array}\tag{8}
$$

## 2.2.4 ResNet18 微调网络

为进一步验证不同下游分类器在DINO特征基础上的表现，本文引入经典的深层卷积神经网络结构 ResNet-18（Residual Network）作为判别模块之一。ResNet-18由17个卷积层与1个全连接层构成，其核心为4个残差块阶段（Stage），每个阶段包含2个基本残差单元（Residual Block）。每个残差单元包含两层3×3卷积，并采用恒等或投影捷径连接以实现残差加法。

ResNet系列模型通过引入残差连接，有效缓解了深层网络中的梯度消失问题，并具备较强的特征抽象与模式识别能力[26]，但在DINO模型下游特征提取效果的表现未知。该策略主要用于探究较深的深度模型是否能进一步提升特征判别能力。

## 2.2.5 多层感知机

为对DINO提取的图像特征进行监督分类，本文设计了一个轻量级的多层感知机（MLP）结构，用于在特征空间中实现类别判别，并将其命名为MLP-Rock，如图3所示。该MLP模型由多个堆叠的线性层（Linear）、批归一化层（Batch-Norm, BN）、激活函数和 Dropout 层组成，以 DI-NO输出的高维全局图像特征向量作为输入，经由Softmax层输出分类结果。它在保证模型轻量性的同时，具备较强的判别能力，适合中小规模标签数据下的图像分类任务。

## 2.3 技术流程图与模块描述

图4系统性展现了本文提出的月球岩石薄片图像分析方法的整体技术流程及其各组成模块之

间的协作关系。整个处理流程遵循“预处理→特征学习→下游分类→结果评估”的主线逻辑。

## 2.3.1 无监督阶段

本研究使用DINO框架在大量未标注的月球岩石薄片图像上进行特征学习。原始图像首先经过多种数据增强生成多个视图（包括全局和局部视图），再分别送入教师网络与学生网络进行对比学习训练。在连续的训练过程中，DINO模型逐步建立了图像之间的语义对齐能力，实现了无需标签即可获得区分性强、结构稳定的图像表示向量。

最终，该阶段输出一个已经训练完成的特征提取器（教师模型），可以将任意图像转化为嵌入空间中的定长向量表示。

![](Images_ARIXDK7Z/066402940106db0dd660f0cdd5017f682ee6a98c657a1f6f35da180473dd4961.jpg)  
图3 MLP-Rock的架构图

Fig.3 Structure of MLP-Rock  
![](Images_ARIXDK7Z/5175fda0688745abc9f975ef831c1fabd66fbe52a8a2b9ece35f3949034f3ff2.jpg)  
图4 月球岩石薄片图像处理流程  
Fig.4 Lunar rock thin-section image processing pipeline

## 2.3.2 监督阶段

在使用无监督训练DINO获得了高质量图像特征后，本研究进一步利用小规模的标注样本对图像进行分类建模。本阶段的重点在于设计并比较多种典型分类器对图像特征的适应性。

这一阶段的所有分类器均以DINO提取的图像特征向量为输入，统一评估其在不同分类模型下的表现能力，从而分析特征分布结构与分类决策之间的内在联系。

在监督阶段，DINO冻结后的特征提取器将每张图像转化为定长的嵌入向量，作为下游分类器的输入。无参数分类器如KNN直接基于向量间的距离进行预测；而有参数分类器如SVM、混合核SVM、MLP、ResNet18，利用带标签数据在训练集上拟合决策边界或特征变换映射。

本方法中的特征抽取与任务建模高度解耦，DINO专注于学习图像语义表示，而下游模块则专注于决策，这种路径设计兼顾训练效率与模型泛化能力，特别适用于标注稀缺的岩石薄片图像分类任务。

## 3 岩石薄片图像分类实验与结果分析

## 3.1 实验设置与参数说明

实验使用的软硬件环境为NVIDIA RTX3090

GPU\*1，内存 24 GB，操作系统 Ubuntu 20.04，Py-thon3.11。各模型的参数配置见表2。

## 3.2 实验结果与性能分析

## 3.2.1 自监督训练过程结果

本研究在模型训练初期采用了自监督学习策略，以提升特征提取模块在缺乏标注样本情况下的泛化能力与表示质量。DINO模型训练时的损失函数在500次迭代时已经趋于稳定。

## 3.2.2 不同分类器效果

为了评估自监督学习后所提取图像特征在不同分类器中的表现能力，选取2.2节中所述五种机器学习分类器进行实验对比。在同一组自监督训练后的特征上，对各分类器进行了训练与测试，并使用如下评价指标对其性能进行了全面分析：

## （1）单类别指标

查准率（Precision）：预测为某类样本中真正为该类的比例。

查全率（Recall）：某类中被正确识别的样本占该类总样本的比例。

F1分数（F1 Score）：查准率与查全率的调和均值，衡量模型的综合分类能力。

对每一类别均计算上述指标之后，使用宏平均（Macro Avg，对所有类别的指标求算术平均）和加权平均（Weighted Avg，按各类别的样本数量加权计算平均值），从多角度分析分类器分类效果。

表2 实验参数配置表  
Table 2 Experimental parameter
<table><tr><td></td><td>参数项</td><td>值</td><td>说明</td></tr><tr><td>DINO</td><td>主干网络</td><td>ViT-S/16</td><td>Patch size 为16 的小型 Vision Transformer,包含12个 Transformer Encoder Block</td></tr><tr><td></td><td>学生模型温度</td><td>0.1</td><td>控制softmax分布的平滑度</td></tr><tr><td></td><td>教师模型温度</td><td>0.04</td><td>稳定教师输出</td></tr><tr><td></td><td>优化器</td><td>AdamW</td><td>加权衰减的Adam优化器</td></tr><tr><td></td><td>训练轮数</td><td>500 epochs</td><td>保证特征学习收敛</td></tr><tr><td></td><td>batch_size</td><td>64</td><td>实验环境下所能使用的最大batch_size</td></tr><tr><td>KNN</td><td>k</td><td>20</td><td>DINO推荐参数值</td></tr><tr><td>MLP-Rock</td><td>训练轮数</td><td>50 epochs</td><td></td></tr><tr><td></td><td>学习率</td><td>0.0003</td><td></td></tr><tr><td>ResNet18</td><td>训练轮数</td><td>30 epochs</td><td></td></tr><tr><td></td><td>学习率</td><td>0.001</td><td></td></tr></table>

## （2）总体指标

本研究使用准确率（Accuracy）作为总体指标，即所有正确分类样本占总样本比例。

从表3中的实验结果可见，不同分类器在准确率与各项评估指标上均表现出较高水平，证明本文所用的自监督学习模型在无标注数据中成功提取了具有判别性的特征。其中MLP-Rock表现最优，在所有指标中均为最高值，尤其是其Recall (Macro)达到了 0.9210，表明这种模型在各类别上均有优秀的识别能力。KNN与ResNet18的表现次之，它们具有良好的均衡性与稳定性，适用于快速原型测试。而SVM与SVM-Mix表现相近，均低于MLP-Rock与KNN，但它们在边界判别类任务中仍具一定优势。

值得注意的是，各模型的宏平均指标与加权平均指标差异不大。这说明各模型在多类别目标上的识别能力分布较为均衡，未出现明显的类别偏倚，进一步证明自监督模型对特征空间的判别性与普适性较强。

由上述结论可知，DINO自监督模型从月球岩石薄片中提取的图像特征具有良好的下游适应性，可以广泛应用于不同类型的分类模型中。MLP-Rock分类器在当前任务中取得最优结果，显示出浅层神经网络在充分利用自监督特征方面的潜力。

## 3.3 特征空间优化效果验证

为验证自监督学习对特征空间结构的优化效果，从直观特征分布可视化与下游任务性能评估两个角度进行分析。

## 3.3.1 特征可视化分析

t- SNE（t- 分 布 随 机 邻 居 嵌 入 ，t- distributedStochastic Neighbor Embedding）是一种常用的非线性降维方法，尤其适用于高维数据的可视化。在保持原始高维空间中数据点之间的相对相似性的前提下，它可将样本映射到二维或三维空间，从而使人类能够直观观察特征分布与类间关系[27] 。

在本研究中，利用t-SNE对经自监督模型提取的高维图像特征进行可视化分析，评估模型是否能够有效区分不同类别的月球岩石图像。在理想情况下，若模型学习到的特征具备良好的判别性，则在t-SNE投影结果中应出现明显的类间分离结构，即同类样本趋向聚集，而异类样本之间则保持一定的间隔。该可视化方法为缺乏标注的无监督学习提供了一种有效而直观的方式，用以评估特征表示的区分能力与结构合理性。

分别在模型初始阶段（未经自监督训练）和完成自监督训练后提取了每张岩石图像的深层特征，并采用t-SNE算法将其从高维特征空间投影到二维平面，以直观展示各类岩石在特征空间中的分布关系。如图5（a）和5（b）所示，初始阶段的t-SNE可视化结果显示不同类别的月球岩石薄片在二维空间中高度重合混杂。

然而，在完成自监督训练之后，相同的月球岩石薄片数据样本的t-SNE投影图展现出了明显的结构变化。原本混杂的各类样本开始在二维空间中逐渐聚集，形成较为清晰的簇结构。不同类别的岩石图像在特征空间中的距离显著增大，边界趋于明确，这表明DINO模型即便在未使用任何标签信息的前提下，仍能逐步学习到反映岩石语义类别差异的深层特征，展现出良好的表示学习能力。

表3 不同分类器在验证集上获得的指标  
Table 3 Validation metrics of various classifier
<table><tr><td>Classifier</td><td>Accuracy</td><td>Precision (Macro)</td><td>Recall (Macro)</td><td>F1 Score (Macro)</td><td>Precision (Weighted)</td><td>Recall (Weighted)</td><td>F1 Score (Weighted)</td></tr><tr><td>KNN</td><td>0.8822</td><td>0.8830</td><td>0.8747</td><td>0.8779</td><td>0.8830</td><td>0.8822</td><td>0.8817</td></tr><tr><td>SVM</td><td>0.8689</td><td>0.8751</td><td>0.8574</td><td>0.8645</td><td>0.8701</td><td>0.8689</td><td>0.8681</td></tr><tr><td>SVM-Mix</td><td>0.8756</td><td>0.8765</td><td>0.8691</td><td>0.8723</td><td>0.8757</td><td>0.8756</td><td>0.8751</td></tr><tr><td>ResNet18</td><td>0.8911</td><td>0.8881</td><td>0.8976</td><td>0.8917</td><td>0.8936</td><td>0.8911</td><td>0.8913</td></tr><tr><td>MLP-Rock</td><td>0.9156</td><td>0.9165</td><td>0.9210</td><td>0.9185</td><td>0.9155</td><td>0.9156</td><td>0.9153</td></tr></table>

![](Images_ARIXDK7Z/1803c890b045522a1ff0bcdc9fa2b975cbbecda5df8d1f580f6bc2b2445c5a9f.jpg)  
(a) Original features

![](Images_ARIXDK7Z/013e9710b42ffc22503119a25176f070166bb41f9180cf11621a88872e1a1684.jpg)  
(b) features after training  
图5 特征提取t-SNE图  
Fig.5 t-SNE visualization

此外，尽管在DINO自监督训练完成后的月岩薄片样本的可视化图中仍存在少量类别边界模糊或样本重叠的现象，样本整体特征的分布仍然较为稳定，说明DINO模型具备良好的初步语义感知能力，为其下游任务打下了坚实基础。

## 3.3.2 KNN下游性能评估

为了进一步量化DINO自监督特征的判别能力，本研究在提取的深层特征上训练了一个简单的K-近邻（KNN）分类器，并使用有限的标注样本进行评估。该方法不引入额外的可学习参数，仅依赖于特征本身的几何分布，因此能够有效反映特征空间的结构性与类间可分性。

具体而言，在训练集中提取每张月球岩石薄片图像的特征表示，并以此作为KNN的支持样本，再对测试集中的图像进行分类预测。分别在模型初始阶段（未经自监督训练）和完成自监督训练后进行KNN分类评估，并统计其Top-1准确

率作为性能指标。

图6（a）和6（b）是未自监督学习和学习后的KNN 分类结果。从图中计算可以得出，自监督学习后分类准确率从45.11%上升到88.22%，说明 DINO 模型在无监督条件下学习到的月球岩石薄片图像特征具备良好的判别性和类间区分能力，显著提升了下游岩石薄片分类任务的性能。从混淆矩阵来看，每个类别的准确率均大幅度上升，尤其是原本混淆较为严重的 Ilmenite（钛铁矿岩）与 Impact Melt（撞击熔融岩）之间的错误预测比例明显降低，说明自监督训练之后的特征已经能够表示不同类别之间更具代表性的语义特征。

实验结果表明，在无监督条件下DINO学习得到的特征在KNN分类器中依然取得了较高的准确率，该结果与前述t-SNE可视化分析较为一致，进一步印证了自监督DINO模型在无标签条件下具备较强的特征学习能力。

## 3.4 样本类别不平衡的说明

因引用数据库限制，本研究使用数据集存在样本类别不平衡现象。橄榄石岩仅323张，而其他类别有600+张。经过分析，认为本模型对类别不平衡问题有较好的适应能力和鲁棒性。

![](Images_ARIXDK7Z/0ecf9fe56a58912a7b1500aa59424852c651d43ffc3e7ea06b1277acdbe14da4.jpg)  
(a)原始特征  
(a) Original features

![](Images_ARIXDK7Z/cced4c24d7e39a2ad95ada77f953616991aeec8bd466ef5d7e66c200b600aa43.jpg)  
(b)训练后特征  
(b) features after training  
图6 混淆矩阵  
Fig.6 Confusion matrix

从理论分析，根据Liu等人[28]的研究显示，无监督学习更容易学习到与标签无关但可迁移的特征，使得无监督学习相较于监督学习来说在数据类别不平衡时有更好的鲁棒性。

本研究分类实际情况见表4。样本类别不平衡通常导致的后果是模型有较强偏向性，表现为小样本类别具有较高的精确率和较低的召回率。从表中数据可知，小样本类别（橄榄石岩）具有较高的精确率和召回率且总体上较为均衡，证明该模型对数据类别不平衡的鲁棒性较好。

表4 MLP-Rock作为分类器的各类别分类指标  
Table 4 Metrics in MLP-Rock
<table><tr><td></td><td>precision</td><td>recall</td><td>f1-score</td><td>support</td></tr><tr><td>Ilmenite</td><td>0.9220</td><td>0.9489</td><td>0.9353</td><td>137</td></tr><tr><td>Impact</td><td>0.9333</td><td>0.8960</td><td>0.9143</td><td>125</td></tr><tr><td>Olivine</td><td>0.9265</td><td>0.9692</td><td>0.9474</td><td>65</td></tr><tr><td>Regolith</td><td>0.8843</td><td>0.8699</td><td>0.8770</td><td>123</td></tr></table>

## 4 讨 论

本文设计了一个基于自监督学习的月球岩石薄片图像特征提取与分类框架，实验结果表明

该方法在特征判别性和下游分类性能方面均具有显著优势。然而，该方法在实际应用中还有如下问题需要考虑。

## 4.1 分类器性能差异原因

不同分类器在相同特征输入下表现出不同的准确率与鲁棒性。从实验数据来看，MLP-Rock和KNN表现出优于ResNet18和SVM的分类能力，这可能是因为自监督学习使得同类图像特征在空间上高度聚集、异类特征分布分散，利于KNN分类，但难以找到SVM的明确分界。通过图7可以看出，ResNet18存在较严重的过拟合现象。通过3.3节可知，DINO提取到的月球岩石薄 片 特 征 向 量 已 经 具 有 较 高 线 性 特 征，而ResNet18的复杂程度过高，导致训练出现了过拟合现象。

## 4.2 自监督学习的适用性与有效性

本研究中所采用的自监督学习策略，主要依赖于图像间的对比关系，在无标签条件下学习出具有判别性的图像表示。然而，自监督学习的性能在一定程度上依赖于前期的数据增强策略和训练超参数的选择。图像的随机裁剪、旋转和输入模型前的归一化等操作在月球岩石薄片图像中可能会破坏重要的微观结构，进而影响模型对“局部-整体”关系的建模。因此，未来需要在不破坏月球岩石薄片语义结构的前提下，设计更具针对性的自监督增强策略。

![](Images_ARIXDK7Z/83d77375e88b5bf2180bef03da68d61ced89ba63de4417d96909d14910c1cb9a.jpg)  
图7 ResNet18分类器在月球岩石样本的训练集和测试集中获得的准确率  
Fig.7 The accuracy acquired by ResNet18 in Train Set and Test Set of the lunar rocks dataset

## 4.3 分类错误成因

分析错误分类数据后，一个重要的成因是部分岩石成分较为复杂，如图8（a）为风化月壤，但其中含有大量的黑色不透明矿物，与钛铁矿玄武岩的特征相似。又如图8（b）中含有较大矿物颗粒，符合撞击熔融岩在熔融时产生的特征。由上可知，部分岩石尤其是风化月壤成分较为复杂，难以从岩石薄片图像上明确辨别。从表 4 也可以看出，风化月壤的指标均为类间最低水平，符合推论，未来可以考虑结合其他数据多模态识别分类。

## 4.4 新种类识别能力

在传统的端到端深度学习模型中，特征提取与分类通常高度耦合，导致模型在面对新类别时需要进行全面的微调或重新训练，这不仅计算成本高昂，而且可能因灾难性遗忘（catastrophic for-getting）而损害原有类别的识别性能。相比之下，本模型采用的“特征识别-分类”解耦架构显著提升了系统的灵活性和可扩展性。

![](Images_ARIXDK7Z/3756930a8d9bb75bc7f1c3e4ab4cafea1451d0e020cec422204c880f57aee598.jpg)  
(a)风化月壤，错分类为钛铁矿岩

(a) Regolith, misclassified as Ilmenite  
![](Images_ARIXDK7Z/40741ab307bacd1f17ce36ef2a74ff074d94756b866075727e13a326876d044c.jpg)  
(b)风化月壤，错分类为撞击熔融岩  
图8 部分分类错误图像及其种类  
Fig. 8 Some incorrectly classified images and their types

具体而言，模型的特征提取模块通过无监督或自监督学习捕获输入数据的通用表征，而分类模块则基于这些固定特征进行轻量级的监督学习。这种设计使得模型在面对新增类别时，无需对整个网络进行反向传播优化，仅需在已提取的特征空间上训练一个新的分类头（classificationhead），从而大幅降低计算开销。

## 5 结 论

本研究围绕月球岩石薄片图像的自动识别与分析问题，设计并实现了一套图像处理与自监督深度学习的图像特征提取并分类相结合的框架。

首先构建了一个高质量的月球岩石薄片图像数据集，并从中提取样本用于自监督训练与分类模型测试。其次，采用对比学习策略对图像进行自监督训练，使DINO模型能够自动学习月球岩石薄片图像中潜在的判别性语义信息。通过t-SNE降维可视化方法清晰展示了自监督学习前后图像特征在高维空间中分布结构的显著变化，证明本文所用方法提升了特征聚类与类间分离能力。

再次，本文基于自监督学习提取的月球岩石薄片图像特征，分别采用和设计了KNN、SVM、SVM-Mix、MLP-Rock、ResNet18 等多种分类器对自监督学习提取的图像特征进行对比分析。实验结果显示在无需标签参与训练的前提下，自监督模型所提取的特征在多个分类器上均取得了优异性能，最高分类准确率可达91.56%。混淆矩阵分析显示本文设计的方法对各类月球岩石的识别精度均有不同程度提升，尤其在类间边界模糊的情况下表现尤为稳健，进一步证明了特征提取模块的判别性和鲁棒性。

另外，本文探讨了该模型在样本类别不平衡的背景下的优势，可以更好地处理实际场景下的分类问题。

对比训练前后的特征可视化结构与下游分类性能，验证了该方法在无监督场景中的实际可行性与有效性。

总体而言，本研究构建的月球岩石图像分析框架在数据稀缺条件下展现出强大的适应性和性能优势，有效缓解了对大规模人工标注数据的依赖，提升了模型的泛化能力与实际应用潜力,为岩石的自动化解译提供了一种新的方式，也能促进人工智能算法在月球的地质研究和相关的深空探测任务中的应用。未来本框架也可用于如火星等其他地外行星和地球上岩石薄片图像

的智能分类工作。

## 利益冲突声明

所有作者声明不存在利益冲突关系。

## 参考文献

[1] TAYLOR S R. Planetary science: a lunar perspective[M]. Houston, Tex: Lunar and Planetary Institute, 1982.

[2] WILSHIRE H G, STUART A L, JACKSON E D. Apollo 16 rocks: Petrology and classification[J]. Journal of Geophysical Research, 1973, 78(14): 2379- 2392.

[3] TAYLOR G J. Ancient lunar crust: Origin, composition, and implications[J]. Elements, 2009, 5(1): 17- 22.

[4] NEAL C R. Petrogenesis of mare basalts: A record of lunar volcanism[J]. Geochimica et Cosmochimica Acta, 1992, 56(6): 2177-2211.

[5] KIRK R L. The competition between thermal contraction and differentiation in the stress history of the Moon[J]. Journal of Geophysical Research: Solid Earth, 1989, 94(B9): 12133-12144.

[6] LUCEY P G, BLEWETT D T, JOLLIFF B L. Lunar iron and titanium abundance algorithms based on final processing of Clementine ultraviolet-visible images[J]. Journal of Geophysical Research: Planets, 2000, 105(E8): 20297-20305.

[7] CHEN J, LING Z C, LIU J Z, et al. Digital and global lithologic mapping of the Moon at a 1:2,500,000 scale[J]. Science Bulletin, 2022, 67(20): 2050-2054.

[8] VON ENGELHARDT W, STENGELIN R. Normative composition and classification of lunar igneous rocks and glasses, I: Lunar igneous rocks[J]. Earth and Planetary Science Letters, 1979, 42(2): 213-222.

[9] JIANG Y, ZHOU J, FENG J, TENG Q. Application of DBSCAN algorithm and mathematical morphology in rock thin section image segmentation[J]. Microcomputer Applications, 2016, 35: 39-41.

[10] 吴继敏. 薄片显微描绘和自动图像分析技术在岩石学定量评价中的应用[J]. 矿物岩石, 1999(02): 26-31.

[11] SINGH N, SINGH T N, TIWARY A, SARKAR K M. Textural identification of basaltic rock mass using image processing and neural network[J]. Computational Geosciences, 2010, 14(2): 301-310.

[12] 周程阳, 刘伟, 吴天润, 等. 基于混合专家模型的岩石薄片图像分类 [J]. 吉林大学学报(理学版), 2024,62(4): 905-914.

[13] 程国建, 李碧, 万晓龙, 等. 基于 SqueezeNet 卷积神经网络的岩石薄片图像分类研究[J]. 矿物岩石,2021, 41(4): 94-101.

[14] SU C, ZHU K Y. Research progress of intelligent image analysis for petrographic thin section images[J]. Bulletin of Mineralogy, Petrology and Geochemistry, 2023, 42(1): 13-25.

[15] ZONG K Q, WANG Z C, LI J W, et al. Bulk compositions of the Chang'E-5 lunar soil: Insights into chemical homogeneity, exotic addition, and origin of landing site basalts[J]. Geochimica et Cosmochimica Acta, 2022, 335: 284-296.

[16] XIA Z P, MIAO B K, CHEN H Y, et al. The petrology and mineralogy of lunar meteorite EET 96008 from Antarctica[J]. Advances in Polar Science, 2013, 25 (4): 352-361.

[17] CARON M , TOUVRON H, MISRA I, et al. Emerging Properties in Self- Supervised Vision Transformers[C]// 2021 IEEE/CVF International Conference on Computer Vision (ICCV). Montreal, QC, Canada: IEEE, 2021: 9630-9640.

[18] NASA Johnson Space Center. Lunar Sample Compendium[DB/OL]. Houston: NASA Johnson Space Center. https://curator.jsc.nasa.gov/lunar/samplecatalog/.

[19] APOLLO 15 PRELIMINARY EXAMINATION TE-AM. The Apollo 15 lunar samples: A preliminary description[J]. Science, 1972, 175(4020): 363-375.

[20] CHEN H, XIE L, SHU Q, MIAO B. Northwest Africa 12279: Evidence for the interaction between early lunar mantle melt and anorthositic crust[J]. Journal of Geophysical Research: Planets, 2023, 128: e2023 JE007844.

[21] DEER W A, HOWIE R A, ZUSSMAN J. An introduction to the rock- forming minerals[M]. 2nd ed. London: Mineralogical Society of Great Britain and Ire-

land, 2013.

[22] TATAR A, HAGHIGHI M, ZEINIJAHROMI A. Experiments on image data augmentation techniques for geological rock type classification with convolutional neural networks[J]. Journal of Rock Mechanics and Geotechnical Engineering, 2025, 17(1): 106-125.

[23] GUI J, CHEN T, ZHANG J, et al. A survey on self-supervised learning: Algorithms, applications, and future trends[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2024, 46(12): 9052-9071.

[24] ABE M, NIIOKA H, MATSUMOTO A, et al. Self-supervised learning for feature extraction from glomerular images and disease classification with minimal annotations[J]. Journal of the American Society of Nephrology, 2025, 36(3): 471-486.

[25] BALESTRIERO R, IBRAHIM M, SOBAL V, et al. A Cookbook of Self-Supervised Learning[J]. arXiv preprint arXiv:2304.12210, 2023.

[26] HE K, ZHANG X, REN S, SUN J. Deep residual learning for image recognition[C]// Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition. Las Vegas: IEEE, 2016: 770-778.

[27] VAN DER MAATEN L, HINTON G. Visualizing data using t- SNE[J]. Journal of Machine Learning Research, 2008, 9: 2579-2605.

[28] LIU H, HAOCHEN J Z, GAIDON A, et al. Self- supervised Learning is More Robust to Dataset Imbalance[C]// International Conference on Learning Representations, 2022.

收稿日期：2025年4月29日

戴旻昊，山东大学，本科，目前就读于计算机科学与技术专业。

本文负责本文初稿撰写、模型构建和开展实验。

DAI Minhao, is currently pursuing the B.E. degree in Computer Science and Technology at the Shandong University.

![](Images_ARIXDK7Z/578140736a2ed5354ad35cec1d4ba96b06151082af17a7b7efdc1cc728e67347.jpg)

In this paper, he is responsible for drafting the paper, building the model and conducting the experiments.

E-mail: 3221416220@qq.com

张立，山东大学，副教授。任国家深空探测遥感测绘工作委员会委员、山东宇航学会理事，近年来主要从事机器学习/深度学习在行星数据中应用等方面的教学与科研工作。

本文负责制定研究计划，论文修改。

ZHANG Li, is an associate professor at Shandong University. He is a member of the National Committee for Remote Sensing and Mapping of Deep Space Exploration, and council member of Shandong Society of Astronautics. In recent years, he has mainly been engaged in teaching and research work related to the application of machine learning and deep learning techniques to planetary data.

![](Images_ARIXDK7Z/91b9cd6a57a2f055eff4c07594592f0306661f81fbc50f768f6fd3ce8a0454ae.jpg)

In this paper, he is responsible for

formulating the research plan and revising the manuscript. E-mail: zhangliwh@sdu.edu.cn