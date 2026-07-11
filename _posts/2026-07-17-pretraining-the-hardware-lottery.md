---
layout: post
title: "The Hardware Lottery"
excerpt: "Part 2. Why every frontier model has converged on the same skeleton, and why the silicon, not the science, is what chose it."
modified: 7/17/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 2 of the series. The hub is [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). This post goes deep on the most counterintuitive claim in the whole series, that architecture barely matters for capability and that the Transformer won partly because it is the thing GPUs run fastest. The numbers are all explorable in the interactive figures below.*

---

Line up the frontier models from the major labs and squint at their architecture diagrams. They are the same diagram. Decoder only. Rotary position embeddings. RMSNorm. SwiGLU activations. Grouped query or latent attention. And increasingly a mixture of experts in place of the dense feedforward network. The convergence is close to total, and it is recent, and it demands an explanation, because independent teams competing hard for a trillion dollar prize do not usually all arrive at the identical answer by luck.

The explanation is not that everyone found the one true architecture. It is that the space of architectures was quietly filtered, over years, by two forces that have almost nothing to do with which idea is most elegant. The bitter lesson, and the hardware lottery. Once you see those two forces operating, the sameness of every frontier model stops being a curiosity and becomes the single most informative fact about the field.

---

## First, where the model actually spends itself

To reason about architecture you have to know where the compute and the parameters actually go, and the popular intuition is wrong. Attention gets the name and the papers, so people assume attention is where the work is. It is not, at ordinary context lengths.

The interactive figure below lets you sweep the context length. At 512 or 2048 tokens, about two thirds of the arithmetic per token is in the feedforward network, not in attention, and the famous quadratic attention term is a rounding error. The quadratic term only takes over once the context passes roughly the feedforward hidden size, near 32 thousand tokens in the configuration used here, after which it dominates and keeps growing. So there are two regimes. Ordinary use is feedforward bound. Long context is a genuinely different economic regime, which is why context length is sold as a premium and why so much architecture effort targets that quadratic tail specifically.


<iframe class="pf-frame" src="/pretraining/11-attention-vs-ffn.html" title="Interactive figure. Where the compute goes" loading="lazy" style="width:100%; height:780px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/11-attention-vs-ffn.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


This matters for the argument because it tells you which parts of the architecture are worth attacking. If most of the compute and most of the parameters live in the feedforward network at normal context, then the highest leverage architectural move is to do something clever with the feedforward network. Which is exactly what the industry did.

---

## The attention lineage is bandwidth engineering

The attention variants first. The line runs from multi head attention to multi query to grouped query to the low rank latent attention of the DeepSeek models. The academic framing presents these as a search for better attention. The honest framing, argued in full in the fab post, is that every one of them is an attack on the number of bytes the key value cache costs to store and to stream during generation. The KV cache experiment in that post shows an ordinary multi head model at long context needing to move hundreds of gigabytes per token, and grouped query and latent attention cutting that by roughly an order of magnitude. None of these variants was chasing a smarter model. They were chasing a cheaper one, where cheaper means fewer bytes across the memory wall. Hold that thought, because it is the pattern.

---

## MoE is a memory versus compute trade, and the numbers are stark

Now the feedforward network, where we just established the parameters live. The mixture of experts replaces one feedforward block with many expert blocks and a router that sends each token to only a few of them. The claim is that you grow total parameters without growing the compute per token.

The interactive figure below makes the trade impossible to miss. A dense baseline of 7 billion parameters activates all 7 billion on every token. An MoE with 64 experts and top 2 routing carries 277 billion total parameters while activating only about 11 billion per token. Push to 256 experts with top 8 and it carries over 1.1 trillion parameters while activating 37 billion, a total to active ratio near 30. That is the gift, roughly thirty times the knowledge capacity at fixed compute per token.


