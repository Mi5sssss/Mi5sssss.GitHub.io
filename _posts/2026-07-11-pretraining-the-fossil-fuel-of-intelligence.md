---
layout: post
title: "The Fossil Fuel of Intelligence"
excerpt: "A field guide to pretraining for engineers, and why most of what you have read about it is already obsolete."
modified: 7/11/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

In December 2024 Ilya Sutskever stood on a stage and said the quiet part out loud. Pretraining as we know it will end. Compute keeps growing. Data does not. We have one internet, and we have already burned most of it. He called data the fossil fuel of AI.

The line landed because it was half right, which is the most dangerous kind of right. It is true that the naive recipe of scraping more of the web and training a bigger dense model has run into a wall. It is false that pretraining is ending. What is actually happening is stranger and more interesting. Pretraining is not dying. It is dissolving into a continuum, migrating up the value chain, and quietly becoming a problem of semiconductor economics rather than machine learning.

This essay is a field guide to that shift. It is written for engineers who already know what a Transformer is and are tired of reading the same eight paragraphs about attention. Every chapter follows the same contract. First the mechanism, told correctly and without hand waving. Then the non-consensus turn, the place where the textbook version and the frontier version part company. I have tried to mark speculation as speculation and to give you the receipts, because you should not believe a contrarian claim without a citation any more than you should believe a consensus one.

Here is the spine of the argument, stated up front so you can disagree with me early.

1. Pretraining is not over. It is fragmenting into a continuum of pretrain, mid-training, and post-training, and the marginal compute dollar is moving toward reinforcement learning and test-time inference. The base model still sets the ceiling.
2. Architecture decides cost. Data decides the ceiling. Every frontier model has converged onto nearly the same shape, and the survivors of the architecture wars won on efficiency, never on raw capability.
3. Chinchilla-optimal is dead, and most tutorials are still teaching the corpse. The optimum moved from training-compute-optimal to whole-lifetime-optimal the moment inference started to dominate the bill.
4. Emergence is probably a measurement artifact. The real mystery is that loss falls smoothly while capability seems to arrive in steps.
5. The data wall is overstated and model collapse is misread. The binding constraint was never raw token count. It was memory bandwidth, packaging capacity, and the quality of your data pipeline.

That last point is the one nobody in the pure ML world wants to hear. Pretraining is now downstream of the fab. Let us build up to why.


<iframe class="pf-frame" src="/pretraining/00-capability-timeline.html" title="Interactive figure. Pretraining sets the ceiling, later phases unlock it" loading="lazy" style="width:100%; height:720px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/00-capability-timeline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## 1. Foundations, and a metaphysical question you cannot avoid

Start with the objective, because everything else is a consequence of it. A language model is trained to predict the next token given all the tokens before it. That is the whole game. You minimize the cross entropy between the model's predicted distribution and the actual next token, averaged over trillions of tokens. Perplexity is just the exponentiated loss, and bits per byte is the same quantity in the currency a compression engineer would recognize.

The forward pass is embedding, then a stack of blocks each combining self attention and a feedforward network, then a projection back to the vocabulary. Attention lets every position look at every earlier position through query, key, and value projections. The causal mask forbids looking forward, which is what makes the objective self supervised rather than cheating. The residual stream, the running sum that each block reads from and writes to, is the real object of interest. Think of the model less as a pipeline and more as a shared blackboard that seventy layers scribble on in turn.


<iframe class="pf-frame" src="/pretraining/01-next-token.html" title="Interactive figure. Next token prediction and attention" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/01-next-token.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


A single training step is unremarkable to describe. Forward pass to get the loss. Backward pass to get the gradients. AdamW to update the weights. The only number that matters at the end of the day is how many tokens you pushed through, because that, not wall clock time and not parameter count alone, is what buys you capability.

So far this is the textbook. Here is where it gets interesting.

### The turn. What is next token prediction actually learning

