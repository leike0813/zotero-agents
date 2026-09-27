# 基于Transformer的 DETR目标检测算法综述

李沂杨1，陆声链1，王继杰2，陈明1

（1．广西师范大学计算机科学与工程学院广西多源信息挖掘与安全重点实验室 ，广西 桂林541004；2．广西师范大学教务处 ，广西 桂林541004）

摘 要 ： 在目标检测领域 卷积神经网络（CNN） 凭借其优异的准确性和可扩展性 长期主导着相关研究 并获得了学术界的广泛认可。 在此框架下 ，先后涌现出基于区域的卷积神经网络（R－CNN）系列（如FastR－CNN、FasterR－CNN）与 YOLO（YouOnlyLookOnce）系列等多个代表性模型。 随着 Transformer在自然语言处理领域的成功 ，研究者开始探索将其用于计算机视觉领域 ，由此产生了视觉Transformer（ViT）和SwinTransformer等视觉骨干网络。 Facebook团队为减少目标检测任务中的先验知识和后处理 ， 在2020年推出了一种端到端目标检测算法———基于Transformer的DETR（DEtectionTRansformer） 。 尽管DETR在目标检测领域展现出潜力 ，但也存在收敛速度慢、准确性较差、目标查询的物理意义不明确等缺点。 这促使研究者对该算法开展了进一步的研究和改进。 本研究旨在归纳总结针对 DETR的改进探索 ，并分析它们的优势与不足 ，同时对利用 DETR开展的前沿研究和细分应用领域进行概括 ，最后给出DETR在计算机视觉领域的未来展望。

关键词 ： 计算机视觉 ；目标检测 ；DETR算法 ；视觉 Transformer；图像分割

中图分类号 ： TP393

文献标志码 ： A

DOI： 10．19678／j．issn．1000－3428．0069312

# ReviewofDETRObjectDetectionAlgorithmBasedonTransformer

LIYiyang1， LUShenglian1， WANGJijie2， CHEN Ming1

（1．GuangxiKeyLaboratoryofMulti－SourceInformationMiningandSecurity，

SchoolofComputerScienceandEngineering， GuangxiNormalUniversity， Guilin541004， Guangxi， China；2．AcademicAffairsOffice， GuangxiNormalUniversity， Guilin541004， Guangxi， China）

【Abstract】 ConvolutionalNeuralNetworks （CNNs）are widelyusedinthefieldofobjectdetection， earning widespreadacclaiminscholarlycirclesduetotheirprecisionandscalability．Ithasspawnednumerousnotable models，includingthoseintheRegion－basedConvolutionalNeuralNetworks （R－CNNs） （suchasFastR－CNNand FasterR－CNN）andYouOnlyLookOnce（YOLO）series．AfterthesuccessofTransformersinthefieldofnatural languageprocessing， researchersbeganexploringtheirapplicationincomputervision， leadingtothedevelopment ofvisualbackbonenetworkssuchasVisualTransformer （ViT ）andSwin Transformer．In2020， aFacebook researchteam unveiled DEtection TRansformer （DETR）， anend－to－endobjectdetectionalgorithm basedon Transformers， designedtominimizetheneedforpriorknowledgeandpostprocessinginobjectdetectiontasks． DespitethepromiseshownbyDETRinobjectdetection， ithaslimitationsincludinglow convergencespeed， relativelylowaccuracy， andtheambiguousphysicalsignificanceoftargetqueries．Theseissueshavespurredawave ofresearchaimedatrefiningandenhancingthealgorithm．Thispaperaimstocollate， scrutinize， andsynthesize thevariouseffortsaimedatimprovingDETR， assessingtheirrespective meritsanddemerits．Furthermore， it presentsacomprehensiveoverview ofstate－of－the－artresearchandspecializedapplicationdomainsthatemploy DETRandconcludeswithaprospectiveanalysisofthefutureroleofDETRinthefieldofcomputervision

【Keywords】computervision； objectdetection； DETRalgorithm； VisualTransformer（ViT）；imagesegmentation

## 0 引言

目标检测是计算机视觉领域的核心任务之一，旨在从给定的图像中定位和识别各种对象。 自2012年基于卷积神经网络 （CNN） 的 AlexNet［1］ 在ImageNet竞赛取得冠军以来，计算机视觉领域迎来了以深度学习技术为核心的重大革新， 这极大地推动了目标检测技术的发展。

目前，目标检测算法主要分为两大类 ：两阶段检测器和单阶段检测器。 基于区域的卷积神经网络（R－CNN）系列等两阶段检测器首先生成候选框区域，然后对其进行分类和边界框回归，这类模型通常在目标定位和识别精度上表现优秀， 但识别速度相对较慢 YOLO（YouOnlyLookOnce）［2］ 系列SSD（SingleShotMultiboxDetector）［3］等单阶段检测器省去了生成候选区域的步骤， 直接在图像上预测对象的类别和位置，提供更快的检测速度，并且近年来得益于单阶段目标检测器的发展， 基于锚点的YOLOv5、无锚的 YOLOv8等基于 CNN 架构的单阶段检测算法在精度和性能上均有显著提升

近年来，Transformer［4］架构在自然语言处理领域取得显著成果，研究人员尝试将其应用于计算机视觉领域 诞生了视觉 Transformer（ViT）［5］ SwinTransformer［6］等基于注意力机制的骨干网络，并在图像分类任务中展现出巨大潜力。 在目标检测领域， CARION 等［7］ 提 出 了 DETR （ DEtectionTRansformer） ，DETR简化了检测流程， 通过可学习的对象查询并行输出最终的预测集， 整个检测过程中不使用非极大抑制（NMS）和锚框等步骤，从而提供了一个更简洁和高效直接的目标检测框架。

本文详细介绍了基于Transformer的目标检测算法—— DETR以及基于DETR的改进算法，分析了它们的改进之处和不足，还分析了DETR算法在多模态 元学习等领域上的创新 这些成果展示了Transformer架构在计算机视觉领域的潜力， 旨在对未来的目标检测领域研究和实际应用提供参考

## 1 基于Transformer的DETR目标检测模型

如今大多数采用CNN的目标检测框架在进行目标检测时会生成大量冗余框， 因此大多数框架都采用 NMS的方法， 通过置信度排序 计算交并比（IoU）来处理生成的大量冗余框 部分目标检测框架采用 Anchor作为先验知识， 这需要针对不同的任务设计多种尺寸及长宽比的锚框， 然而使用锚框会引入更多的冗余框， 加大模型在处理冗余框时的计算量，造成模型复杂度上升，同时也会增加模型轻量化和性能优化的难度。

DETR舍弃了这些冗余操作， 采用端到端的设计理念，输入原始图像， 输出目标检测结果， 其间无需手动设计先验，也没有复杂的分步操作，实现了端到端的检测网络，是一种直接高效的目标检测新方法。 本文将根据 DETR的网络结构对 DETR模型的工作原理和流程进行详细介绍

## 1．1 DETR模型结构

## 1．1．1 骨干网络部分

目标检测任务中选择骨干网络用于特征提取是实现任务的非常重要的一步，直接影响模型性能。

DETR采用了 ResNet－50作为模型的骨干网络以提取输入图像的特征 残差连接［8］的方式极大地保留了图像的原始图像特征， 并且使得网络计算转变为求残差函数，这使得网络更加容易优化，能显著提升模型性能。

DETR首先对于输入特征图的处理可以由下面的数学公式表示 ：

$$
\boldsymbol { x } _ { i } \in \mathbb { R } ^ { 3 \times H _ { 0 } \times W _ { 0 } }\tag{1}
$$

式中 $\boldsymbol { \mathsf { \Omega } } : \mathcal { X } \boldsymbol { \mathsf { \Omega } } _ { i }$ 为输入的第 个图像； $H _ { \mathrm { ~ 0 ~ } } , W _ { \mathrm { ~ 0 ~ } }$ 为输入图像的高 宽；3为输入通道数

随后输入的图像会经过一个ResNet－50进行特征提取并降维成为激活图 ：

$$
f \in \mathbb { R } ^ { C \times H \times W }\tag{2}
$$

式中 ： 为通道数； 、 分 别 为激活图的高、 宽。它们的值分别如下 ：

$$
C = 2 \ 0 4 8 , \ H = { \frac { H _ { \circ } } { 3 2 } } , \ W = { \frac { W _ { \circ } } { 3 2 } }\tag{3}
$$

最后低分辨率激活图通过一个1×1卷积降维，最终得到特征映射 $\mathcal { Z } _ { 0 }$

$$
\boldsymbol { z } _ { 0 } \in \mathbb { R } ^ { d \times H \times W }\tag{4}
$$

式中 $: d$ 、 、 分别为通道数及特征映射的高和宽。  
这样做可以减少后续计算的复杂度和计算量。

但是，传统的 CNN 使用卷积核平移进行特征提取，使得模型需要多层的卷积才能获得全局的信息，导致模型对全局信息的关注能力较差

得益于 Transformer结构的全局注意力特性，将图像序列化传入 Transformer后， 模型会进行全局 的 自 注 意 力 和 交 叉 注 意 力 计 算 。 这 使 得Transformer模型在大型数据集训练后的性能优于传统的CNN架构 因此，自ViT发布以来，后续的DETR 优 化 算 法 通 常 选 择 ViT 或 SwinTransformer这类基于 Transformer结构的特征提取主干，以提升模型性能。

ViT主要包含两个部分 ： 自注意力机制和前馈神经网络， 当假设输入图像的尺寸为 $2 2 4 \times 2 2 4 \times 3$ 时，ViT首先会将图像划分为 个不重复的补丁，其中 $N = \frac { 2 2 4 \times 2 2 4 } { 1 6 \times 1 6 } = 1 9 6$ ， 并且将图像展平映射到一维向量方便后续计算，假设 ＝768， 自注意力的复杂度主要来自计算 矩阵之间的点积， 可以得出 、 、 矩阵的矩阵复杂度为 $O ( 4 N D ^ { 2 } )$ ， 计算注意力权重的点积操作的复杂度为 $O ( N ^ { 2 } D )$ ， 计算加权和的复杂度也为 $O ( N ^ { 2 } D )$ ，因此这一部分的整体计算复杂度可表示如下 ：

$$
\Omega ( \mathrm { M S A } ) { = } O ( 4 N D ^ { 2 } + 2 N ^ { 2 } D )\tag{5}
$$

最终的计算复杂度是 的平方次，因此如果采用高分辨率图像时会带来极大的计算复杂度， 这会严重影响模型的性能和效率。 SwinTransformer［6］提出的局部窗口机制有效地降低了模型的点积计算复杂度，在计算矩阵的过程中计算复杂度不变， 为$O ( 4 N D ^ { 2 } )$ 。 在点积计算时，SwinTransformer不进行全局计算，而是在局部窗口内进行点积运算，假设每一个窗口尺寸为 ， 由于包含点积和加权和计算，在进行计算局部窗口内的注意力权重的点积操作的复杂度为2 2 ， 因此SwinTransformer的整体计算复杂度如下 ：

$$
\Omega ( \mathrm { S W } \mathrm { - M S A } ) { = } O ( 4 N D ^ { 2 } ) { + } 2 M ^ { 2 } N D\tag{6}
$$

可以得出，在高分辨率的图像输入时，相较于 次方级别的ViT，常数级的SwinTransformer的计算复杂度较小 这有助于提取高分辨率图像中的特征

## 1．1．2 编解码器部分

如图1所示 （彩 色效果见《计算机工程》官网HTML版，下同） ，DETR的编解码器采用的是传统的 Transformer编解码器架构， 编码器部分 采 用 了6层堆叠的编码器块，每一层内结构如图1所示 由于Transformer的注意力计算是全局计算，在计算过程中会丢失图像的相对位置信息，使得模型的性能受到影响，因此DETR通过正弦位置编码将位置信息嵌入键和查询，使得模型能学习图像的位置信息，以此提高准确性。 正余弦编码的数学公式如下：

$$
\mathrm { P E } ( \phi _ { \mathrm { p o s } } , 2 i ) = \sin \bigg ( \frac { \hat { P } _ { \mathrm { p o s } } } { 1 0 ~ 0 0 0 ^ { 2 i / d _ { \mathrm { m o d e l } } } } \bigg )\tag{7}
$$

$$
\mathrm { P E } ( \phi _ { \mathrm { p o s } } , 2 i + 1 ) = \mathrm { c o s } \bigg ( \frac {  { \phi _ { \mathrm { p o s } } } } { 1 0 \ 0 0 0 ^ { 2 i / d _ { \mathrm { m o d e l } } } } \bigg )\tag{8}
$$

式中 $: \boldsymbol { \phi } _ { \mathrm { { p o s } } }$ 是位置； 是维度 $; d _ { \mathrm { ~ m o d e l } }$ 是模型的维度

![](Images_RK7DMH8F/e2a448433c1fcbf1f82ce15dece2a2f815f76fefcc25a33940a0bd8ec6501821.jpg)  
图1 DETR编解码器结构  
Fig．1 Encoder－decoderstructureofDETR

正余弦编码使得每个位置的编码能够相对于其他位置是唯一的 使得模型可以通过相对位置来学习位置信息。

解码器层中包含多头注意力层， 用于全局对象之间的特征交互。 均一化层用于对多头注意力的输出均一化，保证样本的分布稳定，可以在一定程度上避免梯度消失和梯度爆炸问题，使得训练高效。

