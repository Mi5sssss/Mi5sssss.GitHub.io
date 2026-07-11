---
layout: post
title: "The Fossil Fuel of Intelligence"
excerpt: "A field guide to pretraining for engineers, and why most of what you have read about it is already obsolete."
modified: 2026-07-05
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

In December 2024 Ilya Sutskever stood on a stage and argued that pretraining as it is currently practiced will end. Compute keeps growing while data does not. There is one internet, and most of it has already been used. He called data the fossil fuel of AI.

The claim was half right, and the wrong half matters. The naive recipe of scraping more of the web and training a bigger dense model has run into a wall, but pretraining as a whole continues in a changed form. It is dissolving into a continuum, migrating up the value chain, and becoming a problem of semiconductor economics rather than machine learning.

What follows examines that shift, and is written for engineers who already know what a Transformer is and are tired of the same eight paragraphs about attention. Each section gives the mechanism first, without hand waving, and then the non-consensus view, where the textbook account and frontier practice diverge. Speculation is marked as speculation and supported by citations, since a contrarian claim deserves no more automatic trust than a consensus one.

The spine of the argument is stated up front.

1. Pretraining continues, but in fragmented form, splitting into a continuum of pretrain, mid-training, and post-training, with the marginal compute dollar moving toward reinforcement learning and test-time inference. The base model still sets the ceiling.
2. Architecture decides cost while data decides the ceiling. Every frontier model has converged on nearly the same shape, and the designs that survived won on efficiency rather than raw capability.
3. Chinchilla-optimal no longer holds in practice, though many tutorials still teach it. The optimum moved from training-compute-optimal to whole-lifetime-optimal once inference started to dominate the bill.
4. Emergence is probably a measurement artifact. The open puzzle is that loss falls smoothly while capability seems to arrive in steps.
5. The data wall is overstated and model collapse is misread. The binding constraint has been memory bandwidth, packaging capacity, and the quality of the data pipeline, rather than raw token count.

That last point is the one the pure ML world is least comfortable with. Pretraining is now downstream of the fab.


<iframe class="pf-frame" src="/pretraining/00-capability-timeline.html" title="Interactive figure. Pretraining sets the ceiling, later phases unlock it" loading="lazy" style="width:100%; height:720px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/00-capability-timeline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## 1. Foundations and an unavoidable metaphysical question

The objective comes first, because everything else follows from it. A language model is trained to predict the next token given all the tokens before it. Training minimizes the cross entropy between the model's predicted distribution and the actual next token, averaged over trillions of tokens. Perplexity is the exponentiated loss, and bits per byte is the same quantity in the currency a compression engineer would recognize.

The forward pass is embedding, then a stack of blocks each combining self attention and a feedforward network, then a projection back to the vocabulary. Attention lets every position look at every earlier position through query, key, and value projections. The causal mask forbids looking forward, which is what makes the objective self supervised rather than cheating. The residual stream, the running sum that each block reads from and writes to, is the central object of interest. A useful picture is a shared blackboard that seventy layers write on in turn, rather than a linear pipeline.


<iframe class="pf-frame" src="/pretraining/01-next-token.html" title="Interactive figure. Next token prediction and attention" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/01-next-token.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


A single training step is unremarkable to describe. A forward pass produces the loss, a backward pass produces the gradients, and AdamW updates the weights. The number that matters most is how many tokens passed through, because token count, more than wall clock time or parameter count alone, is what buys capability.

That is the textbook account, and the more contested questions come next.

### What next token prediction actually learns

There are two camps, and the disagreement between them is not only academic. It determines whether scaling is expected to lead to understanding or to a very expensive dead end.

The compression camp argues that to predict the next token well enough, a model has no choice but to build a model of the process that generated the text. The last page of a murder mystery is the standard illustration. Assigning high probability to the correct name of the killer requires having integrated the whole plot, the alibis, the motive, and the throwaway clue in chapter three. Prediction pushed hard enough forces comprehension.