<iframe class="pf-frame" src="/pretraining/03-moe-router.html" title="Interactive figure. Mixture of experts routing" loading="lazy" style="width:100%; height:760px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/03-moe-router.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


It is also the bill, and the bill is paid in exactly the currency the whole series keeps invoicing. Every one of those trillion parameters has to live in HBM and be reachable over the interconnect, even though any given token only touches a few percent of them. MoE trades abundant compute for scarce memory and scarce bandwidth. It only pays off when you have fast enough interconnect to shard the experts across many chips and route tokens to them, which is why MoE and expert parallelism arrived together and why MoE is a strategy for people who own good networks. The FLOPs got cheaper. The bytes got much more expensive. That is not an ML decision. It is a datacenter decision.

---

## The bitter lesson filters, the hardware lottery chooses

Step back and ask why these particular moves survived when a thousand other architectural ideas did not. Two principles do the work.

The bitter lesson, Rich Sutton's observation, is that general methods that scale with compute beat clever methods that encode human priors, reliably, given enough time and data. Applied to architecture it is a filter. Ideas that inject strong structural assumptions tend to help at small scale and then wash out, overtaken by simpler things that just absorb more compute. This is why the architectural survivors are never capability tricks. They are efficiency tricks. Grouped query attention, latent attention, and MoE do not make the model reason better at fixed scale. They make a given level of capability cheaper to train or to serve. The bitter lesson quietly executes anything that tried to be clever about intelligence, and spares the things that were merely clever about cost.

The hardware lottery, Sara Hooker's idea, is the deeper cut. An architecture does not win only on merit. It wins if it happens to run fast on the hardware that already exists. The Transformer is, stripped down, a machine for doing very large dense matrix multiplications, which is the one operation a GPU does better than any device ever built. It did not win purely because it was the best model of language. It won because it was the best model of language that also saturated the available silicon. The GPU voted, and the field ratified the vote, and then a decade of tooling, kernels, and chips optimized for that choice made the choice self reinforcing.

---

## The non consensus claim, stated plainly

Put the filter and the lottery together and you get a claim most machine learning people resist. For large language models, architecture research is largely finished, and what remains is efficiency engineering downstream of the hardware. The skeleton converged because the silicon selected it, the surviving variations are all about cost, and capability now comes almost entirely from data and scale, not from the shape of the network. Architecture decides cost. Data decides the ceiling. The reason the second post in a series about pretraining spends its energy telling you architecture does not matter much is that this is genuinely the surprising truth, and believing the opposite is how you waste years polishing a skeleton that the bitter lesson has already frozen.

---

## The honest counterpoint

A claim this strong deserves its strongest objection, and the objection is the hardware lottery itself, run in reverse. If architectures win by suiting the hardware, then a change in the hardware could crown a different architecture. The state space models, the Mamba line and its relatives, are the live example. They promise linear rather than quadratic scaling in sequence length, which is enormously attractive for the long context regime we saw is a separate and expensive world. So far they have not displaced the Transformer at the frontier, and part of the reason is precisely the lottery, the entire hardware and software stack is tuned for attention shaped computation, so a challenger has to be not just better but better by enough to overcome a decade of accumulated advantage. The convergence is real, but it is contingent, not eternal. It reflects the chips we built. Build materially different chips, or hit the quadratic wall hard enough that linear scaling becomes non negotiable, and the lottery could be rerun with a different winner. That is the one door through which architecture could matter again, and it is worth watching for exactly that reason.

---

## What to take away

The sameness of every frontier model is not boring. It is the clearest signal the field emits. It tells you that the hard, defensible, still open work has moved off the architecture and onto the two things this series keeps returning to. The data, which the previous post argued is the real moat. And the hardware, which the fab post argued is the real constraint. The architecture is the settled part. Treat it as the commodity it has become, and spend your attention where the leverage actually is.

*The figures above are interactive, so drag and toggle them. Sources and hedges for every claim are in [references.md](/pretraining/references.md).*

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
