---
layout: post
title: "Pretraining Is a Fab Problem"
excerpt: "Part 3. Why the frontier is gated by memory bandwidth, packaging capacity, and depreciation, and barely at all by ideas about intelligence."
modified: 7/20/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 3 of the series. The hub is [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). This post goes deep on the one claim from the hub that machine learning people least want to hear, that pretraining has become a problem of semiconductor physics and capital markets that merely speaks the language of neural networks. Every number below is explorable in the interactive figures embedded in the post.*

---

Ask a room of machine learning engineers what limits frontier pretraining and almost everyone says compute. More FLOPs, bigger models, done. This is the single most expensive misconception in the field, and it is wrong in a specific and instructive way. Compute, raw floating point throughput, is close to the only thing that is not scarce. What is scarce is the ability to feed the compute. Bandwidth to memory. Bandwidth between chips. The physical capacity to bond memory to logic. And the capital to own hardware that melts in value while you use it.

I am going to make the case in numbers, because this is an argument that only becomes convincing when you compute it. By the end you should see pretraining the way the people actually building the clusters see it, as a logistics and materials-science and balance-sheet problem wearing a lab coat.

---

## The premise is inverted

Start with the fact that quietly governs everything else. For decades, arithmetic has grown faster than the ability to deliver data to it. This is the memory wall, named by Wulf and McKee back in 1995 and revived for the deep learning era by Gholami and colleagues in their work on the AI and memory wall. The shape of it is brutal and simple. Peak compute on flagship accelerators has been roughly tripling every couple of years. Memory bandwidth has been growing closer to one and a half times over the same window. Interconnect bandwidth between chips grows slower still.

Two exponentials with different bases diverge without limit. Every hardware generation, the multipliers get relatively hungrier and the pipes feeding them get relatively narrower. So the natural state of a modern accelerator is starving. The tensor cores are the fastest, most expensive, most idle part of the machine. Once you internalize that sentence, most of the strange choices in modern pretraining stop being strange.

---

## The roofline, or how to know what is actually limiting you

The tool for reasoning about this is the roofline model. A kernel is bounded either by compute, the flat roof of peak FLOP per second, or by memory, the slanted roof of bandwidth times arithmetic intensity. Arithmetic intensity is just how many floating point operations you do per byte you move. The crossover between the two roofs is the ridge point, and anything to the left of it is memory bound, which means owning more FLOPs buys you literally nothing.

The interactive roofline below computes the ridge for an H100 class chip at about 296 FLOP per byte. Then it places two workloads on the chart. A training matmul, which pushes thousands of tokens through the same weights at once, lands at an arithmetic intensity above 5000 and runs at the full compute peak. A single decode step, generating one token with a batch of one, lands at an arithmetic intensity of 1 and runs at three tenths of one percent of peak.


<iframe class="pf-frame" src="/pretraining/08-roofline.html" title="Interactive figure. The roofline" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/08-roofline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


Read that gap again. The same silicon, on the same model, runs at a hundred percent of its rated compute during training and at a third of a percent during single-stream generation. The expensive part of the chip is almost entirely idle whenever the model is actually being used one request at a time. This is not a tuning problem you can fix. It is the arithmetic of reusing each weight once versus thousands of times. It is why batching requests together is the central act of inference economics, why the reasoning models that generate enormous chains of tokens are so costly, and why the chips being designed for inference look nothing like the chips designed for training. The workload flips from the right of the ridge to the far left, and a different machine wins.

---

## The KV cache is a wall you can measure in gigabytes per token

Here is where architecture, the subject people think is pure machine learning, reveals itself as memory engineering.

During generation a Transformer keeps a cache of the keys and values for every previous token so it does not recompute them. To emit the next token it must read that entire cache out of memory. Not do heavy math on it. Read it. So generation speed has a hard ceiling set by how fast you can stream the cache out of HBM.

The interactive figure below puts a 70B class configuration on the scale, and the ceiling becomes concrete. With ordinary multi head attention at a context length of 128 thousand tokens, the cache is 312 gigabytes, which does not even fit on one accelerator, and streaming it once per token caps generation near ten tokens per second before you have done a single useful multiply. Switch to grouped query attention, which shares each stored key and value across a group of query heads, and the cache falls to 39 gigabytes and the ceiling rises to eighty tokens per second. Switch to the low rank latent attention introduced in the DeepSeek line, which stores one small compressed vector per layer instead of full head-wise keys and values, and the cache drops under ten gigabytes.