The heuristics camp, informed by mechanistic interpretability, says something less flattering. What the model learns looks more like an enormous bag of shallow heuristics stored in superposition, features packed more densely than the neuron count should allow, stitched together into something that generalizes well in many cases and fails in obvious ways in others. The result resembles a patchwork that behaves like a coherent world model until it breaks.

Both camps can point to real evidence, which is why the disagreement continues. The most likely situation is that the model learns some real structure together with a large number of heuristics, and the ratio between them shifts with scale in ways that cannot yet be measured. This question sits upstream of many others, which is why it is worth watching over the next five years.

---

## 2. Data, the main moat, and two misread panics

If architecture is largely a commodity, then data is what matters most. This is the part of pretraining that labs guard more closely than model weights, and for good reason. A model can be open sourced while the recipe stays secret, and the recipe is the value.

The mechanism comes first. Raw web text goes through extraction, language identification, quality filtering by a mix of cheap heuristics and learned classifiers, and then deduplication. Dedup matters more than people expect. Exact dedup catches the obvious copies, while approximate dedup using MinHash and locality sensitive hashing catches the near copies, the boilerplate, and the syndicated news article that appears ten thousand times. Then come toxicity and privacy filtering, and finally decontamination, the removal of anything that overlaps the evaluation sets. Tokenization sits on top, usually byte level byte pair encoding, and the fertility of the tokenizer, how many tokens it takes to encode a given string, taxes both the context window and the training bill for the life of the model.

Then comes the mixture, the fractions that are web, code, math, books, and multilingual text. The trend is clear. Code and math are rising as a share of pretraining corpora even for models that will never write a line of production software, because reasoning appears to transfer. Training on code seems to make a model better at tasks that are not code. The highest quality data is increasingly saved for the end of training, an annealing phase in which the best data is upweighted as the learning rate decays.

### Why the data wall and model collapse are both misdiagnosed

Two panics dominate the discussion, and both are misdiagnosed.

The first is that data is running out, the fossil fuel thesis. The counterevidence is that repeating data works far better than the panic implies. The work on data constrained scaling by Muennighoff and colleagues showed that training for roughly four epochs on repeated data carries almost no penalty relative to fresh tokens. Four epochs is a large amount of headroom. That figure also predates the modalities that remain barely touched. The text internet is finite, whereas video and audio are effectively unbounded, and they are denser in physical world structure than text will ever be. The binding constraint is the compute needed to process the data and the judgment needed to filter it, rather than the supply of tokens.

The second panic is model collapse, the fear that training on AI generated data degrades models recursively until their quality collapses. The Nature paper by Shumailov and colleagues is sound, and its mechanism holds, but it describes naive recursive self training, a model eating its own unfiltered output generation after generation. Competent labs do something different. They use distillation and curated synthesis, taking a stronger model to generate data that is then carefully filtered and verified. Done that way, synthetic data becomes one of the most important ingredients in modern frontier recipes. The difference between collapse and improvement is the filter, and the filter is where the craft lies.

One less discussed issue underlies all of this. A meaningful slice of measured benchmark capability is memorization leaking through imperfect decontamination. This is why serious labs treat contamination as a first class engineering problem, and why any leaderboard number that was not earned on a held out, freshly minted evaluation deserves distrust.

---

## 3. Architecture, and why it barely matters

The last decade of architecture looks like a story of progress. It begins with dense Transformers, where every token activates every parameter. Attention variants follow, driven by the cost of the key value cache, moving from multi head to multi query to grouped query attention, and more recently to the low rank compression of multi head latent attention. Rotary position embeddings arrive, along with the long running effort to make them extrapolate past their training length. Then comes sparsity, the mixture of experts, where a router sends each token to a small number of expert subnetworks, allowing total parameters to grow without growing the compute each token costs.

The sequence reads like a march of ideas, but it is mostly a march of constraints.

