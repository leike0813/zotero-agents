# Enhancing DETR’s Variants through Improved Content Query and Similar Query Aggregation

Yingying Zhang , Chuangji Shi , Xin Guo , Jiangwei Lao , Jian Wang , Jiaotuan Wang , Jingdong Chen Ant Group   
{qichu.zyy, chuanji.scj, wenshuo.ljw,bobblair.wj,jingdongchen.cjd}@antgroup.com

# Abstract

The design of the query is crucial for the performance of DETR and its variants. Each query consists of two components: a content part and a positional one. Traditionally, the content query is initialized with a zero or learnable embedding, lacking essential content information and resulting in sub-optimal performance. In this paper, we introduce a novel plug-and-play module, Self-Adaptive Content Query (SACQ), to address this limitation. The SACQ module utilizes features from the transformer encoder to generate content queries via selfattention pooling. This allows candidate queries to adapt to the input image, resulting in a more comprehensive content prior and better focus on target objects. However, this improved concentration poses a challenge for the training process that utilizes the Hungarian matching, which selects only a single candidate and suppresses other similar ones. To overcome this, we propose a query aggregation strategy to cooperate with SACQ. It merges similar predicted candidates from different queries, easing the optimization. Our extensive experiments on the COCO dataset demonstrate the effectiveness of our proposed approaches across six different DETR’s variants with multiple configurations, achieving an average improvement of over 1.0 AP.

Object detection is essential in various applications, such as autonomous driving, video surveillance, and robotic manipulation. Over the past few decades, convolutional architectures have driven significant advancements in detection methods [Girshick, 2015; Ren et al., 2015; Tian et al., 2019; He et al., 2017; Redmon et al., 2016; Liu et al., 2016; Lin et al., 2017]. These algorithms typically require a handdesigned module to generate anchors, which serve as preliminary candidates for object detection. Furthermore, nonmaximum suppression (NMS) [Hosang et al., 2017] is indispensable for preventing duplicate detections. Recently, Carion et al. proposed a fully end-to-end object detection approach named DEtection TRansfomer (DETR) [Carion et al., 2020]. In contrast to previous detection algorithms, DETR

# 1 Introduction

![](Images_EEBF8EGR/f70b85cd75fba206edc209a01a7363f7baca1a36e9b7090d632ac1db4442a41f.jpg)  
Figure 1: Comparison of multi-scale deformable attention of the first decoder layer between vanilla Deformable-DETR and DeformableDETR with SACQ. We draw the sampling points and attention weights from multi-scale feature maps in one picture. Each sampling point is marked as a filled circle whose color indicates its attention weight. The red rectangle is the predicted bounding box of correspoinding query.

employs learned queries to predict objects uniquely, eliminating the need for anchor generation and NMS. This approach simplifies and unifies the detection pipeline but suffers from slow training convergence.

Numerous variants of DETR have been proposed to address its convergence issues by enhancing its query design. Within the decoders, each query is composed of two components: a content part and a positional one. The majority of existing research has concentrated on improving the positional part. These methods are dedicated to providing a comprehensive positional prior for each query, enabling the cross-attention module to focus on a specific region related to the target object. In contrast, the content part has been largely neglected and is typically initialized as either a zero or a learnable embedding. This offers no substantial information to the cross-attention module in the initial decoder layer.

In this paper, we focus on the content query, an aspect that has rarely been considered in previous works. We introduce a novel plug-and-play module called Self-Adaptive Content Query (SACQ) to enhance the performance of DETR’s variants. Our SACQ comprises two main components: 1) globally pooled features for content query initialization, and 2) locally pooled features for further enhancement of the content query. Traditionally, the content query in a decoder is initialized with either a zero tensor or a learnable embedding, which remains static and lacks any input prior. Carion et al. [Carion et al., 2020] pointed out that the encoder in DETR already separates instances through global attention, while the decoder focuses on extremities to extract class and object boundaries. Building on this insight, we propose a self-attention pooling module (SAPM) capable of dynamically pooling features from the encoder to serve as a more effective initial content query for the decoder’s first layer.

To validate our assumption, we visualize the learned sampling points with high attention weights from the first decoder layer of the original Deformable-DETR, as depicted in Figure.1. The visualization indicates that these points tend to either congregate in a narrow area of the predicted object or spread over the vicinity of the target. After incorporating the SAPM module, the sampling points with high weights more uniformly cover the entire predicted object, and there are significantly fewer points outside the object. This suggests that our content query supplements the content prior for each query, enabling the cross-attention module to focus better on the target object.

The improved object queries are inclined to concentrate on target objects, causing a cluster of highly similar candidate queries generated for target objects. It poses additional challenge for the training process through conventional Hungarian one-to-one matching. Jia et al. [Jia et al., 2022] have pointed out that this matching strategy reduces the training efficiency of positive samples due to few queries assigned as positive samples. To alleviate this issue, we propose a straightforward solution: merging similar predicted results from different queries into a single one before conducting set matching. The similarity of the queries is determined by the Kullback-Leibler (KL) divergence [Joyce, 2011] of category predictions and the Intersection over Union (IoU) between the bounding box predictions. As demonstrated in Figure.5, our SACQ module tends to produce more similar bounding boxes for target objects due to its improved initialization. By implementing the Query Aggregation (QA) strategy, we further capitalize on the benefits of SACQ by combining the outputs of these potential queries and maximizing their utility.

In summary, our technical contributions are twofold:

• We propose a novel method for content query optimization, which has been overlooked in previous works. It consists of two complementary modules: the SACQ and QA. The SACQ generates improved content query for the decoder by introducing input priors. Additionally, the QA module preserves high-quality candidates generated by the SACQ and reduces instability associated with one-to-one matching by aggregating candidate boxes. Both modules can be easily integrated into existing DETR’s variants.

• Through extensive experiments on the COCO dataset and qualitative analysis, we validate the effectiveness of our proposed method, achieving an average improvement of over 1.0 AP across six different DETR’s variants with multiple configurations.

# 2 Related work

# 2.1 CNN-based Object Detection Methods

Classical CNN-based object detectors can be divided into two categories: two-stage and one-stage methods. Twostage methods initially generate a set of box proposals, then determine whether each proposal corresponds to an object, and finally perform bounding box regression based on the proposals. Typical methods include RCNN[Girshick et al., 2014], Fast-RCNN [Girshick, 2015], Faster-RCNN [Ren et al., 2015], etc. In contrast, one-stage models directly predict the bounding box of objects based on predefined anchors or reference points. Examples of one-stage methods include SSD [Liu et al., 2016], YOLO series [Redmon et al., 2016; Redmon and Farhadi, 2018], and others.

# 2.2 DETR and Its Variants

