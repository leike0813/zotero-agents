# CvF

This CVPR paper is the Open Access version, provided by the Computer Vision Foundation. Except for this watermark, it is identical to the accepted version; the final published version of the proceedings is available on IEEE Xplore.

# DN-DETR: Accelerate DETR Training by Introducing Query DeNoising

Feng $\operatorname { L i } ^ { 2 ; 2 \gimel }$ Hao Zhang1,2\*t， Shilong Liu2.3t，Jian Guo²，Lionel M. $\mathrm { N i ^ { 1 , 4 } }$ ， Lei Zhang2‡ 1The Hong Kong University of Science and Technology. 2International Digital Economy Academy (IDEA). 3Tsinghua University. 4The Hong Kong University of Science and Technology (Guangzhou). {fliay,hzhangcx}@connect.ust.hk {liusl20}@mails.tsinghua.edu.cn {ni}@ust.hk {guojian,leizhang}@idea.edu.cn

# Abstract

We present in this paper a novel denoising training method to speedup DETR (DEtection TRansformer) training and offer a deepened understanding of the slow convergence issue of DETR-like methods. We show that the slow convergence results from the instability of bipartite graph matching which causes inconsistent optimization goals in early training stages. To address this issue,except for the Hungarian loss,our method additionally feeds ground-truth bounding boxes with noises into Transformer decoder and trains the model to reconstruct the original boxes,which effectively reduces the bipartite graph matching diffculty and leads to a faster convergence. Our method is universal and can be easily plugged into any DETR-like methods by adding dozensof lines of code to achieve a remarkable improvement.As a result,our DN-DETR results in a remarkable improvement $( + 1 . 9 A P )$ under the same setting and achieves the best result (AP 43.4 and 48.6 with 12 and 50 epochs of training respectively) among DETR-like methods with ResNet-5O backbone. Compared with the baseline under the same setting, DN-DETR achieves comparable performance with $5 0 \%$ training epochs. Code is available at https://github.com/FengLi-ust/DN-DETR.

# 1. Introduction

Object detection is a fundamental task in computer vision which aims to predict the bounding boxes and classes of objects in an image. While having made remarkable progress,classical detectors[14,15] were mainly based on convolutional neural networks, until Carion et al.[1] recently introduced Transformers [17] into object detection and proposed DETR (DEtection TRansformer).

![](Images_YM5G5G2T/8667e0d363c4ddc7fcbc439012c3e58621bd7cd20412102e82124b83439f28f8.jpg)  
Figure 1. Convergence curve between our model DN-DeformableDETR built upon Deformable DETR with denoising training and previous models under ResNet-5O backbone.