### Why frontier models converge on one design

The frontier models share a common list of features. Almost all are decoder only, with rotary embeddings, RMSNorm, SwiGLU activations, grouped query or latent attention, and increasingly a mixture of experts. The convergence is nearly total, and it reflects selection rather than parallel invention. The bitter lesson operates as a filter. Architectural ideas that inject strong human priors get washed out at scale, outperformed by general methods that absorb more compute and data. What survives is consistently an efficiency trick rather than a capability trick.

There is a deeper reason for the convergence, and it connects architecture to the world of chips. Sara Hooker named it the hardware lottery. An architecture wins partly on merit and partly because it runs fast on the hardware that already exists. The Transformer is, above all, a machine for large dense matrix multiplications, which is the operation a GPU performs better than almost anything else. The available silicon shaped the choice of Transformer as much as merit did.

This reframes the architecture question. Mixture of experts functions mainly as a memory versus compute trade rather than a machine learning idea. Sparse activation cuts the floating point work per token, but it expands the parameter memory that must be held, which is why MoE makes sense only with fast interconnect to shard experts across many chips. Grouped query and latent attention function as attacks on the memory bandwidth cost of the key value cache at inference time, rather than as accuracy improvements. The architecture is downstream of the memory system. Seen this way, architecture papers read as computer engineering more than as machine learning.

---

## 4. The training run as a semiconductor problem

At industrial scale, pretraining is as much about physics, logistics, and capital as about mathematics.

The mechanism is parallelism in four dimensions. Data parallelism replicates the model and splits the batch, with ZeRO style sharding to spread the optimizer state so it is not stored everywhere. Tensor parallelism splits individual layers across chips. Pipeline parallelism splits the layer stack into stages and streams micro batches through them, fighting the bubble of idle time at the seams. Expert parallelism is the MoE specific dimension, scattering experts across devices. Real training runs combine all four, and the combination is dictated by the topology of the cluster and the bandwidth of the wires between chips rather than by elegance.

Numerical precision is the next factor. The move from BF16 to FP8 training, and the early experiments with FP4, are usually explained as a numerics story about dynamic range and stability. That explanation is incomplete. Low precision matters mainly because modern training is memory bandwidth bound long before it is compute bound. Halving the bytes per number saves memory and also doubles the effective bandwidth and interconnect, which is the resource actually in short supply. FP8 is best understood as a bandwidth improvement rather than a numerics one.

Stability and reliability complete the picture. They cover loss spikes, gradient clipping, learning rate warmup and decay, and, above a few thousand accelerators, the practical problem of fault tolerance. At that scale hardware fails constantly, and the checkpoint and restart machinery, along with the storage bandwidth feeding it, becomes a load bearing part of the training system rather than an afterthought. Model FLOPs utilization, the fraction of theoretical compute converted into useful work, is the number that separates a competent training team from an expensive one.

### The DeepSeek result and why the cost story was partly marketing

For two years the industry ran on a comfortable narrative. Frontier pretraining costs hundreds of millions of dollars, so only a handful of hyperscale labs can play, so their lead is safe. DeepSeek V3 upended that narrative by reportedly training a competitive model for a small fraction of the assumed cost. The exact figure deserves caution, since reported training costs often exclude research, failed runs, and salaries. Even so, the direction is real and the lesson matters. Much of the cost moat was a story that incumbents had every incentive to tell, rather than a fact of physics.

The real moat is the data recipe, the accumulated engineering know how, and above all the number of iterations a lab can afford, rather than the price of a single training run. Frontier capability is a function of how many times a team can be wrong and try again, which depends on capital and talent more than on any single line item.

The chip supply chain, more than the ML labs, gates all of this. The binding constraints on frontier pretraining today are advanced packaging and high bandwidth memory rather than wafer starts. TSMC can etch the logic. The chokepoint is CoWoS packaging capacity and the supply of HBM stacks, which come from only three companies worldwide. The scarce resource in AI is the ability to physically bond memory to logic with enough bandwidth between them, more than intelligence or even electricity. That claim would have sounded far fetched in 2019 and is a central fact of the industry in 2026.