DETR [Carion et al., 2020] is the pioneering work that introduces transformer to object detection. Unlike previous detection methods, DETR is a true fully end-to-end detector that does not rely on hand-designed components such as anchor proposal and NMS. However, it suffers from extremely slow training convergence due to the decoder’s crossattention [Sun et al., 2020]. Many subsequent methods have attempted to address this issue. Dai et al. [Dai et al., 2021a] improve the encoder and decoder in DETR by incorporating dynamic attention to overcome the problems of low feature resolution and slow training convergence. Anchor DETR[Wang et al., 2021b] and DAB-DETR [Liu et al., 2022a] formulate positional queries as dynamic anchor points and anchor boxes respectively, which bridge the gap between classical anchor-based detectors and DETR-based ones.

Some variants improve the training performance by optimizing the structure of transformer head. Sparse DETR [Roh et al., 2022] and PnP-DETR [Wang et al., 2021a] address the excessive computation of the transformer network in a DETR model caused by the spatial redundancy issue of the feature map. Deformable-DETR [Zhu et al., 2021] proposes a more efficient attention module, which attends to a small set of sampling locations around a reference point as a pre-filter for prominent key elements.

Some other works have improved upon the the query in the decoder. SAM-DETR [Zhang et al., 2022] uses query embeddings to align and reweight RoI-Aligned encoded image features and generate enhanced queries, which exhibits similarity to our query feature enhancement to some extent. Nevertheless, the main objectives of our approach and SAMDETR are considerably different. SAM-DETR uses zeroinitialized content query and primarily enhances the query after the fisrt decoder layer, whereas our SACQ aims to provide object-related content prior that was initially overlooked during query initialization in current DETR’s variants. SAPDETR [Liu et al., 2022b] assigns each query with a specific grid region and initializes the corner/center of the grid as its reference point. This method is orthogonal to our method. Dynamic DETR [Dai et al., 2021b] introduces dynamic attention, which is achieved by adding additional RoI features to cross-attention into both the encoder and decoder stages to address the low feature resolution and slow training convergence problems. However, it uses learnable embedding for the initialization of the query as well, which is different from our approach.

![](Images_EEBF8EGR/5a8c184e701b076b2667ae99d4087b90a8845f07541159f8eee1aa87e631fbb4.jpg)  
Figure 2: The left portion of the diagram depicts the structure of the proposed SAPM. Features from the transformer encoder are projected into $q$ attention maps through the attention map projection modules. For each feature from the encoder, its elements are weighted according to certain attention map in the spatial dimension and then averaged to create a spatially pooled feature. The right portion illustrates the integration of SACQ into the transformer decoder of DETR’s variants. SACQ generates the initial content query for the first layer of the decoder from the features produced by the transformer encoder. Starting from the second layer of the decoder, SACQ utilizes SAPM to enhance the content query based on the previous box prediction.

Li et al. proposed DN-DETR [Li et al., 2022a], which additionally feeds ground-truth bounding boxes with noises into the transformer decoder and trains the model to reconstruct the original boxes. DINO [Zhang et al., 2023] further improves denoising training by combining DN-DETR with the designs from DAB-DETR and Deformable-DETR. Mask DINO [Li et al., 2022b] extends DINO by adding a mask prediction branch to make it support segmentation tasks. It has initialized content query by simply selecting features from encoder, but their initialization only contains information of one location which can not cover the entire target. H-DETR [Zong et al., 2023] and Co-DETR [Zong et al., 2022] augment additional hybrid-matching training branch, which explores more positive queries to overcome the drawbacks of one-to-one matching. Stable-DINO [Liu et al., 2023] only utilizes positional metrics to supervise classification scores of positive examples to alleviate the instability of bipartite graph matching. Other DETR’s variants proposed recently are Group-DETR [Chen et al., 2022], SQR-DETR [Chen et al., 2023], Team-DETR [Qiu et al., 2023], and KS-DETR [Zhao and Ukita, 2023].

# 3 Method

# 3.1 Overview

Given an input image $I$ , DETR and its variants first apply a backbone network to extract spatial features $F ^ { B }$ . These features are further refined as enhanced features $F ^ { E }$ by the transformer encoder. The enhanced features, along with a default set of object queries $Q$ , are then fed into the transformer decoder to identify corresponding objects. Finally, the outputs from the last layer of the decoder are used to predict labels and boxes via a prediction head. Object queries in the transformer decoder consist of two components: a positional query $Q ^ { p }$ and a content query $Q ^ { c }$ . However, in most variants of DETR, the content query is typically initialized either with zeros or with a learnable embedding. In this work, we concentrate on the content query and present a novel plugand-play module, Self-Adaptive Content Query (SACQ), to enhance it. This is further complemented by a Query Aggregation (QA) strategy. More details will be elaborated in the following subsections.

# 3.2 Self-Adaptive Content Query

To enhance the initialization of the content query, it is essential to develop a module capable of accurately identifying and extracting object-related features from an image. Existing feature extraction methods that target specific objects, such as RoI-Align[He et al., 2017], necessitate the input of precise target position coordinates within the image. However, the features pooled using this method may inevitably include noise, such as the background. A promising solution to this challenge is to employ the attention mechanism to softly isolate the target, which can yield better features than those obtained via RoI-Align. This solution involves designing a module that can generate unique attention maps for each object, and using these maps to extract detailed object-specific features. These features would subsequently aid in the initialization and enhancement of the content queries. As this process does not require the input of the target’s coordinates, we designate it as Self-Adaptive Content Query (SACQ), a more intuitive and autonomous method for object-related feature extraction, aiming for better content queries.

The core of our SACQ is the Self-Attention Pooling Module (SAPM), detailed in the left part of Figure.2. The SAPM consists of three components: the Attention Map Projection (AMP) module, the Weighted Pooling (WP) module, and the Channel Reweighting (CR) module [Hu et al., 2018]. Given the input features $\bar { F } \overset { ^ { \cdot } } { \in } \mathbb { R } ^ { c \times h \times w }$ , the SAPM initially projects it into attention maps $A \in \mathbb { R } ^ { q \times h \times w }$ through AMP module. Here, AMP is made up of several convolutional layers. Its primary goal is to generate attention maps for each query that can focus on the corresponding target. Subsequently, the feature $F$ undergoes a weighted pooling process to derive the object-specific feature $\check { F ^ { P } } \in \hat { \mathbb { R } } ^ { q \times c }$ , which is guided by the attention map $A$ as follows:

$$
F _ { i } ^ { P } = \sum _ { j = 0 , k = 0 } ^ { h , w } F [ : , j , k ] \cdot A [ i , j , k ] , \forall i \in \{ 0 , 1 , . . . , q - 1 \} .
$$

The CR module then refines the channel weights within $F ^ { P }$ , thereby accentuating the distinctiveness of the extracted features. The output features can be expressed as $F ^ { O } =$ $\sigma ( \mathrm { M L P } ( { \cal F } ^ { P } ) ) \odot { \dot { F ^ { P } } }$ , where $\sigma$ denotes the sigmoid activation function, and $\odot$ represents element-wise multiplication.