经过多层的编码器计算后的结果会输入解码器

生成键和值，用于后续的解码器交叉注意力计算。

在解码器的输入部分有一个对象查询的模块其中有一组可学习的参数。 为了检测一张图内的全部目标，参数量在最开始时被设计为远大于一张图片内的目标个数 ，以便后续进行一对一的二分图匹配，从而不遗漏检测对象。

在创建对象查询时， 首先将对象查询随机初始化，随着解码器的注意力计算的进行，对象查询被不断更新，每一个对象查询都会随着解码器的计算转换为输出嵌入。 这种由全局推理计算得出的包含图像内对象的位置和类别的信息将用于后续的分类头进行预测。

## 1．1．3 前馈网络部分

DETR模型中的前馈网络由两部分构成：1个使用ReLU激活函数 隐藏维度为 的3层感知机以及1层线性投影层 该网络包含2个主要分支：1个分支负责预测类别，由1个线性层构成，输出维度为类别数加1（增加的1类表示“空类”） ；另一个分支负责预测边界框，该分支为1个包含3层线性层的多层感知机（MLP） ，输出表示边界框的四维（4D）向量。 这2个分支的输出会经过匈牙利算法进行二分图匹配，以计算网络的整体损失。 由于匈牙利匹配是在预测之后进行的，每个目标只需与最优预测结果进行匹配，从而有效避免了大量冗余预测框的计算

## 1．1．4 二分图匹配部分

DETR的推断过程采用了与传统目标检测完全不同的方法（即集合预测） 它们通过设置一组固定的 个预测（ 远大于一张图片中包含的预测对象个数） ，并且设计二分图匹配函数使得预测值和真实值能够一一对应并且保证损失函数的值最小， 具体的损失函数设计原理如式（9）所示 ：

$$
\hat { \sigma } \stackrel { } { = } \underset { \sigma \in S N } { \operatorname { a r g m i n } } { \sum _ { i } } L _ { \mathrm { m a t c h } } ( \boldsymbol { y } _ { i } , \hat { \boldsymbol { y } } _ { \hat { \sigma } ( i ) } )\tag{9}
$$

式中 ：argmin表示需要寻找一个排列 ，使得对于所ESN  
有可能的 个元素的预测值 $\hat { \mathscr { I } } _ { \sigma ( i ) }$ 和真实值 $y _ { i }$ 之间  
的匹配函数 $L _ { \mathrm { m a t c h } }$ 最小化 。

计算的损失函数为匈牙利损失函数， 如式（10）所 示 ：

$$
\begin{array} { l } { { \displaystyle { \cal L } _ { \mathrm { H u n g a r i a n } } ( y , \hat { y } ) = } } \\ { { \displaystyle \sum _ { i = 1 } ^ { N } \left[ - \log _ { \hat { p } _ { \sigma ( i ) } } ( c _ { i } ) + 1 _ { \{ c _ { i } \neq \emptyset \} } { \cal L } _ { \mathrm { b o x } } ( b _ { i } , \hat { b } _ { \sigma ( i ) } ) \right] } } \end{array}\tag{10}
$$

式中 ： $N$ 表示预测的数量； 、 分别表示真实值和预测值； ${ \bf ; } \hat { \phi } _ { \hat { \sigma } ( i ) } \left( \boldsymbol { c } _ { i } \right)$ 表示第 个预测类别 $c _ { i }$ 的预测概率 ； $L _ { \mathrm { b o x } } ( b _ { i } , \hat { b } _ { \hat { \sigma } ( i ) } )$ ）表示边界框预测的框损失，计算框的预测值 $\hat { b } _ { \hat { \sigma } ( i ) }$ 和真实值 $b _ { i }$ 之间的损失 $\boldsymbol { \mathsf { \Omega } } : 1 _ { \{ c _ { i } \neq \emptyset \} }$ 是指示函数，当类别 $c _ { i }$ 不为空（即存在对象）时为1，否则为0，当 $c _ { i } = \mathscr { D }$ 时，对数概率项被减少了90％， 以处理类别不平衡问题

计算边界框损失的损失函数如式（11）所示 ：

$$
L _ { \mathrm { b o x } } ( b _ { i } , b ^ { \sigma ( i ) } ) =
$$

$$
\lambda _ { \mathrm { \scriptsize ~ i o u } } L _ { \mathrm { \scriptsize ~ i o u } } ( b _ { i } , \hat { b } _ { \sigma ( i ) } ) + \lambda _ { L 1 } \left\| b _ { i } - \hat { b } _ { \sigma ( i ) } \right\| _ { 1 }\tag{11}
$$

DETR采用了广义交并比（GIoU）损失 $\left( L _ { \mathrm { i o u } } \right)$ 和L1损失（ 1） ， 其中， $L _ { \mathrm { \scriptsize ~ i o u } } \left( \boldsymbol { b } _ { i } , \hat { \boldsymbol { b } } _ { \sigma ( i ) } \right)$ ） 对于不同大小的边界框是公平的，能提供更好的边界框相似度度量，L1损失则对每个维度的误差进行线性惩罚，它们通过两个超参数 $\lambda _ { \mathrm { { i o u } } }$ 和 $\lambda _ { L 1 }$ 调整重要性系数，使模型学习如何定位和分类对象。

## 1．2 DETR性能结果

DETR在使用ResNet－50骨干网络训练500轮的情况下在COCO 数据集上实现了39．9％的平均精度（AP） ， 在使用 ResNet－101骨干训练相同轮次的情况下实现了43．5％的 AP， 在大部分性能指标上追评了baseline（FasterR－CNN） ， 但是 DETR也存在如下问题 ：

1）DETR性能较差， 与当时采用卷积网络的最先进的目标检测算法 $\mathrm { C B N e t ^ { [ 9 ] } }$ （在COCO数据集上获得53．3％的 AP）相比，性能表现有着明显差距

2）DETR模型训练收敛速度较慢， 基线FasterR－CNN仅需108轮，但是DETR需要500轮，训练轮次是FasterR－CNN的约5倍

3）DETR小目标检测性能低下，在COCO数据集上的针对小物体的平均精度（APS）仅有21．9％，与FasterR－CNN模型的27．2％具有较大差距

## 1．3 DETR缺点分析

DETR与其他的目标检测模型相比， 收敛的轮次大约为其他模型的5～10倍， 收敛速度缓慢 本节将从注意力模块的稀疏性方面探究 DETR的收敛缓慢问题

DETR是一个基于 Transformer架构的目标检测算法，其中 Transformer的注意力图在初始阶段几乎是均匀的，但在训练过程中会逐渐变得稀疏，直至收敛［10］ 。 因此，在DETR解码器的交叉注意力部分，如果优化不精确会导致解码器无法准确提取图像上下文信息。 假设给定一个 × 的注意力图，通过式（12）计算注意力的稀疏性 ：

$$
\frac { 1 } { m } \sum _ { j = 1 } ^ { m } P ( a _ { i , j } ) \log _ { a } P ( a _ { i , j } )\tag{12}
$$

式中 ： $P ( a _ { i , j } )$ 表示从源位置 到目标位置 的注意力得分； 是目标位置的总数。

通过计算一个概率分布的熵来衡量概率分布的随机性，在不同解码器层上随着轮次增加的注意力得分如图2所示

![](Images_RK7DMH8F/07e77e3d375b48984bdc1f45bb4fc67f7a4e5f888ab2babd16d58398a6089df9.jpg)  
图2 在不同解码器层上随着轮次增加的注意力得分  
Fig．2 AttentionscoresincreasingwithEpochsin differentdecoderlayers

由图2可以看出， 即使经过100个训练轮次之后注意力的稀疏度依旧在持续增加， 模型依旧没有达到收敛，因此可以得出是模型的交叉注意力计算部分导致了模型的慢速收敛。

## 2 针对 DETR的改进方法

针对DETR模型存在的问题，不少研究人员通过分析DETR的结构，对DETR进行了改进。 本章的主要内容是将这些改进方法进行整理、总结汇总结果，如表1所示 针对 DETR的收敛缓慢 检测精度较差等问题的改进主要可以分为限制注意力、改进原有的对象查询、引入多尺度、引入锚点锚框、改进分类头等多种方法。

表1 DETR在基准数据集上的改进模型汇总  
Table1 SummaryofimprovedmodelsofDETRonbenchmarkdatasets
<table><tr><td>改进方法</td><td>模型名称</td><td>改进内容</td><td>优势</td><td>不足</td><td>源码地址</td></tr><tr><td rowspan="5"></td><td>Deformable- DETR</td><td>可变形注意力机制</td><td>减少冗余计算，加快收敛</td><td>采用多尺度特征增加了 20倍 的 token,计算复杂度高</td><td>https：// github.com/fundamentalvision/ Deformable-DETR/</td></tr><tr><td>SMCA-DETR</td><td>空间调制注意力机制</td><td>提高收敛速度，优化注意 力效率</td><td>物体检测性能较差</td><td>https:// github.com/gaopengcuhk/SMCA- DETR</td></tr><tr><td>Sparse DETR</td><td>编码器令牌稀疏化 问题</td><td>稀疏化降低计算成本，提 升模型性能</td><td>对小尺寸物体检测性能较差</td><td>https：// github.com/kakaobrain/sparse- detr</td></tr><tr><td></td><td>Cascade-DETR 级联关注机制</td><td>提高检测质量，增强泛化 性能</td><td>并未充分利用多尺度特征，模 型性能较差</td><td>https:// github.com/SysCV/cascade-detr</td></tr><tr><td>Focus-DETR</td><td>双重注意力编码器，令 牌评分机制</td><td>稀疏化注意力，性能提 升，加快收敛</td><td>小尺寸物体检测性能较差</td><td>https：// github.com/linxid/Focus-DETR- mindspore</td></tr><tr><td rowspan="3">多尺度 引入</td><td>PnP-DETR</td><td>PnP 采样模块，精细化 特征提取</td><td>显著减少计算量，自适应 空间计算分配</td><td>将特征分类为精细和粗略，但 未进一步利用多尺度特征</td><td>https:// github.com/twangnh/pnp-detr</td></tr><tr><td>DETR++</td><td>双向特征金字塔</td><td>多尺度特征提升性能</td><td>计算复杂度高</td><td>未公开源代码</td></tr><tr><td>Co-DETR</td><td>混合协作配合训练</td><td>采用多种训练技巧，加快 模型拟合和性能提升</td><td>计算复杂度和模型复杂度高</td><td>https:// github.com/Sense-X/Co-DETR</td></tr><tr><td rowspan="4">对象查 询改进</td><td>Efficent DETR</td><td>对象容器初始化</td><td>减少编解码器数量，加快 模型的收敛速度</td><td>依赖先验，小物体检测性能差</td><td>未公开源代码</td></tr><tr><td>Conditional</td><td>空间条件查询</td><td>交叉注意力头能关注物</td><td>未能进一步分析对象查询包</td><td>https：// github.com/Atten4Vis/Conditional</td></tr><tr><td>DETR Coditional</td><td>盒查询，轴向注意力</td><td>体边界，加快模型收敛 提高模型检测质量，减少</td><td>含的物理意义，性能提升有限</td><td>DETR</td></tr><tr><td>DETR V2</td><td>机制</td><td>内存消耗</td><td>模型参数较大，小物体性能差</td><td>未公开源代码 https：// github.com/megvii-research/Anchor</td></tr><tr><td rowspan="5">锚点锚 框先验</td><td>Anchor DETR</td><td>基于锚点查询</td><td>加快模型收敛,提升性能</td><td>小物体检测精度较差</td><td>DETR https：// github.com/IDEA-Research/DAB-</td></tr><tr><td>DAB-DETR</td><td>基于4D锚框</td><td>提高局部注意力集中度， 优化训练收敛速度</td><td>小物体检测精度较差</td><td>DETR</td></tr><tr><td>DN-DETR</td><td>噪声去噪训练</td><td>加快模型收敛，提升模型 精度</td><td>去噪训练可以进一步优化</td><td>https:// github.com/IDEA-Research/DN- DETR</td></tr><tr><td>DINO</td><td>对比去噪训练</td><td>相较于 DN-DETR 强化 了训练过程，进一步提升 模型先验</td><td>对计算资源需求大，模型复杂 度高</td><td>https:// github.com/IDEA-Research/DINO</td></tr><tr><td>SAP-DETR</td><td>显著点实例对象转换</td><td>收敛速度相较基线快 1.4倍，模型精度提升</td><td>小物体检测性能较差</td><td>https:// github.com/liuyang-ict/SAP-DETR</td></tr></table>

表 1（续 ）
<table><tr><td>改进方法</td><td>模型名称</td><td>改进内容</td><td>优势</td><td>不足</td><td>源码地址</td></tr><tr><td rowspan="2">匹配模 式改进</td><td>Group DETR</td><td>对象查询组</td><td>实现一对多匹配，提升 性能</td><td>未针对小物体进行检测优化， 小物体检测性能差</td><td>https:/ github.com/Atten4Vis/Group DETR</td></tr><tr><td>H-DETR</td><td>混合匹配方法</td><td>提升训练效率,实现简化</td><td>小物体检测性能较差</td><td>https://github.com/HDETR/H-Deformable- DETR</td></tr><tr><td rowspan="2">轻量化 设计</td><td>Lite-DETR</td><td>关键感知的可变形注 意力机制</td><td>显著减少模型复杂度，保 持性能</td><td>虽然模型显著减少了计算量， 但并未考虑实时目标检测</td><td>https  $\colon / /$  github.com/IDEA-Research/Lite DETR</td></tr><tr><td>RT-DETR</td><td>尺度内特征交互和跨 尺度特征融合模块</td><td>高精度，高处理速度，实 时检测</td><td>性能相较高精度模型较差</td><td>https:// github.com/lyuwenyu/RT-DETR</td></tr></table>

