---
layout: post
title: "Data Is the Whole Game"
excerpt: "Part 1. Why the corpus, not the architecture, is the moat, and why the two loudest panics about running out of data are both told wrong."
modified: 7/14/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 1 of a six part series. It begins with [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/).*

---

There is a tell in how labs behave that shows where the value actually sits. They will open source the model weights, hundreds of billions of parameters, the thing that cost tens of millions of dollars to train. They will not open source the data recipe, the mixture, the filters, the dedup thresholds, and the synthetic data pipeline. Weights are the destination, but the recipe is the map, and the map is the moat.

Pretraining is gated by physics and capital, and among the things a lab actually controls, almost all of the differentiation lives in data. Architecture is a near commodity. Data is where the craft is, and because the craft is hidden, the public conversation about it is dominated by two panics that are both, on inspection, told wrong.

---

## What survives the pipeline

Raw web text is closer to a landfill than a corpus, and turning one into the other is a pipeline of destruction. Extraction pulls text out of markup. Language identification sorts it. Quality filtering, a mix of cheap heuristics and learned classifiers, throws away the machine generated spam, the keyword salad, and the pages that are technically text and contain no information. Deduplication comes next, then filtering for toxicity and private data, then decontamination, the removal of anything that overlaps the evaluation sets a lab plans to grade itself on.

Only a small fraction of raw crawled text reaches a serious pretraining set. The figure below shows that fraction falling at each stage. The instinct that more data is always better is backwards at the frontier. The scarce input is quantity that survives a strict filter, and building the filter is the job.


<iframe class="pf-frame" src="/pretraining/02-data-pipeline.html" title="Interactive figure. The data pipeline and the mixture" loading="lazy" style="width:100%; height:900px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/02-data-pipeline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## Why deduplication improves model quality

Of all the stages, deduplication is the one people underrate most, so it is worth making concrete. Exact duplicates are trivial to remove, since hashing each document and dropping collisions handles them. The hard and important case is the near duplicate, the same article reworded, or a page that appears ten thousand times with only its header and footer changed. These do not just waste compute. They teach the model to memorize the repeated spans instead of generalizing, and removing them has been shown to improve models measurably.

The workhorse for finding them at web scale is MinHash with locality sensitive hashing. MinHash estimates the true overlap between two documents to within about five hundredths using signatures a tiny fraction of the size of the documents, which is what lets it scale to trillions of tokens. The locality sensitive hashing then flags the reworded copy and the boilerplate padded copy as near duplicates, at a true similarity of 0.70 and 0.81, while leaving unrelated documents untouched. Collapsing everything it flags to a single copy spends a little compute to buy back a lot of model quality. Deduplication is one of the higher leverage interventions in the pipeline.

---

## How tokenizer choice affects cost

Before text becomes training signal it becomes tokens, and the tokenizer is a decision made once that affects cost for every token afterward. The relevant quantity is fertility, how many tokens it takes to encode a given piece of text. High fertility means a fixed context window holds less real content, training costs more per unit of information, and inference costs more per request. A tokenizer trained mostly on English learns merges that compress English well and everything else badly.

The figure below trains a byte level tokenizer on English and then measures fertility across scripts. English, the training language, is the baseline. Source code costs about 1.4 times as many tokens, because identifiers and punctuation and indentation fragment into small pieces. Russian costs about 3.6 times as many. Chinese costs about 5.4 times as many, because each character is several bytes and almost none of the English merges apply, so the tokenizer falls back toward raw bytes. A speaker of the last language pays several times the token cost, latency, and context pressure to express the same content, purely because of a vocabulary decision made on someone else's corpus. Tokenizer design looks like a technical footnote, yet it functions as an act of policy, because more tokens per request means more bytes to move for every user on the wrong side of the tokenizer.


<iframe class="pf-frame" src="/pretraining/10-tokenizer-fertility.html" title="Interactive figure. Tokenizer fertility" loading="lazy" style="width:100%; height:680px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/10-tokenizer-fertility.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## How the data mixture is chosen

Once the data is clean and tokenized, the last lever is the mixture, the fraction that is web, code, math, books, and multilingual text. This is among the least published and most consequential sets of numbers in a lab, and the trend is clear. The share of code and math is rising even in models meant for general use, because reasoning appears to transfer. Training on code seems to make a model better at tasks beyond code, and the mixture panel in the figure above sketches that tradeoff, where lifting code and math pulls up reasoning at some cost to other axes.

The timing also matters, because the highest quality data is increasingly saved for an annealing phase at the end of training, upweighted as the learning rate decays, so the model finishes on the cleanest signal. The boundary between this and what people now call mid training is deliberately blurry.

---

## Why the data wall is overstated

The first panic is that the supply of data is running out, the fossil fuel thesis. The web is finite, the argument goes, so scaling is about to hit a wall.

The counterevidence is strong and specific. Repeating data works far better than the panic assumes. The work on data constrained scaling by Muennighoff and colleagues found that training for up to roughly four epochs on repeated data is nearly as good as training on the same volume of fresh tokens. Four epochs is a large amount of headroom against a supply people describe as nearly exhausted. That headroom exists before counting the modalities that remain barely touched. The text internet is finite, whereas video and audio are not, and they carry more structure about the physical world than text does. The binding constraint was always the compute to process the tokens and the judgment to filter them.

---

## Why model collapse is misread

The second panic is model collapse, the fear that training on AI generated data degrades models recursively into mush. The Nature paper by Shumailov and colleagues that anchors this fear is real, and its mechanism is real. What it actually studies is naive recursive self training, a model eating its own unfiltered output generation after generation with no quality control. That is not what any competent lab does with synthetic data.

What they do is nearly the opposite. They use a stronger model to generate data and then filter and verify it aggressively, keeping only what passes. Distillation from a better teacher, curated and checked, has become one of the central ingredients in modern frontier recipes. It is a large part of why the data wall is less of an emergency than claimed, because high quality tokens can be manufactured as well as mined. The difference between collapse and improvement lies entirely in the filter, and collapse is what happens when the craft is skipped.

---

## How contamination inflates benchmark scores

One more factor belongs in any honest reading of the benchmark numbers. A meaningful slice of what gets reported as capability is memorization leaking through imperfect decontamination. If a benchmark or something close to it sits in the training data, the model can score well by recall rather than by ability, and separating the two is hard at web scale. This is why serious labs treat contamination as a first class engineering problem, and why any leaderboard number not earned on a freshly minted, held out evaluation should be discounted. It is also another reason the recipe stays secret. Admitting what is in the data means admitting what the numbers do and do not mean.

---

## Why data is the decisive input

Taken together, the architecture is shared, the hardware is bought from the same few suppliers, and the scaling laws are public. The one input that is private, defensible, and decisive is the data, and every part of handling it, the filtering, the dedup, the tokenizer, the mixture, the synthesis, and the decontamination, is craft that compounds and does not leak. This is why catching up to a frontier model on architecture takes a weekend while catching up on the data pipeline takes years.

The usual framing treats the model as the product and the data as the raw material. At the frontier the relationship is closer to the reverse. The data pipeline is the product, refined over years and hidden on purpose, and the weights are the most recent thing it happened to print.

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