The economics are also less obvious than the headline numbers suggest. The dominant cost of a training run is the depreciation of hardware that will be obsolete in two or three years, rather than electricity. A frontier GPU is a depreciating asset, racing to earn back its cost before its successor arrives. Pretraining economics are fab economics and capital markets economics expressed as a research budget.

---

## 5. Scaling laws, and two ideas that no longer hold

The empirical backbone of the field is the observation that loss falls as a smooth power law in three quantities, model parameters, training data, and compute. Kaplan and colleagues found the early laws. The Chinchilla work by Hoffmann and colleagues then corrected them with a cleaner claim. For a fixed compute budget there is an optimal balance between model size and data, and it lands near twenty tokens of training data per parameter. A model much larger than that ratio wastes compute that should have gone to data, and the reverse holds as well.

Chinchilla was a real advance, and by 2026 much of its practical advice no longer holds.

### Why compute optimal no longer holds in practice

Chinchilla optimizes the wrong quantity. It minimizes the compute needed to reach a given loss during training. A deployed model spends the large majority of its lifetime compute on inference, serving billions of requests, rather than on the one time cost of training. Accounting for that flips the optimization. The better choice is to spend more compute in training than Chinchilla suggests, deliberately overtraining a smaller model well past the point of training efficiency, because a smaller model is cheaper to serve indefinitely. Every extra dollar spent overtraining is repaid many times over at inference.

The reasoning here is closer to amortization than to model quality. A one time training cost is spread across the enormous number of requests the model will serve, which is a semiconductor economics argument. This shift is the point at which pretraining strategy became a corollary of inference hardware economics. A second shift followed. Test time compute, the reasoning models that think longer before answering, opened a new axis. Capability can now be bought at inference time rather than baked in during pretraining, which partially substitutes for pretraining scale and shifts hardware demand from training clusters toward low latency inference fleets. The chips suited to that work are different, optimized for memory bandwidth and latency over raw training throughput.

### Why emergence is probably a measurement artifact

One appealing idea in scaling is emergence, the claim that new capabilities appear suddenly and unpredictably as models cross a size threshold. The evidence suggests it is mostly a measurement artifact. Schaeffer and colleagues showed that many so called emergent abilities appear discontinuous only because they are measured with discontinuous metrics like exact match accuracy. Under a smooth metric, the sharp jump resolves into the same gradual curve that everything else follows.

The artifact does not dispose of the underlying puzzle, and something real remains. Loss falls smoothly and continuously, yet model behavior on the tasks that matter does seem to reorganize in phases. Grokking, the sudden late generalization after apparent memorization, is real and reproducible. The honest position is that there is a strong predictive theory for the loss and almost no predictive theory for the capabilities the loss is meant to represent. Closing that gap, predicting downstream ability from upstream loss, remains one of the central open problems in the science of pretraining.

---

## 6. The industry, and where competition has moved

The public technical choices of the frontier labs show a clear pattern. Almost everyone has moved or is moving to mixture of experts. FP8 training is becoming mainstream. Context windows have stretched into the hundreds of thousands of tokens and beyond. The boundary between pretraining and what people now call mid-training, the long context extension and high quality annealing phases, has blurred to the point where the two words describe a continuum rather than two stages.

Any comparison of specific labs has to be qualified, because the details that matter are the details nobody publishes. Anything specific here is informed inference from public material rather than confirmed fact.

### Why competition shifted from architecture to data and post-training

A central fact about the current industry is that competition is no longer mainly about architecture, and it is barely about scale in the old sense. It has moved largely to data and post-training. When every serious model shares the same skeleton, differentiation comes from elsewhere, from the data recipe, from the ability to generate and filter synthetic data, and from the reinforcement learning and reasoning layers stacked on top.