There are two camps and they do not agree, and the disagreement is not academic. It determines whether you believe scaling leads to understanding or to a very expensive dead end.

The compression camp argues that to predict the next token well enough, a model has no choice but to build a model of the process that generated the text. Consider the last page of a murder mystery. To assign high probability to the correct name of the killer, you must have integrated the whole plot, the alibis, the motive, the throwaway clue in chapter three. Prediction, pushed hard enough, forces comprehension. Compression is understanding wearing a lab coat.

The heuristics camp, informed by mechanistic interpretability, says something less flattering. What the model actually learns looks more like an enormous bag of shallow heuristics stored in superposition, features packed more densely than the neuron count should allow, stitched together into something that generalizes surprisingly well and fails in surprisingly dumb ways. Not a world model. A patchwork that behaves like one until it does not.

Both camps can point at real evidence, which is why the fight continues. My own read is that the truth is uncomfortable for everyone. The model learns real structure and a pile of heuristics, and the ratio between them shifts with scale in ways we cannot yet measure. If you want one open problem to keep your eye on for the next five years, it is this one, because it is upstream of everything else.

---

## 2. Data, the real moat, and two panics that are told wrong

If architecture is a commodity, and I will argue in a moment that it is, then data is the entire ballgame. This is the part of pretraining that labs guard more jealously than model weights, and for good reason. You can open source a model and still keep the recipe secret, and the recipe is the value.

The mechanism first. Raw web text goes through extraction, language identification, quality filtering by a mix of cheap heuristics and learned classifiers, and then deduplication. Dedup matters more than people expect. Exact dedup catches the obvious copies. Approximate dedup using MinHash and locality sensitive hashing catches the near copies, the boilerplate, the syndicated news article that appears ten thousand times. Then toxicity and privacy filtering, and finally decontamination, the removal of anything that overlaps your evaluation sets. Tokenization sits on top, usually byte level byte pair encoding, and the fertility of your tokenizer, how many tokens it takes to encode a given string, silently taxes both your context window and your training bill for the life of the model.

Then comes the mixture. What fraction is web, code, math, books, multilingual text. The trend is unmistakable and worth pausing on. Code and math are rising as a share of pretraining corpora even for models that will never write a line of production software, because reasoning appears to transfer. Training on code seems to make a model better at things that are not code. And the highest quality data is increasingly saved for the end of training, an annealing phase where you upweight the good stuff as the learning rate decays.

### The turn. The data wall and model collapse are both misdiagnosed

Two panics dominate the discourse and both are told wrong.

The first is that we are running out of data, the fossil fuel thesis. The counterevidence is that repeating data works far better than the panic implies. The work on data constrained scaling by Muennighoff and colleagues showed you can train for roughly four epochs on repeated data with almost no penalty relative to fresh tokens. Four epochs is a lot of headroom. And that is before you count the modalities we have barely touched. The text internet is finite. Video and audio are not, and they are denser in physical world structure than text will ever be. The wall is not made of data. It is made of the compute needed to process it and the judgment needed to filter it.

The second panic is model collapse, the fear that training on AI generated data degrades models recursively until they turn to mush. The Nature paper by Shumailov and colleagues is real and its mechanism is real, but it describes naive recursive self training, a model eating its own unfiltered output generation after generation. That is not what any competent lab does. What they do is distillation and curated synthesis, using a stronger model to generate data that is then aggressively filtered and verified. Done that way, synthetic data is not poison. It is the single most important ingredient in modern frontier recipes. The difference between collapse and improvement is the filter, and the filter is the craft.

There is a dirty secret underneath all of this. A meaningful slice of what we call capability on benchmarks is memorization leaking through imperfect decontamination. This is why serious labs treat contamination as a first class engineering problem and why you should distrust any leaderboard number that has not been earned on a held out, freshly minted evaluation.

---

## 3. Architecture, and the heresy that it barely matters