The SAPM has been instrumental in enhancing the initialization of content queries for the first decoder layer. Furthermore, there is potential for additional optimization in subsequent layers by refining the content queries to more accurately focus on the target object. To fully capitalize on the SAPM’s ability to precisely concentrate on objects, we have integrated it with RoI-Align to generate local features. This enhancement of the content queries starts from the second decoder layer and continues onwards.

The right part of Figure.2 illustrates the complete SACQ module. The transformer encoder generates features $F ^ { E }$ , which are initially processed by the global SAPM to produce the initial content query $Q _ { 0 } ^ { c }$ . This query works in conjunction with the positional query $Q _ { 0 } ^ { p }$ to form a composite object query, which is used as the input for the first layer of the transformer decoder. Through multi-head cross-attention, the object query interacts with $F ^ { E }$ to produce the updated content query $Q _ { 1 } ^ { \dot { c } 1 }$ . For the sake of brevity, feeding the positional encoding of features into the decoder is not shown in the figure. Subsequently, a box head is utilized to predict the bounding box $B _ { 1 }$ for each query. These bounding boxes are then subjected to RoI-Align to extract local features specific to each predicted region. The extracted local features are then input into the local SAPM, and the resulting output $Q _ { 1 } ^ { c 2 }$ is used to enhance the content query and generate the input for the next decoder layer: $Q _ { 1 } ^ { c } \ : \stackrel { . } { = } \ : \dot { Q } _ { 1 } ^ { c 1 } \ : + \ : \stackrel { . } { Q } _ { 1 } ^ { c 2 }$ . The following decoder layers repeat this process of reinforcing the content query by utilizing the local SAPM with shared parameters.

# 3.3 Similar Query Aggregation Strategy

Our SACQ enhances content query through the self-attention mechanism, enabling it to produce a greater number of highquality candidate results. Nevertheless, this improvement in candidate quality complicates the optimization process and introduces instability for the prevailing one-to-one matching mechanism. Because one-to-one matching is constrained to optimizing a single candidate per object, necessitating the suppression of any additional high-quality candidates that belong to the same object. To address this issue, we propose a method named Query Aggregation (QA) that consolidates similar predictions of distinct candidates into a unified result before set matching. This strategy not only preserves highquality candidates but also mitigates the instability associated with one-to-one matching by aggregating candidate boxes for easier optimization. In our QA, we evaluate the similarity of predicted categories and bounding boxes between queries using Kullback-Leibler (KL) divergence and Intersection over Union (IoU), respectively. For category predictions $p _ { i }$ and $p _ { j }$ belonging to the $i$ -th and $j$ -th query, where $p _ { i } , p _ { j } \in \mathbb { R } ^ { m }$ , the category similarity $S _ { c l s } \in \mathbb { R } ^ { q \times q }$ is defined as follows:

![](Images_EEBF8EGR/59c568b3164aeccfce6697fd47c1af445ff8c4941f50e1c60373173a06d12e46.jpg)  
Figure 3: (a) shows the vanilla decoder of transformer. The candidate predictions generated from queries are directly matched with targets. (b) show the decoder with our query aggregation strategy. Candidate predictions are first merged according to similarity metric and then matched with targets.

$$
\begin{array} { l } { { S _ { c l s } [ i , j ] = K L ( p _ { i } | | p _ { j } ) + K L ( p _ { j } | | p _ { i } ) } } \\ { { \ = \displaystyle \sum _ { k } ^ { m } p _ { i } [ k ] l o g \left( \frac { p _ { i } [ k ] } { p _ { j } [ k ] } \right) + \sum _ { k } ^ { m } p _ { j } [ k ] l o g \left( \frac { p _ { j } [ k ] } { p _ { i } [ k ] } \right) } } \end{array}
$$

For bounding box predictions $B _ { i }$ and $B _ { j }$ of the $i$ -th and $j$ -th query, box similarity $S _ { b o x } \in \mathbb { R } ^ { q \times q }$ is defined by:

$$
S _ { b o x } [ i , j ] = I o U ( B _ { i } | | B _ { j } ) = \frac { A r e a ( B _ { i } \cap B _ { j } ) } { A r e a ( B _ { i } \cup B _ { j } ) }
$$

Here, $q$ represents the number of queries, and $m$ is the total number of object categories. We establish two thresholds to determine which queries to merge: a category similarity threshold $t _ { c }$ , and a box similarity threshold $t _ { b }$ . The criteria for merging are $S _ { c l s } < t _ { c }$ and $S _ { b o x } > t _ { b }$ . For a set of $n$ queries identified for merging $Q _ { i }$ , where $i \in M$ , the merged result is calculated by averaging the predictions: $\begin{array} { r } { p \ = \ \frac { \mathbb { 1 } } { n } \sum _ { i \in M } p _ { i } . } \end{array}$ $\begin{array} { r } { B \ = \ \frac { 1 } { n } \sum _ { i \in M } B _ { i } } \end{array}$ . Figure.3 illustrates the distinction between a transformer decoder employing our query aggregation strategy and a vanilla transformer decoder.

