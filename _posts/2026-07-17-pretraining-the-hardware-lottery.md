---
layout: post
title: "The Hardware Lottery"
excerpt: "Part 2. Why every frontier model has converged on the same skeleton, and why the silicon, not the science, is what chose it."
modified: 7/17/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 2 of a six part series. It begins with [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/).*

---

The frontier models from the major labs share one architecture diagram. They are decoder only, with rotary position embeddings, RMSNorm, SwiGLU activations, and grouped query or latent attention. Increasingly they use a mixture of experts in place of the dense feedforward network. The convergence is close to total and recent, and it demands an explanation, because independent teams competing hard for a trillion dollar prize do not usually all arrive at the identical answer by luck.

The space of architectures was filtered, over years, by two forces that have little to do with which idea is most elegant, the bitter lesson and the hardware lottery. With those two forces in view, the sameness of every frontier model stops being a curiosity and becomes an informative fact about the field.

---

## Where the compute and parameters go

Reasoning about architecture requires knowing where the compute and the parameters go, and the popular intuition is wrong. Attention gets the name and the papers, so people assume attention is where the work is. At ordinary context lengths, most of the work is elsewhere.

The figure below sweeps the context length. At 512 or 2048 tokens, about two thirds of the arithmetic per token is in the feedforward network rather than in attention, and the quadratic attention term is a rounding error. The quadratic term only takes over once the context passes roughly the feedforward hidden size, near 32 thousand tokens in the configuration used here, after which it dominates and keeps growing. There are two regimes. Ordinary use is feedforward bound, while long context is a different economic regime, which is why context length is sold as a premium and why so much architecture effort targets that quadratic tail.


<iframe class="pf-frame" src="/pretraining/11-attention-vs-ffn.html" title="Interactive figure. Where the compute goes" loading="lazy" style="width:100%; height:780px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/11-attention-vs-ffn.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


This matters because it shows which parts of the architecture are worth attacking. If most of the compute and most of the parameters live in the feedforward network at normal context, then the highest leverage architectural move is to do something clever with the feedforward network, which is what the industry did.

---

## The attention variants target the key value cache

The attention variants come first. The line runs from multi head attention to multi query to grouped query to the low rank latent attention of the DeepSeek models. They are often described as a search for better attention, but each one reduces the number of bytes the key value cache costs to store and to stream during generation. An ordinary multi head model at long context needs to move hundreds of gigabytes per token, and grouped query and latent attention cut that by roughly an order of magnitude. These variants were chasing a cheaper model rather than a smarter one, where cheaper means fewer bytes across the memory wall. This is the recurring pattern.

---

## Mixture of experts trades compute for memory

The feedforward network holds most of the parameters. The mixture of experts replaces one feedforward block with many expert blocks and a router that sends each token to only a few of them. The claim is that total parameters grow without growing the compute per token.

The figure below shows the trade. A dense baseline of 7 billion parameters activates all 7 billion on every token. An MoE with 64 experts and top 2 routing carries 277 billion total parameters while activating only about 11 billion per token. At 256 experts with top 8 it carries over 1.1 trillion parameters while activating 37 billion, a total to active ratio near 30. The result is roughly thirty times the knowledge capacity at fixed compute per token.


<iframe class="pf-frame" src="/pretraining/03-moe-router.html" title="Interactive figure. Mixture of experts routing" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/03-moe-router.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


There is also a bill. Every one of those trillion parameters has to live in HBM and be reachable over the interconnect, even though any given token only touches a few percent of them. MoE trades abundant compute for scarce memory and scarce bandwidth. It only pays off with a fast enough interconnect to shard the experts across many chips and route tokens to them, which is why MoE and expert parallelism arrived together and why MoE is a strategy for those who own good networks. The FLOPs got cheaper while the bytes got more expensive. This is a datacenter decision more than an ML one.

---

## The bitter lesson and the hardware lottery

Two principles explain why these particular moves survived when a thousand other architectural ideas did not.

The bitter lesson, Rich Sutton's observation, is that general methods that scale with compute beat clever methods that encode human priors, given enough time and data. Applied to architecture, it acts as a filter. Ideas that inject strong structural assumptions tend to help at small scale and then wash out, overtaken by simpler things that absorb more compute. The architectural survivors are efficiency tricks rather than capability tricks. Grouped query attention, latent attention, and MoE make a given level of capability cheaper to train or to serve rather than raising the ceiling at fixed scale. The filter removes ideas that tried to be clever about intelligence and keeps the ones that were clever about cost.

The hardware lottery, Sara Hooker's idea, goes further. An architecture wins partly on merit and partly by running fast on the hardware that already exists. The Transformer, stripped down, is a machine for doing very large dense matrix multiplications, which is the one operation a GPU does better than any device ever built. It won because it was the best model of language that also saturated the available silicon. The hardware favored it, the field adopted it, and then a decade of tooling, kernels, and chips optimized for that choice made the choice self reinforcing.

---

## Architecture research is largely finished

Together the filter and the lottery produce a claim that most machine learning people resist. For large language models, architecture research is largely finished, and what remains is efficiency engineering downstream of the hardware. The skeleton converged because the silicon selected it, the surviving variations are about cost, and capability now comes almost entirely from data and scale rather than from the shape of the network. Architecture decides cost, and data decides the ceiling. This claim is surprising, and believing the opposite leads to years spent polishing a skeleton that the bitter lesson has already frozen.

---

## Where architecture could matter again

A claim this strong deserves a serious objection, which is the hardware lottery run in reverse. If architectures win by suiting the hardware, then a change in the hardware could favor a different architecture. The state space models, the Mamba line and its relatives, are the live example. They promise linear rather than quadratic scaling in sequence length, which is attractive for long context, a separate and expensive regime. So far they have not displaced the Transformer at the frontier, and part of the reason is the lottery, since the hardware and software stack is tuned for attention shaped computation, so a challenger has to be better by enough to overcome a decade of accumulated advantage. The convergence is real but contingent. It reflects the chips that were built. Materially different chips, or a quadratic wall hard enough that linear scaling becomes non negotiable, could rerun the lottery with a different winner. That is the one route by which architecture could matter again.

---

## Where the open work has moved

The sameness of every frontier model is a useful signal. It shows that the hard, defensible, still open work has moved off the architecture and onto two things. Data is the real moat, and hardware is the real constraint. The architecture is the settled part, a commodity, and the leverage now lies with data and hardware.

*The figures above are interactive. Sources and hedges for every claim are in [references.md](/pretraining/references.md).*

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
