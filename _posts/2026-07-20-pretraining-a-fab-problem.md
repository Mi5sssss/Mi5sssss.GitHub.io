---
layout: post
title: "Pretraining Is a Fab Problem"
excerpt: "Part 3. Why the frontier is gated by memory bandwidth, packaging capacity, and depreciation, and barely at all by ideas about intelligence."
modified: 7/20/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 3 of a six part series. It begins with [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/).*

---

Asked what limits frontier pretraining, most machine learning engineers say compute, meaning more FLOPs and bigger models. That is an expensive misconception, and it is wrong in a specific way. Compute, raw floating point throughput, is close to the only thing that is not scarce. What is scarce is the ability to feed the compute. That means bandwidth to memory, bandwidth between chips, the physical capacity to bond memory to logic, and the capital to own hardware that loses value while it runs.

The people building the clusters treat pretraining as a logistics, materials science, and balance sheet problem that happens to use the vocabulary of neural networks.

---

## Bandwidth grows slower than compute

One fact governs the rest. For decades, arithmetic has grown faster than the ability to deliver data to it. This is the memory wall, named by Wulf and McKee in 1995 and revived for the deep learning era by Gholami and colleagues in their work on the AI and memory wall. Peak compute on flagship accelerators has been roughly tripling every couple of years. Memory bandwidth has been growing closer to one and a half times over the same window. Interconnect bandwidth between chips grows slower still.

Two exponentials with different bases diverge without limit. Each hardware generation, the multipliers grow relatively faster and the paths feeding them relatively narrower, so the normal state of a modern accelerator is data starved. The tensor cores are the fastest, most expensive, and most idle part of the machine. Once that is clear, most of the unusual choices in modern pretraining stop looking unusual.

---

## The roofline model

The tool for reasoning about this is the roofline model. A kernel is bounded either by compute, the flat roof of peak FLOP per second, or by memory, the slanted roof of bandwidth times arithmetic intensity. Arithmetic intensity is how many floating point operations run per byte moved. The crossover between the two roofs is the ridge point, and anything to the left of it is memory bound, where owning more FLOPs adds nothing.

The figure below computes the ridge for an H100 class chip at about 296 FLOP per byte and places two workloads on the chart. A training matmul, which pushes thousands of tokens through the same weights at once, lands at an arithmetic intensity above 5000 and runs at the full compute peak. A single decode step, generating one token with a batch of one, lands at an arithmetic intensity of 1 and runs at three tenths of one percent of peak.


<iframe class="pf-frame" src="/pretraining/08-roofline.html" title="Interactive figure. The roofline" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/08-roofline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


The same silicon, on the same model, runs at a hundred percent of its rated compute during training and at a third of a percent during single stream generation. The expensive part of the chip is almost entirely idle whenever the model is used one request at a time. This follows from the arithmetic of reusing each weight once versus thousands of times, and no amount of tuning changes it. It explains why batching requests together dominates inference economics, why the reasoning models that generate long chains of tokens are so costly, and why the chips being designed for inference look nothing like the chips designed for training. The workload moves from the right of the ridge to the far left, and a different machine wins.

---

## The KV cache sets a limit on generation speed

Architecture, the subject usually thought of as pure machine learning, is largely memory engineering.

During generation a Transformer keeps a cache of the keys and values for every previous token so it does not recompute them. To emit the next token it must read that entire cache out of memory. Generation speed therefore has a hard ceiling set by how fast the cache can stream out of HBM.

The figure below puts a 70B class configuration on the scale. With ordinary multi head attention at a context length of 128 thousand tokens, the cache is 312 gigabytes, which does not fit on one accelerator, and streaming it once per token caps generation near ten tokens per second before any useful arithmetic. Grouped query attention, which shares each stored key and value across a group of query heads, brings the cache to 39 gigabytes and raises the ceiling to eighty tokens per second. The low rank latent attention introduced in the DeepSeek line, which stores one small compressed vector per layer instead of full head wise keys and values, drops the cache under ten gigabytes.


<iframe class="pf-frame" src="/pretraining/07-memory-wall.html" title="Interactive figure. The KV cache wall" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/07-memory-wall.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


The main attention methods of the last five years, multi query attention, grouped query attention, latent attention, and sliding windows, are largely reductions in the number of bytes the cache costs to store and to stream. Commonly presented as attention variants, they act as bandwidth reductions. The architecture is downstream of the memory system, and the memory system is downstream of the fab.

---

## FP8 as a bandwidth reduction

The industry is moving from sixteen bit training down to eight bits and now toward four. The standard explanation is a numerics story about dynamic range and numerical stability, and that story is true. The FP8 E4M3 format keeps three mantissa bits and reaches a maximum normal value in the low hundreds, so training in it requires careful per tensor or per block scaling to keep every value inside a small representable window. If the scaling is lost, the run diverges.

The numerics story leaves out the larger effect. An FP8 value carries one quarter of the bytes of an FP32 value and half the bytes of the BF16 that training has used for years. In every regime that is memory bound, which covers most of serving and a large part of training, cutting the bytes per value cuts the memory traffic by the same factor and speeds the kernel up by close to it, independent of any change in arithmetic throughput. FP8 delivers speedups larger than its FLOP count alone predicts, because the binding constraint was the bytes moved. The roadmap does not stop at FP8. FP4 is coming for the same reason, since the scarce resource is bandwidth and every bit removed from a number is a bit that does not have to move across it.