## 2．1 注意力限制

传统的DETR模型在初始化时，对特征图中所有像素的注意力权重分配几乎是均匀的， 而图像中仅有部分位置包含具体目标信息， 这导致了注意力落在了大量非重要的像素上， 造成了大量的冗余计算。 模型为了集中注意力在稀疏且关键的位置， 需要较长的训练周期 此外， 考虑到 Transformer编码器在计算自注意力权重时， 计算量与像素数量的平方成正比，如式（13）所示 ：

$$
\mathrm { A t t e n t i o n } ( Q , K , V ) { = } \mathrm { S o f t m a x } \bigg ( \frac { Q K ^ { \mathrm { T } } } { \sqrt { d _ { k } } } \bigg ) V\tag{13}
$$

式中 ： 、 、 均是 输入序列 的线 性变 换， 其 中、 之间矩阵点积计算及注意力权重和值矩阵之间的点积计算的复杂度均为 $O \left( n ^ { 2 } d \right)$ ， 因此整体的计算复杂度为 $O ( n ^ { 2 } d )$ 。

因此，在使用高分辨率特征图时会极大增加计算和内存复杂度，这使得DETR模型不能很好地处理高分辨率特征图。

为此，文献［10］提出的Deformable－DETR采用了一种可变形注意力机制（如图3所示） ， 可变形注意力机制使得注意力围绕参考点， 通过为每个查询分配固定数量的关键点， 形成一组有限的关键采样点，而不考虑特征图的空间尺寸 改进后的多头可变形注意力计算公式如式（14）所示 ：

$$
\begin{array} { r } { \mathrm { M S D e f o r m A t t n } ( z _ { q } , \hat { p } _ { q } , \{ x ^ { l } \} _ { l = 1 } ^ { L } ) = } \end{array}
$$

$$
\sum _ { m = 1 } ^ { M } W _ { m } \bigg ( \sum _ { l = 1 } ^ { L } \sum _ { k = 1 } ^ { K } A _ { m l q k } \ \bullet \ W _ { \scriptscriptstyle 0 } ^ { \scriptscriptstyle m } x ^ { \scriptscriptstyle l } ( \phi _ { l } ( \hat { p } _ { q } ) + \Delta \phi _ { m l q k } ) \bigg )\tag{14}
$$

多尺度可变形注意力模块复杂度可表示如下 ：

$$
\begin{array} { l } { { O ( N _ { q } C ^ { 2 } + \operatorname* { m i n } ( H W C ^ { 2 } , N _ { q } K C ^ { 2 } ) + } } \\ { { 5 N _ { q } K C + 3 N _ { q } C M K ) } } \end{array}\tag{15}
$$

式中 ： $N _ { q }$ 是 查 询 元 素 的 数 量 ； 是 注 意 力 头 的 数

![](Images_RK7DMH8F/a7e8fb1b641adf35b051d640bf0e99717f1a51a7ac08aed652810dba2eb44e12.jpg)  
图3 Deformable－DETR注意力结构

Fig．3 AttentionstructureofDeformable－DETR

量； 是每个头的采样点数量； 是通道数； 是输入特征图的尺度数量。

当 ＝8、 ≤4且 ＝256时，5 ＋3 远小于 ，模型整体复杂度约为 ：

$$
O ( 2 N _ { q } C ^ { 2 } + \operatorname* { m i n } ( H W C ^ { 2 } , N _ { q } K C ^ { 2 } ) )\tag{16}
$$

因此Deformable－DETR编码器的计算复杂度为 $O ( H W C ^ { 2 } )$ ，与特征图的空间大小呈线性关系；解码器部分的计算复杂度为 $O \left( N K C ^ { 2 } \right)$ ， 与特征图的空间大小无关。

这一设计在一定程度上可以解决冗余计算和缓慢收敛速度的问题， 使得 Deformable－DETR 仅在50轮训练后在COCO数据集上达到46．9％的 AP，相比DETR减少了90％的训练轮次。

GAO 等［11］ 提出的SMCA－DETR引入了空间调制共注意力机制， 空间调制共注意力机制约束共注意力响应在初始估计的边界框附近， 也显著加快收敛速度，在COCO 数据集上50轮和108轮后可以达到43．7％和45．6％的 AP

YE等［12］提出的 Cascade－DETR通过改变编码器结构，在原有的 Transformer解码器中引入了以对象为中心的偏置。 这使得解码器的交叉注意力被限制于前一层的预测盒子区域内， 在提高检测质量的同时加快了模型收敛

ROH 等［13］ 提出的SparseDETR在 DETR的基础上提出了编码器令牌的稀疏化策略， 该团队提出了两种新的稀疏化标准， 通过选择性地更新解码器引用的token， 在大幅降低计算成本的同时保持了性能，并且在COCO基准上使用Swin－T骨干的SparseDETR实现了48．2％的 AP， 整体计算成本降低了38％。

同样采取注意力稀疏化策略的还有 ZHENG等［14］提出的 Focus－DETR， 利用信息丰富的token子集降低注意力机制的复杂度。 相较基线 Sparse

DETR，Focus－DETR带来了更显著的性能提升， 在36轮次的训练后模型在COCO上达到了50．4％的AP，同时增加的计算成本几乎可以忽略不计。

## 2．2 多尺度引入

研究［15－17］表明 ： 使用多尺度特征有助于提升各类视觉识别任务的性能。 多尺度特征融合使得模型能同时捕捉到局部细节和全局上下文信息， 增强其泛化能力。

WANG 等［18］ 提 出 的 PnP－DETR 通 过 PnP（PollandPool）采样模块实现高效的特征提取。 这一设 计 显 著 减 少 了 Transformer的 计 算 量 在COCO基准测试上 ，PnP－DETR在减少56％的计算量的 同 时 仅 比 DETR基 线 下 降 0．2百 分 点 的$\mathrm { A P _ { \circ } }$

ZHANG等［19］ 提出的 DETR＋＋研究了整合多尺度特征的不同方法， 并发现双向特征金字塔网络（BiFPN）［20］ 与 DETR 结 合 能 提 升 模 型 性 能DETR＋＋将 BiFPN 模块连接到 ResNet主干的$C _ { 3 } \setminus C _ { 4 }$ 和 $C _ { 5 }$ 输出， 进行了8次堆叠后将多尺度特征聚合的 $C _ { 5 }$ 输出送入 Transformer架构 这种多尺度设计使DETR在COCO数据集上的性能提高了1．9百分点。

Co－DETR［21］团队提出了协作混合分配训练方案 ，以解决 DETR在 一对一集合匹 配中正样本 分配不足的 问 题。 模 型 结 构 如 图 4所 示 ， 通 过 在 编码器输出上引入多种一对多标签分配的辅助头部 ，增加对编码器输出的监督 ， 以提升特征的区分能力。 为提高解码器训 练效率 ， 设计了辅 助头部中正样本的坐标 ， 并将其作为多组正查询输入原始解码器 Co－DETR在12和36轮训练中分别比Deformable－DETR提 高 了 5．8 和 6．7 百 分 点 的AP， 在 COCOtest－dev数 据集上使用 ViT－L实 现了66．0％的 AP。

![](Images_RK7DMH8F/60e8120b5ce0535ce5262394909b415698a943c499e4ddd4807ae8fa58185fff.jpg)  
图4 Co－DETR结构  
Fig．4 StructureofCo－DETR

## 2．3 对象查询改进

在DETR中，对象查询是整个模型最重要的部分之一，在训练过程中会逐渐学习特征图中包含的目标位置和类别信息。 但是，DETR中对象查询的随机初始化的设计使得对象查询需要长时间的训练收敛才能重新掌握目标的位置分类信息，这也是使得模型经过长时间的训练轮次都无法收敛的原因之一。

EfficientDETR［22］模型检测流程如图5所示，通过对对象容器的初始化， 使对象容器在初始化后包含一定的对象位置信息。 该模型仅使用3个编码器层和1个解码器层就能实现相较 DETR更好的性能和更快的收敛。

![](Images_RK7DMH8F/670534ece773377b6a9c9e5409689b9247f114385e298ef5e3d92c7b09714a69.jpg)  
图5 EfficientDETR检测流程  
Fig．5 DetectionflowofEfficientDETR

EfficientDETR包含两个部分 ： 密集部分和稀疏部分 密集部分执行基于滑动窗口的类密集预测，将其用于生成候选分割，从而生成参考点和对象查询 稀疏部分利用密集部分结果和先验知识初始化目标容器 使用焦点损失（FocalLoss）来处理类别不平衡问题，L1损失衡量预测边界框和真实边界框之间的差异。 GIoU损失衡量预测边界框和真实边界框之间的重叠程度。

$$
{ \cal L } = \lambda _ { \mathrm { \scriptsize ~ c l s } } \bullet L _ { \mathrm { \scriptsize ~ c l s } } + \lambda _ { L 1 } \bullet L _ { L 1 } + \lambda _ { \mathrm { \scriptsize ~ g i o u } } \bullet L _ { \mathrm { \scriptsize ~ g i o u } }\tag{17}
$$

这 一 设 计 有 效 减 少 了 收 敛 轮 次 ， 在 使 用ResNet－50作为骨干网络的情况下， 在36个训练轮次内达到了COCO数据集上45．1％的 AP

MENG 等［23］ 提出 ConditionalDETR， 并在分析对象查询后提出一种名为“空间条件查询”的模型 由于DETR模型在定位极点和边界框上有很高要求，从而对内容嵌入提出了较高需求。 该团队在对象查询中增加了额外的可学习的条件空间嵌入，这种方法缩小了用于定位对象的空间范围， 减少了对内容嵌入的依赖，简化了训练过程，并显著提高了收敛速度。

ConditionalDETR $\mathrm { V } 2 ^ { [ 2 4 ] }$ 将原有的解码器输入目标查询更改为盒查询。 盒查询是编码器输出计算得到的参考点嵌入与盒子相对于参考点之间的变换的组合，提高了模型的检测质量。 另外，该模型采用了轴向注 意 力机制有效降低了 内存成本， 在使用DC5－ResNet－50作为骨干网络时在 COCO 验证集上达 到 了 44．8％ 的 AP， 并 且 相 比 Conditional

DETR提高了1．0百分点的 AP。

## 2．4 锚点锚框改进

DETR中的对象查询是一组可学习嵌入， 但由于对象查询缺乏实际的物理意义，可解释性较差，并且每一次对象查询关注的点都是随机初始化的， 因此无法预测最终每个对象查询会集中在哪里， 在训练中难以优化。 由此 AnchorDETR［25］ 提出了一种基于锚点的新型查询方式， 借鉴了 CNN 中的锚点设计 这使得 DETR中的对象查询获得了实际的物理意义 为解决一个位置出现多个物体时锚点无法准确关注的问题，AnchorDETR为每个锚点设计了多重模式，具体来说 ： 初始查询特征 $Q _ { \mathrm { i n i t } } ^ { \mathrm { f } } \in \mathbb { R } ^ { N _ { \mathrm { q } } \times C }$ 中，每个对象查询 $Q _ { i } ^ { \mathrm { f } } \in \mathbb { R } ^ { 1 \times C }$ 具有一个模式， 其中是对象查询的索引， 使用模式嵌入 f ∈R p× 来检测每个位置的不同模式的对象， $N _ { \mathrm { ~ p ~ } }$ 是模式的数量，模式嵌入 在 所 有 对 象 查 询 中 共 享； 共 享 模 式 嵌 入$Q _ { i } ^ { \mathrm { f } } \in \mathbb { R } ^ { N _ { \mathrm { p } } \times C }$ 可以得到初始查询特征 $Q _ { \mathrm { i n i t } } ^ { \mathrm { f } } \in \mathbb { R } ^ { N _ { \mathrm { p } } N _ { \mathrm { A } } \times C }$ 和位置查询 $Q _ { \mathrm { p } } \in \mathbb { R } ^ { N _ { \mathrm { p } } N _ { \mathrm { A } } \times C }$ ，因此最终的查询为 ＝$Q _ { \mathrm { i n i t } } ^ { \mathrm { f } } + Q _ { \mathrm { p } }$ 。 这种设计有助于提高检测器在复杂场景中的性能， 使得 AnchorDETR在仅需 DETR1／10训练轮次的情况下就可实现更优秀的性能。 在使用单 个 ResNet－50－DC5 作 为 骨 干 网 络 时， AnchorDETR在COCO数据集上达到了44．2％的 AP