<iframe class="pf-frame" src="/pretraining/07-memory-wall.html" title="Interactive figure. The KV cache wall" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/07-memory-wall.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


Now reread the last five years of attention research with this in mind. Multi query attention, grouped query attention, latent attention, sliding windows, all of it. Not one of these is primarily about making the model smarter. Every one is an attack on the number of bytes the cache costs to store and to stream. The academic framing calls them attention variants. The honest framing calls them bandwidth reductions. The architecture is downstream of the memory system, and the memory system is downstream of the fab.

---

## FP8 is a bandwidth play wearing a numerics costume

The industry is marching from sixteen bit training down to eight bits and now toward four. The standard explanation is a numerics story about dynamic range and numerical stability, and that story is true. The tightrope is easy to see. The FP8 E4M3 format keeps only three mantissa bits and reaches a maximum normal value in the low hundreds, so training in it requires careful per tensor or per block scaling to keep every value inside a tiny representable window. Lose the scaling and the run diverges. That is real and it is hard.

But the numerics story buries the point. The same experiment shows that an FP8 value carries one quarter of the bytes of an FP32 value and half the bytes of the BF16 that training has used for years. In every regime that is memory bound, and we just established that this is most of serving and a large part of training, cutting the bytes per value cuts the memory traffic by the same factor and speeds the kernel up by close to it, entirely independent of any change in arithmetic throughput. FP8 delivers speedups larger than its FLOP count alone predicts, because the FLOP count was never the binding constraint. The bytes were. That is also why the roadmap does not stop at FP8. FP4 is coming for the same reason, the scarce resource is the wire, not the multiplier, and every bit you shave off a number is a bit you do not have to drag across it.

---

## The communication tax, or why the network is part of the model

So far everything has lived inside one chip. Frontier pretraining lives across tens of thousands of them, and the moment you split a model across chips you introduce a second bandwidth problem that is worse than the first.

Consider the simplest case, data parallelism, where every replica holds the whole model and they average their gradients at the end of each step with an all reduce. The ring algorithm that does this moves an amount of data per GPU that barely changes as you add GPUs. That sounds like good news, and it is, until you notice the other half. Compute per step shrinks as you add GPUs, because the work is divided among them. The communication does not shrink. The gap between those two is the tax.

The interactive figure below tracks the fraction. For a 70B model with a four million token global batch, on a fast NVLink class fabric inside a node, the gradient exchange is a rounding error at any scale. On a slower cross node fabric of the InfiniBand class, the same exchange is nine percent of the step at 64 GPUs, forty three percent at 512, and ninety six percent at sixteen thousand. At the scale of a frontier run, on the wrong side of the network hierarchy, the chips would spend nearly all their time talking and almost none computing.


<iframe class="pf-frame" src="/pretraining/04-parallelism.html" title="Interactive figure. Four dimensional parallelism" loading="lazy" style="width:100%; height:860px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/04-parallelism.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


This is why the physical unit of frontier compute is no longer the chip. It is the pod, the tightly coupled island of chips wired together with a fast fabric, past which bandwidth falls off a cliff. It is why enormous engineering effort goes into keeping the chatty parallelism dimensions inside the fast domain and overlapping communication with the backward pass so it hides under compute. And it is why I will argue the real Moore's law of this era is not transistor density at all. It is interconnect bandwidth, and it is the slowest of all the exponentials, which makes it the one that increasingly decides who can train what.

---

## The bottleneck is packaging, and there are three companies

Zoom out one more level, past the pod, to the supply chain that builds the chips, and you find the true scarce resource. It is not wafers. TSMC can etch the logic dies. The chokepoints are the high bandwidth memory stacks and the advanced packaging that bonds them to the logic.

High bandwidth memory is made in volume by three companies on the entire planet. SK Hynix, Samsung, and Micron. That is the whole list. And the packaging that stacks that memory beside a GPU on a single interposer, the family of techniques TSMC markets as chip on wafer on substrate, has been a hard capacity constraint through the recent build out, widely reported as the gating step on how many accelerators can be produced at all. The bottleneck of the AI boom moved off the transistor and onto the act of physically integrating memory with compute. Which is exactly what the memory wall predicts. When bandwidth is the constraint, the scarce manufacturing capability becomes the one that produces bandwidth, and that is packaging and HBM, not logic.

