---
layout: post
title: "Data Is the Whole Game"
excerpt: "Part 1. Why the corpus, not the architecture, is the moat, and why the two loudest panics about running out of data are both told wrong."
modified: 7/14/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 1 of the series. The hub is [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). This post goes deep on the claim that data curation is the real frontier work, the part every lab guards and almost none publishes. Every quantitative claim is something you can explore in the interactive figures below.*

---

There is a tell in how labs behave that tells you where the value actually sits. They will open source the model weights, hundreds of billions of parameters, the thing that cost tens of millions of dollars to train. They will not open source the data recipe. The mixture, the filters, the dedup thresholds, the synthetic data pipeline. Weights are the destination. The recipe is the map, and the map is the moat.

This post is about the map. If the hardware post argued that pretraining is gated by physics and capital, this one argues that among the things a lab actually controls, almost all of the differentiation lives in data. Architecture is a near commodity, a point the hardware lottery post makes in full. Data is where the craft is. And because the craft is hidden, the public conversation about it is dominated by two panics that are both, on inspection, told wrong.

---

## What survives the pipeline

Start with the shape of the work. Raw web text is not a corpus, it is a landfill, and turning one into the other is a pipeline of destruction. Extraction pulls text out of markup. Language identification sorts it. Quality filtering, a mix of cheap heuristics and learned classifiers, throws away the machine generated spam, the keyword salad, the pages that are technically text and contain no information. Then deduplication. Then filtering for toxicity and private data. Then decontamination, the removal of anything that overlaps the evaluation sets you plan to grade yourself on.

The striking fact is how little survives. Only a small fraction of raw crawled text makes it into a serious pretraining set, and the interactive data component for this post lets you watch that fraction collapse stage by stage. The instinct that more data is always better is exactly backwards at the frontier. The scarce input is not quantity, it is quantity that survives a ruthless filter, and building the filter is the job.


<iframe class="pf-frame" src="/pretraining/02-data-pipeline.html" title="Interactive figure. The data pipeline and the mixture" loading="lazy" style="width:100%; height:900px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/02-data-pipeline.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## Deduplication is not housekeeping, it is capability

Of all the stages, deduplication is the one people underrate most, so it is worth making concrete. Exact duplicates are trivial to remove, you hash each document and drop collisions. The hard and important case is the near duplicate. The same article reworded. A page that appears ten thousand times with only its header and footer changed. These do not just waste compute. They teach the model to memorize the repeated spans instead of generalizing, and removing them has been shown to improve models measurably.

The workhorse for finding them at web scale is MinHash with locality sensitive hashing, and the idea is elegant. MinHash estimates the true overlap between two documents to within about five hundredths using signatures a tiny fraction of the size of the documents, which is what lets it scale to trillions of tokens. Then the locality sensitive hashing flags the reworded copy and the boilerplate padded copy as near duplicates, at a true similarity of 0.70 and 0.81, while leaving genuinely unrelated documents untouched. That is a deduplicator working. Collapse everything it flags to a single copy and you have spent a little compute to buy back a lot of model quality. Dedup is not tidying. It is one of the highest leverage interventions in the whole pipeline.

---

## The tokenizer taxes every token for the life of the model

Before text becomes training signal it becomes tokens, and the tokenizer is a decision made once that levies a tax forever. The relevant quantity is fertility, how many tokens it takes to encode a given piece of text. High fertility means a fixed context window holds less real content, training costs more per unit of information, and inference costs more per request. And a tokenizer trained mostly on English learns merges that compress English well and everything else badly.

The interactive figure below trains a byte level tokenizer on English and then measures fertility across scripts. English, the training language, is the baseline. Source code costs about 1.4 times as many tokens, because identifiers and punctuation and indentation fragment into small pieces. Russian costs about 3.6 times. Chinese costs about 5.4 times, because each character is several bytes and almost none of the English merges apply, so the tokenizer falls back toward raw bytes. Sit with that. A speaker of the last language pays several times the cost, several times the latency, and several times the context pressure to say the same thing, purely because of a vocabulary decision made on someone else's corpus. Tokenizer design looks like a technical footnote. It is quietly an act of policy, and it connects straight back to the bandwidth story of the hardware post, because more tokens per request means more bytes to move for every user on the wrong side of the tokenizer.


