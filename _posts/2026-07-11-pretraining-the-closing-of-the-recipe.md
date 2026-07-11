---
layout: post
title: "The Closing of the Recipe"
excerpt: "Part 5. When every model shares one skeleton, the moat becomes the thing nobody publishes."
modified: 2026-07-11
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 5 of a six part series. It begins with [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/).*

---

Every frontier model has converged on the same architecture. These models are decoder only, use rotary embeddings, share the same normalization and activation, use grouped or latent attention, and rely on a mixture of experts. Given that convergence, a question follows. When the underlying designs are identical, where does the competition live? It cannot live in the architecture, because there is nothing left to differentiate there, so it has moved elsewhere. Where it moved says a great deal about the current structure of the industry, and about a slow conflict that will shape the next twenty years.


<iframe class="pf-frame" src="/pretraining/06-industry-convergence.html" title="Interactive figure. The converging frontier" loading="lazy" style="width:100%; height:900px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/06-industry-convergence.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## Where the competition moved

The competition moved to two things. The first is data, which is the real moat. The second is post training, the reinforcement learning and reasoning layers stacked on top of the base model. Both share a property that architecture does not. They are craft, accumulated over years, and they do not leak when the product ships.

This explains why the phrase open source means something particular and limited in this field. A lab can release the weights of a model, hundreds of billions of numbers, and reveal almost nothing about how it was made. The mixture of data, the filtering thresholds, the synthetic data pipeline, the exact post training procedure, and the thousand small decisions that separate a good model from a frontier one are not present in the weights in any legible form. Open weights give the destination while withholding the map, and the map is where the moat sits.

---

## Why labs release open weights

When a large company releases open weight models, the move is strategic. Releasing capable weights commoditizes the layer competitors are trying to sell, builds an ecosystem and a hiring funnel around the company's stack, and costs little of its real advantage, because that advantage was never the weights. It was the recipe, the pipeline, and the post training, all of which stayed private. A lab can give away the destination because it is confident nobody can reconstruct the map from it. Open weights are a defensible kind of generosity, one that gives away the thing that is no longer the source of the lead.

This changes the open versus closed debate. The meaningful axis is open recipe versus closed recipe, and on that axis almost everyone is closed, including most of the labs celebrated as open. What is being hoarded shifted from the artifact to the process, and much writing has not noticed the shift and still argues about the artifact.

---

## The blurring line between pretraining and post training

A second structural change makes the recipe even harder to see from outside. There used to be a clean story. Pretraining built the base model, then a separate post training phase aligned it. That clean line is gone. In its place is a continuum, and the middle of it has acquired a name, mid training, the long context extension and high quality data annealing and capability shaping that happens between the two classical phases.

This blurring is more than terminology. It means the recipe is now distributed across a pipeline with no clean seams, which makes it both more powerful and more opaque. There is no single phase to point to where capability appeared, because it accumulates across a continuous process that each lab tunes in its own private way, with soft boundaries between phases. An outside observer holding only the final weights sees the output of a long, secret, and seamless process and tries to infer the process behind it. That inference is hard by design.

---

## The asymmetry in catching up

Taken together, these changes produce an asymmetry that governs competition in this field. Catching up to a frontier model on architecture is fast, because the architecture is public, converged, and simple to copy. Catching up on data pipeline and post training is slow and difficult, because those are years of accumulated, hidden, non transferable craft. DeepSeek is one example, and its significance went beyond the low reported cost. The team also showed it could assemble the hidden craft well enough to reach the frontier, and then describe much of how it did so, which is the rarer act. Efficiency combined with openness about method is the combination that threatens incumbents, because it attacks the moat rather than the artifact the moat protects.

---

## The academic counterweight

A field where the industry is closing needs a counterweight, and it has one. The academy runs in the opposite direction. Its purpose is to make knowledge public and reproducible, and it has concentrated in the places where industry has the least incentive to publish.

Open models and open datasets matter beyond their capability, because they are the reproducible baselines without which there is no science. Nothing can be studied that cannot be run. Mechanistic interpretability, the investigation of what these models compute internally, is largely an open enterprise. So is much of the data science of curation, the theory of scaling, and the work on efficient training that lets a lab with a hundred chips contribute to a field increasingly built for people with a hundred thousand. Every rigorous open replication of a closed result pushes back against the enclosure of a commons.

Enclosure is the right word for the stakes. The question is whether the knowledge of how to build machine intelligence becomes public infrastructure, like the knowledge of how to build a compiler or a database, or private property held by a handful of firms. Every closed recipe fences off a piece of what could have been common knowledge. Every open dataset and honest technical report pushes the fence back. Which side wins is a question of policy as much as engineering, and it will shape the distribution of power around this technology.

---

## What pretraining has become

Several forces now shape pretraining at once. It is gated by the fab, by memory bandwidth, packaging, and depreciation. Its architecture has converged because the silicon favored that design. Its real moat is the data. Scaling, often treated as its scientific core, turns out to be governed by inference economics and by what can be measured. Its competitive structure has become a contest over the hidden recipe, fought between an industry that is closing and an academy trying to keep the door open.

A single reframe runs under all of this. Much of what people attribute to ideas about intelligence, the architecture, the scaling recipe, the capabilities, is downstream of something more predictable. That includes the physics of moving bytes, the economics of owning hardware that depreciates, the craft of curating data, and the politics of who is allowed to know how it was done. That is what pretraining is, once it left the research lab. The intelligence is real, though the forces shaping it are the forces that shape any mature industrial technology, and it is better understood when read that way.

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