---

## The communication cost of splitting a model

Frontier pretraining runs across tens of thousands of chips, and splitting a model across them introduces a second bandwidth problem worse than the one inside a single chip.

The simplest case is data parallelism, where every replica holds the whole model and they average their gradients at the end of each step with an all reduce. The ring algorithm that does this moves an amount of data per GPU that barely changes as GPUs are added. The other half of the picture is that compute per step shrinks as GPUs are added, because the work is divided among them, while the communication does not shrink. The gap between those two is the tax.

The figure below tracks the fraction. For a 70B model with a four million token global batch, on a fast NVLink class fabric inside a node, the gradient exchange is a rounding error at any scale. On a slower cross node fabric of the InfiniBand class, the same exchange is nine percent of the step at 64 GPUs, forty three percent at 512, and ninety six percent at sixteen thousand. At the scale of a frontier run, on the slower side of the network hierarchy, the chips would spend nearly all their time communicating and almost none computing.


<iframe class="pf-frame" src="/pretraining/04-parallelism.html" title="Interactive figure. Four dimensional parallelism" loading="lazy" style="width:100%; height:860px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/04-parallelism.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


This is why the physical unit of frontier compute has become the pod, the tightly coupled island of chips wired together with a fast fabric, past which bandwidth drops sharply. It is why large engineering effort goes into keeping the communication heavy parallelism dimensions inside the fast domain and overlapping communication with the backward pass so it hides under compute. The effective Moore's law of this era is interconnect bandwidth, the slowest of all the exponentials, which makes it the constraint that increasingly decides who can train what.

---

## Packaging and memory supply as the bottleneck

One level past the pod is the supply chain that builds the chips. TSMC can etch the logic dies, so wafers are not the scarce input. The chokepoints are the high bandwidth memory stacks and the advanced packaging that bonds them to the logic.

High bandwidth memory is made in volume by three companies, SK Hynix, Samsung, and Micron. The packaging that stacks that memory beside a GPU on a single interposer, the family of techniques TSMC markets as chip on wafer on substrate, has been a hard capacity constraint through the recent build out, widely reported as the gating step on how many accelerators can be produced. The bottleneck of the AI boom moved off the transistor and onto the physical integration of memory with compute, which is what the memory wall predicts. When bandwidth is the constraint, the scarce manufacturing capability is the one that produces bandwidth, which is packaging and HBM.

For pretraining strategy, money does not convert directly into frontier capability, because the intermediate good, packaged high bandwidth accelerators, is rate limited by a handful of fabs and a handful of memory makers. Capital buys an allocation in a queue. The frontier is gated by a supply chain three companies deep, and no amount of machine learning routes around a shortage of interposers.

---

## Depreciation as the dominant cost

The economics come down to the balance sheet.

The dominant cost of a large training run is depreciation against obsolescence, ahead of electricity or the evenly amortized sticker price of the hardware. A frontier accelerator loses its economic value when its successor arrives and does the same work for a fraction of the cost per operation. Performance per dollar in this domain has been improving fast enough that a two year old accelerator loses value whether or not it is run, so the rational owner extracts value before the next generation makes the current silicon uneconomic. Utilization is therefore a financial concern as much as an engineering one, because idle time on a depreciating asset is a loss.

Two more features of the economics shape behavior. First, the informal observation sometimes called Jensen's law, that the relevant performance metrics are improving faster than the classic Moore's law cadence, which is what makes the depreciation so fast. Second, the circular financing that has become characteristic of this cycle, in which the maker of the scarce chips invests in the companies that buy the scarce chips, widely reported across the recent build out. The specifics are reported rather than audited, but the structure is real, and it is the kind of arrangement that appears when demand for a rate limited good has to be manufactured and financed at the same time.

The economics connect back to the science. Chinchilla optimal training is largely set aside, and labs deliberately overtrain smaller models far past the point of training efficiency, for economic reasons. A smaller model is cheaper to serve on every one of the billions of requests it will answer over its life, and serving is memory bound and therefore dominated by these bandwidth and capital constraints. Overtraining spends more of the compute bound resource, which is relatively abundant, to save the memory bound resource, which is scarce, across the entire inference fleet. The reasoning is closer to amortization than to model quality. A larger up front training cost is spread across the enormous number of requests the model will serve, a decision made against a depreciation schedule and a bandwidth ceiling. The pretraining recipe is downstream of the unit economics of the serving fleet.

---


<iframe class="pf-frame" src="/pretraining/09-fab-economics.html" title="Interactive figure. Fab economics of a training run" loading="lazy" style="width:100%; height:780px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/09-fab-economics.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


## What gates the frontier

Pretraining has moved out of the research lab. It now depends on the fab, the interconnect, and the balance sheet, and the language of neural networks is increasingly a surface description of a problem whose real variables are gigabytes per second, interposers per quarter, and dollars per depreciated GPU hour.

The more predictive indicators are HBM supply, advanced packaging capacity, interconnect roadmaps, and the depreciation assumptions in hyperscaler filings, rather than the next architecture paper. Those numbers gate the frontier more tightly than any idea about intelligence does at present, and they move on the slow clock of factories and capital, which is what makes them forecastable when the models are not.

The main bottleneck to machine intelligence today is the physics of moving bytes and the economics of owning the machines that move them, with most else downstream of that.

*Sources and hedges for every claim are in [references.md](/pretraining/references.md).*

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