The consequence for pretraining strategy is stark and underappreciated. You cannot convert money directly into frontier capability, because the intermediate good, packaged high bandwidth accelerators, is rate limited by a handful of fabs and a handful of memory makers. Capital buys you an allocation in a queue. The frontier is gated by a supply chain three companies deep, and no amount of clever machine learning routes around a shortage of interposers.

---

## The economics, or the depreciation schedule as a scaling law

Now the balance sheet, which is where the story ends and where it is least romantic.

The dominant cost of a large training run is not electricity, and it is not even the sticker price of the hardware amortized evenly. It is depreciation against obsolescence. A frontier accelerator loses its economic value not because it wears out but because its successor arrives and does the same work for a fraction of the cost per operation. Performance per dollar in this domain has been improving fast enough that holding a two year old accelerator is a little like holding ice. The asset is melting whether or not you use it, so the rational owner races to extract value before the next generation makes today's silicon embarrassing. This is why utilization is a financial obsession and not just an engineering one. Idle time on a melting asset is pure loss.

Two more features of the economics deserve naming because they shape behavior. First, the informal observation, sometimes called Jensen's law, that the relevant performance metrics are improving faster than the classic Moore's law cadence, which is precisely what makes the depreciation so punishing. Second, the circular financing that has become characteristic of this cycle, in which the maker of the scarce chips invests in the companies that buy the scarce chips, widely reported across the recent build out. Treat the specifics as reported rather than audited, but the structure is real, and it is the kind of arrangement that appears when demand for a rate limited good has to be manufactured and financed at the same time.

Here is the synthesis that ties this post back to the science. In the scaling laws post I argue that Chinchilla optimal is dead, that labs deliberately overtrain smaller models far past the point of training efficiency. The reason is entirely on this page. A smaller model is cheaper to serve on every one of the billions of requests it will answer over its life, and serving is memory bound and therefore dominated by exactly the bandwidth and capital constraints described here. Overtraining spends more of the compute-bound resource, which is relatively abundant, to save the memory-bound resource, which is scarce, across the entire inference fleet. The death of Chinchilla is not a machine learning result. It is an amortization decision made against a depreciation schedule and a bandwidth ceiling. The pretraining recipe is downstream of the unit economics of the serving fleet.

---


<iframe class="pf-frame" src="/pretraining/09-fab-economics.html" title="Interactive figure. Fab economics of a training run" loading="lazy" style="width:100%; height:780px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/09-fab-economics.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


## What this means

Pretraining grew up and moved out of the research lab. It now lives in the fab, the interconnect, and the balance sheet, and the language of neural networks is increasingly just the surface description of a problem whose real variables are gigabytes per second, interposers per quarter, and dollars per depreciated GPU hour.

The practical upshot for anyone trying to see where this goes is to change what you read. The single most predictive thing you can track is not the next architecture paper. It is HBM supply, advanced packaging capacity, interconnect roadmaps, and the depreciation assumptions in hyperscaler filings. Those numbers gate the frontier more tightly than any idea about intelligence does right now, and they move on the slow clock of factories and capital, which is exactly what makes them forecastable when the models are not.

That is the non consensus claim of this whole series stated in its hardest form. The bottleneck to machine intelligence, today, is the physics of moving bytes and the economics of owning the machines that move them. Everything else is downstream.

*The figures above are interactive, so drag and toggle them. Sources and hedges for every claim are in [references.md](/pretraining/references.md).*

<script>
(function(){
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe.pf-frame'));
  function resize(f){ try{ var d=f.contentWindow.document.documentElement; f.style.height=(d.scrollHeight+24)+'px'; }catch(e){} }
  frames.forEach(function(f){
    f.addEventListener('load', function(){
      resize(f); setTimeout(function(){resize(f);}, 300);
      ['click','change','input'].forEach(function(ev){
        try{ f.contentWindow.document.addEventListener(ev, function(){ setTimeout(function(){resize(f);}, 90); }); }catch(e){}
      });
    });
  });
  window.addEventListener('resize', function(){ frames.forEach(function(f){ setTimeout(function(){resize(f);}, 120); }); });
})();
</script>