Walk through the last decade of architecture and you find a story that looks like progress. Dense Transformers where every token activates every parameter. Then attention variants driven by the cost of the key value cache, from multi head to multi query to grouped query attention, and more recently the low rank compression of multi head latent attention. Rotary position embeddings and the long running project of making them extrapolate past their training length. And then sparsity, the mixture of experts, where a router sends each token to a small number of expert subnetworks so you can grow total parameters without growing the compute each token costs.

It reads like a march of ideas. It is mostly a march of constraints.

### The turn. Every frontier model now looks the same, and the silicon is why

Line up the frontier models and squint. Decoder only. Rotary embeddings. RMSNorm. SwiGLU activations. Grouped query or latent attention. Increasingly, mixture of experts. The convergence is nearly total, and it is not because everyone independently discovered the one true architecture. It is the bitter lesson operating as a filter. Architectural ideas that inject strong human priors get washed out at scale, outperformed by general methods that simply absorb more compute and data. What survives is never a capability trick. It is always an efficiency trick.

But there is a deeper and less comfortable reason for the convergence, and it is the one that connects this whole essay to the world of chips. Sara Hooker named it the hardware lottery. An architecture does not win only because it is the best idea. It wins because it happens to run fast on the hardware we already built. The Transformer is, above all, a machine for doing enormous dense matrix multiplications, which is precisely the one thing a GPU does better than anything else in history. We did not choose the Transformer purely on merit. The silicon voted, and we ratified the result.

This reframes the entire architecture question. Mixture of experts is not fundamentally a machine learning idea. It is a memory versus compute trade. Sparse activation cuts the floating point work per token, but it explodes the parameter memory you must hold, which is why MoE only makes sense when you have fast interconnect to shard experts across many chips. Grouped query and latent attention are not accuracy improvements. They are attacks on the memory bandwidth cost of the key value cache at inference time. The architecture is downstream of the memory system. Once you see it this way you cannot unsee it, and you stop reading architecture papers as ML and start reading them as computer engineering.

Architecture decides cost. Data decides the ceiling. Say it twice.

---

## 4. The training run as a semiconductor problem

Here is where pretraining stops being about mathematics and becomes about physics, logistics, and capital.

The mechanism is parallelism in four dimensions. Data parallelism replicates the model and splits the batch, with ZeRO style sharding to spread the optimizer state so you do not store it everywhere. Tensor parallelism splits individual layers across chips. Pipeline parallelism splits the layer stack into stages and streams micro batches through them, fighting the bubble of idle time at the seams. Expert parallelism is the MoE specific dimension, scattering experts across devices. Real training runs combine all four, and the combination is dictated not by elegance but by the topology of your cluster and the bandwidth of the wires between chips.

Then precision. The move from BF16 to FP8 training, and the early experiments with FP4, are usually explained as a numerics story about dynamic range and stability. That explanation misses the point. The reason low precision matters so much is that modern training is memory bandwidth bound long before it is compute bound. Halving the bytes per number does not just save memory. It doubles your effective bandwidth and your effective interconnect, which is the resource you were actually short on. FP8 is a bandwidth play wearing a numerics costume.

Stability and reliability round it out. Loss spikes, gradient clipping, learning rate warmup and decay, and above a few thousand accelerators the grim reality of fault tolerance. At that scale hardware fails constantly, and your checkpoint and restart machinery, and the storage bandwidth feeding it, become load bearing parts of the training system rather than an afterthought. Model FLOPs utilization, the fraction of your theoretical compute you actually convert into useful work, is the number that separates a competent training team from an expensive one.

### The turn. The DeepSeek moment, and why the cost story was partly marketing

For two years the industry ran on a comfortable narrative. Frontier pretraining costs hundreds of millions of dollars, therefore only a handful of hyperscale labs can play, therefore their lead is safe. DeepSeek V3 detonated that narrative by reportedly training a genuinely competitive model for a small fraction of the assumed cost. Treat the exact figure with caution, since reported training costs conveniently exclude research, failed runs, and salaries. But the direction is real and the lesson is important. A large part of the cost moat was never physics. It was a story that incumbents had every incentive to tell.