在 进 一 步 的 研 究 中 ，LIU 等［26］ 提 出 的 DAB－DETR 继 承 了 AnchorDETR 的 理 念 相 较 于AnchorDETR的锚点 ，DAB－DETR在目 标查 询中引入了4D锚框 ， 并考虑了锚框的位置和大小 ， 从而引入了更加准确的先验知识。 DAB－DETR通过分析 Transformer解码器中的交叉注意力机制 ， 将原本的查询分 为内 容和位置两部分 ， 将 查 询与特征图之间的相似度用于特征的聚合。 这种方法考虑了内容和位置信息 ， 使得模型能够围绕查询位置聚合特征。 最终 DAB－DETR 通过预测4D 锚框 ，实现了对 象 查 询 的 自 适 应 调 整 和 逐 层 动 态 更新 ，优化了注意力机制的焦点 ， 使其集中在目标对象周围。 这种基于调整锚框大小的动态注意力机制显著 提高了模 型 的注 意 力能力和训 练收敛速度 在 COCO 数据集上 ， 仅使用单个 ResNet－50作为 骨 干 网 络 进 行 训 练 ， DAB－DETR 达 到 了45．7％的 AP

SAP－DETR［27］ 通过为每个对象查 询初 始化一个特定于查询的参考点， 并逐步将这些点聚合成一个实例对象，进而预测从边界框到这些参考点的距离。 该方法迅速聚焦于查询的参考区域和条件性边界框边缘， 显 著 提高了模 型 的收敛速度。 SAP－DETR在采用 ResNet－DC－101作为骨干网络的配置下，实现了46．9％的 AP。

$\mathrm { D N - D E T R } ^ { [ 2 8 ] }$ 提出了一种针对双向图匹配中有关匹配损失问题的解决策略， 该策略通过在原有的训练数据中人工添加噪声， 并将这些带噪声的数据用于去 噪任 务， 输入到 Transformer解码器进行训练。 具体来说 ：通过向解码器中输入带噪声的真实标签和框并训练模型重建真实标签和框 该方法的损失函数如下 ：

$$
L _ { \mathrm { D N } } = L _ { \mathrm { b o x } } ( \hat { b } , b ) + L _ { \mathrm { c l s } } ( U ( \hat { X } ) , \hat { c } , c )\tag{18}
$$

式中 $: L _ { \mathrm { \Phi _ { \mathrm { b o x } } } }$ 是边界框损失，衡量预测边界框 $\hat { b }$ 和真实边界框 之间的差异； $L _ { \mathrm { c l s } }$ 是分类损失， 结合了特征不确定性 （ ） 、预测类别 和真实类别 。

该策 略 能 辅 助 模 型 更 好 地 进 行 双 向 图 匹 配 ，同时稳定模型性能 得益于该设计 ， 去噪任务成为了一个相对简 单的辅 助任 务 ， 减轻了二分 图匹配的不稳 定 问 题 ， 并 降 低 了 模 型 优 化 的 难 度。 该策略被成功 应 用 于 其 他 DETR变 体 模 型 上 ， 当 训练了12和50个轮次时 ， 分别达到了46．0％的 AP和48．6％的 AP。

ZHANG 等［29］ 对 DN－DETR 的降噪训 练和DAB－DETR的 锚 框 进 行 研 究 后 提 出 了 端 到 端DETR变体目 标 检 测器———DINO。 如图6所示，DINO 继承了 DN－DETR 的对 比去 噪训 练思 想，$L _ { \mathrm { { C D N } } } { = } L _ { \mathrm { { D N } } } { + } \alpha \bullet L _ { \mathrm { { c o n t r a s t i v e } } }$ ， 其中 ， $L _ { \mathrm { c o n t r a s t i v e } }$ 是对比损失，是权重系数。 同样是在训 练数据中添加噪声，DINO通过调整权重系数将训练样本按照添加的噪声程度划分，训练样本既作为正样本又作为负样本，从而增强了模型的泛化能力， 改善了一对一匹配效率。 DINO在利用ResNet－50骨干的多尺度特征的情况 下 在 12 个 训 练 轮 次 内 在 COCO 上 实 现 了49．4％的 AP， 在24个训练轮次内实现了51．3％的AP， 分别比原模型提高了 6．0 百分点的 AP 和2．7百 分 点 的 AP。 在 SwinL 骨 干 网 络 上 用Objects365数据集进行预训练后，DINO 在 COCOval2017和test－dev上均取得了63．2％的 AP和633％的 AP。

![](Images_RK7DMH8F/c296eb76f8e47861fae72ebf31eaf85cb914ab88635264d77452176aa81bd64a.jpg)  
图6 DINO模型架构  
Fig．6 ArchitectureofDINOmodel

## 2．5 匹配模式改进

在FasterR－CNN 等传统目标检测算法中， 通常会给真实对象分配多个预测，即进行一对多匹配，再通过NMS等后处理步骤去除冗余候选框 这能帮助模型筛选出得分最高的候选框以提升模型性能。 但是，DETR在模型设计上采用了强制的基于匈牙利算法的一对一集合匹配， 导致一对多匹配不能很好地应用于DETR，并且由于对象查询的设计，对象查询中的每个向量都会关注一个目标物体， 但是一张图片中包含的目标个数通常都会远低于对象查询个数，因此在DETR的对象查询中存在大量的冗余查询。

针对这一问题 ，CHEN等［30］ 提出了 一 种 基 于对象查询的一对多匹 配方法 ， 引 入了对象查 询组的概念。 该方法设计了 个对象查询组 ， 每个组包含 个查询 具体来说 ： 将初始的 个查询作为第1组 ， 并额外引 入 －1组同样规模 的查 询组 ，从而构成 个查询组 $Q _ { 1 } , Q _ { 2 } , \cdots , Q _ { K } ;$ 在每组内部 ，先通过解码器自注意力计算获得该组的预测对象 $Y _ { 1 } , Y _ { 2 } , \cdots , Y _ { K }$ ， 再使用二分图匹配在组内预测对象与真实对象之间进行一对一的分配 ； 最终每组独 立输出对 应的注 意 力分数及 预测结果$\mathrm { S A } ( \pmb { Q } _ { 1 } ) , \mathrm { S A } ( \pmb { Q } _ { 2 } ) , \cdots , \mathrm { S A } ( \pmb { Q } _ { K } )$

该过程可以看作是数据增强 多个一对一匹配的对象查询组相当于并行训练具有相同架构的参数共享网络，通过该方式引入更多监督来实现一对多匹配。 该团队将该模型命名为 GroupDETR［30］ ，这一通用的设计使得模型很容易快速扩展插入在其他变体中。 例如，在ConditionalDETR上应用查询组设计，可使其在 COCO数据集上提升5．0百分点的均值平均精度（mAP） ，这充分证明了一对多匹配在对象查询中是可行的。

JIA等［31］提出的 H－DETR在DETR匹配过程中发现了使用匈牙利算法进行一对一匹配时模型的对象查询中仅有少部分预测被分配了正样本， 大部分的对象查询并未得到有效利用， 这会导致较差的训练效果，因此该团队提出了混合匹配方法 具体来说 ： 除了传统的一对一匹配以外，H－DETR还引入一个额外的一对多匹配策略，因此 H－DETR模型共有两个匹配模块 ： 一对一匹配模块和一对多匹配模 块 其 中 ： 一 对 一 匹 配 模 块 使 用 个Transformer解码器处理查询， 对每一层的预测值和真实值做双边匹配， 使用匈牙利损失函数计算分类、L1回归和 GIoU 损失； 一对多模块是简单地将真实值标签重复 次，这一过程产生多个具有相同模型参数但不同结果的增强目标， 通过一对多损失函数计算一对多损失。

如图7所示，混合匹配方法能够在保持端到端设计的 情 况 下 有 效 地 提 升 模 型 的 训 练 效 率， 在Deformable－DETR上使用混合匹配方法得到改进变体 H－Deformable－DETR，其相比于Deformable－DETR提升了1．7百分点的AP 此外，相较于DN－DETR的去噪训练，混合匹配方法更简单直接，利于拓展。

![](Images_RK7DMH8F/ca88dbb5d917dc16477310e87459556bc2c91b7e7690222c6776a83aa412147d.jpg)  
图7 在 Deformable－DETR上使用混合匹配方法对比Fig．7 ComparisonofhybridmatchingmethodsonDeformable－DETR

## 2．6 轻量化设计

移 动 端 与 嵌 入 式 设 备 通 常 算 力 与 功 耗 受限［32－33］ ，因此模型轻量化成为在保障精度的前提下实现高效部署的关键。

LI等［34］研究发现 ： 为了增强模型的泛化能力，通常会将多尺度 特征提取和多尺度融 合 应用于DETR模型，但其中包含许多低级特征，这会使模型的计算效率低下 为此， 该团队设计了一个高效的编码器，通过交错更新的策略处理高级特征和低级特征。 这能显著减少计算成本， 但此设计会引入低级特征滞后的问题。 为了更可靠地预测注意力权重并实现跨尺度融合， 该团队开发了关键感知可变形注意力（KDA） 机制。 该机制能够根据输入数据的特性进行动态调整， 从而聚焦于重要特征。 该团队将此改进 方 法 命 名 为 LiteDETR， 并 将 其 应 用 于DINO和 H－DETR，相比于原模型能在保持99％的性 能 的 同 时 降 低 62％ ～78％ 的 模 型 复 杂 度$( \mathrm { G F L O P s } )$ 基于 Swin－T 骨干网络的变体 Lite－DINO在 COCO数据集上也超越了相同计算复杂度的YOLO系列模型。

即使是经过轻量化后的 DETR模型相较于其他基于 CNN的实时目标检测模型在模型大小上还有很大差距， 因此 ZHAO 等［35］ 提出了实时目标检测的RT－DETR模型，如图8所示，模型首先通过骨干网络产生3个尺度不同的特征图， 这些特征图被输入一个混合编码器，其中包含两个模块 ：尺度内特征交互（AIFI）模块和基于CNN的跨尺度特征融合模块（CCFM） 。 AIFI模块首先在高层特征图 $S _ { 5 }$ 上使用单尺度的Transformer编码器捕捉高层的实体语义生成高层特征图 $F _ { 5 }$ 。

$$
Q { = } K { = } V { = } \operatorname { F l a t t e n } ( S _ { 5 } )\tag{19}
$$

$$
F _ { 5 } = \mathrm { R e s h a p e } ( \mathrm { A I F I } ( Q , K , V ) )\tag{20}
$$

接着在多尺度融合部分， 模型将 $S _ { 3 } \setminus S _ { 4 }$ 和 $F _ { \xi }$ 进行特征融合，实现基于CNN的跨尺度特征融合，将特征转换成一连串的图像特征序列。

$$
O { = } \mathrm { C C F M } ( S _ { 3 } , S _ { 4 } , F _ { 5 } )\tag{21}
$$

然后模型采用IoU 感知机制来精选图像特征，这些特征被用于初始化对象查询。 在最终的对象查询阶段使用分类分数，从编码器中选出前 个特征进行初始化。 为了解决分类分数与位置置信度的分布不一致问题，RT－DETR 采用约束算法确保高IoU的预测框产生高分类分数， 而低IoU 的框产生低分类分数 同时 通过特征不确定性 （ ） ＝（ ）－ （ ） ， 其中， ∈R 优化损失函数分类部分的梯度， （ ）为定位的预测和真实值的差，（ ）为分类预测和真实值的差。

$$
L ( \hat { X } , \hat { Y } , Y ) = L _ { \mathrm { \tiny ~ b o x } } ( \hat { b } , b ) + L _ { \mathrm { \tiny ~ c l s } } ( U ( \hat { X } ) , \hat { c } , c )\tag{22}
$$

式中 ： 和 表示预测值和真实值， $\hat { Y } = \hat { c } , \hat { b } , \hat { c }$ 和分别表示类别和边界框； 表示编码器特征

因此，模型不仅会关注目标的位置和类别，还会考虑特征的不确定性， 从而选择更高质量的特征进行对象查询的初始化，提供更准确的分类和定位，以提高检测器的整体性能。 这样模型能够选择那些既有高分类分数又有高IoU 分数的编码器特征对应的预测框，以生成准确的边界框和置信度分数

![](Images_RK7DMH8F/83f1a3ac1bc17632615d5a37febdfa086a262bd9b44d0a431fb1424d2112f4bc.jpg)  
图8 RT－DETR架构  
Fig．8 RT－DETRarchitecture

最终RT－DETR－L在COCOval2017数据集上实现了53．0％的 AP， 同 时在 NVIDIA TeslaT4GPU 上 达 到 了 114 帧／s 的 处 理 速 度， 而 RT－DETR－X在相同数据集上实现了54．8％的 AP和74帧／s的处理速度 在实时目标检测领域， 这是DETR变体模型首次在速度与准确性上超越同等规模的YOLO检测器。

## 3 DETR上的创新探索

得益于 DETR模型无需后处理步骤的端到端简洁设计和自注意力机制的长距离全局建模优势，越来越多的团队在原有的 DETR模型的基础上进行进一步深入研究，并且不再局限于将DETR应用于通用数据集， 而是充分利用 Transformer对大量高质量数据的需求特性，将DETR模型用于大型数据集及无监督、多模态等前沿领域，并取得了一定的研究成果。 下面将分别论述 DETR模型在从少样本元学习、自监督与无监督、大模型与多模态3个不同领域的研究成果。 表2汇总了 DETR模型变体在这些领域的优势。

## 3．1 元学习

元学习的本义是指学会学习， 旨在利用以往的经验知识来指导模型完成对新任务的学习， 使得模

型具备学习能力。