In contrast to previous detectors,DETR uses learnable queries to probe image features from the output of Transformer encoders and bipartite graph matching to perform set-based box prediction. Such a design effectively eliminates hand-designed anchors and non-maximum supperession (NMS） and makes object detection end-to-end optimizable.However, DETR suffers from prohibitively slow training convergence compared with previous detectors. To obtain a good performance, it usually takes 5Oo epochs of training on the COCO detection dataset,in contrast to 12 epochs used in the original Faster-RCNN training.

Much work [3,11,12,16,18,20] has tried to identify the root cause and mitigate the slow convergence issue. Some of them address the problem through improving the model architecture.For example, Sun et al. [16] attribute the slow convergence issue to the low efficiency of the cross-attention and proposed an encoder-only DETR. Dai et al. [3] designed a ROI-based dynamic decoder to help the decoder focus on regions of interest.More recent works propose to associate each DETR query with a specific spatial position rather than multiple positions for more efficient feature probing [11,12,18,2O]. For instance, Conditional DETR [12] decouples each query into a content part and a positional part, enforcing a query to have a clear correspondence with a specific spatial position.Deformable DETR [20] and Anchor DETR [18] directly treat $2 D$ reference points as queries to perform cross-attention. DAB-DETR [11] interprets queries as 4-D anchor boxes and learns to progressively improve them layer by layer.

Despite all the progress, few work pays attention to the bipartite graph matching part for more efcient training. In this study, we find that the slow convergence issue also results from the discrete bipartite graph matching component, which is unstable especially in the early stages of training due to the nature of stochastic optimization. As a consequence, for the same image,a query is often matched with different objects in different epochs,which makes optimization ambiguous and inconstant.

To address this problem,we propose a novel training method by introducing a query denoising task to help stabilize bipartite graph matching in the training process. Since previous works have shown effective to interpret queries as reference points [18,20] or anchor boxes [11] which contain positional information, we follow their viewpoint and use 4D anchor boxes as queries.Our solution is to feed noised ground truth bounding boxes as noised queries together with learnable anchor queries into Transformer decoders.Both kinds of queries have the same input format of $( x , y , w , h )$ and can be fed into Transformer decoders simultaneously. For noised queries,we perform a denoising task to reconstruct their corresponding ground truth boxes. For other learnable anchor queries,we use the same training loss including bipartite matching as in the vanilla DETR. As the noised bounding boxes do not need to go through the bipartite graph matching component, the denoising task can be regarded as an easier auxiliary task, helping DETR alleviate the unstable discrete bipartite matching and learn bounding box prediction more quickly. Meanwhile, the denoising task also helps lower the optimization difficulty because the added random noise is usually small. To maximize the potential of this auxiliary task, we also regard each decoder query as a bounding box $\mathbf { \nabla } + \mathbf { a }$ class label embedding so that we are able to conduct both box denoising and label denoising.

In summary, our method is a denoising training approach. Our loss function consists of two components. One is a reconstruction loss and the other is a Hungarian loss which is the same as in other DETR-like methods. Our method can be easily plugged into any existing DETR-like method.For convenience,we utilize DAB-DETR [11] to evaluate our method since their decoder queries are explicitly formulated as 4D anchor boxes $( x , y , w , h )$ . For DETR variants that only support 2D anchor points such as anchor DETR [18],we can do denoising on anchor points. For those that do not support anchors like the Vanilla DETR [1], we can do linear transformation to map 4D anchor boxes to the same latent space as for other learnable queries.

To the best of our knowledge,this is the first work to introduce the denoising principle into detection models. We summarize our contribution as follows:

1. We design a novel training method to speedup DETR training. Experimental results show that our method not only accelerates training convergence,but also leads to a remarkably better training result — achieve the best result among all detection algorithms in the 12-epoch setting.Moreover,our method shows a remarkable improvement ( $\mathbf { \tau } _ { + 1 . 9 }$ AP)over our baseline DAB-DETR and can be easily integrated into other DETR-like methods.

2.We analyze the slow convergence of DETR from a novel viewpoint and give a deeper understanding of DETR training. We design a metric to evaluate the instability of bipartite matching and verify that our method can effectively lower the instability.

3. We conduct a series of ablation studies to analyze the effectiveness of different components of our model such as noise,label embedding,and attention mask.

# 2. Related Work

Classical CNN-based detectors can be divided into 2 categories, one-stage and two-stage methods. Two-stage methods [6,7] first generate some region proposals and then decide whether each region contains an object and do bounding box regression to get a refined box. Ren et al.[15] proposed an end-to-end method which utilizes a Region Proposal Network to predict anchor boxes. In contrast to twostage methods,one-stage methods [13,14] directly predict the offset of real boxes relative to anchor boxes.Overall, they are all anchor-based methods.

Carion et al.[1] proposed an end-to-end object detector based on Transformers[17] named DETR (DEtection TRansformer） without using anchors. While DETR achieves comparable results with Faster-RCNN [15], its training suffers severely from the slow convergence problem— it needs 5OO epochs of training to obtain a good performance.

Many recent works have attempted to speedup the training process of DETR.Some find the cross attention of Transformer decoders in DETR inefficient and make improvement from different ways. For example, Dai et al. [3] designed a dynamic decoder that can focus on regions of intersts from a coarse-to-fine manner and lower the learning difficulty. Sun et al. [16] discarded the Transformer decoder and proposed an encoder only DETR.Another series of works make improvements in decoder queries.Zhu et al.[2O] designed an attention module that only attend to some sampling points around a reference point. Meng et al.[12] decoupled each decoder query into a content part and a position part and only utilized the content-tocontent and position-to-position terms in the cross-attention formulation. Yao et al.[19] utilized a Region Proposal Network (RPN) to propose top- $K$ anchor points.DAB-DETR [11] uses 4-D box coordinates as queries and updates boxes layer-by-layer ina cascade manner.

Despite all the progress,none of them treats bipartite graph matching used in the Hungarian loss as a main reason for slow convergence. Sun et al. [16] analyzed the impact of Hungarian loss by using a pre-trained DETR as a teacher to provide the ground-truth label assignment for a student model and train the student model. They found that the label assignment only helps the convergence in the early stage of training but does not influence the final performance significantly. Therefore, they concluded that the Hungarian loss is not a main reason for slow convergence.In this work, we give a different analysis with an effective solution that leads to a different conclusion.

We adopt DAB-DETR as the detection architecture to evaluate our training method,where the label embedding appended with an indicator is used to replace the decoder embedding part to support label denoising. The difference between our method and other methods is mainly in the training method. In addition to the Hungarian loss,we add a denoising loss as an easier auxiliary task that can accelerate training and boost the performance significantly. Chen et al.[2] augments their sequence with synthetic noise objects,but is totally different from our method. They set the targets of noise objects to "noise”class (not belonging to any ground truth classes) so that they can delay the Endof-Sentence (EOS) token and improve the recall. In contrast to their method,we set the target of noised boxes to the original boxes and the motivation is to bypass bipartite graph matching and directly learn to approximate ground truth boxes.

# 3. Why Denoising accelerates DETR training?

Hungarian matching is a popular algorithm in graph matching. Given a cost matrix,the algorithm outputs an optimal matching result. DETR is the first algorithm that adopts Hungarian matching in object detection to solve the matching problem between predicted objects and ground truth objects. DETR turns ground truth assignment to a dynamic process,which brings in an instability problem due to its discrete bipartite matching and the stochastic training process. There are works [5] showing that Hungarian matching does not result in a stable matching since blocking pairs exist. A small change of the cost matrix may cause an enormous change in the matching result, which will further lead to inconsistent optimization goals for decoder queries.

We view the training process of DETR-like models as two stages, learning“good anchors”and learning relative offsets.Decoder queries are responsible for learning anchors as shown in previous works [11,2O]. The inconsistent update of anchors can make it difficult to learn relative offsets.Therefore,in our method, we leverage a denoising task as a training shortcut to make relative offset learning easier, as the denoising task bypasses bipartite matching. Since we interpret each decoder query as a 4-D anchor boxes,a noised query can be regarded as a“good anchor”which has a corresponding ground truth box nearby. The denoising training thus has a clear optimization goal - to predict the original bounding box,which essentially avoids the ambiguity brought by Hungarian matching.

To quantitatively evaluate the instability of the bipartite matching result, we design a metric as follows. For a training image, we denote the predicted objects from Transformer decoders as $\mathbf { O ^ { i } } = \left\{ O _ { 0 } ^ { i } , O _ { 1 } ^ { i } , . . . , O _ { N - 1 } ^ { i } \right\}$ in the $i$ -th epoch，where $N$ is the number of predicted objects,and the ground truth objects as $\textbf { T } = \ \{ T _ { 0 } , T _ { 1 } , T _ { 2 } , . . . , T _ { M - 1 } \}$ where $M$ is the number of ground truth objects. After bipartite matching，we compute an index vector $\begin{array} { r l } { \mathbf { V ^ { i } } } & { { } = } \end{array}$ $\big \{ \bar { V } _ { 0 } ^ { i } , V _ { 1 } ^ { i } , . . . , V _ { N - 1 } ^ { i } \big \}$ to store the matching result of epoch $i$ as follows.

$$
V _ { n } ^ { i } = { \left\{ \begin{array} { l l } { m , } & { { \mathrm { i f ~ } } O _ { n } ^ { i } { \mathrm { ~ m a t c h e s ~ } } T _ { m } } \\ { - 1 , } & { { \mathrm { i f ~ } } O _ { n } ^ { i } { \mathrm { ~ m a t c h e s ~ n o t h i n g } } } \end{array} \right. }
$$

We define the instability of epoch $i$ for one training image

![](Images_YM5G5G2T/d4a9b7deffa95a3d58fc2da0a4e41918024b19f563354f47809e096a37a73ab8.jpg)  
Figure 2. The $I S$ of DAB-DETR and DN-DETR during training. For each method, we train l2 epoch on the same setting.We test the change of the Hungarian matching between each two epochs on the Validation set as the $I S$

as the difference between its $V ^ { i }$ and $V ^ { i - 1 }$ , which is calculated as

$$
I S ^ { i } = \sum _ { j = 0 } ^ { N } \mathbb { 1 } ( V _ { n } ^ { i } \neq V _ { n } ^ { i - 1 } )
$$

where $\mathbb { 1 } ( \cdot )$ is the indicator function. $\mathbb { 1 } ( x ) = 1$ if $x$ is true and O otherwise. The instability of epoch $i$ for the whole data set is averaged over the instability numbers for all images. We omit the index for an image for notation simplicity in Eq. (1) and Eq. (2).

Fig.2 shows a comparison of $I S$ between our DN-DETR (DeNoising DETR) and DAB-DETR.We conduct this evalutaion on COCO 2017 validation set [10] which has 7.36 objects per image on average. So the largest possible $I S$ is $7 . 3 6 \times 2 = 1 4 . 7 2$ .Fig.2 clearly shows that our method effectively alleviates the instability of matching.

# 4.DN-DETR

![](Images_YM5G5G2T/e1b31b63d63ab81a1d3d388f5036f851bc3928ee85be2d7c18f2d0b5f9dd697f.jpg)  
Figure 3. Comparison of the cross-attention part DAB-DETR and ourDN-DETR (a)DAB-DETR directly uses dynamically updated anchor boxes to provide both a reference query point $( x , y )$ and a reference anchor size $( w , h )$ to improve the cross-attention computation.(b) DN-DETR specify the decoder embedding as label embedding and add an indicator to differentiate denoising task and matching task.

# 4.1. Overview

We base on the architecture of DAB-DETR [11] to implement our training method. Similar to DAB-DETR,we explicitly formulates the decoder queries as box coordinates. The only difference between our architecture and theirs lies in the decoder embedding,which is specified as class label embedding to support label denoising. Our main contribution is the training method as shown in Fig. 4.

Similar to DETR,our architecture contains a Transformer encoder and a Transformer decoder. On the encoder side, the image features are extracted with a CNN backbone and then fed into the Transformer encoder with positional encodings to attain refined image features. On the decoder side,queries are fed into the decoder to search for objects through cross attention.

We denote decoder queries as $\textbf { q } = { \{ q _ { 0 } , q _ { 1 } , . . . , q _ { N - 1 } \} }$ and the output of the Transformer decoder as $\begin{array} { r l } { \mathbf { O } } & { { } = } \end{array}$ $\big \{ o _ { 0 } , o _ { 1 } , . . . , o _ { N - 1 } \big \}$ . We also use $F$ and $A$ to denote the refined image features after the Transformer encoder and the attention mask derived based on the denoising task design.

We can formulate our method as follows.

$$
\mathbf { o } = D ( \mathbf { q } , F | A )
$$

where $D$ denotes the Transformer decoder.

There are two parts of decoder queries. One is the matching part. The inputs of this part are learnable anchors,which are treated in the same way as in DETR.That is, the matching part adopts bipartite graph matching and learns to approximate the ground truth box-label pairs with matched decoder outputs.The other is the denoising part. The inputs of this part are noised ground-truth (GT) box-label pairs which are called GT objects in rest of the paper. The outputs of the denoising part aims to reconstruct GT objects.

In the following,we abuse the notations to denote the denoising part as $\mathbf { q } = \left\{ q _ { 0 } , q _ { 1 } , . . . , q _ { K - 1 } \right\}$ and the matching part as $\mathbf { Q } = \{ Q _ { 0 } , Q _ { 1 } , . . . , Q _ { L - 1 } \}$ .So the formulation of our method becomes

$$
{ \bf o } = { \cal D } ( { \bf q } , { \bf Q } , { \cal F } | A )
$$

To increase the denoising efciency, we propose to use multiple versions of noised GT objects in the denoising part. Further more,we utilize an attention mask to prevent information leakage from the denoising part to the matching part and among different noised versions of the same GT object.

# 4.2. Intro to DAB-DETR

Many recent works associate DETR queries with different positional information. DAB-DETR follows this analysis and explicitly formulates each query as 4D anchor coordinates. As shown in Fig. 3(a),a query is specified as a tuple $( x , y , w , h )$ ，where $x , y$ are the center coordinates and $w , h$ are the corresponding width and height of each box.In addition, the anchor coordinates are dynamically updated layer by layer. The output of each decoder layer contains a tuple $( \Delta x , \Delta y , \Delta w , \Delta h )$ and the anchor is updated to $( x + \Delta x , y + \Delta y , w + \Delta w , h + \Delta h )$

Note that our proposed method is mainly a training method which can be integrated into any DETR-like models. To test on DAB-DETR,we only add minimal modifications: specifying the decoder embedding as label embedding, as shown in Fig. 3(b).

# 4.3. Denoising

For each image,we collect all GT objects and add random noises to both their bounding boxes and class labels. To maximize the utility of denoising learning, we use multiple noised versions for each GT object.

We consider adding noise to boxes in two ways: center shifting and box scaling. We define $\lambda _ { 1 }$ and $\lambda _ { 2 }$ as the noise scale of these 2 noises.For center shifting,we add a random noise $( \Delta x , \Delta y )$ , to the box center and make sure that $\begin{array} { r } { { } | \Delta x | < \frac { \lambda _ { 1 } w } { 2 } } \end{array}$ and $\begin{array} { r } { | \Delta y | < \frac { \lambda _ { 1 } h } { 2 } } \end{array}$ ， where λ1 ∈ (0,1) so that the center of the noised box will still lie inside the original bounding box. For box scaling，we set a hyperparameter $\lambda _ { 2 } ~ \in ~ ( 0 , 1 )$ ．The width and height of the box are randomly sampled in $[ ( 1 - \lambda _ { 2 } ) w , ( 1 + \lambda _ { 2 } ) w ]$ and $[ ( 1 - \lambda _ { 2 } ) h , ( 1 + \lambda _ { 2 } ) h ]$ ,respectively.

![](Images_YM5G5G2T/ee831efddf9127f95ea19fa1514a87571d16e21ea637652412bdb26f88b17416.jpg)  
Figure4.Theoverviewofourtraining method.Thereare twopartsofqueries,namelythedenoising partandthe matchingpart.The denoising part contains $\geq 1$ denoising groups. The atention masks from the matching part to the denoising part and among denoising groupsaresetto1(block)toblockinformationlakage.Inthefgure,theyellow,browandgreengrdsintheatentionmaskeprsent (unblock) and grey grids represent 1 (block).

For label noising,we adopt label flipping,which means we randomly flip some ground-truth labels to other labels. Label flipping forces the model to predict the ground-truth labels according to the noised boxes to better capture labelbox relationship. We have a hyper-parameter $\gamma$ to control the ratio of labels to flip.The reconstruction losses are $l _ { 1 }$ loss and GIOU loss for boxes and focal loss [9] for class labels as in DAB-DETR.We use a function $\delta ( \cdot )$ to denote the the noised GT objects. Therefore,each query in the denoising part can be represented as $q _ { k } = \delta ( t _ { m } )$ where $t _ { m }$ is $m$ -th GT object.

Notice that denoising is only considered in training, during inference the denoising part is removed,leaving only the matching part.

# 4.4. Attention Mask

Attention mask is a component of great importance in our model. Without attention mask, the denoising training will compromise the performance instead of improving it as shown in Table 4.

To introduce attention mask,we need to first divide the noised GT objects into groups. Each group is a noised version of all GT objects. The denoising part becomes

$$
\mathbf { q } = \left. \mathbf { g _ { 0 } } , \mathbf { g _ { 1 } } , . . . , \mathbf { g _ { P - 1 } } \right.
$$

where $\mathbf { g _ { p } }$ is defined as the $p$ -th denoising group. Each denoising group contains $M$ queries where $M$ is the number of GT objects in the image. So we have

where $q _ { m } ^ { p } = \delta ( t _ { m } )$

leakage. One is that the matching part may see the noised GT objects and easily predict GT objects.The other is that one noised version of a GT object may see another version. Therefore,our attention mask is to make sure the matching part cannot see the denoising part and the denoising groups cannot see each other as shown in Fig. 4.

The purpose of the attention mask is to prevent information leakage. There are two types of potential information

We use $\mathbf { A } \ = \ [ \mathbf { a } _ { i j } ] _ { W \times W }$ to denote the attention mask where $W = P \times M + N$ $P$ and $M$ are the number of groups and GT objects. $N$ is the number of queries in the matching part. We let the first $P \times M$ rows and columns to represent the denoising part and the latter to represent the matching part. $a _ { i j } = 1$ means the $i$ -th query cannot see the $j$ -th query and $a _ { i j } = 0$ otherwise.We devise the attention mask as follows

$$
a _ { i j } = \left\{ \begin{array} { l l } { 1 , } & { \mathrm { ~ i f ~ } j < P \times M \mathrm { ~ a n d ~ } \lfloor \frac { i } { M } \rfloor \neq \lfloor \frac { j } { M } \rfloor ; } \\ { 1 , } & { \mathrm { ~ i f ~ } j < P \times M \mathrm { ~ a n d ~ } i \ge P \times M ; } \\ { 0 , } & { \mathrm { ~ o t h e r w i s e . } } \end{array} \right.
$$

Note that whether the denoising part can see the matching part or not will not influence the performance, since the queries of matching part are learned queries that contain no information of the ground truth objects.

The extra computation introduced by multiple denoising groups is negligible—when 5 denoising groups are introduced, GFLOPs for training is only increased from 94.4 to 94.6 for DAB-DETR with R5O backbone and there is no computation overhead for testing.

# 4.5.Label Embedding

$$
\mathbf { g _ { p } } = \left\{ q _ { 0 } ^ { p } , q _ { 1 } ^ { p } , . . . , q _ { M - 1 } ^ { p } \right\}
$$

The decoder embedding is specified as label embedding in our model to support both box denoising and label denoising. Except for the 80 classes in COCO 2017 [10], we also consider an unknown class embedding which is used in the matching part to be semantically consistent with the denoising part. We also append an indicator to label embedding. The indicator is 1 if a query belongs to the denoising part and O otherwise.

Table 1.Results forour DN-DETR andotherdetection models underthe same settng.AllDETR-like models exceptDETRuse300 queries,while DETR uses 100.   

<table><tr><td>Model</td><td>#epochs</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td><td>GFLOPs</td><td>Params</td></tr><tr><td>DETR-R50 [1]</td><td>500</td><td>42.0</td><td>62.4</td><td>44.2</td><td>20.5</td><td>45.8</td><td>61.1</td><td>86</td><td>41M</td></tr><tr><td>Faster RCNN-FPN-R50 [15]</td><td>108</td><td>42.0</td><td>62.1</td><td>45.5</td><td>26.6</td><td>45.5</td><td>53.4</td><td>180</td><td>42M</td></tr><tr><td>Anchor DETR-R50 [18]</td><td>50</td><td>42.1</td><td>63.1</td><td>44.9</td><td>22.3</td><td>46.2</td><td>60.0</td><td>1</td><td>39M</td></tr><tr><td>Conditional DETR-R50 [12]</td><td>50</td><td>40.9</td><td>61.8</td><td>43.3</td><td>20.8</td><td>44.6</td><td>59.2</td><td>90</td><td>44M</td></tr><tr><td>DAB-DETR-R50 [11]</td><td>50</td><td>42.2</td><td>63.1</td><td>44.7</td><td>21.5</td><td>45.7</td><td>60.3</td><td>94</td><td>44M</td></tr><tr><td>DN-DETR-R50</td><td>50</td><td>44.1(+1.9)</td><td>64.4</td><td>46.7</td><td>22.9</td><td>48.0</td><td>63.4</td><td>94</td><td>44M</td></tr><tr><td>DETR-R101[ 1</td><td>500</td><td>43.5</td><td>63.8</td><td>46.4</td><td>21.9</td><td>48.0</td><td>61.8</td><td>152</td><td>60M</td></tr><tr><td>Faster RCNN-FPN-R101 [15]</td><td>108</td><td>44.0</td><td>63.9</td><td>47.8</td><td>27.2</td><td>48.1</td><td>56.0</td><td>246</td><td>60M</td></tr><tr><td>Anchor DETR-R101 [18]</td><td>50</td><td>43.5</td><td>64.3</td><td>46.6</td><td>23.2</td><td>47.7</td><td>61.4</td><td>1</td><td>58M</td></tr><tr><td>Conditional DETR-R101[12]</td><td>50</td><td>42.8</td><td>63.7</td><td>46.0</td><td>21.7</td><td>46.6</td><td>60.9</td><td>156</td><td>63M</td></tr><tr><td>DAB-DETR-R101 [11]</td><td>50</td><td>43.5</td><td>63.9</td><td>46.6</td><td>23.6</td><td>47.3</td><td>61.5</td><td>174</td><td>63M</td></tr><tr><td>DN-DETR-R101</td><td>50</td><td>45.2(+1.7)</td><td>65.5</td><td>48.3</td><td>24.1</td><td>49.1</td><td>65.1</td><td>174</td><td>63M</td></tr><tr><td>DETR-DC5-R50[1]</td><td>500</td><td>43.3</td><td>63.1</td><td>45.9</td><td>22.5</td><td>47.3</td><td>61.1</td><td>187</td><td>41M</td></tr><tr><td>Anchor DETR-DC5-R50 [18]</td><td>50</td><td>44.2</td><td>64.7</td><td>47.5</td><td>24.7</td><td>48.2</td><td>60.6</td><td>151</td><td>39M</td></tr><tr><td>Conditional DETR-DC5-R50 [12]</td><td>50</td><td>43.8</td><td>64.4</td><td>46.7</td><td>24.0</td><td>47.6</td><td>60.7</td><td>195</td><td>44M</td></tr><tr><td>DAB-DETR-DC5-R50 [11]</td><td>50</td><td>44.5</td><td>65.1</td><td>47.7</td><td>25.3</td><td>48.2</td><td>62.3</td><td>202</td><td>44M</td></tr><tr><td>DN-DETR-DC5-R50</td><td>50</td><td>46.3(+1.8)</td><td>66.4</td><td>49.7</td><td>26.7</td><td>50.0</td><td>64.3</td><td>202</td><td>44M</td></tr><tr><td>DETR-DC5-R101[1]</td><td>500</td><td>44.9</td><td>64.7</td><td>47.7</td><td>23.7</td><td>49.5</td><td>62.3</td><td>253</td><td>60M</td></tr><tr><td>Anchor DETR-R101 [18]</td><td>50</td><td>45.1</td><td>65.7</td><td>48.8</td><td>25.8</td><td>49.4</td><td>61.6</td><td>1</td><td>58M</td></tr><tr><td>Conditional DETR-DC5-R101 [12]</td><td>50</td><td>45.0</td><td>65.5</td><td>48.4</td><td>26.1</td><td>48.9</td><td>62.8</td><td>262</td><td>63M</td></tr><tr><td>DAB-DETR-DC5-R101[11]</td><td>50</td><td>45.8</td><td>65.9</td><td>49.3</td><td>27.0</td><td>49.8</td><td>63.8</td><td>282</td><td>63M</td></tr><tr><td>DN-DETR-DC5-R101</td><td>50</td><td>47.3(+1.5)</td><td>67.5</td><td>50.8</td><td>28.6</td><td>51.5</td><td>65.0</td><td>282</td><td>63M</td></tr></table>

Table2.ResultsforourDN-DETRadotherdetection modelsonthe1xsettg.Superscript‘indicatesthat wecheck with theauthorsof DynamicDETRthrough privatecommunication,theirencoderdeign makes theirsingle-scale andmulti-scaleresults almostidentical..   

<table><tr><td>Model</td><td>MultiScale</td><td>#epochs</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td><td>GFLOPs</td><td>Params</td></tr><tr><td>Faster R50-FPN 1x [15]</td><td>√</td><td>12</td><td>37.9</td><td>58.8</td><td>41.1</td><td>22.4</td><td>41.1</td><td>49.1</td><td>180</td><td>40M</td></tr><tr><td>DETR-R50 1x [1]</td><td></td><td>12</td><td>15.5</td><td>29.4</td><td>14.5</td><td>4.3</td><td>15.1</td><td>26.7</td><td>86</td><td>41M</td></tr><tr><td>DAB-DETR-DC5-R50 [11]</td><td></td><td>12</td><td>38.0</td><td>60.3</td><td>39.8</td><td>19.2</td><td>40.9</td><td>55.4</td><td>216</td><td>44M</td></tr><tr><td>DN-DETR-DC5-R50</td><td></td><td>12</td><td>41.7(+3.7)</td><td>61.4</td><td>44.1</td><td>21.2</td><td>45.0</td><td>60.2</td><td>216</td><td>44M</td></tr><tr><td>Deformable DETR-R50 1x [20] Dynamic DETR-R50+ 1x</td><td>√</td><td>12</td><td>37.2</td><td>55.5</td><td>40.5</td><td>21.1</td><td>40.7</td><td>50.5</td><td>173</td><td>40M</td></tr><tr><td>(without dynamic encoder)</td><td>√</td><td>12</td><td>40.2</td><td>58.6</td><td>43.4</td><td>11</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Dynamic DETR-R50† 1x [4]</td><td>√</td><td>12</td><td>42.9</td><td>61.0</td><td>46.3</td><td>24.6</td><td>44.9</td><td>54.4</td><td>1</td><td>1</td></tr><tr><td>DN-Deformable-DETR-R50 [4]</td><td>√</td><td>12</td><td>43.4</td><td>61.9</td><td>47.2</td><td>24.8</td><td>46.8</td><td>59.4</td><td>195</td><td>48M</td></tr><tr><td>DAB-DETR-DC5-R101[11]</td><td></td><td>12</td><td>40.3</td><td>62.6</td><td>42.7</td><td>22.2</td><td>44.0</td><td>57.3</td><td>282</td><td>63M</td></tr><tr><td>DN-DETR-DC5-R101</td><td></td><td>12</td><td>42.8(+2.5)</td><td>62.9</td><td>45.7</td><td>23.3</td><td>46.6</td><td>61.3</td><td>282</td><td>63M</td></tr><tr><td>Faster R101FPN[15]</td><td>√</td><td>108</td><td>44.0</td><td>63.9</td><td>47.8</td><td>27.2</td><td>48.1</td><td>56.0</td><td>246</td><td>60M</td></tr><tr><td>DN-Deformable-DETR-R101</td><td></td><td>12</td><td>44.1</td><td>62.8</td><td>47.9</td><td>26.0</td><td>47.8</td><td>61.3</td><td>275</td><td>67M</td></tr></table>

# 5. Experiment

# 5.1. Setup

Dataset: We show the effectiveness of DN-DETR on the challenging COCO 2017 [10] Detection task. Following the common practice, we report the standard mean average precision (AP) result on the COCO validation dataset under different IoU thresholds and object scales.

Implementation Details: We test the effectiveness of the denoising training on DAB-DETR,which is composed of a CNN backbone, multiple Transformer encoder layers and decoder layers. We also show that denoising training can be plugged into other DETR-like models to boost performance.For example,our DN-Deformable-DETR is built upon Deformable DETR in multi-scale setting.

We adopt several ResNet models [8] pre-trained on ImageNet as our backbones and report our results on 4 ResNet settings:ResNet-50 (R50), ResNet-101 (R101),and their $1 6 \times$ -resolution extensions ResNet-50-DC5 (DC5-R50) and ResNet-101-DC5 (DC5-R101). For hyperparameters,we follow DAB-DETR to use a 6-layer Transformer encoder and a 6-layer Transformer decoder and 256 as the hidden dimension. We add uniform noise on boxes and set the hyperparameters with respect to noise as $\lambda _ { 1 } = 0 . 4$ ， $\lambda _ { 2 } = 0 . 4$ ， and $\gamma = 0 . 2$ .For the learning rate scheduler, we use an initial learning rate (lr) $1 \times 1 0 ^ { - 4 }$ and drop lr at the 40-th epoch by multiplying O.1 for the 5O-epoch setting and at the 11-th epoch by multiplying O.1 for the 12-epoch seting.We use the AdamW optimizer with weight decay of $1 \times 1 0 ^ { - 4 }$ and train our model on 8 Nvidia A1OO GPUs.The batch size is

<table><tr><td>Model</td><td>MultiScale</td><td>#epochs</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td><td>GFLOPs</td><td>Params</td></tr><tr><td>Deformable DETR-R50 [20]</td><td>√</td><td>50</td><td>43.8</td><td>62.6</td><td>47.7</td><td>26.4</td><td>47.1</td><td>58.0</td><td>173</td><td>40M</td></tr><tr><td>SMCA-R50 [6]</td><td>√</td><td>50</td><td>43.7</td><td>63.6</td><td>47.2</td><td>24.2</td><td>47.0</td><td>60.4</td><td>152</td><td>40M</td></tr><tr><td>TSP-RCNN-R50 [16]</td><td>√</td><td>96</td><td>45.0</td><td>64.5</td><td>49.6</td><td>29.7</td><td>47.7</td><td>58.0</td><td>188</td><td>1</td></tr><tr><td>Dynamic DETR-R50*[4]</td><td>√</td><td>50</td><td>47.2</td><td>65.9</td><td>51.1</td><td>28.6</td><td>49.3</td><td>59.1</td><td>1</td><td>1</td></tr><tr><td>DAB-Deformable-DETR-R50</td><td>√</td><td>50</td><td>46.9</td><td>66.0</td><td>50.8</td><td>30.1</td><td>50.4</td><td>62.5</td><td>195</td><td>48M</td></tr><tr><td>DN-Deformable-DETR-R50</td><td>√</td><td>50</td><td>48.6</td><td>67.4</td><td>52.7</td><td>31.0</td><td>52.0</td><td>63.7</td><td>195</td><td>48M</td></tr></table>

Table 3.Bestresults forourDN-DETRandotherdetection models withtheResNet-50backbone.\*indicatesitis thetest-devresult.

16. Unless otherwise specified, we use 5 denoising groups.

We conduct a series of experiments to demonstrate the performance improvement as shown in Table 1,where we follow the basic setings in DAB-DETR without any bells and whistles in training. To compare with the state-of-theart performance in the 12 epoch setting (the so called $1 \times$ setting on Detectron2） and the standard 5O epoch setting (most widely used in DETR-like models) in Table 2 and 3,we follow DAB-DETR to use 3 pattern embeddings as in Anchor DETR [18]. All our comparisons with DAB-DETR and its variants are under exactly the same seting.

DN-Deformable-DETR:To show the effectiveness of denoising training applied in other DETR-like models,we also integrate denoising training into Deformable DETR with 10 denoising groups as DN-Deformable-DETR.We follow the same setting as Deformable DETR, but specify its query into 4D boxes as in DAB-DETR to better use denoising training.

When comparing in the standard 5O epoch setting,to eliminate any misleading information that the performance improvement of DN-Deformable-DETR may result from the explicit query formulation of anchor boxes,we also implement a strong baseline DAB-Defromable-DETR for comparison. It formulates Deformable DETR query as anchor box without using denoising training,while all the other settings are the same.Note that we strictly follow Deformable DETR to use multi-scale (4 scale) features without FPN.Dynamic DETR [4] add FPN and more scales (5 scales) which can further boost the performance but our performance still exceed theirs.

# 5.2. Denoising Training Improves Performance

To show the absolute performance improvement compared with DAB-DETR and other single-scale DETR models,we conduct a series of experiments on different backbones under the basic single-scale settings.The results are summarized in Table 1.

The results show that we achieve the best results among single-scale models with all four commonly used backbones. For example,compared with our baseline DABDETR under exactly the same seting，we achieve $\mathbf { + 1 . 9 }$ AP absolute improvement with ResNet-50. The table also shows that denoising training adds negligible parameters and computation.

# 5.3. $1 \times$ Setting

With denoising training, the detection task can be accelerated by a large margin.As shown in Table 2,we compare our method with both a traditional detector [15] and some DETR-like models [1,4,20]. Note that Dynamic DETR [4] adopts dynamic encoder, for a fair comparison,we also compare with its version without dynamic encoder.

Under the same seting with the DC5-R50 backbone, DN-DETR can outperform DAB-DETR by $+ 3 . 7$ AP within 12 epochs.Compared with other models,DN-DeformableDETR achieves the best results in the 12 epoch setting. It is worth noting that our DN-Deformable-DETR achieve 44.1 AP within 12 epochs with the ResNet-101 backbone,which surpasses Faster R-CNN ResNet-101 trained for 1O8 epochs $9 \times$ faster).

# 5.4. Compared with State-of-Art Detectors

We also conduct experiments to compare our method with multi-scale models. The results is summarized in Table 3. Our proposed DN-Deformable-DETR achieves the best result 48.6 AP with the ResNet-50 backbone. To eliminate the performance improvement from formulating the queries of deformable DETR as anchor boxes,we further use a strong baseline DAB-Deformable-DETR without denoising training. The results show that we can still yield $1 . 7 \mathrm { \ A P }$ absolute improvement. The performance improvement of DN-Deformable-DETR also indicates that denoising training can be integrated into other DETR-like models and improve their performance.Though it is not a fair comparison with Dynamic DETR as it includes dynamic encoder and more scales(5 scales) with FPN,we still yield $+ 1 . 4$ AP improvement.

We also show the convergence curve in both single-scale and multi-scale setting in Fig. 5,where we drop learning rate by O.1 in multiple epochs in Fig. 5(b). The detailed training acceleration analysis and training eficiency is shown is Appendix 7.1 and 7.2.

# 5.5. Ablation Study

We conduct a series of ablation study with the ResNet50 backbone trained for 5O epochs to verify the effectiveness each component and report the results in Table 4 and Table 5.The results in Table 4 show that each component in denoising training contributes to the performance improve

![](Images_YM5G5G2T/f660577df1da08899f2f367b336e5c95f33c27f9ca30efc6c20fe6c4ac02fffe.jpg)  
Figure 5.(a)ConvergencecurvesofDAB-DETRandDN-DETR withResNet-DC5-50.Before leaingrate drop,DN-DETRachieves40 APin 20epochs,whileDAB-DETRneds 40epochs.(b)Convergencecurvesofmulti-scale models with ResNet-50.Withlearingrate drop,DN-Deformable-DETRachieves 47.8APin30epochs,whichis0.9APhigherthantheconverged DAB-Deformable-DETR.

Box Denoising Label Denoising Attention Mask AP   
√ √ √ 43.4   
√ √ 43.0   
√ 42.2   
√ √ 24.0

Table 4．Ablation results for DN-DETR.All models are trained with the ResNet-5O backbone using 1 denoising group under the same default settings.   
Table 5.Ablation results for DN-DETR using different numbers of denoising groups.All models are trained with the ResNet-50 backbone under the same default setting.   

<table><tr><td></td><td>No Group</td><td>1 Group</td><td>5 Groups</td></tr><tr><td>R50</td><td>42.2</td><td>43.4</td><td>44.1</td></tr><tr><td>R50-DC5</td><td>44.5</td><td>45.6</td><td>46.3</td></tr><tr><td>R101</td><td>43.5</td><td>45.0</td><td>45.2</td></tr><tr><td>R101-DC5</td><td>45.8</td><td>46.5</td><td>47.3</td></tr></table>

ment. Notably, without attention mask to prevent information leakage, the performance degenerates significantly.

We also analyze the influence of the number of denoising groups in our model,as shown in Table 5. The results indicate that adding more denoising groups improves the performance,but the performance improvement becomes marginal as the number of denoising group increases. Therefore,in our experiment, our default setting uses 5 denoising groups,but more denoising groups can further boost performance as well as faster convergence.

In Fig. 6,We explore the influence of noise scale. We run 20 epochs with batch size 64 and ResNet-5O backbone without learning rate drop. The results show that both center shifting and box scaling improve performance. But when the noise is too large, the performance drops.

# 6. Conclusion

In this paper, we have analyzed the reason for the slow convergence of DETR training lying in the unstable bipartite matching and proposed a novel denoising training method to address this problem. Based on this analysis, we proposed DN-DETR by integrating denoising training into DAB-DETR to test its effectiveness.DN-DETR specifies the decoder embedding as label embedding and introduces denoising training for both boxes and labels.We also added denoisoing training to Deformable DETR to show its generality.The results show that denoising training significantly accelerates convergence and improves performance, leading to the best results in the 1x(12 epochs) setting with both ResNet-5O and ResNet-1O1 as backbone.This study shows that denoising training can be easily integrated into DETRlike models as a general training method with only a small training cost overhead and bring in a remarkable improvement in terms of both training convergence and detection performance.

![](Images_YM5G5G2T/c417c1dcf268ea4c3fab3e44bc1aa7fd0679203dd0fb8af2de14f6fad60ee498.jpg)  
Figure 6.DN-DETR in different noise scales.We fix one noise scale to O.4 and change the other.Noise scale is defined in 4.3

Limitations and Future Work:In this work, the added noises are simply sampled from uniform distribution. We have not explored more complex noising schemes and leave these for future work. Reconstructing noised data achieves great success in un-supervised learning. This work is an initial step to apply it into object detection. In the future, we will explore how to pretrain detectors on weakly labeled data with unsupervised learning techniques or explore other unsupervised learning methods such as contrastive learning.

# References

[1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko. End-toend object detection with transformers. In European Conference on Computer Vision, pages 213-229. Springer, 2020.   
[2] Ting Chen, Saurabh Saxena,LalaLi, David J. Fleet,and Geoffrey Hinton. Pix2seq: A language modeling framework for object detection, 2021.   
[3] Xiyang Dai，Yinpeng Chen，Jianwei Yang，Pengchuan Zhang,Lu Yuan,and Lei Zhang. Dynamic detr: End-to-end object detection with dynamic attention. In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV), pages 2988-2997, October 2021.   
[4] Xiyang Dai，Yinpeng Chen，Jianwei Yang，Pengchuan Zhang,Lu Yuan,and Lei Zhang.Dynamic detr: End-toend object detection with dynamic attention.In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 2988-2997,2021.   
[5] Enrico Maria Fenoaltea, Izat B Baybusinov, Jianyang Zhao, Lei Zhou,and Yi-Cheng Zhang. The stable marriage problem: An interdisciplinary review from the physicist's perspective.Physics Reports,2021.   
[6] Peng Gao,Minghang Zheng, Xiaogang Wang, Jifeng Dai, and Hongsheng Li. Fast convergence of detr with spatially modulated co-attention. arXiv preprint arXiv:2101.07448, 2021.   
[7] Ross Girshick,Jeff Donahue,Trevor Darrell,and Jitendra Malik. Rich feature hierarchies for accurate object detection and semantic segmentation, 2014. [8] Kaiming He, Xiangyu Zhang,Shaoqing Ren,and Jian Sun. Deep residual learning for image recognition. In 2016 IEEE Conference on Computer Vision and Pattern Recognition (CVPR), pages 770-778,2016.   
[9] Tsung-YiLin, Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar. Focal loss for dense object detection,2018.   
[10] Tsung-Yi Lin,Michael Maire,Serge Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C Lawrence Zitnick.Microsoft coco: Common objects in context.In European conference on computer vision, pages 740-755. Springer, 2014.   
[11] Shilong Liu,Feng Li, Hao Zhang, Xiao Yang, Xianbiao Qi, Hang Su, Jun Zhu, and Lei Zhang. DAB-DETR: Dynamic anchor boxes are better queries for DETR.In International Conference on Learning Representations, 2022.   
[12] Depu Meng, Xiaokang Chen, Zejia Fan,Gang Zeng, Houqiang Li, Yuhui Yuan, Lei Sun,and Jingdong Wang. Conditional detr for fast training convergence. arXiv preprint arXiv:2108.06152,2021.   
[13] Joseph Redmon and Ali Farhadi. Yolo90oO:Better,faster, stronger, 2016.   
[14] Joseph Redmon and Ali Farhadi． Yolov3:An incremental improvement, 2018.   
[15] Shaoqing Ren,Kaiming He,Ross Girshick,and Jian Sun. Faster r-cnn: Towards real-time object detection with region proposal networks. IEEE Transactions on Pattern Analysis and Machine Intelligence. 39(6):1137-1149.2017.   
[16] Zhiqing Sun, Shengcao Cao,Yiming Yang,and Kris Kitani. Rethinking transformer-based set prediction for object detection.arXiv preprint arXiv:2011.10881,2020.   
[17] AshishVaswani,Noam Shazeer,NikiParmar,JakobUszkoreit,Llion Jones,Aidan NGomez,Lukasz Kaiser,and Illia Polosukhin. Attention is all you need. In Advances in neural information processing systems,pages 5998-6008,2017.   
[18] Yingming Wang,Xiangyu Zhang, Tong Yang,and Jian Sun. Anchor detr: Query design for transformer-based detector. arXiv preprint arXiv:2109.07107,2021.   
[19] Zhuyu Yao,Jiangbo Ai,Boxun Li,and Chi Zhang.Efficient detr: Improving end-to-end object detector with dense prior. arXiv preprint arXiv:2104.01318,2021.   
[20] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai.Deformable detr:Deformable transformers for end-to-end object detection.In ICLR 2021: The Ninth International Conference on Learning Representations,2021.