The real moat is not the price of a single training run. It is the data recipe, the accumulated engineering know how, and above all the number of iterations you can afford. Frontier capability is a function of how many times you get to be wrong and try again, and that is a function of capital and talent, not of any single line item.

Now zoom out to the industry that actually gates all of this, because it is not the ML labs. The binding constraints on frontier pretraining today are advanced packaging and high bandwidth memory. Not wafer starts. TSMC can etch the logic. The chokepoint is CoWoS packaging capacity and the supply of HBM stacks from a grand total of three companies on earth. The scarce resource in AI is not intelligence or even electricity. It is the ability to physically bond memory to logic with enough bandwidth between them. That is a sentence that would have sounded absurd in 2019 and is the central fact of the industry in 2026.

And the economics are stranger than the headline numbers suggest. The dominant cost of a training run is not electricity. It is the depreciation of hardware that will be obsolete in two or three years. A frontier GPU is a melting asset, racing to earn back its cost before its own successor makes it embarrassing. Pretraining economics are fab economics and capital markets economics dressed up as a research budget.

---

## 5. Scaling laws, and two corpses in the road

The empirical backbone of the whole field is the observation that loss falls as a smooth power law in three quantities. Model parameters, training data, and compute. Kaplan and colleagues found the early laws. Then the Chinchilla work by Hoffmann and colleagues corrected them with a cleaner claim. For a fixed compute budget there is an optimal balance between model size and data, and it lands near twenty tokens of training data per parameter. Train a model much larger than that ratio and you are wasting compute you should have spent on data, and vice versa.

Chinchilla was a genuine advance. It is also, in 2026, largely a corpse that tutorials keep propping up in a chair.

### First corpse. Chinchilla-optimal is dead

Chinchilla optimizes the wrong thing. It minimizes the compute to reach a given loss during training. But a deployed model spends the overwhelming majority of its lifetime compute on inference, serving billions of requests, not on the one time cost of training. Once you account for that, the optimization flips. You want to spend more compute in training than Chinchilla says, deliberately overtraining a smaller model far past the point of training efficiency, because a smaller model is cheaper to serve forever. Every extra dollar you burn overtraining is repaid a thousand times at inference.

Read that again and notice what it is. It is not a machine learning argument. It is an amortization argument, a semiconductor economics argument about spreading a fixed cost across an enormous fleet. The death of Chinchilla is the moment pretraining strategy became a corollary of inference hardware economics. And then a second thing happened. Test time compute, the reasoning models that think longer before answering, opened an entirely new axis. You can now buy capability at inference time rather than baking all of it in during pretraining, which partially substitutes for pretraining scale and shifts hardware demand from training clusters toward low latency inference fleets. The chips you want for that are different chips, optimized for memory bandwidth and latency over raw training throughput.

### Second corpse. Emergence is probably a mirage

The most romantic idea in scaling is emergence, the claim that new capabilities appear suddenly and unpredictably as models cross a size threshold. It is a wonderful story. It is probably mostly a measurement artifact. Schaeffer and colleagues showed that many so called emergent abilities appear discontinuous only because we measure them with discontinuous metrics like exact match accuracy. Switch to a smooth metric and the sharp jump melts into the same gradual curve everything else follows.

But do not throw the mystery out with the artifact. Something real remains. Loss falls smoothly and continuously, yet the model's behavior on tasks we care about does seem to reorganize in phases. Grokking, the sudden late generalization after apparent memorization, is real and reproducible. The honest position is that we have a beautiful predictive theory for the loss and almost no predictive theory for the capabilities the loss is supposed to represent. Closing that gap, predicting downstream ability from upstream loss, is the most important unsolved problem in the science of pretraining.

---