元学习包括少样本学习、零样本学习等细分概念 零样本学习指的是模型可以学习识别在训练过程中没有见过的事物 零样本的核心在于如何让模型利用另一个模型的现有知识以获得新类别的有意义表示。 少样本学习也是元学习的一种， 旨在利用较少的训练样本构建性能较好的机器学习模型， 核心思想在于人类只要通过一个或者几个实例就能建立对物体的认知 机器模型算法通过从一系列的相似任务中学习并将所学知识推广到新的任务中来保证模型的泛化能力， 以提高少样本学习的效果。 其中少样本目标检测系统实现的关键在于 ： 无需在使用过程中微调，能够处理任意数量的新对象，并实现与封闭系统相当的准确性。

为应对少样本目标检测的挑战，ZHANG等［36］在 DETR上构建少样本模型，提出基于类间相关性学习的图像级检测器 Meta－DETR，这种检测范式克服了传统少样本检测框架中不准确的区域提案的限制，模型结构如图9所示。 具体来说，与传统方法中检测多个类别往往需要多次计算不同， 该团队提出了相关性聚合模块（CAM） ，通过权重共享的多头注意力模块处理查询和支持特征，并应用RoIAlign进行平均池化 ， 以获 得 支 持特征的原型 。CAM执行特征和编码匹配，分别匹配查询特征与支持类别原型和任务编码 这种方法在图像级别工作， 不依赖于区 域 建 议， 支 持 同 时 关 注 多 个 类 别， 并 且 在

表2 DETR在新领域上的改进模型汇总  
Table2 SummaryofimprovedmodelsofDETRinnewdomains
<table><tr><td>模型名称</td><td>应用方向</td><td>模型结构</td><td>模型优势</td><td>源码地址</td></tr><tr><td>Meta-DETR</td><td>元学习</td><td>类间相关性学习的图像级检 测器</td><td>克服少样本检测框架限制，支 持多类别同时关注</td><td>https:// github.com/ZhangGongjie/Meta-DETR</td></tr><tr><td>FS-DETR</td><td>少样本学习</td><td>利用类别模板增强目标检测</td><td>单次前向传播识别多类别对 象，无需重新训练</td><td>未公开源代码</td></tr><tr><td>UP-DETR</td><td>无监督学习</td><td>随机查询补丁检测的无监督 代理任务</td><td>无需人工标注的预训练，改善 小物体检测性能</td><td>https:// github.com/lifuguan/UPDETR-mmdet</td></tr><tr><td>Siamese DETR</td><td>自监督学习</td><td>多视角自监督预训练方法</td><td>提高视角不变的表示学习，提 升定位和区分能力</td><td>https:// github.com/Zx55/SiameseDETR</td></tr><tr><td>DQ-DETR</td><td>视觉定位</td><td>双查询模型，解耦处理模态间 差异</td><td>结合图像框检测与文本定位， 提高准确性</td><td>https://github.com/IDEA-Research/DQ-DETR</td></tr><tr><td>Dynamic-MDETR</td><td>视觉定位</td><td>动态多模态解码器</td><td>加速定位过程，减少解码复 杂度</td><td>未公开源代码</td></tr><tr><td>OV-DETR</td><td>开发词汇目标 检测(OVOD)</td><td>条件二分图匹配的检测模型</td><td>超越传统方法，提升在新类别 中的识别能力</td><td>未公开源代码</td></tr><tr><td>MS-DETR</td><td>自然语言视频 定位(NLVL)</td><td>多尺度视觉语言编码器和时 刻解码器</td><td>高效处理视频中时刻匹配 问题</td><td>https://github.com/To-Two-Tu/MS-DETR</td></tr><tr><td>X-DETR</td><td>综合视觉 语言任务</td><td>视觉语义多模态模型</td><td>整合目标检测、语言编码和视 觉语言对齐</td><td>未公开源代码</td></tr></table>

PASCALVOC和 MSCOCO数据集上展现了优异性能，特别是在新类别和基类别上都取得了最佳表 现 。

![](Images_RK7DMH8F/b00fc4f6b678346ed130b845a533b8e46c32cdc54a3898df7a1092b1f84b4498.jpg)  
图9 Meta－DETR架构  
Fig．9 Meta－DETRarchitecture

Meta－DETR引入的相关聚合模块虽然提升了零样本检测的性能， 但一定程度上增加了模型的复杂度，于是BULAT等［37］ 针对 Meta－DETR中的问题提出了进一步的解决方案， 并将这种改进变体称为FS－DETR

具体来说，FS－DETR模型的核心设计在于利用类别模板作为视觉提示来增强目标检测能力。 这一过程主要包括2个步骤 ：1）在编码器中通过交叉注意力机制过滤由骨干网络提取的图像特征；2）将带有特殊伪类的标记进行编码， 并附加到可学习的对象查询上，这些伪类编码在分类的最后阶段用于预测，基于交叉镝损失进行处理 这样模型能够在单次前向传播中识别并定位多个对象， 每个对象都有不同数量的类别。 在整个过程中， 模型不需要重新训练 FS－DETR 的这种方法类似于软提示过程，直接将视觉模板提示附加到解码器的对象查询中，实现提示在图像中的存在性和位置的预测，性能相较 Meta－DETR有较大提升。

## 3．2 自监督与无监督

自监督和无监督都是机器学习的训练方法，无监督通常指的是训练的数据通常不包含标签，因此训练过程不依赖任何标签值，而是通过对数据之间的内在联系，寻找并学习样本之间的关系，从而达到训练模型的目的。 自监督学习通常指的是从大规模数据集中挖 掘自身监督信 息的 模 型训 练方法， 在 CLIP（ContrastiveLanguage－ImagePre－training）［38］ 、 GPT（ Generative Pre－trained Transformer）［39］ 、 基 于

Transformer的双向编码器表示（BERT）［40］ 这些大语言模型的自监督训练过程中通常包含无监督预训练和有监督微调两个步骤。 得益于大语言模型在自然语言处理领域的成功，有越来越多的学者试图将这一训练范式用于基于Transformer架构的视觉模型，例如DAI等［41］ 设计了一种称为随机查询补丁检测的无监督代理任务，并将这种采用无监督训练的模型称为UP－DETR，该模型的编解码器结构如图10所示， 用于在没有任何人工标注的情况下预训练检测。

![](Images_RK7DMH8F/ffd7ef6d91d66f334c6fa112a075a80e3b1f3ee4738a66fce7029764c4748ed1.jpg)  
图10 UP－DETR编解码器架构  
Fig．10 Encoder－decoderarchitectureofUP－DETR

UP－DETR模型从给定的图像中随机裁剪多个查询补丁，并预训练 Transformer编解码器以预测给定图像中这些查询补丁的边界框。 目标检测任务包含对象分类和定位两类任务， 但其仅针对分类任务使用随机查询补丁检测从头开始对 CNN主干和编解码器进行预训练，会导致模型无法很好收敛，因此为了避免查询补丁检测破坏分类特征， 该团队进行了以下改进 ：

1）预训练主干冻结 ： 该团队在 Transformer编解码器的预训练期间冻结了预训练CNN主干。 稳定的主干参数有助于编解码器的预训练， 并加速模型的预训练过程 该改进保留了编解码器的特征区分 性 。

2）补丁特征重建 ： 该团队提出了一个特征重建损失项 rec，用于在定位预训练期间保留分类特征。

得益于此设计，在COCO数据集上，UP－DETR在150个轮次的训练后性能超越 DETR（SwAV［42］CNN） ，达到80％的AP，并在300个轮次后达到428％的 AP， 实现了比 DETR（SwAV［42］ CNN） 更好的性能 尽管如此， 但由于 UP－DETR缺少多尺度特征 设 计， 小 物 体 检 测 性 能 仍 落 后 基 线 FasterR－CNN。

当前，使用自监督代理任务进行预训练的模型通常使用ResNet、ViT这一类基础模型进行表示学习，但这类模 型不能简 单地迁移到 DETR 上， 而UP－DETR这类基于DETR的预训练自监督模型采用了单视角训练的方法。 CHEN 等［43］ 结合多视角自监督在 DETR上提出了一种名为Siamese的自监督 预 训 练 方 法， 并 将 其 改 进 模 型 称 为 SiameseDETR，同时引入了两个互补任务 ：多视角区域监测和多视角语义判别

1）多视角区域监测 ： 该方法通过多视角交叉注意力机制在不同视角之间定位目标区域， 利用一种视角的区域特征在另一种视角中识别相应区域， 并借助特定的预测头进行边界框预测。 此外， 为提升定位精度，模型计算了多视角对称定位损失

2）多视角语义判别 ：由于缺乏语义标签，该方法引入了全局与区域层面的多视角语义判别任务作为替代监督信号。 为此， 模型使用一个额外的预测头进行判别学习，通过最大化不同视角间编码上下文的相似性，并强化每个区域内部的语义一致性，从而提升了对各类对象的识别能力

这两种方法共同使得SiameseDETR能够在预训练阶段有效学习视角不变的表示， 增强了模型在对象检测任务中的定位和区分能力， 使得 SiameseDETR在PASCALVOC和 COCO 数据集上相比于 UP－DETR有更好的性能。

## 3．3 大模型与多模态

受到无监督预训练大型语言模型 （如 GPTBERT）在自然语言处理领域成功应用的启发，研究人员开始将这种训练范式应用于计算机视觉领域。此转变催生了视觉－语言跨模态的多模态大模型，并衍生出一系列针对多模态模型的基准任务， 如视觉定 位、 NLVL、 OVOD 以 及 多 模 态 实 例 搜 索（NMIS） 这些任务促进了研究的深入， 也为研究视觉语言大模型 多模态等新型研究领域带来了新的挑战和机遇 本节将详细阐述 DETR变体模型分别在上述领域的贡献。

## 3．3．1 视觉定位

视觉定位使用语言描述来定位图像中特定对象的任务，是文本视觉多模态领域的重要应用之一。此问题涉及语义理解和对象检测，LIU等［44］ 提出的DQ－DETR将其视为短语提取和定位 （PEG） 问题，即在图像文本对中预测相关的区域短语对。 针对图像框检测与文本掩码分割的综合问题， 该团队引入了跨模态平均精度（CMAP）评估标准， 旨在准确衡量文本短语提取和图像对象定位 传统模型通常利用单一对象查询进行边界框回归和文本定位， 但此做法引入了一个新问题， 如何有效实现视觉和语言模态之间的跨模态特征对齐 该团队指出这两个任务应通过不同特征来适应模态间差异。 为解决这一挑战，该团队设计了双查询模型，即将查询解耦为两部分 这种设计有助于框预测分支训练， 加快模型收敛。 DQ－DETR模型由图像主干、文本主干、多层编码器、多层解码器和多个预测头组成。

具体来说，图像和文本主干用于提取特征，提取后的特征经过展平连接， 构成多模态特征输入编码器。 编码后的特征输入解码器， 由可学习的双重查询对解码器进行检测及特征提取， 最终用于框回归和短语定位。

鉴于两个查询均需关注同一区域并且保持特征对齐，因此两个查询中的位置部分共享，而各自的内容查询部分是解耦的。 其中位置查询分为图像位置查询和文本位置查询。 图像位置查询采用了类似DAB－DETR那样的锚框，并通过正余弦编码投射到高维空间 文本位置查询被定义为1D分割掩码，用于文本引导的注意力。

DQ－DETR在短语定位任务上显著优于基线模型 MDETR［45］ 。 在采用相同骨干网络的情况下， 仅用一半的预训练周期， 便在 Recall＠1指标上对于两个查询分别取得了0．7和1．4百分点的性能提升。此外， 在 ResNet－101主干上超越了所有之前的变体 在未专门针对任务设计先验的传统检测任务中，DQ－DETR也大幅超越 MDETR。

SHI等［46］ 提出的 Dynamic－MDETR通过解耦编码和解码过程， 优化了视觉定位任务。 该团队发现图像中的背景对于最后的视觉定位没有帮助 然而仍旧需要参与注意力计算。 因此， 该团队设计了一种创新的动态多模态解码器， 如图11所示， 使用稀疏先验加速定位过程 动态解码器由2D自适应采样模块和文本引导的解码模块构成。 2D自适应采样模块预测参考点偏移，并选择信息丰富的区域。解码模块计算图像和文本特征间的交叉注意力， 提取对象信息。

![](Images_RK7DMH8F/19ac3edce6b5151a9000f71e1371b1b5d3e4b2d9f9abc2a7ae73a07dfc2add08.jpg)  
图11 Dynamic－DETR解码器架构  
Fig．11 DecoderarchitectureofDynamic－DETR

解码器的自适应采样模块基于采样查询，在2D空间中自适应采样信息丰富的视觉令牌， 提高位置和几何信息学习效率 生成相对参考点的位移 提升检测性能。 这种采样减少了计算成本， 与图像输入大小无关，保持恒定复杂度。 文本引导解码模块将视觉特征解码为文本指导下的目标定位位置 利用语言查询注入强烈语义信息， 实现精准定位。 两种模块交替堆叠，缩小模态间差异，迭代更新对象参考点，旨在实现视觉定位。

与其他 Transformer架构的多模态视觉定位基线相比，Dynamic－MDETR在多数数据集上表现优异，特别是在RefCOCO＋的testA集和RefCOCOg的val－u划分子集上，分别提高了2．23和1．54百分点的 AP，验证了其自适应建模方案的强大多模态推理能力和定位能力。

## 3．3．2 OVOD