<table><tr><td>Method</td><td>w/ Ours</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td><td>Epochs</td><td>FLOPs</td><td>Params</td></tr><tr><td>Deformable-DETRt</td><td rowspan="2">√</td><td>45.4</td><td>64.7</td><td>49.0</td><td>26.8</td><td>48.3</td><td>61.7</td><td>50</td><td>173</td><td>40M</td></tr><tr><td>Deformable-DETRt</td><td>46.9(+1.5)</td><td>65.4</td><td>50.7</td><td>29.0</td><td>50.1</td><td>62.5</td><td>50</td><td>216</td><td>51M</td></tr><tr><td>Deformable-DETR++</td><td rowspan="2">√</td><td>46.2</td><td>65.2</td><td>50.0</td><td>28.8</td><td>49.2</td><td>61.7</td><td>50</td><td>173</td><td>40M</td></tr><tr><td>Deformable-DETR†t</td><td>47.3(+1.1)</td><td>66.7</td><td>51.2</td><td>30.6</td><td>50.0</td><td>62.6</td><td>50</td><td>216</td><td>51M</td></tr><tr><td>SAM-DETR</td><td rowspan="2">丨</td><td>41.8</td><td>63.2</td><td>43.9</td><td>22.1</td><td>45.9</td><td>60.9</td><td>50</td><td>100</td><td>58M</td></tr><tr><td>SAM-DETR</td><td>43.0(+1.2)</td><td>63.6</td><td>45.9</td><td>23.6</td><td>47.1</td><td>61.5</td><td>50</td><td>104</td><td>62M</td></tr><tr><td>SAP-DETR</td><td rowspan="2">「</td><td>43.1</td><td>63.8</td><td>45.4</td><td>22.9</td><td>47.1</td><td>62.1</td><td>50</td><td>92</td><td>47M</td></tr><tr><td>SAP-DETR</td><td>44.5(+1.4)</td><td>65.7</td><td>47.3</td><td>24.1</td><td>48.4</td><td>64.2</td><td>50</td><td>95</td><td>50M</td></tr><tr><td>Dab-DETR</td><td rowspan="2"></td><td>42.2</td><td>63.2</td><td>45.6</td><td>21.8</td><td>46.2</td><td>61.1</td><td>50</td><td>94</td><td>44M</td></tr><tr><td>Dab-DETR</td><td>43.2(+1.0)</td><td>63.9</td><td>46.1</td><td>22.5</td><td>46.9</td><td>61.9</td><td>50</td><td>97</td><td>47M</td></tr><tr><td>Dab-Deformable-DETRt</td><td rowspan="2"></td><td>46.8</td><td>66.0</td><td>50.4</td><td>29.1</td><td>49.8</td><td>62.3</td><td>50</td><td>195</td><td>47M</td></tr><tr><td>Dab-Deformable-DETRt</td><td>47.6(+0.8)</td><td>65.7</td><td>51.9</td><td>30.0</td><td>50.5</td><td>62.4</td><td>50</td><td>239</td><td>58M</td></tr><tr><td>DINO</td><td rowspan="2"></td><td>49.0</td><td>66.6</td><td>53.5</td><td>32.0</td><td>52.3</td><td>63.0</td><td>12</td><td>279</td><td>47M</td></tr><tr><td>DINO</td><td>49.4(+0.4)</td><td>66.9</td><td>53.9</td><td>31.8</td><td>52.3</td><td>64.6</td><td>12</td><td>323</td><td>58M</td></tr><tr><td>DN-DETR</td><td rowspan="2"></td><td>41.1</td><td>61.7</td><td>43.5</td><td>20.6</td><td>44.8</td><td>59.6</td><td>12</td><td>94</td><td>44M</td></tr><tr><td>DN-DETR</td><td>42.4(+1.3)</td><td>63.0</td><td>45.1</td><td>21.7</td><td>46.3</td><td>61.2</td><td>12</td><td>97</td><td>47M</td></tr><tr><td>DN-Deformable-DETRt</td><td rowspan="2"></td><td>43.4</td><td>61.9</td><td>47.2</td><td>24.8</td><td>46.8</td><td>59.4</td><td>12</td><td>195</td><td>48M</td></tr><tr><td>DN-Deformable-DETRt</td><td>44.5(+1.1)</td><td>63.3</td><td>47.8</td><td>27.5</td><td>48.0</td><td>58.9</td><td>12</td><td>239</td><td>59M</td></tr></table>

Table 1: Experimental results based on Deformable-DETR, SAM-DETR, SAP-DETR, Dab-DETR, DINO and DN-DETR on COCO valida tion set. $\dagger$ indicates that Deformable-DETR uses iterative bounding box refinement mechanism. $^ { \dag \dag }$ stands for two-stage Deformable-DETR, which utilizes generated region proposals of the first stage as object queries for further refinement.

# 4 Experiments

# 4.1 Setup

Dataset We conduct the experiments on the well-known COCO 2017 object detection dataset [Lin et al., 2014], which contains about 118K training images and 5K validation images. Following the common practice in detection methods, we report the standard mean average precision (AP) result on the validation set under different bounding box IoU thresholds with different object scales.

Implemention Details We test the effectiveness of our method on six DETR’s variants: Deformable-DETR, SAMDETR, SAP-DETR, DAB-DETR, DN-DETR, and DINO. They comprise a backbone network, multiple transformer encoder layers, and decoder layers. For a fair comparison, we uniformly adopt ResNet-50 [He et al., 2015] model pretrained on ImageNet-1K [Russakovsky et al., 2014] as the backbone for each variant. We follow the original hyperparameters setting of corresponding baseline methods. For detailed network structure of SAPM please refer to Appendices.A.1. The category and box similarity thresholds are set as: $t _ { c } = 3 \times 1 0 ^ { - 7 } \dot { , } t _ { b } \dot { = } 0 . 9$ . The output size of RoI-Align used in content query enhancement is $7 \times 7$ . We use 2 images per GPU on an 8-(A100)GPU machine for training, with a total batch size of 16. AdamW [Loshchilov and Hutter, 2017] is used for optimizing with $\beta _ { 1 } = 0 . 9$ , $\beta _ { 2 } = 0 . 9 9 9$ , and weight decay $1 0 ^ { - 4 }$ . The learning rates for the backbone network and other modules are set to $1 0 ^ { - 5 }$ and $1 0 ^ { - 4 }$ , respectively. For fast converging variants (DN-DETR and DINO), we train models for 12 epochs and drop the learning rate by 0.1 after 11 epochs. For Deformable-DETR and DAB-DETR, we train models for 50 epochs and drop the learning rate by 0.1 after 40 epochs. For the loss function, we use the L1 loss and GIOU [Rezatofighi et al., 2019] loss for bounding box regression and focal loss [Lin et al., 2019] with $\alpha = 0 . 2 5$ , $\gamma = 2$ for object classification. Following the training setting in DETR’s variants, we add auxiliary losses after each decoder layer. We use the same loss coefficients as each baseline method, that is, 2.0 for classification loss, 5.0 for L1 loss, and 2.0 for GIOU loss.

# 4.2 Main Results

Table 1 presents our main experimental results. All models are evaluated on the COCO 2017 validation set for fairness. Our method consistently enhances the performance of all methods. For Deformable-DETR, our approach achieves AP gains of 1.5 (45.4 vs. 46.9) and 1.1 (46.2 vs. 47.3) under iterative bounding box refinement and two-stage settings, respectively. DAB-DETR and DAB-Deformable-DETR improve the positional aspect of the query, and our method further enhances performance with AP gains of 1.0 (42.2 vs. 43.2) and 0.8 (46.8 vs. 47.6), respectively. This indicates that our optimization of the content query is orthogonal to the position query. For SAM-DETR and SAP-DET, our approach results in AP gains of 1.2 (41.8 vs. 43.0)and 1.4 (43.1 vs. 44.5) respectively. DN-DETR, which introduces a query denoising task to help stabilize bipartite graph matching and accelerate training convergence, also benefits from our method with a $1 . 3 \mathrm { A P }$ improvement (41.1 vs. 42.4) under a 12-epoch training schedule. For state-of-the-art method DINO, we obtains 0.4 (49.0 vs. 49.4) AP improvement. Although the gains for DINO are not yet significant, our joint optimization of both the content query and matching strategy has illuminated a new direction for DETR-based detection methods. These two modules are closely related in a non-trivial way. Our current solution is effective and has great potential for further improvement, which we leave for future research. For more results of Swin Transformer backbone [Liu et al., 2021] please refer to Appendices.B.1.

