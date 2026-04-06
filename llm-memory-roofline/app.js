(function () {
  var root = document.getElementById("llm-memory-roofline-app");
  if (!root) return;

  var MODELS = {
    llama31_8b: { name: "Llama 3.1 8B", totalParamsB: 8.0, activeParamsB: 8.0, layers: 32, kvHeads: 8, kvHeadDim: 128, kvMode: "standard", notes: "Dense baseline. Small enough that tier placement is often driven by concurrency rather than raw model size." },
    mistral_small_24b: { name: "Mistral Small 3.1 24B", totalParamsB: 24.0, activeParamsB: 24.0, layers: 40, kvHeads: 8, kvHeadDim: 128, kvMode: "standard", notes: "Dense mid-size model. A good point for testing the transition from single-GPU fit to scale-up sharding." },
    llama31_70b: { name: "Llama 3.1 70B", totalParamsB: 70.0, activeParamsB: 70.0, layers: 80, kvHeads: 8, kvHeadDim: 128, kvMode: "standard", notes: "Representative large dense model. Decode is usually dominated by weight streaming pressure." },
    qwen25_72b: { name: "Qwen2.5 72B", totalParamsB: 72.7, activeParamsB: 72.7, layers: 80, kvHeads: 8, kvHeadDim: 128, kvMode: "standard", notes: "Large dense model with similar cache growth to Llama 70B class deployments." },
    mixtral_8x7b: { name: "Mixtral 8x7B", totalParamsB: 46.7, activeParamsB: 12.9, layers: 32, kvHeads: 8, kvHeadDim: 128, kvMode: "standard", notes: "Standard MoE example. Capacity follows total parameters. Decode bandwidth follows active parameters." },
    deepseek_v3: { name: "DeepSeek-V3", totalParamsB: 671, activeParamsB: 37, layers: 61, kvMode: "mla", kvLoraRank: 512, qkRopeHeadDim: 64, notes: "MLA example. Extreme weight residency, but much slower KV growth than conventional attention." }
  };

  var ACCELERATORS = {
    h100: { name: "NVIDIA H100 SXM", hbmGB: 80, hbmBandwidthGiBs: 3120, bf16TFLOPs: 989.5, peerName: "NVLink", peerBandwidthGiBs: 838 },
    h200: { name: "NVIDIA H200 SXM", hbmGB: 141, hbmBandwidthGiBs: 4470, bf16TFLOPs: 989.5, peerName: "NVLink", peerBandwidthGiBs: 838 },
    blackwell: { name: "NVIDIA Blackwell-Class GPU", hbmGB: 180, hbmBandwidthGiBs: 7450, bf16TFLOPs: 2500, peerName: "NVLink", peerBandwidthGiBs: 1675 },
    mi300x: { name: "AMD MI300X", hbmGB: 192, hbmBandwidthGiBs: 4937, bf16TFLOPs: 1300, peerName: "Infinity Fabric", peerBandwidthGiBs: 896 },
    tpu_v6e: { name: "Google TPU v6e", hbmGB: 32, hbmBandwidthGiBs: 1490, bf16TFLOPs: 918, peerName: "ICI", peerBandwidthGiBs: 745 },
    trainium2: { name: "AWS Trainium2", hbmGB: 96, hbmBandwidthGiBs: 2700, bf16TFLOPs: 667, peerName: "NeuronLink", peerBandwidthGiBs: 1190 }
  };

  var WORKLOADS = {
    chat: { label: "Chat", addedTokens: 2500, minBranches: 1, baseScratchGiB: 2 },
    rag: { label: "RAG", addedTokens: 9000, minBranches: 1, baseScratchGiB: 4 },
    agent: { label: "Agent", addedTokens: 18000, minBranches: 3, baseScratchGiB: 8 },
    planner_workers: { label: "Planner + Workers", addedTokens: 24000, minBranches: 5, baseScratchGiB: 12 }
  };

  var RULE_SHIFTS = [
    { title: "Old rule: if the model fits on one device, the memory story is finished", body: "Now false. Scale-up with peer HBM can preserve fit, but the interconnect becomes part of the memory hierarchy and changes the effective decode roof." },
    { title: "Old rule: offloading is only a capacity patch", body: "Now false. Once CXL.mem, CPU memory, or SSD enters the hot path, the system is no longer riding the HBM roof. The memory roof itself changes." },
    { title: "Old rule: weight compression is the main lever", body: "Increasingly incomplete. In multi-session or agent workloads, KV growth and branch-induced state duplication can outrun the saved weight bytes." },
    { title: "Old rule: more GPUs simply add more capacity", body: "Only when the model and serving stack can exploit peer memory and tolerate the interconnect tax. Capacity and locality are now separate design variables." },
    { title: "Old rule: tokens per second is enough", body: "Not for agent systems. Useful comparisons increasingly require state-aware measures such as bytes per useful step or tokens per second per resident GiB." }
  ];

  var state = {
    modelKey: "llama31_70b",
    acceleratorKey: "h200",
    weightBits: "16",
    kvBits: "16",
    basePrompt: 24000,
    sessions: 3,
    gpuCount: 4,
    workloadKey: "agent",
    extraScratchGiB: "8",
    customActive: false,
    activeParamsText: "37",
    poolPeerHbm: true,
    enableCpuTier: true,
    cpuCapacity: "512",
    cpuBandwidth: "200",
    enableCxlTier: false,
    cxlCapacity: "1024",
    cxlBandwidth: "80",
    enableSsdTier: false,
    ssdCapacity: "8192",
    ssdBandwidth: "14",
    placementPolicy: "weights_first",
    activeTab: "placement"
  };

  function bytesToGiB(bytes) { return bytes / Math.pow(2, 30); }
  function formatGiB(v) { return v.toFixed(2) + " GiB"; }
  function formatKiB(v) { return v.toFixed(2) + " KiB"; }
  function formatNum(v) { if (v >= 100) return v.toFixed(0); if (v >= 10) return v.toFixed(1); return v.toFixed(2); }
  function weightGiB(paramsB, bytesPerParam) { return bytesToGiB(paramsB * 1e9 * bytesPerParam); }
  function kvPerTokenBytes(model, kvBytes) { return model.kvMode === "mla" ? model.layers * (model.kvLoraRank + model.qkRopeHeadDim) * kvBytes : 2 * model.layers * model.kvHeads * model.kvHeadDim * kvBytes; }
  function numberOr(value, fallback) { var p = parseFloat(value); return Number.isFinite(p) ? p : fallback; }
  function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

  function allocateSequential(parts, tiers) {
    var remaining = tiers.map(function (tier) { return { key: tier.key, remaining: tier.capacityGiB }; });
    var allocation = {};
    var tierUsage = {};
    parts.forEach(function (part) {
      allocation[part.key] = {};
      var need = part.sizeGiB;
      remaining.forEach(function (tier) {
        if (need <= 0) return;
        var placed = Math.max(0, Math.min(need, tier.remaining));
        allocation[part.key][tier.key] = placed;
        tier.remaining -= placed;
        need -= placed;
      });
      allocation[part.key].unplaced = Math.max(0, need);
    });
    tiers.forEach(function (tier) {
      var r = remaining.find(function (item) { return item.key === tier.key; });
      tierUsage[tier.key] = tier.capacityGiB - (r ? r.remaining : 0);
    });
    return { allocation: allocation, tierUsage: tierUsage };
  }

  function weightedBandwidthForPart(partAllocation, tierMap) {
    var entries = Object.keys(partAllocation).filter(function (key) { return key !== "unplaced" && partAllocation[key] > 0; });
    var total = entries.reduce(function (sum, key) { return sum + partAllocation[key]; }, 0);
    if (total <= 0) return 0;
    var time = entries.reduce(function (sum, key) { return sum + partAllocation[key] / tierMap[key].bandwidthGiBs; }, 0);
    return total / time;
  }

  function perTokenTrafficFromAllocation(partAllocation, partTrafficGiB, totalPartGiB) {
    var out = {};
    if (totalPartGiB <= 0) return out;
    Object.keys(partAllocation).forEach(function (tier) {
      if (tier === "unplaced") return;
      var placed = partAllocation[tier];
      if (placed <= 0) return;
      out[tier] = partTrafficGiB * (placed / totalPartGiB);
    });
    return out;
  }

  function computeDerived() {
    var model = MODELS[state.modelKey];
    var accelerator = ACCELERATORS[state.acceleratorKey];
    var workload = WORKLOADS[state.workloadKey];
    var weightBytes = Number(state.weightBits) / 8;
    var kvBytes = Number(state.kvBits) / 8;
    var totalParamsB = model.totalParamsB;
    var activeParamsB = state.customActive ? Math.max(0, numberOr(state.activeParamsText, model.activeParamsB)) : model.activeParamsB;
    var liveTokens = state.basePrompt + workload.addedTokens;
    var effectiveSessions = Math.max(state.sessions, workload.minBranches);
    var scratchGiB = Math.max(0, numberOr(state.extraScratchGiB, 0)) + workload.baseScratchGiB;
    var weightsGiB = weightGiB(totalParamsB, weightBytes);
    var activeWeightTrafficGiB = weightGiB(activeParamsB, weightBytes);
    var kvTokenBytesValue = kvPerTokenBytes(model, kvBytes);
    var kvTokenGiB = bytesToGiB(kvTokenBytesValue);
    var kvPerSessionGiB = kvTokenGiB * liveTokens;
    var kvTotalGiB = kvPerSessionGiB * effectiveSessions;
    var localHbmCapacityGiB = accelerator.hbmGB;
    var peerHbmCapacityGiB = state.poolPeerHbm ? Math.max(0, (state.gpuCount - 1) * accelerator.hbmGB) : 0;
    var tiers = [{ key: "local_hbm", label: "Local HBM", capacityGiB: localHbmCapacityGiB, bandwidthGiBs: accelerator.hbmBandwidthGiBs }];
    if (peerHbmCapacityGiB > 0) tiers.push({ key: "peer_hbm", label: accelerator.peerName + " Peer HBM", capacityGiB: peerHbmCapacityGiB, bandwidthGiBs: Math.min(accelerator.hbmBandwidthGiBs, accelerator.peerBandwidthGiBs) });
    if (state.enableCxlTier) tiers.push({ key: "cxl", label: "CXL.mem", capacityGiB: Math.max(0, numberOr(state.cxlCapacity, 0)), bandwidthGiBs: Math.max(1, numberOr(state.cxlBandwidth, 1)) });
    if (state.enableCpuTier) tiers.push({ key: "cpu", label: "CPU Memory", capacityGiB: Math.max(0, numberOr(state.cpuCapacity, 0)), bandwidthGiBs: Math.max(1, numberOr(state.cpuBandwidth, 1)) });
    if (state.enableSsdTier) tiers.push({ key: "ssd", label: "SSD Backup", capacityGiB: Math.max(0, numberOr(state.ssdCapacity, 0)), bandwidthGiBs: Math.max(1, numberOr(state.ssdBandwidth, 1)) });
    var parts = state.placementPolicy === "kv_first"
      ? [{ key: "kv", sizeGiB: kvTotalGiB }, { key: "weights", sizeGiB: weightsGiB }, { key: "scratch", sizeGiB: scratchGiB }]
      : [{ key: "weights", sizeGiB: weightsGiB }, { key: "kv", sizeGiB: kvTotalGiB }, { key: "scratch", sizeGiB: scratchGiB }];
    var placement = allocateSequential(parts, tiers);
    var allocation = placement.allocation;
    var tierUsage = placement.tierUsage;
    var tierMap = {};
    tiers.forEach(function (tier) { tierMap[tier.key] = tier; });
    var weightTrafficByTier = perTokenTrafficFromAllocation(allocation.weights || {}, activeWeightTrafficGiB, weightsGiB);
    var kvTrafficByTier = perTokenTrafficFromAllocation(allocation.kv || {}, kvPerSessionGiB, kvTotalGiB);
    var trafficByTier = {};
    Object.keys(weightTrafficByTier).forEach(function (tier) { trafficByTier[tier] = (trafficByTier[tier] || 0) + weightTrafficByTier[tier]; });
    Object.keys(kvTrafficByTier).forEach(function (tier) { trafficByTier[tier] = (trafficByTier[tier] || 0) + kvTrafficByTier[tier]; });
    var effectiveDecodeSeconds = Object.keys(trafficByTier).reduce(function (sum, tier) { return sum + trafficByTier[tier] / tierMap[tier].bandwidthGiBs; }, 0);
    var effectiveTokPerSec = effectiveDecodeSeconds > 0 ? 1 / effectiveDecodeSeconds : 0;
    var ridge = accelerator.bf16TFLOPs / (accelerator.hbmBandwidthGiBs / 1000);
    var decodeIntensity = 2 / weightBytes;
    var totalPlacedGiB = Object.keys(tierUsage).reduce(function (sum, key) { return sum + tierUsage[key]; }, 0);
    var totalDemandGiB = weightsGiB + kvTotalGiB + scratchGiB;
    var unplacedGiB = Math.max(0, totalDemandGiB - totalPlacedGiB);
    var fitClass = "local";
    if (unplacedGiB > 0) fitClass = "overflow";
    else if (Object.keys(trafficByTier).some(function (key) { return key === "cxl" || key === "cpu" || key === "ssd"; })) fitClass = "spill";
    else if (Object.keys(trafficByTier).indexOf("peer_hbm") !== -1) fitClass = "scaleup";
    return {
      model: model,
      accelerator: accelerator,
      liveTokens: liveTokens,
      effectiveSessions: effectiveSessions,
      weightsGiB: weightsGiB,
      kvTokenBytes: kvTokenBytesValue,
      kvTotalGiB: kvTotalGiB,
      tiers: tiers,
      allocation: allocation,
      tierUsage: tierUsage,
      trafficByTier: trafficByTier,
      effectiveTokPerSec: effectiveTokPerSec,
      ridge: ridge,
      decodeIntensity: decodeIntensity,
      totalDemandGiB: totalDemandGiB,
      unplacedGiB: unplacedGiB,
      fitClass: fitClass,
      weightWeightedBw: weightedBandwidthForPart(allocation.weights || {}, tierMap),
      kvWeightedBw: weightedBandwidthForPart(allocation.kv || {}, tierMap),
      localHbmCapacityGiB: localHbmCapacityGiB,
      peerHbmCapacityGiB: peerHbmCapacityGiB
    };
  }

  function optionList(items, selectedKey, labelKey) {
    return Object.keys(items).map(function (key) {
      return '<option value="' + key + '"' + (key === selectedKey ? " selected" : "") + ">" + escapeHtml(items[key][labelKey]) + "</option>";
    }).join("");
  }

  function scalarOptionList(values, selectedValue, labels) {
    return values.map(function (value) {
      return '<option value="' + value + '"' + (String(value) === String(selectedValue) ? " selected" : "") + ">" + escapeHtml(labels[value] || value) + "</option>";
    }).join("");
  }

  function capacityChartHtml(derived) {
    return derived.tiers.map(function (tier) {
      var used = derived.tierUsage[tier.key] || 0;
      var percent = tier.capacityGiB > 0 ? Math.min(100, (used / tier.capacityGiB) * 100) : 0;
      return '<div class="lmr-bar-row"><div class="lmr-bar-head"><span>' + escapeHtml(tier.label) + '</span><span>' + formatGiB(used) + ' / ' + formatGiB(tier.capacityGiB) + '</span></div><div class="lmr-bar-track"><div class="lmr-bar-fill"></div><div class="lmr-bar-overlay" style="width:' + percent.toFixed(2) + '%"></div></div></div>';
    }).join("");
  }

  function trafficChartHtml(derived) {
    var trafficEntries = derived.tiers.map(function (tier) { return { label: tier.label, traffic: derived.trafficByTier[tier.key] || 0 }; }).filter(function (item) { return item.traffic > 0; });
    if (!trafficEntries.length) return '<p class="lmr-note">No hot per-token traffic is assigned to slower tiers in this configuration.</p>';
    var maxTraffic = trafficEntries.reduce(function (max, item) { return Math.max(max, item.traffic); }, 0);
    return trafficEntries.map(function (item) {
      var percent = maxTraffic > 0 ? (item.traffic / maxTraffic) * 100 : 0;
      return '<div class="lmr-bar-row"><div class="lmr-bar-head"><span>' + escapeHtml(item.label) + '</span><span>' + item.traffic.toFixed(2) + ' GiB/token</span></div><div class="lmr-bar-track"><div class="lmr-bar-overlay traffic" style="width:' + percent.toFixed(2) + '%"></div></div></div>';
    }).join("");
  }

  function placementHtml(derived) {
    var rows = [{ name: "Weights", alloc: derived.allocation.weights || {} }, { name: "KV Cache", alloc: derived.allocation.kv || {} }, { name: "Scratch", alloc: derived.allocation.scratch || {} }];
    return rows.map(function (row) {
      var tiles = derived.tiers.map(function (tier) {
        return '<div class="lmr-part-tile"><div class="lmr-mini-label">' + escapeHtml(tier.label) + '</div><div class="lmr-tier-value">' + formatGiB(row.alloc[tier.key] || 0) + "</div></div>";
      }).join("");
      if ((row.alloc.unplaced || 0) > 0) tiles += '<div class="lmr-part-tile unplaced"><div class="lmr-mini-label">Unplaced</div><div class="lmr-tier-value">' + formatGiB(row.alloc.unplaced || 0) + "</div></div>";
      return '<div class="lmr-part-card"><h3>' + escapeHtml(row.name) + '</h3><div class="lmr-part-grid">' + tiles + "</div></div>";
    }).join("") + '<div class="lmr-callout">This simulator uses a simple sequential placement model. Its purpose is not to mimic one runtime exactly. Its purpose is to show how the active memory roof changes once weights or KV stop being local to one HBM domain.</div>';
  }

  function rooflineHtml(derived) {
    var decodeText = derived.decodeIntensity < derived.ridge
      ? "Decode remains memory-bound. The key question is no longer only whether state fits, but whether the hot fraction of that state stays on local HBM or moves onto a slower tier."
      : "This configuration is entering a more compute-efficient region, which is unusual for single-token decode and typically requires very aggressive batching or unusual placement assumptions.";
    return '<div class="lmr-grid-4"><div class="lmr-mini-card"><div class="lmr-mini-label">Ridge Point</div><div class="lmr-tier-value">' + formatNum(derived.ridge) + ' FLOP/byte</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">Decode Intensity</div><div class="lmr-tier-value">' + formatNum(derived.decodeIntensity) + ' FLOP/byte</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">Weight Weighted Bandwidth</div><div class="lmr-tier-value">' + formatNum(derived.weightWeightedBw) + ' GiB/s</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">KV Weighted Bandwidth</div><div class="lmr-tier-value">' + formatNum(derived.kvWeightedBw) + ' GiB/s</div></div></div><div class="lmr-callout">' + escapeHtml(decodeText) + '</div><div class="lmr-callout">Multi-GPU scale-up changes the roofline in two ways. It adds capacity through peer HBM, and it inserts an interconnect ceiling between local and remote state. CXL.mem, CPU memory, and SSD extend capacity further, but they also create successively lower effective memory roofs if hot state spills into them.</div>';
  }

  function rulesHtml() {
    return '<div class="lmr-rule-stack">' + RULE_SHIFTS.map(function (item) {
      return '<div class="lmr-rule-card"><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.body) + "</p></div>";
    }).join("") + "</div>";
  }

  function fitLabel(fitClass) {
    if (fitClass === "overflow") return "Unplaced Spill";
    if (fitClass === "spill") return "Slow-Tier Spill";
    if (fitClass === "scaleup") return "Scale-Up Fit";
    return "Local Fit";
  }

  function render() {
    var derived = computeDerived();
    var model = MODELS[state.modelKey];
    var accelerator = ACCELERATORS[state.acceleratorKey];
    var activeTabContent = state.activeTab === "placement" ? placementHtml(derived) : state.activeTab === "roofline" ? rooflineHtml(derived) : rulesHtml();
    root.innerHTML = '<section class="lmr-shell"><div class="lmr-topbar"><a class="lmr-home-link" href="../">Back to Homepage</a></div><div class="lmr-intro"><h1>LLM Memory Hierarchy and Roofline Explorer</h1><p>This page is fully standalone. It does not use the site template layout, navigation, sidebar, or footer. All sliders, toggles, and calculations run directly in the browser.</p></div><div class="lmr-layout"><aside class="lmr-panel"><h2>Controls</h2><div class="lmr-control-group"><label for="modelKey">Model</label><select class="lmr-select" id="modelKey">' + optionList(MODELS, state.modelKey, "name") + '</select><p>' + escapeHtml(model.notes) + '</p></div><div class="lmr-control-group"><label for="acceleratorKey">Accelerator</label><select class="lmr-select" id="acceleratorKey">' + optionList(ACCELERATORS, state.acceleratorKey, "name") + '</select></div><div class="lmr-control-group"><div class="lmr-range-row"><span>Accelerator Count</span><strong>' + state.gpuCount + '</strong></div><input class="lmr-range" id="gpuCount" type="range" min="1" max="16" step="1" value="' + state.gpuCount + '"></div><div class="lmr-control-group lmr-box"><div class="lmr-toggle"><span class="lmr-label">Pool Peer HBM Over ' + escapeHtml(accelerator.peerName) + '</span><input id="poolPeerHbm" type="checkbox"' + (state.poolPeerHbm ? " checked" : "") + (state.gpuCount === 1 ? " disabled" : "") + '></div><p>When enabled, the model may shard across multiple accelerators. Peer memory increases capacity, but remote accesses are limited by the interconnect, not by local HBM bandwidth.</p></div><div class="lmr-grid-2"><div class="lmr-control-group"><label for="weightBits">Weight Precision</label><select class="lmr-select" id="weightBits">' + scalarOptionList(["16", "8", "4"], state.weightBits, { "16": "bf16 / fp16", "8": "fp8 / int8", "4": "int4" }) + '</select></div><div class="lmr-control-group"><label for="kvBits">KV Precision</label><select class="lmr-select" id="kvBits">' + scalarOptionList(["16", "8"], state.kvBits, { "16": "bf16 / fp16", "8": "fp8 / int8" }) + '</select></div></div><div class="lmr-control-group"><label for="workloadKey">Workload Preset</label><select class="lmr-select" id="workloadKey">' + optionList(WORKLOADS, state.workloadKey, "label") + '</select></div><div class="lmr-control-group"><div class="lmr-range-row"><span>Base Prompt Tokens</span><strong>' + state.basePrompt.toLocaleString() + '</strong></div><input class="lmr-range" id="basePrompt" type="range" min="1000" max="128000" step="1000" value="' + state.basePrompt + '"><p>Effective live tokens = base prompt + workload overhead = ' + derived.liveTokens.toLocaleString() + ' tokens</p></div><div class="lmr-control-group"><div class="lmr-range-row"><span>Concurrent Sessions</span><strong>' + state.sessions + '</strong></div><input class="lmr-range" id="sessions" type="range" min="1" max="16" step="1" value="' + state.sessions + '"><p>Effective session count respects minimum workload branch count = ' + derived.effectiveSessions + '</p></div><div class="lmr-control-group"><label for="placementPolicy">Placement Policy</label><select class="lmr-select" id="placementPolicy">' + scalarOptionList(["weights_first", "kv_first"], state.placementPolicy, { weights_first: "Place Weights First", kv_first: "Place KV First" }) + '</select></div><div class="lmr-control-group lmr-box"><div class="lmr-toggle"><span class="lmr-label">Override Active Params</span><input id="customActive" type="checkbox"' + (state.customActive ? " checked" : "") + '></div><input class="lmr-input" id="activeParamsText" type="text" value="' + escapeHtml(state.activeParamsText) + '"' + (state.customActive ? "" : " disabled") + '><p>Use this to test routing sparsity, speculative decode, or partial-activation experiments.</p></div><div class="lmr-control-group"><label for="extraScratchGiB">Extra Scratch / Runtime Overhead (GiB)</label><input class="lmr-input" id="extraScratchGiB" type="text" value="' + escapeHtml(state.extraScratchGiB) + '"></div></aside><section class="lmr-main"><div class="lmr-grid-4"><div class="lmr-card lmr-stat-card"><div class="lmr-stat-label">Weights</div><div class="lmr-stat-value">' + formatGiB(derived.weightsGiB) + '</div></div><div class="lmr-card lmr-stat-card"><div class="lmr-stat-label">KV Per Token</div><div class="lmr-stat-value">' + formatKiB(derived.kvTokenBytes / 1024) + '</div></div><div class="lmr-card lmr-stat-card"><div class="lmr-stat-label">Total KV Across Sessions</div><div class="lmr-stat-value">' + formatGiB(derived.kvTotalGiB) + '</div></div><div class="lmr-card lmr-stat-card"><div class="lmr-stat-label">Effective Decode Ceiling</div><div class="lmr-stat-value">' + formatNum(derived.effectiveTokPerSec) + ' tok/s</div></div></div><div class="lmr-card"><h2>Tiered Memory System</h2><div class="lmr-mini-grid"><div class="lmr-mini-card"><div class="lmr-mini-label">Local HBM</div><div class="lmr-tier-value">' + formatNum(derived.localHbmCapacityGiB) + ' GiB</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">Peer HBM Pool</div><div class="lmr-tier-value">' + formatNum(derived.peerHbmCapacityGiB) + ' GiB</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">Total Demand</div><div class="lmr-tier-value">' + formatGiB(derived.totalDemandGiB) + '</div></div><div class="lmr-result-card ' + derived.fitClass + '"><div class="lmr-mini-label">Placement Result</div><div class="lmr-result-value">' + fitLabel(derived.fitClass) + '</div></div><div class="lmr-mini-card"><div class="lmr-mini-label">Unplaced</div><div class="lmr-tier-value">' + formatGiB(derived.unplacedGiB) + '</div></div></div><div class="lmr-chart-grid"><div class="lmr-chart-card"><h3>Capacity by Tier</h3><div class="lmr-bar-list">' + capacityChartHtml(derived) + '</div></div><div class="lmr-chart-card"><h3>Per-Token Traffic by Tier</h3><div class="lmr-bar-list">' + trafficChartHtml(derived) + '</div></div></div></div><div class="lmr-tier-section"><div class="lmr-tier-card"><h2>CXL.mem</h2><div class="lmr-control-group"><div class="lmr-toggle"><span class="lmr-label">Enable</span><input id="enableCxlTier" type="checkbox"' + (state.enableCxlTier ? " checked" : "") + '></div></div><div class="lmr-control-group"><label for="cxlCapacity">Capacity (GiB)</label><input class="lmr-input" id="cxlCapacity" type="text" value="' + escapeHtml(state.cxlCapacity) + '"' + (state.enableCxlTier ? "" : " disabled") + '></div><div class="lmr-control-group"><label for="cxlBandwidth">Bandwidth (GiB/s)</label><input class="lmr-input" id="cxlBandwidth" type="text" value="' + escapeHtml(state.cxlBandwidth) + '"' + (state.enableCxlTier ? "" : " disabled") + '></div></div><div class="lmr-tier-card"><h2>CPU Memory</h2><div class="lmr-control-group"><div class="lmr-toggle"><span class="lmr-label">Enable</span><input id="enableCpuTier" type="checkbox"' + (state.enableCpuTier ? " checked" : "") + '></div></div><div class="lmr-control-group"><label for="cpuCapacity">Capacity (GiB)</label><input class="lmr-input" id="cpuCapacity" type="text" value="' + escapeHtml(state.cpuCapacity) + '"' + (state.enableCpuTier ? "" : " disabled") + '></div><div class="lmr-control-group"><label for="cpuBandwidth">Bandwidth (GiB/s)</label><input class="lmr-input" id="cpuBandwidth" type="text" value="' + escapeHtml(state.cpuBandwidth) + '"' + (state.enableCpuTier ? "" : " disabled") + '></div></div><div class="lmr-tier-card"><h2>SSD Backup</h2><div class="lmr-control-group"><div class="lmr-toggle"><span class="lmr-label">Enable</span><input id="enableSsdTier" type="checkbox"' + (state.enableSsdTier ? " checked" : "") + '></div></div><div class="lmr-control-group"><label for="ssdCapacity">Capacity (GiB)</label><input class="lmr-input" id="ssdCapacity" type="text" value="' + escapeHtml(state.ssdCapacity) + '"' + (state.enableSsdTier ? "" : " disabled") + '></div><div class="lmr-control-group"><label for="ssdBandwidth">Bandwidth (GiB/s)</label><input class="lmr-input" id="ssdBandwidth" type="text" value="' + escapeHtml(state.ssdBandwidth) + '"' + (state.enableSsdTier ? "" : " disabled") + '></div></div></div><div class="lmr-tabs"><button class="lmr-tab' + (state.activeTab === "placement" ? " active" : "") + '" data-tab="placement" type="button">Placement</button><button class="lmr-tab' + (state.activeTab === "roofline" ? " active" : "") + '" data-tab="roofline" type="button">Roofline</button><button class="lmr-tab' + (state.activeTab === "rules" ? " active" : "") + '" data-tab="rules" type="button">Rule Shifts</button></div><div class="lmr-tab-panel">' + activeTabContent + "</div></section></div></section>";
    bindEvents();
  }

  function updateState(key, value) {
    state[key] = value;
    if (key === "gpuCount" && state.gpuCount === 1) state.poolPeerHbm = false;
    render();
  }

  function bindInput(id, key, parser) {
    var el = document.getElementById(id);
    if (!el) return;
    var listener = function (event) { updateState(key, parser ? parser(event.target.value) : event.target.value); };
    el.addEventListener("input", listener);
    el.addEventListener("change", listener);
  }

  function bindCheckbox(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", function (event) { updateState(key, !!event.target.checked); });
  }

  function bindEvents() {
    bindInput("modelKey", "modelKey");
    bindInput("acceleratorKey", "acceleratorKey");
    bindInput("weightBits", "weightBits");
    bindInput("kvBits", "kvBits");
    bindInput("workloadKey", "workloadKey");
    bindInput("placementPolicy", "placementPolicy");
    bindInput("activeParamsText", "activeParamsText");
    bindInput("extraScratchGiB", "extraScratchGiB");
    bindInput("cxlCapacity", "cxlCapacity");
    bindInput("cxlBandwidth", "cxlBandwidth");
    bindInput("cpuCapacity", "cpuCapacity");
    bindInput("cpuBandwidth", "cpuBandwidth");
    bindInput("ssdCapacity", "ssdCapacity");
    bindInput("ssdBandwidth", "ssdBandwidth");
    bindInput("gpuCount", "gpuCount", function (value) { return parseInt(value, 10) || 1; });
    bindInput("basePrompt", "basePrompt", function (value) { return parseInt(value, 10) || 1000; });
    bindInput("sessions", "sessions", function (value) { return parseInt(value, 10) || 1; });
    bindCheckbox("poolPeerHbm", "poolPeerHbm");
    bindCheckbox("customActive", "customActive");
    bindCheckbox("enableCpuTier", "enableCpuTier");
    bindCheckbox("enableCxlTier", "enableCxlTier");
    bindCheckbox("enableSsdTier", "enableSsdTier");
    Array.prototype.slice.call(root.querySelectorAll("[data-tab]")).forEach(function (button) {
      button.addEventListener("click", function () { updateState("activeTab", button.getAttribute("data-tab")); });
    });
  }

  render();
})();