OVOD是一种新兴的多模态任务，融合了计算机视觉和自然语言处理， 旨在使用自然语言词汇进行图像目标检测。 开放词汇检测目前的研究方向致力于使检测器能够不再受限于标注数据的少量类别，期望其能识别更广泛的未知的物体类别 现有模型的局限性在于它们缺乏未知标记物体的识别能力，导致无法计算新类别的分类成本矩阵。

为解决此挑战，ZANG等［47］ 提出的 OV－DETR将学习目标定义为输入查询与相应物体间的二分图匹配。 OV－DETR首先采用CLIP中的图像和文本嵌入模型进行对齐，利用经过预训练的CLIP模型获得的条件嵌入作为 OV－DETR的查询嵌入；接着通过全连接层将条件嵌入投影至与查询相同的维度，并采用二分图匹配损失来衡量匹配程度；然后匹配输入图像中的所有合适的对象实例，同时将其他类别实例标记为不匹配；最后通过一个包含匹配损失 框损失和嵌入重构损失的综合损失函数来计算总损失。

该团队基于Deformable－DETR，替换了原有分类器层的骨干网络，将 ViTB／32作为CLIP模型的骨干网络， 以此构建了 OV－DETR 在开放词汇基准测试中，OV－DETR显著超越 OVR－CNN，在所有类别上与ViLD相比，实现了1．4百分点的 mAP的领先，在新颖类别上更是实现了1．8百分点的 mAP的领先。 与其他方法在 OV－LVIS和 OV－COCO数据集上对比，OV－DETR均展现出最佳性能。

## 3．3．3 NLVL

NLVL是视觉大模型多模态领域的关键任务之一，该任务利用自然语言查询识别视频中与语义相匹 配 的 特 定 时 刻 WANG 等［48］ 提 出 的 MS－DETR引入了一种基于提案的方法。 该方法首先生成候选提案，然后匹配最佳提案，从而对时刻及其关系进行建模 MS－DETR设计了一个多尺度视觉语言编码器，并引入了一组由锚引导、与可学习模板配对的时刻解码器

具体来说，MS－DETR首先将视觉特征和语言查询特征通过单层前馈网络投影到统一维度，并添加位置编码，通过链接投射后的视觉和语言特征来编码多模态特征。 在编码器阶段，MS－DETR引入了一种注意力模块以分离投影，并使用两组注意力—— —视觉跨模态注意力和语言跨模态注意力 鉴于视频中的关键信息通常集中在正片内容部分，为减少不必要的计算量，MS－DETR提出了序列缩减的多模态注意力方法，并通过时间合并操作减小尺度，同时利用辅助跨模态监督损失和多尺度文本增强特征对编码特征进行增强。 在解码器阶段， 如图12所示，MS－DETR设计了锚引导的时刻解码器，该解码器将可学习的模板及其对应的锚点解码为时刻时间戳 解码器包括两部分：一是时刻间交互的自注意力；二是锚点高亮注意力，用于在候选时刻中识别最佳匹配。

![](Images_RK7DMH8F/c3b36923b5c4d6ac8964a69e5b3d5c4fd80416942bcc16fa0565d1b822a28c4f.jpg)  
图12 MS－DETR解码器架构  
Fig．12 DecoderarchitectureofMS－DETR

在 NLVL 的 关 键 测 试 集— ActivityNetCaptions和TACoS上，MS－DETR均实现了最优性能，在 Charades－STA上也达到了次优的结果， 充分展示了 MS－DETR在处理自然语言视频定位任务中的卓越性能。 该模型通过其创新的多尺度视觉语言编码器和锚引导的时刻解码器， 有效地解决了视频中时刻匹配的问题

## 3．3．4 综合视觉语言任务

综合视觉语言任务涵盖图像和语言这两种多模态信号输入，融合了计算机视觉与自然语言处理两个交叉领域 在交叉领域，存在诸如图像说明 视觉问答、图像文本匹配等多样的任务。 然而，多数现有的视觉－语言多模态模型专注于特定任务，且非端到端设计，限制了它们在通用视觉语义任务上的适用性。 为此，周丽娟等［49］提出了一种基于DETR的视觉语义多模态模型 X－DETR 该模型通过实例级跨模态网络，整合目标检测器、语言编码器和视觉语言对齐3个主要组件， 在模型设计中视觉与语言成分被解耦，操作独立

## X－DETR主要包括以下组件 ：

1）视觉对象检测器 ， 是一个将图像 转化为检测对象 的函数，表示如下 ：

$$
o = D \left( I \right)\tag{23}
$$

2）文本编码器 $\psi$ ， 是一个将语言查询 编码为嵌入 $\psi ^ { ( \boldsymbol { y } ) }$ 的函数，表示如下 ：

$$
\psi ( { \boldsymbol { y } } ) { = } \mathrm { E m b e d d i n g ~ o f } ~ { \boldsymbol { y } }\tag{24}
$$

3）视觉语言对齐 ，是一个将视觉实例 与语言描述 $\psi ^ { ( \boldsymbol { y } ) }$ 在联合特征空间中对齐的函数。 对于匹配的视觉实例与语言描述 ${ } , h \left( o \right. , \psi ^ { \left( { } _ { y } \right) } )$ 值较高；对于不匹配的视觉实例与语言描述， $h \left( o \right. , \psi ^ { \left( \gamma \right) } )$ 值较低，表示如下 ：

$$
\begin{array} { r l } & { h \left( o , \phi \left( y \right) \right) = } \\ & { \mathrm { A l i g n m e n t ~ s c o r e ~ b e t w e e n ~ } o \mathrm { ~ a n d ~ } \phi \left( y \right) } \end{array}\tag{25}
$$

受CLIP多模态模型启发，X－DETR在视觉语言对齐中采用了简单且高效的点积操作进行特征融合，该操作简化如下 ：

$$
h \left( o , y \right) = \operatorname * { d o t } \mathrm { p r o d u c t } ( f ( o ) , g \left( \phi ( y ) \right) )\tag{26}
$$

式中 ： 和 分别是视觉和语言的转换函数

在 OVOD这一具有挑战性的任务中，X－DETR表现出色， 超越 R－CLIP3．7百分点的 AP， 并且与MDETR［45］ 相比有近10百分点的 AP的提升 X－DETR甚至接近了完全监督的vanillaDETR基线（16．4％的 APvs17．8％的AP） 在基于RefCOCO数据集的NMIS中，X－DETR同样展现出具有竞争力的性能。 这一创新模型的提出为视觉语言多模态领域的发展和应用贡献了新方法。

## 4 常用数据集

数据集对目 标 检 测 算 法 的影 响至关重要 ， 它是提升算法性能的关键 从传统的检测算法到深度学习检测 算 法 ， 对数 据集的质量 和数量的要 求日益提高。 特别是对于 基 于 Transformer的 深 度模型 ，已有大量的研究实验表明 ， 数据集的质量和数量在很大程度上决定了目标检测算法的性能因此 ，数据集的质量不仅是衡量算 法性能 的重要标准 ，也是推动 目 标 检 测领域持 续发展 的 基础。表3列举并分类了目标检测领域的一些常用数据集 表4总结了部分 DETR改进模型按照骨干网络分类在基准数据集COCO上的性能对比 ，其中 ，AP＠0．5、AP＠0．7分别表示IoU为0．5、0．75时的平均精度 ，APM APL分别表示针对中 大物体的平均精度 ， “—”表示原文献中没有该指标值

表3 目标检测领域常用数据集  
Table3 Commonlyuseddatasetsinthefieldofobjectdetection
<table><tr><td>数据集名称</td><td>图片数目/张</td><td></td><td>目标种类/个图片大小/像素</td><td>基本描述</td></tr><tr><td>ISLVRC</td><td>1 200 000</td><td>1000</td><td>多样</td><td>标准大规模带标签图像数据集，其包含约120万张照片、1000 种类别，是ImageNet22k 的子集，通常用于图像分类训练和预训练</td></tr><tr><td>ImageNet-22K</td><td>15 000 000</td><td>22 000</td><td>多样</td><td>标准大规模带标签图像数据集，其包含约1500万张照片、2.2万种类别，通常用于图像 分类训练和预训练</td></tr><tr><td>MS COCO</td><td>328000</td><td>91</td><td>640×480</td><td>标准目标检测数据集，其每张图像包含7.2个目标，是最具挑战、用于性能比较的基准 数据集</td></tr><tr><td>PASCAL 2007</td><td>9963</td><td>20</td><td>500×375</td><td>目标检测数据集，其用于对比衡量模型性能的基准数据集，包含常见的20种类别</td></tr><tr><td>PASCAL 2012</td><td>11 540</td><td>20</td><td>470×380</td><td>目标检测数据集，其用于对比衡量模型性能的基准数据集，包含常见的20 种类别</td></tr><tr><td>DOTA</td><td>2806</td><td>14</td><td>4 000×4000</td><td>航空领域特殊目标检测数据集</td></tr><tr><td>Crowd Human</td><td>24370</td><td>6</td><td>多样</td><td>密集行人检测数据集，其约包含2.4万张图片，每张图片中约有23人，通常用于行人目 标检测</td></tr><tr><td>Open Image</td><td>1 910 098</td><td>600</td><td>多样</td><td>大规模目标检测数据集，其约包含190万张图片、600 种类别</td></tr><tr><td>Objects365</td><td>2 000000</td><td>365</td><td>640×480</td><td>大规模目标检测数据集，其包含生活中的14种大类，通常用于额外训练数据集以提升 目标检测性能</td></tr></table>

## 5 总结与展望

DETR这一端到端无需后处理的目标检测器，基于 Transformer的简洁架构设计和使用二分图匹配实现目标检测的特性使其在目标检测领域具有一定的优势，但是DETR也存在一些明显问题需要进一步解决和改进，具体如下 ：

1）小物体目标检测性能较差 ：DETR在处理小目标时的性能较差， 这是 Transformer架构在处理小目标物体的时候注意力分散， 导致小目标的特征难以被模型准确掌握和利用， 另外 Transformer自身的全局注意力机制特性通常对较大物体具有良好的性能， 而 需 要 高 级 语 义 特 征 的 小 物 体 性 能 往 往不 佳 。

2）模型的收敛速度缓慢 ：DETR通常需要较长的训练时 间 才 能 达 到 稳 定 的 性 能， 这 通 常 是 基 于CNN 的 目 标 检 测 器 的 5～10 倍， 主 要 原 因 是Transformer架构的训练过程需要长时间的计算才能 使 得 注 意 力 收 敛 于 图 像 中 的 关 注 位 置 ， 此 外DETR的网络结构和参数量也较为庞大， 对象查询的随机初始化也会带来训练收敛速度慢的问题