# 4.3 Ablations

Table 2: Ablation results for our method. All models are tested over Deformable-DETR with iterative bounding box refinement baseline.   

<table><tr><td>SACQ QA Global Local</td><td colspan="4">AP AP50 AP75 APs APM APL</td></tr><tr><td>baseline</td><td>45.4</td><td>64.7 49.0</td><td>26.8 48.3</td><td>61.7</td></tr><tr><td></td><td>46.2 65.2</td><td>49.7</td><td>28.7 49.2</td><td>61.9</td></tr><tr><td>三 &lt;</td><td>46.6 65.2</td><td>50.4</td><td>28.9 49.5</td><td>62.3</td></tr><tr><td>&lt;</td><td>46.9 65.4</td><td>50.7</td><td>29.0</td><td>50.1 62.5</td></tr></table>

We conduct a set of ablation studies on Deformable-DETR with iterative bounding box refinement baseline to verify the effectiveness of each component in our method. The results in Table 2 show that all components contribute to performance improvement. SACQ-Global means we only adopt one SAPM to pool global features from the encoder to initialize content queries. SACQ-Local denotes locally pooled features are used to enhance the content queries after the first decoder layer. QA stands for our similarity query aggregation strategy, which merges similar predicted results from different queries into the same one. The results show that content query initialized with globally pooled feature has the most noticeable performance improvement.

Table 3: The influence of CR module for SACQ.   

<table><tr><td></td><td>with CR module|AP AP50 AP75 APs APM APL</td><td></td><td></td></tr><tr><td>√</td><td>46.365.149.8 28.7 49.2 62.2 46.665.2 50.4</td><td>28.9</td><td>）49.5 62.3</td></tr></table>

We analyze the influence of the channel weighting module of SACQ, as shown in Table 3. The results indicate that adding the CR module improves performance to some extent. We argue that the CR module can make each content query more specialized and respond to different inputs in a highly object-specific manner.

Furthermore, we investigate the impact of varying thresholds on our query aggregation strategy. We set the category threshold at a low value to guarantee that queries with the same categories are merged. This does not have a significant impact on performance outcomes. However, the performance is highly sensitive to the bounding box Intersection over Union (IoU) threshold. We observe a performance decline when the box IoU threshold is too small. As shown in Table 7, we present the results obtained using various box IoU thresholds. When the threshold is set at 0.7, the performance declines to an AP of 45.3, which falls below the baseline without query aggregation. This decrease can be attributed to the negative impact on the merging of objects that

do not significantly overlap with one another. For more ablations, please refer to Appendices B.2 and B.3.   

<table><tr><td>Box IoU threshold tb| AP AP50 AP75 APs APM APL</td><td></td><td></td></tr><tr><td>0.9</td><td>46.9 65.450.72</td><td>29.0 50.1 6 62.5</td></tr><tr><td>0.8</td><td>46.7 65.2 50.52</td><td>28.949.6 62.3 </td></tr><tr><td>0.7</td><td>63.4 48.4 27.6</td><td>48.5 61.0</td></tr></table>

Table 4: The influence of different box IoU thresholds in QA.

# 4.4 Discussions

What do attention maps of SACQ learn? Our comprehensive experiments conducted across various baselines have confirmed the effectiveness of our SACQ. To provide a clear understanding of its self-attention mechanism, we have visualized the global pooling attention maps in the form of heatmaps. As depicted in Figure 8, each attention map within the SACQ module accurately concentrates on the related object (indicated by the red bounding box, which represents the predicted object of the corresponding query). For queries with low prediction scores, the attention maps exhibit a more uniform distribution, suggesting a less focused attention. The capacity to precisely focus on specific objects verifies that the features generated are appropriate for initiating content queries. This initiation results in a superior content prior for cross-attention calculations in the initial decoder layer, thereby improving the cross-attention mechanism’s precision in targeting the desired objects. For additional visualizations, please see Appendix B.4.

Can SACQ be replaced by ROI-Aligned features? The ROI-aligned results on encoded feature maps can simply serve as an option for content query initialization. However, it necessitates an additional module to generate ROIs for most DETR’s variants (except two-stage Deformable-DERT). This contradicts one of the key advantages of DETR’s variants, namely the elimination of anchor or proposal generation. Additionally, we conduct the experiment of using ROI-aligned features as content query initialization, where the ROIs are from the first stage of two-stage Deformable-DERT. Compared to the original two-stage Deformable-DERT, the performance deteriorates 1.1 points (45.1 vs. 46.2). The primary reasons are twofold: 1) the bounding boxes predicted from the first stage is of low quality, as indicated by DINO’s author; 2) the obtained features using ROIs contain irrelevant contents as the objects may not perfectly fit the target boxes, making the features ambiguous and insufficient for content query initialization. In contrast, SACQ can accurately focus on target objects through SAPM module (refer to Figure.8).

How does QA cooperate with SACQ? With improved initialization, SACQ is capable of producing a greater number of high-quality candidate bounding boxes for a target object, as illustrated in the left part of Figure.5. The traditional oneto-one matching approach would assign a high target score to only one of these queries, resulting in the suppression and underutilization of the remaining queries. Additionally, the presence of more high-quality candidates can further destabilize the optimization process. For example, candidates A and

![](Images_EEBF8EGR/52ca53dc9b21f4e748d148067a29f9a7f8e7f464c64936f427993f3747842d40.jpg)  
Figure 4: The attention maps from the SACQ module are visualized to correspond with detected objects, each encased within a red bounding box. These maps exhibit a well focus on the predicted object, indicating their efficacy in extracting features that are relevant to the target. The ability to precisely concentrate on specific object confirms that generated features are suitable for the initialization of content queries.

B both meet the matching criteria for a target object. During a specific training iteration, candidate A might be optimized while candidate B is suppressed, and vice versa in another iteration. This fluctuation aggravates the instability of the optimization process and makes it more difficult to achieve convergence. Our Query Aggregation (QA) module is designed to address this issue by merging the outputs of these highquality candidates, thereby eliminating the need to suppress any additional high-quality candidates corresponding to the same object.

![](Images_EEBF8EGR/76576dcfd688cba3522cfc1d0fc2adc944267a901c379059f330b506328056f5.jpg)  
Figure 5: Visualization of activated query’s bounding box (green boxes) and its highly overlapped $\mathrm { ( I o U > 0 . 8 ) }$ ) bounding boxes (red boxes) from queries with suppressed low scores. Improved content query initialization from SACQ generates more potential queries with similar bboxes, which can be further addressed by QA.