<iframe class="pf-frame" src="/pretraining/10-tokenizer-fertility.html" title="Interactive figure. Tokenizer fertility" loading="lazy" style="width:100%; height:680px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/10-tokenizer-fertility.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## The mixture is where taste lives

Once the data is clean and tokenized, the last lever is the mixture. What fraction is web, code, math, books, multilingual text. This is the least published and most consequential single set of numbers in a lab, and the visible trend is unmistakable. The share of code and math is rising even in models meant for general use, because reasoning appears to transfer. Training on code seems to make a model better at things that are not code, and the draggable mixture panel in the figure above sketches that tradeoff, where lifting code and math visibly pulls up reasoning at some cost to other axes.

There is also timing. The highest quality data is increasingly saved for an annealing phase at the end of training, upweighted as the learning rate decays, so the model finishes on the cleanest signal. The boundary between this and what people now call mid training is deliberately blurry, which is a theme the final post in this series takes up.

---

## Panic one, the data wall, is overstated

Now the two panics. The first is that we are running out of data, the fossil fuel thesis from the hub. The web is finite, the argument goes, so scaling is about to hit a wall.

The counterevidence is strong and specific. Repeating data works far better than the panic assumes. The work on data constrained scaling by Muennighoff and colleagues found that training for up to roughly four epochs on repeated data is nearly as good as training on the same volume of fresh tokens. Four epochs is enormous headroom against a supply people describe as nearly exhausted. And that is before the modalities we have barely started on. The text internet is finite. Video and audio are not, and they carry more structure about the physical world than text ever will. The binding constraint was never the raw token count. It is the compute to process the tokens and the judgment to filter them, which is the same conclusion the whole series keeps reaching from different directions.

---

## Panic two, model collapse, is misread

The second panic is model collapse, the fear that training on AI generated data degrades models recursively into mush. The Nature paper by Shumailov and colleagues that anchors this fear is real, and its mechanism is real. But read what it actually studies, which is naive recursive self training, a model eating its own unfiltered output generation after generation with no quality control. That is not what any competent lab does with synthetic data.

What they do is nearly the opposite. They use a stronger model to generate data and then filter and verify it aggressively, keeping only what passes. Distillation from a better teacher, curated and checked, is not poison. It has become one of the most important ingredients in modern frontier recipes, and it is a large part of why the data wall is not the emergency it is sold as, because you can manufacture high quality tokens rather than only mining them. The difference between collapse and improvement is entirely in the filter. Collapse is what happens when you skip the craft. The craft is the whole point.

---

## The dirty secret under the benchmarks

One more thing belongs in an honest account. A meaningful slice of what gets reported as capability is memorization leaking through imperfect decontamination. If a benchmark or something close to it sits in the training data, the model can score well by recall rather than by ability, and separating the two is genuinely hard at web scale. This is why serious labs treat contamination as a first class engineering problem, and why you should quietly discount any leaderboard number that was not earned on a freshly minted, held out evaluation. It is also another reason the recipe stays secret. Admitting exactly what is in the data is admitting exactly what the numbers do and do not mean.

---

## Why this is the whole game

Put the pieces together. The architecture is shared, the hardware is bought from the same few suppliers, and the scaling laws are public. The one input that is private, defensible, and decisive is the data, and every part of handling it, the filtering, the dedup, the tokenizer, the mixture, the synthesis, the decontamination, is craft that compounds and does not leak. This is why catching up to a frontier model on architecture is a weekend and catching up on data pipeline is the actual war, a claim the final post develops in full.

The reframe to carry forward is simple. Stop thinking of the model as the product and the data as the raw material. At the frontier it is closer to the reverse. The data pipeline is the product, refined over years and hidden on purpose, and the weights are just the most recent thing it happened to print.

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