表4 DETR改进模型在通用数据集COCO上的性能表现  
Table4 PerformanceofimprovedmodelsofDETRonthegeneralCOCOdataset
<table><tr><td>Model</td><td>Backbone</td><td>Epoch</td><td>AP/%</td><td>AP@0.5/% AP@0.75/%</td><td></td><td>APS/%</td><td>APM/%</td><td>APL/%</td></tr><tr><td>Deformable-DETR</td><td>Swin-T</td><td>36</td><td>51.8</td><td></td><td></td><td>34.8</td><td>55.1</td><td>67.8</td></tr><tr><td>H-Deformable-DETR</td><td>Swin-T</td><td>36</td><td>54.6</td><td></td><td></td><td>35.9</td><td>56.4</td><td>68.2</td></tr><tr><td>Deformable-DETR</td><td>Swin-L</td><td>36</td><td>56.3</td><td></td><td></td><td>39.2</td><td>60.4</td><td>71.8</td></tr><tr><td>Co-DINO-Deformable-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>60.7</td><td>78.5</td><td>66.7</td><td>45.1</td><td>64.7</td><td>76.4</td></tr><tr><td>Co-Deformable-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>58.5</td><td>77.1</td><td>64.5</td><td>42.4</td><td>62.4</td><td>74.0</td></tr><tr><td>DINO-4scale</td><td>Swin-L(IN-22K)</td><td>36</td><td>58.0</td><td>77.1</td><td>66.3</td><td>41.3</td><td>62.1</td><td>73.6</td></tr><tr><td>DINO-Deformable-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>58.5</td><td>77.0</td><td>64.1</td><td>41.5</td><td>62.3</td><td>74.0</td></tr><tr><td>Group-DINO-Deformable-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>58.4</td><td>1</td><td>1</td><td>41.0</td><td>62.5</td><td>73.9</td></tr><tr><td>H-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>57.6</td><td>76.5</td><td>63.2</td><td>41.4</td><td>61.7</td><td>73.9</td></tr><tr><td>H-Deformable-DETR</td><td>Swin-L(IN-22K)</td><td>36</td><td>57.9</td><td>76.8</td><td>63.6</td><td>42.4</td><td>61.9</td><td>73.4</td></tr><tr><td> Stable-DINO-4 scale</td><td>Swin-L(IN-22K)</td><td>12</td><td>57.7</td><td>75.7</td><td>63.4</td><td>39.8</td><td>62.0</td><td>74.7</td></tr><tr><td>Efficient DETR</td><td>ResNet-50</td><td>36</td><td>45.1</td><td>63.1</td><td>49.1</td><td>28.3</td><td>48.4</td><td>59.0</td></tr><tr><td>Anchor-DETR-DC5</td><td>ResNet-50</td><td>50</td><td>44.2</td><td>64.7</td><td>47.5</td><td>24.7</td><td>48.2</td><td>60.6</td></tr><tr><td>Co-DINO-Deformable-DETR</td><td>ResNet-50</td><td>36</td><td>54.8</td><td>72.5</td><td>60.1</td><td>38.3</td><td>58.4</td><td>69.6</td></tr><tr><td>Conditional DETR</td><td>ResNet-50</td><td>108</td><td>45.1</td><td>65.4</td><td>48.5</td><td>25.3</td><td>49.0</td><td>62.2</td></tr><tr><td>DAB-DETR</td><td>ResNet-50</td><td>50</td><td>45.7</td><td>66.2</td><td>49.0</td><td>26.1</td><td>49.4</td><td>63.1</td></tr><tr><td>DAB-Deformable-DETR</td><td>ResNet-50</td><td>50</td><td>46.9</td><td>66.0</td><td>50.8</td><td>30.1</td><td>50.4</td><td>62.5</td></tr><tr><td>DAB-Deformable-DETR++</td><td>ResNet-50</td><td>50</td><td>48.7</td><td>67.2</td><td>53.0</td><td>31.4</td><td>51.6</td><td>63.9</td></tr><tr><td>DETR++</td><td>ResNet-50</td><td>500</td><td>41.8</td><td>60.1</td><td>44.6</td><td>22.1</td><td>45.0</td><td>58.6</td></tr><tr><td>DETR-DC5</td><td>ResNet-50</td><td>500</td><td>43.3</td><td>63.1</td><td>45.9</td><td>22.5</td><td>47.3</td><td>61.1</td></tr><tr><td>DINO-4scale</td><td>ResNet-50</td><td>36</td><td>50.9</td><td>69.0</td><td>55.3</td><td>34.6</td><td>54.1</td><td>64.6</td></tr><tr><td>DINO-Deformable-DETR</td><td>ResNet-50</td><td>36</td><td>51.2</td><td>69.0</td><td>55.8</td><td>35.0</td><td>54.3</td><td>65.3</td></tr><tr><td>DN-Deformable-DETR</td><td>ResNet-50</td><td>50</td><td>48.6</td><td>67.4</td><td>52.7</td><td>31.0</td><td>52.0</td><td>63.7</td></tr><tr><td>DN-Deformable-DETR++</td><td>ResNet-50</td><td>50</td><td>49.5</td><td>67.6</td><td>53.8</td><td>31.3</td><td>52.6</td><td>65.4</td></tr><tr><td>Deformable-DETR</td><td>ResNet-50</td><td>50</td><td>46.9</td><td>65.6</td><td></td><td>29.6</td><td>50.1</td><td>61.6</td></tr><tr><td>Dynamic-DETR(5 scale)</td><td>ResNet-50</td><td>12</td><td>42.9</td><td>61.0</td><td></td><td>24.6</td><td>44.9</td><td>54.4</td></tr><tr><td>H-DETR</td><td>ResNet-50</td><td>36</td><td>50.0</td><td>68.3</td><td>54.4</td><td>32.9</td><td>52.7</td><td>65.3</td></tr><tr><td>H-Deformable-DETR</td><td>ResNet-50</td><td>36</td><td>51.0</td><td>一</td><td></td><td>32.9</td><td>52.7</td><td>65.3</td></tr><tr><td>RT-DETR</td><td>ResNet-50</td><td>72</td><td>53.1</td><td>71.3</td><td>57.7</td><td>34.8</td><td>58.0</td><td>70.0</td></tr><tr><td>SAM-DETR</td><td>ResNet-50</td><td>50</td><td>39.8</td><td>61.8</td><td>41.6</td><td>20.5</td><td>43.4</td><td>59.6</td></tr><tr><td>SAM-DETR+SMCA</td><td>ResNet-50</td><td>50</td><td>41.8</td><td>63.2</td><td>43.9</td><td>22.1</td><td>45.9</td><td>60.9</td></tr><tr><td>SMCA-DETR</td><td>ResNet-50</td><td>108</td><td>45.6</td><td>65.5</td><td>49.1</td><td>25.9</td><td>49.3</td><td>62.6</td></tr><tr><td>Sparse-DETR</td><td>ResNet-50</td><td>50</td><td>46.3</td><td>66.0</td><td>50.1</td><td>29.0</td><td>49.5</td><td>60.0</td></tr><tr><td> Stable-DINO-4scale</td><td>ResNet-50</td><td>12</td><td>50.4</td><td>67.4</td><td>55.0</td><td>32.9</td><td>54.0</td><td>65.5</td></tr><tr><td>Stable-DINO-5 scale</td><td>ResNet-50</td><td>12</td><td>50.5</td><td>66.8</td><td>55.3</td><td>32.6</td><td>54.0</td><td>65.3</td></tr><tr><td>UP-DETR</td><td>ResNet-50</td><td>300</td><td>42.8</td><td>63.0</td><td>45.3</td><td>20.8</td><td>47.1</td><td>61.7</td></tr><tr><td>Anchor-DETR-DC5</td><td>ResNet-101</td><td>50</td><td>45.1</td><td>65.7</td><td>48.8</td><td>25.8</td><td>49.4</td><td>61.6</td></tr><tr><td>Conditional DETR</td><td>ResNet-101</td><td>108</td><td>45.9</td><td>66.8</td><td>49.5</td><td>27.2</td><td>50.3</td><td>63.3</td></tr><tr><td>DAB-DETR</td><td>ResNet-101</td><td>50</td><td>46.6</td><td>67.0</td><td>50.2</td><td>28.1</td><td>50.5</td><td>64.1</td></tr><tr><td>DETR-DC5</td><td>ResNet-101</td><td>500</td><td>44.9</td><td>64.7</td><td>47.7</td><td>23.7</td><td>49.5</td><td>62.3</td></tr><tr><td>DETR</td><td>ResNet-101</td><td>500</td><td>43.5</td><td>63.8</td><td>46.4</td><td>21.9</td><td>48.0</td><td>61.8</td></tr><tr><td>Efficient DETR</td><td>ResNet-101</td><td>36</td><td>45.7</td><td>64.1</td><td>49.5</td><td>28.2</td><td>49.1</td><td>60.2</td></tr><tr><td>RT-DETR</td><td>ResNet-101</td><td>72</td><td>54.3</td><td>72.7</td><td></td><td>36.0</td><td>58.8</td><td>72.1</td></tr><tr><td>SMCA-DETR</td><td>ResNet-101</td><td>108</td><td>46.3</td><td>66.6</td><td>50.2</td><td>27.2</td><td>50.5</td><td>63.2</td></tr><tr><td>Sparse-R-CNN</td><td>ResNet-101 HGNetv2</td><td>36</td><td>45.6</td><td>64.6</td></table>

3） 模型计算开销大 ： 由于采用了 Transformer的编解码器作用于特征融合架构部分并且参数量较大，因此在训练过程中需要较多的训练数据和训练轮次才能保证模型性能， 其中仍然包含许多对性能提升影响较小甚至没有影响但仍需参与计算的冗余参数，造成计算开销大。

4）无法实现实时目标检测 ：DETR的推理速度较慢，训练的开销非常大，并且不能应用于实时目标检测场景，因此实际的工程应用性较差

针对 DETR 存 在 的 问 题， 可 以 考 虑 从 以 下 的6个方面进行改进和优化 ：

1）采用多尺度的主干网络 ： 考虑采用多尺度的主干网络，通过在不同的尺度上提取特征，可以更好地保留图像的高级语义类别信息和低级语义定位信息［49－50］ ，从而提高小目标的检测性能。

2）采用锚点与锚框先验 ：在DETR注意力对目标边界定位不佳的情况下，引入一些先验知识，有助于改善模型的性能， 如 AnchorDETR的基于锚点的查询，DAB－DETR的4D锚框。 这些先验知识可以帮助模型更好地定位和识别目标

3）去噪训练 ： 为了加快模型收敛速度并减少计算开销，在训练过程中可以引入去噪训练的策略。例如 ：DN－DETR的去噪训练，通过在训练数据中人工添加噪声的方式提升模型鲁棒性；DINO 的对比去噪训练，按照添加的噪声程度划分，既作为正样本又作为负样本，从而增强了模型的泛化能力 这些方法可以帮助模型在面对噪声或干扰时， 仍能保持良好的性能。

4）改进原有的匹配模式 ：DETR的对象查询使用基于匈牙利算 法 的一对一匹 配 ， 使 得对象查 询中的每个查询都会关注一个目标物体 但是一张图片中包含的目标个数通常会远低于对象查询个数 ，在DETR的对象查询中存在大量的冗余查询 ，因此重构匹配策略也有助于 DETR提升模型性能 ，例如 ，GroupDETR使用对象 查 询 组 实 现 一 对多匹配 ， H－DETR提出混合匹配方法 这样的改进能够使模型更好地处理重叠目标和群体目标的情 况 。

5）限制注意力 ：DETR使用的原有的交叉注意力和自注意力在多尺度主干的情况下会带来极大的性能开销，然而不使用多尺度会带来小目标性能低下的问题，限制注意力或者采取其他的注意力方式是很好的解决方案 例如，Deformable－DETR的可变形注意力，Cascade－DETR的级联注意力等 这些机制能够更加高效地分配模型的计算资源， 专注于图像中的关键区域

6） 更换主干网络结构 ： DETR 中主干网络ResNet－50负责对输入图像进行特征的提取， 用于后续的编解码器进行进一步的特征融合 近期基于状态空间模型（SSM）的 Mamba架构以其线性级计算复杂度和更快的推理速度受到研究人员的广泛关注，其中 Vmanba作为通用视觉骨干模型， 引入了交叉扫描 模 块， 在 图 像 特 征 提 取 上 性 能 显 著 优 于ViT等通用骨干网络， 因此可以尝试使用 Vmanba替换DETR原有的 ResNet－50以提取更多的图像特征，使得模型具有更强的特征提取能力。

通 过 总 结 提 炼 不 同 的 DETR 改 进 模 型 与DETR的性能对比，以直观地说明新机制对性能的影响，如表5所示。

表5 DETR及其改进模型与性能表现  
Table5 PerformanceofDETRanditsimprovedmodels
<table><tr><td>Model</td><td>Improvement points</td><td>Backbone</td><td>Epoch</td><td>AP/%</td><td></td><td>AP@0.5/% AP@0.75/%</td><td>APS/%</td><td>APM/%</td><td>APL/%</td></tr><tr><td>DETR</td><td>原版DETR</td><td>ResNet-50</td><td>500</td><td>39.9</td><td>59.8</td><td>42.4</td><td>57.2</td><td>43.3</td><td>18.8</td></tr><tr><td>DETR++</td><td>双向特征金字塔</td><td>ResNet-50</td><td>500</td><td>41.8</td><td>60.1</td><td>44.6</td><td>22.1</td><td>45.0</td><td>58.6</td></tr><tr><td>Co-DETR</td><td>多尺度特征融合</td><td>Swin-L(IN-22K)</td><td>36</td><td>58.5</td><td>77.1</td><td>64.5</td><td>42.4</td><td>62.4</td><td>74.0</td></tr><tr><td>Anchor DETR</td><td>基于锚点的查询</td><td>ResNet-50</td><td>50</td><td>44.2</td><td>64.7</td><td>47.5</td><td>24.7</td><td>48.2</td><td>60.6</td></tr><tr><td>DAB-DETR</td><td>4D锚框</td><td>ResNet-50</td><td>50</td><td>45.7</td><td>66.2</td><td>49.0</td><td>26.1</td><td>49.4</td><td>63.1</td></tr><tr><td>DN-DETR</td><td>去噪训练</td><td>ResNet-50</td><td>50</td><td>48.6</td><td>67.4</td><td>52.7</td><td>31.0</td><td>52.0</td><td>63.7</td></tr><tr><td>DINO</td><td>对比去噪训练</td><td>ResNet-50</td><td>36</td><td>50.9</td><td>69.0</td><td>55.3</td><td>34.6</td><td>54.1</td><td>64.6</td></tr><tr><td>H-DETR</td><td>混合匹配方法</td><td>ResNet-50</td><td>36</td><td>50.0</td><td>68.3</td><td>54.4</td><td>32.9</td><td>52.7</td><td>65.3</td></tr><tr><td>Deformable-DETR</td><td>可变形注意力</td><td>Swin-T</td><td>36</td><td>51.8</td><td>1</td><td>1</td><td>34.8</td><td>55.1</td><td>67.8</td></tr><tr><td>SMCA-DETR</td><td>空间调制注意力</td><td>ResNet-50</td><td>108</td><td>45.6</td><td>65.5</td><td>49.1</td><td>25.9</td><td>49.3</td><td>62.6</td></tr></table>

## 6 结束语

本文详细阐述了基 于 Transformer的 DETR目标检测算法，并延伸介绍了基于端到端目标检测模型 DETR这一范式，其是计算机视觉领域内对于各项任务探索的变体。 本文主要介绍了 DETR在基准数据集上的性能改进， 在大模型、元学习、多模态 等 前 沿 研 究 领 域 上 的 探 索 和 研 究 成 果 ， 以 及DETR模型变体在细分领域上的目标检测成果。 最后，本文比较了在基准数据集上部分DETR模型变体的性能，并针对DETR存在的问题总结了可能的改进策略。 本团队期望本文可为目标检测领域的研究者提供有益的思路和启发。

## 参考文献