What does the object predicted by the merged query look like? As previously discussed, our query aggregation strategy combines similar predictions from different high-quality candidates into a single prediction. In the validation set, the maximum number of merging operations is 169, while the minimum is 1, indicating instances where no merging occurred. Figure.6 illustrates the predicted bounding boxes after merging, alongside the original prediction from each query. The green bounding boxes represent predictions from merged queries with scores above 0.5, while the red boxes denote predictions from queries before merging. The blue boxes represent the predictions from queries with scores below 0.5. The results demonstrate that our strategy can increase confidence in object prediction by merging high-quality candidates and maximizing their utility. For example, in Figure.6, the score for the person on the left in the second-row image without query aggregation is below 0.5. However, with query aggregation, the corresponding prediction for the same person exceeds a score of 0.5. This highlights the effectiveness of our aggregation approach in improving the reliability of object detection.

![](Images_EEBF8EGR/a6b5e5ed96b396805a4ab0290db6316d5ee6badc13767909b390842024bfab0b.jpg)  
Figure 6: Visualization of all predicted boxes of queries in Deformable-DETR w/ and w/o QA. The green and red boxes are the predicted objects of merged queries and corresponding queries before merging, respectively. And the blue boxes are from queries with low predicted scores $( < 0 . 5 )$

# 5 Conclusion

In this paper, we introduce a novel plug-and-play method that enhances the performance of DETR’s variants. Our approach incorporates a Self-Adaptive Content Query (SACQ) module and a Query Aggregation (QA) strategy. The SACQ module improves the content aspect of the query in DETR’s variants by offering better initialization and step-by-step enhancement. The QA strategy, on the other hand, preserves the high-quality candidates generated by SACQ and reduces the instability associated with one-to-one matching by merging similar candidate boxes. This further complements the SACQ module. We have conducted extensive experiments on six different baseline methods with multiple configurations to validate the efficacy of our approach.

# A Implemention Details A.1 Detailed Network Structure of SAPM

![](Images_EEBF8EGR/cf6c6ad0d4271842b6976d6864935324d2ff0dfdc2ed2e03166a6f8363a20b42.jpg)  
Figure 7: Detailed Architecture of SAPM

In our experiments, AMP module is made up of three convolutional layers, which is illustrated in Fig.7(a). Features from transformer encoder have 256 channels. Hence, the kernel shape of Conv1 is: $2 5 6 \times 2 5 6 \times 5 \times 5$ . The kernel shape of Conv2 is: $2 5 6 \times 2 5 6 \times 3 \times 3$ . And the kernel shape of Conv3 is: $q \times 2 5 6 \times 3 \times 3$ . $q$ is the number of queries in DETR’s variants. $( q = 9 0 0$ for DINO and $q = 3 0 0$ for other variants). The number of groups in GN is 32. We use softmax function to normalize the attention map on spatial dimension:

$$
A [ i , j , k ] = \frac { \exp ( F [ i , j , k ] * \tau ) } { \sum _ { j , k } ^ { h , w } \exp ( F [ i , j , k ] * \tau ) }
$$

Here, $F \in \mathbb { R } ^ { q \times h \times w }$ is the output feature of Conv3. We set $\tau \ = \ 1 . 2$ in our experiments. For Deformable-DETR and DINO, which have multi-scale features, AMPs with independent parameters are used to generate pooled features for each scale. Furthermore, the pooled features of different scales are averaged as the final feature:

$$
F ^ { P } = \frac { 1 } { N } \sum _ { i } ^ { N } F _ { ( i ) } ^ { P }
$$

Here, $F _ { ( i ) } ^ { P }$ is the i-th pooled feature, and $N$ is the total number of scales of features. As is shown in Fig.7(b), CR module is made up of two linear layers, the shape of each layer’s weight is: $2 5 6 \times 2 5 6$ .

# A.2 About Positional Query in Our Method

We would like to clarify that we did not change the positional query of each DERT’s variant. In the case of Dab-DETR, the positional query is an embedding of the anchor box, which is refined layer by layer. For the other variants, the positional query remains the same across different layers. We will highlight this point in a revision of the paper.

# A.3 Details of SAPM in Two-stage Deformable DETR

In the original two-stage deformable DETR, the top- $\mathbf { \nabla } \cdot \mathbf { k }$ inactive bounding box coordinates are selected from the first stage to create a set of positional embeddings consisting of $\mathbf { k }$ ddimensional vectors. These positional embeddings are then processed through a layer of fully connected (FC) followed by layer normalization (LN), resulting in 2d-dimensional vectors. These vectors are subsequently divided into two separate d-dimensional vectors: the positional query and content query. Thus, the original two-stage deformable DETR’s query only contains location information and lacks the content information of the object. In our approach, we replace the content query with the query generated by SAPM, just like replacing a zero-initialized or learnable content query in other variants. In the case of one-stage deformable DETR, both the positional query and content query are initialized by learned embedding, we also only substitute the initialization of content query. It should be emphasized that we do not change the positional query of each DERT’s variant.

# B More Experiments

# B.1 Results of Swin-tiny Backbone

We also provide experiments results of our method based on swin-tiny backbone network. Table 5 shows the performance gains of our method in different DETR’s variants. For DNDETR and DINO, we train models for 12 epochs and drop the learning rate by 0.1 after 11 epochs. For others, we train models for 50 epochs and drop the learning rate by 0.1 after 40 epochs.

Table 5: Experimental results based on swin-tiny backbone on COCO validation set. $\dagger$ indicates that Deformable-DETR uses iterative bounding box refinement mechanism. $^ { \dag \dag }$ stands for two-stage Deformable-DETR, which utilizes generated region proposals of the first stage as object queries for further refinement.   