## 6. The industry, where the war already moved

Line up the frontier labs and their public technical choices and a pattern emerges. Almost everyone has moved or is moving to mixture of experts. FP8 training is going mainstream. Context windows have stretched into the hundreds of thousands of tokens and beyond. The boundary between pretraining and what people now call mid-training, the long context extension and high quality annealing phases, has blurred to the point where the two words describe a continuum rather than two stages.

Any comparison of specific labs has to carry a warning label, because the details that matter are exactly the details nobody publishes. Treat everything specific as informed inference from public material, not gospel.

### The turn. The architecture war is over and nobody won, because it moved

The most important fact about the current industry is that the competition is no longer about architecture, and it is barely about scale in the old sense. It has moved entirely to data and post-training. When every serious model shares the same skeleton, differentiation cannot come from the skeleton. It comes from the data recipe, from the ability to generate and filter synthetic data, and from the reinforcement learning and reasoning layers stacked on top.

This is why the open versus closed debate is so frequently misframed. Open weights are now relatively common. Open recipes are not, and the recipe is the moat. An open weights model tells you the destination and hides the map. Catching up to a frontier model in architecture is a weekend. Catching up in data pipeline and post training is the whole war. The thing being hoarded shifted from the artifact to the process, and most commentary has not noticed.

---

## 7. Academia and the open source counterweight

There is a structural tension running underneath the field that deserves to be named plainly. The industry recipe is getting more secret every year, and academia is running in the opposite direction, trying to keep the science public.

Open models and open datasets matter far beyond their raw capability, because they provide the reproducible baselines that make science possible at all. You cannot study what you cannot run. The academic contribution has concentrated in the places where industry has the least incentive to publish. Mechanistic interpretability, the actual science of what these models compute. The data science of curation and filtering. The theory of scaling. And efficient training methods that let a university lab with a hundred chips contribute to a field increasingly built for people with a hundred thousand.

The stakes are higher than credit. This is a fight over whether the knowledge of how to build intelligence becomes public infrastructure or private property. Every closed recipe is a small enclosure of a commons. Every rigorous open replication is a push the other way. Which side wins is not a technical question, and it will shape the next twenty years more than any architecture choice.

---

## 8. So, is pretraining over

Return to the stage in December 2024 and the fossil fuel line. We can now answer it properly.

No, pretraining is not over. But the naive version of it is, and confusing the two is the error underneath most of the confident predictions you will read. What is ending is the era where you could win by scraping more web text and training a bigger dense model on it. What is beginning is subtler. Pretraining is dissolving into a continuum with mid-training and post-training. The marginal compute dollar is migrating toward reinforcement learning and test time reasoning. And the whole enterprise has revealed its true nature as a problem of semiconductor supply, memory bandwidth, and capital amortization that happens to be expressed in the language of machine learning.

The fossil fuel metaphor is even better than Sutskever intended, and in a way he may not have meant. Fossil fuels did not vanish when we noticed they were finite. We got radically more efficient at using them, we found reserves we had written off, and we slowly built the alternatives. Data is following the same arc. Repetition, synthesis, new modalities, and better filtering are the enhanced recovery techniques of the token economy. The wall everyone fears is real, and like most walls in this field it will be moved rather than hit.

The one prediction I will make with confidence is this. The next decade of progress will be gated less by ideas about intelligence and more by the physics of bonding memory to logic, the capital markets that finance melting assets, and the quality of the filter you run your data through. Pretraining grew up. It moved out of the research lab and into the fab and the balance sheet. Anyone who wants to understand where this is going should spend less time reading about attention and more time reading about packaging capacity and depreciation schedules.

That is the non consensus take, and I think the next few years will be kind to it.

---

*The figures throughout this series are interactive, so drag and toggle them. Notes on sources and the specific empirical claims are in the [references file](/pretraining/references.md), where any claim resting on a single lab's unpublished practice is marked as inference rather than fact.*

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