This is why the open versus closed debate is often misframed. Open weights are now common, while open recipes are not, and the recipe is the moat. An open weights model reveals the destination while hiding the map. Matching a frontier model on architecture takes a weekend, while matching it on data pipeline and post training is the hard and lengthy part. What is hoarded has shifted from the artifact to the process, and most commentary has not caught up.

---

## 7. Academia and the open source counterweight

A structural tension runs underneath the field. The industry recipe is getting more secret every year, while academia moves in the opposite direction, trying to keep the science public.

Open models and open datasets matter beyond their raw capability, because they provide the reproducible baselines that make science possible. What cannot be run cannot be studied. The academic contribution has concentrated where industry has the least incentive to publish, in mechanistic interpretability, the science of what these models compute, in the data science of curation and filtering, in the theory of scaling, and in efficient training methods that let a university lab with a hundred chips contribute to a field increasingly built for those with a hundred thousand.

The stakes go beyond academic credit. The question is whether the knowledge of how to build intelligence becomes public infrastructure or private property. Every closed recipe is a small enclosure of a commons, and every open replication pushes the other way. The outcome is not mainly a technical question, and it will shape the next twenty years as much as any architecture choice.

---

## 8. Is pretraining over

The fossil fuel line from December 2024 can now be answered properly.

Pretraining as a whole continues, while its naive version has ended, and confusing the two is the error underneath most confident predictions on the subject. What is ending is the era in which scraping more web text and training a bigger dense model could win. What is beginning is more subtle. Pretraining is dissolving into a continuum with mid-training and post-training. The marginal compute dollar is migrating toward reinforcement learning and test time reasoning. The enterprise as a whole has turned out to be a problem of semiconductor supply, memory bandwidth, and capital amortization expressed in the language of machine learning.

The fossil fuel metaphor holds up better than Sutskever intended. Fossil fuels did not vanish once their limits became clear. Users grew much more efficient, reserves once written off came back into play, and alternatives were built over time. Data is following the same arc. Repetition, synthesis, new modalities, and better filtering are the enhanced recovery techniques of the token economy. The wall that many fear is real, and like most walls in this field it will be moved rather than hit.

One prediction can be made with some confidence. The next decade of progress will be gated less by ideas about intelligence and more by the physics of bonding memory to logic, the capital markets that finance depreciating assets, and the quality of the data filter. Pretraining has matured, moving out of the research lab and into the fab and the balance sheet. Understanding where this is going now depends more on packaging capacity and depreciation schedules than on attention.

That is the non consensus view, and the next few years will likely support it.

---

*The figures are interactive. Notes on sources and the specific empirical claims are in the [references file](/pretraining/references.md), where any claim resting on a single lab's unpublished practice is marked as inference rather than fact.*

<script>
(function(){
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe.pf-frame'));
  function resize(f){
    try{
      var b = f.contentWindow.document.body;
      if(!b) return;
      // Measure the body content height, not documentElement.scrollHeight. The latter is
      // floored to the iframe viewport, so setting the height back would ratchet upward on
      // every call. body.scrollHeight reflects true content, and the guard below stops any
      // sub-pixel feedback so clicking no longer adds a strip of blank space each time.
      var h = b.scrollHeight;
      if(h && Math.abs(h - (f._h || 0)) > 1){ f.style.height = h + 'px'; f._h = h; }
    }catch(e){}
  }
  frames.forEach(function(f){
    f.addEventListener('load', function(){
      resize(f); setTimeout(function(){resize(f);}, 300);
      ['click','change','input'].forEach(function(ev){
        try{ f.contentWindow.document.addEventListener(ev, function(){ setTimeout(function(){resize(f);}, 90); }); }catch(e){}
      });
    });
  });
  window.addEventListener('resize', function(){ frames.forEach(function(f){ f._h = 0; setTimeout(function(){resize(f);}, 120); }); });
})();
</script>