<table><tr><td rowspan=1 colspan=1>Method</td><td rowspan=1 colspan=1>w/ Ours</td><td rowspan=1 colspan=1>[w/ Ours|AP AP50AP75 APs APM APL</td></tr><tr><td rowspan=4 colspan=1>Deform.-DETRtDeform.-DETRtDeform.-DETRttDeform.-DETR†tSAM-DETRSAM-DETRSAP-DETRSAP-DETRDab-DETRDab-DETRDINODINODN-DETRDN-DETR</td><td rowspan=1 colspan=1></td><td rowspan=4 colspan=1>49.7 68.6 54.1 32.8 52.2 65.850.8 69.7 555.3 33.3 53.7 (66.450.9 69.655.5 33.6 53.466.651.7 70.356.6 34.6 54.3（67.345.1 63.243.9 25.8 49.264.545.8 64.946.1 26.6 50.1(65.545.9 65.547.5 25.5 49.865.146.5 66.248.3 26.1 50.4 66.044.3 65.847.1 24.3 48.0 64.445.2 66.948.0 24.9 48.965.751.3 69.656.2 34.4 53.866.551.8 70.4 56.7 34.6 54.4 67.543.6 63.5445.8 22.9 46.9 62.144.7 64.746.9 23.7 47.5 63.4</td></tr><tr><td rowspan=1 colspan=1></td></tr><tr><td rowspan=1 colspan=1></td></tr><tr><td rowspan=1 colspan=1></td></tr></table>

# B.2 Different normalization functions

Table 6 shows the different results between sigmoid and softmax normalization for the attention map used in SACQ. Softmax normalization achieve better performance due to the attention maps can make content queries focus on objects better.

<table><tr><td>Norm. function|AP AP50 AP75 APs APM APL</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>sigmoid</td><td>46.064.849.62</td><td></td><td></td><td>28.0</td><td></td><td>）49.161.8</td></tr><tr><td>softmax</td><td>46.66</td><td>65.2</td><td>50.4</td><td>28.9 </td><td>49.5</td><td>62.3</td></tr></table>

Table 6: The influence of different normalization functions of attention map in SACQ.

# B.3 Influence of The Number of Conv. Layer

We also show the influence of the number of convolutional layers of the attention map projection module in our SACQ module. As shown in Table 7, the results demonstrate that adding more convolutional layers improves the performance, but the performance improvement becomes marginal as the number of layers increases. Therefore, we use 3 convolutional layers in the attention map projection module in our experiment.

Table 7: The influence of the number of convolutional layers of the attention map projection module in SACQ.   

<table><tr><td>Conv. layers|APAP504</td><td></td><td></td><td>AP75</td><td></td><td>APsAPM</td><td>APL</td></tr><tr><td>1</td><td>46.3</td><td>64.4</td><td>49.9</td><td>28.9</td><td>49.1</td><td>62.0</td></tr><tr><td>2</td><td>46.4</td><td>64.6</td><td>50.0</td><td>28.8</td><td>49.3</td><td>61.7</td></tr><tr><td>3</td><td>46.6</td><td>65.2</td><td>50.4</td><td>28.9</td><td>49.5</td><td>62.3</td></tr><tr><td>4</td><td>46.7</td><td>65.1</td><td>50.3</td><td>29.1</td><td>49.8</td><td>62.5</td></tr><tr><td>5</td><td>46.7</td><td>64.9</td><td>50.4</td><td>29.3</td><td>49.8</td><td>62.3</td></tr></table>

# B.4 Training and Inference Time

We conduct experiments on A100 GPUs. The total training time of original two-stage deformable DETR is 37.3 hours (50 epochs, 8 GPUs). The training time increases to 44.5 hours after adding SAPM and QA. The inference FPS are 25.1 and 21.7 for original and our approach, respectively. For DINO, our method increases 3.1 hours(12 epochs, 16.3 hours vs. 19.4 hours). The inference FPS drops 2.7 ( 18.5 vs. 15.7).

# B.5 More Visualizations of Attention Maps of SACQ

We visualize the global pooling attention maps in corresponding to features at different scales in the form of heat maps. As depicted in Fig.8, each attention map in SACQ module focuses on its related object (predicted object of corresponding query which is drawn as red bounding box). Furthermore, the attention maps corresponding to high-resolution (low-level) features have smaller highlight areas than those corresponding to low-resolution (high-level) features. That means attention maps of high-resolution features focus on the

Local salient features of objects. And attention maps of lowresolution features provide more global information for objects in the pooling procedure. The pooled features through these attention maps, which focus on a local region corresponding to a target object can provide better content prior for cross-attention computing in the first decoder layer. And the content prior will make the cross-attention in decoder focus on a target object better.

# References

[Carion et al., 2020] Nicolas Carion, Francisco Massa, Gabriel Synnaeve, Nicolas Usunier, Alexander Kirillov, and Sergey Zagoruyko. End-to-end object detection with transformers. In ECCV, pages 213–229, 2020.   
[Chen et al., 2022] Qiang Chen, Xiaokang Chen, Gang Zeng, and Jingdong Wang. Group detr: Fast training convergence with decoupled one-to-many label assignment. ArXiv, abs/2207.13085, 2022.   
[Chen et al., 2023] Fangyi Chen, Han Zhang, Kaiqin Hu, Yu-Kai Huang, Chenchen Zhu, and Marios Savvides. Enhanced training of query-based object detection via selective query recollection. In IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2023.   
[Dai et al., 2021a] Xiyang Dai, Yinpeng Chen, Jianwei Yang, Pengchuan Zhang, Lu Yuan, and Lei Zhang. Dynamic detr: End-to-end object detection with dynamic attention. In IEEE International Conference on Computer Vision (ICCV), page 2988–2997, 2021.   
[Dai et al., 2021b] Xiyang Dai, Yinpeng Chen, Jianwei Yang, Pengchuan Zhang, Lu Yuan, and Lei Zhang. Dynamic detr: End-to-end object detection with dynamic attention. 2021 IEEE/CVF International Conference on Computer Vision (ICCV), pages 2968–2977, 2021.   
[Girshick et al., 2014] Ross Girshick, Jeff Donahue, Trevor Darrell, and Jitendra Malik. Rich feature hierarchies for accurate object detection and semantic segmentation. In IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2014.   
[Girshick, 2015] Ross Girshick. Fast r-cnn. In IEEE International Conference on Computer Vision (ICCV), 2015.   
[He et al., 2015] Kaiming He, X. Zhang, Shaoqing Ren, and Jian Sun. Deep residual learning for image recognition. IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 770–778, 2015.   
[He et al., 2017] Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Girshick. Mask r-cnn. In ´ IEEE International Conference on Computer Vision (ICCV), pages 2961–2969, 2017.   
[Hosang et al., 2017] Jan Hendrik Hosang, Rodrigo Benenson, and Bernt Schiele. Learning non-maximum suppression. IEEE Conference on Computer Vision and Pattern Recognition (CVPR), pages 6469–6477, 2017.   
[Hu et al., 2018] Jie Hu, Li Shen, and Gang Sun. Squeezeand-excitation networks. In IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2018.

![](Images_EEBF8EGR/41a3791f5a1ff6fbe4916c7bc7e2efdcdf904f2b1426b0f5a899755a6ac4e142.jpg)  
Figure 8: Visualization of attention maps of SACQ for detected objects. For each object, we show three attention maps corresponding to different-scale features of Deformable-DETR. From left to right, the first attention map corresponds to the resolution of $C _ { 3 }$ -stage features of the backbone network. And the next two correspond accordingly to $C _ { 4 }$ -stage and $C _ { 5 }$ -stage features.

[Jia et al., 2022] Ding Jia, Yuhui Yuan, Haodi He, Xiaopei Wu, Haojun Yu, Weihong Lin, Lei Sun, Chao Zhang, and Han Hu. Detrs with hybrid matching. arxiv, July 2022.

[Joyce, 2011] James M. Joyce. Kullback-Leibler Divergence, pages 720–722. Springer Berlin Heidelberg, Berlin, Heidelberg, 2011.

[Li et al., 2022a] Feng Li, Hao Zhang, Shilong Liu, Jian Guo, Lionel M. Ni, and Lei Zhang. Dn-detr: Accelerate detr training by introducing query denoising. In IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2022.

[Li et al., 2022b] Feng Li, Hao Zhang, Hu-Sheng Xu, Siyi Liu, Lei Zhang, Lionel Ming shuan Ni, and Heung yeung Shum. Mask dino: Towards a unified transformer-based framework for object detection and segmentation. 2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3041–3050, 2022.

[Lin et al., 2014] Tsung-Yi Lin, Michael Maire, Serge J. Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C. Lawrence Zitnick. Microsoft coco: Com- ´ mon objects in context. In European Conference on Computer Vision, 2014.

[Lin et al., 2017] Tsung-Yi Lin, Piotr Dollar, Ross B. Gir- ´ shick, Kaiming He, Bharath Hariharan, and Serge J. Belongie. Feature pyramid networks for object detection. IEEE Conference on Computer Vision and Pattern Recognition (CVPR), pages 936–944, 2017.

[Lin et al., 2019] Tsung-Yi Lin, Priya Goyal, Ross Girshick, Kaiming He, and Piotr Dollar. Focal loss for dense object ´ detection. In IEEE International Conference on Computer Vision (ICCV), 2019.

[Liu et al., 2016] Wei Liu, Dragomir Anguelov, Dumitru Erhan, Christian Szegedy, Reed Scott, Cheng-Yang Fu, and Alexander C Berg. Ssd: Single shot multibox detector. In ECCV, pages 21–37, 2016.

[Liu et al., 2021] Ze Liu, Yutong Lin, Yue Cao, Han Hu, Yixuan Wei, Zheng Zhang, Stephen Lin, and Baining Guo. Swin transformer: Hierarchical vision transformer using shifted windows. 2021 IEEE/CVF International Conference on Computer Vision (ICCV), pages 9992–10002, 2021.

[Liu et al., 2022a] Shilong Liu, Feng Li, Hao Zhang, Xiao Yang, Xianbiao Qi, Hang Su, Jun Zhu, and Lei Zhang. Dab-detr: Dynamic anchor boxes are better queries for detr. In International Conference on Learning Representations, 2022.

[Liu et al., 2022b] Yang Liu, Yao Zhang, Yixin Wang, Yang Zhang, Jiang Tian, Zhongchao Shi, Jianping Fan, and Zhiqiang He. Sap-detr: Bridging the gap between salient points and queries-based transformer detector for fast model convergency. ArXiv, abs/2211.02006, 2022.

[Liu et al., 2023] Siyi Liu, Tianhe Ren, Jia-Yu Chen, Zhaoyang Zeng, Hao Zhang, Feng Li, Hongyang Li, Jun Huang, Hang Su, Jun-Juan Zhu, and Lei Zhang. Detection transformer with stable matching. ArXiv, abs/2304.04742, 2023.

[Loshchilov and Hutter, 2017] Ilya Loshchilov and Frank Hutter. Decoupled weight decay regularization. In International Conference on Learning Representations, 2017.

[Qiu et al., 2023] Tian Qiu, Linyun Zhou, Wenxiang Xu, Lechao Cheng, Zunlei Feng, and Mingli Song. Team detr: Guide queries as a professional team in detection transformers. arxiv, 2023.

[Redmon and Farhadi, 2018] Joseph Redmon and Ali Farhadi. Yolov3: An incrementalimprovement. In CoRR, 2018.

[Redmon et al., 2016] Joseph Redmon, Santosh Divvala, Ross Girshick, and Ali Farhadi. You only look once: Unified, real-time object detection. In IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2016.

[Ren et al., 2015] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun. Faster r-cnn: Towards real-time object detection with region proposal networks. Advances in neural information processing systems, 28, 2015.

[Rezatofighi et al., 2019] Seyed Hamid Rezatofighi, Nathan Tsoi, JunYoung Gwak, Amir Sadeghian, Ian D. Reid, and Silvio Savarese. Generalized intersection over union: A metric and a loss for bounding box regression. IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 658–666, 2019.

[Roh et al., 2022] Byungseok Roh, JaeWoong Shin, Wuhyun Shin, and Saehoon Kim. Sparse detr: Efficient end-to-end object detection with learnable sparsity. In International Conference on Learning Representations, 2022.

[Russakovsky et al., 2014] Olga Russakovsky, Jia Deng, Hao Su, Jonathan Krause, Sanjeev Satheesh, Sean Ma, Zhiheng Huang, Andrej Karpathy, Aditya Khosla, Michael S. Bernstein, Alexander C. Berg, and Li Fei-Fei. Imagenet large scale visual recognition challenge. International Journal of Computer Vision, 115:211–252, 2014.

[Sun et al., 2020] Zhiqing Sun, Shengcao Cao, Yiming Yang, and Kris Kitani. Rethinking transformer-based set prediction for object detection. arxiv, 2020.

[Tian et al., 2019] Zhi Tian, Chunhua Shen, Hao Chen, and Tong He. Fcos: Fully convolutional one-stage object detection. In IEEE International Conference on Computer Vision (ICCV), 2019.   
[Wang et al., 2021a] Tao Wang, Li Yuan, Yunpeng Chen, Jiashi Feng, and Shuicheng Yan. Pnp-detr: Towards efficient visual analysis with transformers. In IEEE International Conference on Computer Vision (ICCV), 2021.   
[Wang et al., 2021b] Yingming Wang, Xiangyu Zhang, Tong Yang, and Jian Sun. Anchor detr: Query design for transformer-based detector. In AAAI, 2021.   
[Zhang et al., 2022] Gongjie Zhang, Zhipeng Luo, Yingchen Yu, Kaiwen Cui, and Shijian Lu. Accelerating detr convergence via semantic-aligned matching. 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 939–948, 2022.   
[Zhang et al., 2023] Hao Zhang, Feng Li, Shilong Liu, Lei Zhang, Hang Su, Jun Zhu, Lionel M. Ni, and HeungYeung Shum. Dino: Detr with improved denoising anchor boxes for end-to-end object detection. In International Conference on Learning Representations, 2023.   
[Zhao and Ukita, 2023] Kaikai Zhao and Norimichi Ukita. Ks-detr: Knowledge sharing in attention learning for detection transformer. ArXiv, abs/2302.11208, 2023.   
[Zhu et al., 2021] Xizhou Zhu, Weijie Su, Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable detr: Deformable transformers for end-to-end object detection. In International Conference on Learning Representations, 2021.   
[Zong et al., 2022] Zhuofan Zong, Guanglu Song, and Yu Liu. Detrs with collaborative hybrid assignments training. ArXiv, abs/2211.12860, 2022.   
[Zong et al., 2023] Zhuofan Zong, Guanglu Song, and Yu Liu. Detrs with collaborative hybrid assignments training. IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2023.