［1 ］ KRIZHEVSKY A， SUTSKEVER I， HINTON G EImageNet classification with deep convolutional neuralnetworks［J］．CommunicationsoftheACM， 2017， 60（6）：84－90．

［2 ］ REDMONJ， DIVVALAS， GIRSHICK R， etal．Youonlylook once： unified， real－time object detection ［C ］ ∥ProceedingsoftheIEEEConferenceonComputerVisionandPatternRecognition （CVPR ）．Washington D．C． USA ：IEEEPress， 2016： 779－788．

［3 ］ LIU W， ANGUELOV D， ERHAN D， etal．SSD： singleshotmultiboxdetector ［C ］∥ProceedingsofECCV,16Berlin， Germany： SpringerInternationalPublishing， 2016：21－37．

［4 ］ VASWANIA， SHAZEERN， PARMARN， etal．Attentionisallyouneed［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／1706．03762

［5 ］ DOSOVITSKIY A， BEYER L， KOLESNIKOV A， etalAnimageisworth16×16 words： Transformersforimagerecognitionatscale［EB／OL］．［2024－01－14］．https：∥arxivorg／abs／2010．11929

［6 ］ LIU Z， LIN Y T， CAO Y， etal．Swin Transformer：hierarchicalvisionTransformerusingshiftedwindows［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision （ICCV）．WashingtonD．C．， USA： IEEEPress 2021： 9992－10002

［7 ］ CARIONN， MASSAF， SYNNAEVEG， etal．End－to－endobjectdetection with Transformers ［C ］∥ ProceedingsofECCV, 20． Berlin， Germany： Springer InternationalPublishing， 2020： 213－229

［8 ］ HEK M， ZHANG X Y， RENSQ， etal．Deepresiduallearningforimagerecognition［C］∥ProceedingsoftheIEEEConferenceon Computer Vision and Pattern Recognition（CVPR）．WashingtonD．C．， USA：IEEEPress， 2016： 770－778．

［9 ］ LIUYD， WANGYT， WANGSW， etal．CBNet： anovelcomposite backbone network architecture for objectdetection［C］∥ Proceedings ofthe AAAI Conference onArtificialIntelligence．PaloAlto， USA： AAAIPress， 2020：11653－11660．

［10］ SUNZ Q， CAO S C， YANG Y M， etal．RethinkingTransformer－basedsetpredictionforobjectdetection［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision （ICCV）．WashingtonD．C．， USA： IEEEPress， 2021： 3591－3600

［11］ GAOP， ZHENGMH， WANG XG， etal．FastconvergenceofDETRwithspatiallymodulatedco－attention［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceon Computer Vision（ICCV）．WashingtonD．C．， USA： IEEEPress， 2021： 3601－3610．

［12］ YEMQ， KEL， LISY， etal．Cascade－DETR： delvingintohigh－qualityuniversalobjectdetection［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision（ICCV ）． Washington D．C．， USA： IEEE Press， 2023：6681－6691

［13］ ROHB， SHINJ， SHINWC， etal．SparseDETR： efficientend－to－endobjectdetectionwithlearnablesparsity［EB／OL］［2024－01－14］．https：∥arxiv．org／abs／2111．14330

［14］ ZHENGD H， DONG W H， HU H L， etal．Lessismore：focusattentionforefficientDETR［C］∥ProceedingsoftheIEEE／CVF International Conference on Computer Vision（ICCV ）． Washington D．C．， USA： IEEE Press， 2023：6651－6660

［15］ 王国明 ， 贾代旺．基于 YOLOv8的 小 目标检测模型的 优 化［J］．计算机工程 ， 2025， 51（12）： 294－303．WANG G M， JIA D W． Optimization ofsmallobjectdetection model based on YOLOv8 ［J ］． ComputerEngineering， 2025， 51（12）： 294－303．（inChinese）

［16］ 董刚 ， 谢维成 ， 黄小龙 ， 等．深度学习小目标检测算法综述［J］．计算机工程与应用 ， 2023， 59（11）： 16－27．DONGG， XIE W C， HUANGXL， etal．Reviewofsmallobjectdetection algorithms based on deeplearning［J］ComputerEngineeringandApplications， 2023， 59（11）： 16－27．（inChinese）

［17］ ZHANGJ， HUANGJ， LUOZ， etal．DA－DETR： domainadaptivedetectionTransformerwithinformationfusion［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2103．17084

［18］ WANG T， YUAN L， CHEN Y P， etal．PnP－DETR ：towardsefficientvisualanalysiswith Transformers［C ］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision （ICCV）．WashingtonD．C．， USA： IEEEPress， 2021： 4641－4650

［19］ ZHANGC， LIU L， ZANG X， etal．DETR＋ ＋ ： tamingyourmulti－scaledetectionTransformer［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2206．02977

［20］ TAN MX， PANGRM， LEQV．EfficientDet： scalableandefficientobjectdetection［C］∥ProceedingsoftheIEEE／CVFConferenceon Computer Vision and Pattern Recognition（CVPR）．WashingtonD．C．， USA：IEEEPress， 2020： 1－9

［21］ ZONGZF， SONGGL， LIUY．DETRswithcollaborativehybridassignmentstraining［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision （ICCV）WashingtonD．C．， USA： IEEEPress， 2023： 6725－6735

［22］ YAOZ， AIJ， LIB， etal．EfficientDETR： improvingend－to－endobjectdetectorwithdenseprior［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2104．01318

［23］ MENGDP， CHENXK， FANZJ， etal．ConditionalDETRforfasttrainingconvergence［C］∥ProceedingsoftheIEEE／CVFInternationalConferenceonComputerVision （ICCV）WashingtonD．C．， USA： IEEEPress， 2021： 3631－3640

［24］ CHENX， WEIF， ZENGG， etal．ConditionalDETRV2：efficientdetectionTransformerwithboxqueries［EB／OL］［2024－01－14］．https：∥arxiv．org／abs／2207．08914

［25］ WANG Y M， ZHANG X Y， YANG T， etal．AnchorDETR ：querydesignforTransformer－baseddetector［C］∥Proceedings of the AAAI Conference on ArtificialIntelligence．Palo Alto， USA： AAAIPress， 2022： 2567－2575．

［26］ LIUS， LIF， ZHANG H， etal．DAB－DETR： dynamicanchorboxesarebetterqueriesforDETR［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2201．12329．

［27］ LIU Y， ZHANG Y， WANG Y X， etal．SAP－DETR ：

bridgingthegapbetweensalientpointsandqueries－based Transformerdetectorforfast modelconvergency［C ］∥ ProceedingsoftheIEEE／CVF Conference on Computer VisionandPatternRecognition （CVPR）．WashingtonD．C．， USA： IEEEPress， 2023： 15539－15547

［28］ LIF， ZHANG H， LIUSL， etal．DN－DETR： accelerateDETR training byintroducing query DeNoising ［C ］∥ProceedingsoftheIEEE／CVF Conference on ComputerVisionandPatternRecognition （CVPR）．WashingtonD．C．，USA： IEEEPress， 2022： 13609－13617

［29］ ZHANG H， LI F， LIU S， etal．DINO： DETR withimproved denoising anchor boxes for end－to－end objectdetection［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2203．03605

［30］ CHENQ， CHENXK， WANG J， etal．GroupDETR： fastDETRtrainingwithgroup－wiseone－to－manyassignment［C］∥Proceedingsofthe IEEE／CVF International Conference onComputerVision （ICCV）．Washington D．C．， USA： IEEEPress， 2023： 6610－6619．

［31］ JIAD， YUAN Y H， HE H D， etal．DETRswithhybridmatching［C］∥ProceedingsoftheIEEE／CVFConferenceonComputer Vision and Pattern Recognition （CVPR ）WashingtonD．C．， USA： IEEEPress， 2023： 19702－19712

［32］ 潘晓英 ， 贾凝心 ， 穆元震 ， 等．小目标检测研究综述 ［J］．中国图象图形学报 2023 28（9）： 2587－2615PANXY， JIANX， MUYZ， etal．Surveyofsmallobjectdetection［J］．JournalofImageandGraphics， 2023， 28（9）：2587－2615．（inChinese）

［33］ 王福军 ， 王星 ， 王柯迪．基于双域查询增强 Transformer的遥 感 图 像 旋 转 小 目 标 检 测 ［J］．吉 林 大 学 学 报 （理 学 版 ） ，2025 63（5） 14181426WANGFJ， WANGX， WANGKD．Rotatedsmallobjectdetectionofremotesensingimagesbasedondual－domainqueryenhancedTransformer［J］．JournalofJilinUniversity（ScienceEdition）， 2025， 63（5）： 1418－1426．（inChinese）

［34］ LIF， ZENG A L， LIU S L， etal．Lite DETR： aninterleaved multi－scaleencoderforefficientDETR ［C ］∥ProceedingsoftheIEEE／CVF Conference on ComputerVisionandPatternRecognition （CVPR）．WashingtonD．C．，USA： IEEEPress， 2023： 18558－18567

［35］ ZHAOY， LÜ W， XUS， etal．DETRsbeatYOLOsonreal－timeobjectdetection ［EB／OL］． ［2024－01－14］．https： ∥arxiv．org／abs／2304．08069．

［36］ ZHANGG， LUO Z， CUIK， etal．Meta－DETR： image－levelfew－shotobjectdetection withinter－classcorrelationexploitation［EB／OL］． ［2024－01－14］．https：∥arxiv．org／abs／2103．11731

［37］ BULAT A， GUERRERO R， MARTINEZ B， etal．FS－DETR： few－shotdetectionTransformerwithpromptingandwithoutre－training［C ］∥ ProceedingsoftheIEEE／CVFInternational Conference on Computer Vision （ICCV ）WashingtonD．C．， USA： IEEEPress， 2023： 11759－11768．

［38］ RADFORD A， KIM J， HALLACY C， etal．LearningTransferablevisualmodelsfromnaturallanguagesupervision［EB／OL］． ［2024－01－14］．https： ∥arxiv．org／abs／2103

00020．

［39］ RADFORD A， NARASIMHAN K．Improving language understandingbygenerativepre－training［EB／OL］． ［2024－ 01－14］．https：∥www．semanticscholar．org／paper／Improving－ Language－Understanding－by－Generative－Radford－Narasimhan／ cd18800a0fe0b668a1cc19f2ec95b5003d0a5035

［40］ DEVLINJ， CHANG M W， LEE K， etal．BERT ： pre－training of deep bidirectional Transformers forlanguageunderstanding［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／1810．04805

［41］ DAIZ G， CAIB L， LIN Y G， etal．Unsupervisedpre－trainingfordetectionTransformers［J］．IEEETransactionsonPatternAnalysisandMachineIntelligence， 2023， 45（11）：12772－12782

［42］ CARON M， MISRAI， MAIRALJ， etal．Unsupervisedlearningofvisualfeaturesbycontrastingclusterassignments［EB／OL］． ［2024－01－14］．https： ∥arxiv．org／abs／2006．09882．

［43］ CHENZR， HUANGGS， LIW， etal．SiameseDETR［C］∥ProceedingsoftheIEEE／CVFConferenceonComputerVisionandPatternRecognition （CVPR）．WashingtonD．C．， USA ：IEEEPress， 2023： 15722－15731．

［44］ LIUSL， HUANGSJ， LIF， etal．DQ－DETR： dualquerydetectionTransformerforphraseextractionandgrounding［C］∥ProceedingsoftheAAAIConferenceonArtificialIntelligencePaloAlto USA AAAIPress 2023 17281736

［45］ KAMATH A， SINGH M， LECUN Y， etal．MDETR—modulated detection for end－to－end multi－modalunderstanding ［ C ］ ∥ Proceedings of the IEEE／CVFInternational Conference on Computer Vision （ICCV ）WashingtonD．C．， USA： IEEEPress， 2021： 1760－1770

［46］ SHIF Y， GAO R P， HUANG W L， etal．DynamicMDETR： adynamic multimodalTransformerdecoderforvisualgrounding［J］．IEEETransactionsonPatternAnalysisandMachineIntelligence 2024 46（2）： 1181－1198

［47］ ZANG Y H， LI W， ZHOU K Y， etal．Open－vocabularyDETR withconditionalmatching［C ］∥ProceedingsoftheEuropeanConferenceonComputerVision．Berlin， Germany：SpringerNatureSwitzerland， 2022： 106－122

［48］ WANGJ， SUN A， ZHANG H， etal．MS－DETR： naturallanguagevideolocalization withsampling moment－momentinteraction［EB／OL］．［2024－01－14］．https：∥arxiv．org／abs／2305．18969．

［49］ 周丽娟 ， 毛嘉宁．视觉 Transformer识别任务研究综述 ［J］中国图象图形学报 ， 2023， 28（10）： 2969－3003．ZHOU L J， MAO J N． Vision Transformer－basedrecognitiontasks： acriticalreview［J］．JournalofImageandGraphics， 2023， 28（10）： 2969－3003．（inChinese）

［50］ 王杨 ， 宋世佳 ， 王鹤琴 ， 等．基于改进 VisionTransformer的局部光照一致性估计 ［J］．计算机工程 ， 2025， 51（2）： 312－321．WANGY， SONGSJ， WANG H Q， etal．Estimationoflocalillumination consistency based onimproved VisionTransformer［J］．ComputerEngineering， 2025， 51（2）： 312－321．（inChinese）

文字编辑 陆燕菲

栏目编辑 赖玉玲