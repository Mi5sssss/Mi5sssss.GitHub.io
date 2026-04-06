import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Cpu, MemoryStick, Layers, Gauge, AlertTriangle, HardDrive, Network } from "lucide-react";

const MODELS = {
  llama31_8b: {
    name: "Llama 3.1 8B",
    totalParamsB: 8.0,
    activeParamsB: 8.0,
    layers: 32,
    kvHeads: 8,
    kvHeadDim: 128,
    kvMode: "standard",
    notes: "Dense baseline. Small enough that tier placement is often driven by concurrency rather than raw model size.",
  },
  mistral_small_24b: {
    name: "Mistral Small 3.1 24B",
    totalParamsB: 24.0,
    activeParamsB: 24.0,
    layers: 40,
    kvHeads: 8,
    kvHeadDim: 128,
    kvMode: "standard",
    notes: "Dense mid-size model. A good point for testing the transition from single-GPU fit to scale-up sharding.",
  },
  llama31_70b: {
    name: "Llama 3.1 70B",
    totalParamsB: 70.0,
    activeParamsB: 70.0,
    layers: 80,
    kvHeads: 8,
    kvHeadDim: 128,
    kvMode: "standard",
    notes: "Representative large dense model. Decode is usually dominated by weight streaming pressure.",
  },
  qwen25_72b: {
    name: "Qwen2.5 72B",
    totalParamsB: 72.7,
    activeParamsB: 72.7,
    layers: 80,
    kvHeads: 8,
    kvHeadDim: 128,
    kvMode: "standard",
    notes: "Large dense model with similar cache growth to Llama 70B class deployments.",
  },
  mixtral_8x7b: {
    name: "Mixtral 8x7B",
    totalParamsB: 46.7,
    activeParamsB: 12.9,
    layers: 32,
    kvHeads: 8,
    kvHeadDim: 128,
    kvMode: "standard",
    notes: "Standard MoE example. Capacity follows total parameters. Decode bandwidth follows active parameters.",
  },
  deepseek_v3: {
    name: "DeepSeek-V3",
    totalParamsB: 671,
    activeParamsB: 37,
    layers: 61,
    kvMode: "mla",
    kvLoraRank: 512,
    qkRopeHeadDim: 64,
    notes: "MLA example. Extreme weight residency, but much slower KV growth than conventional attention.",
  },
};

const ACCELERATORS = {
  h100: {
    name: "NVIDIA H100 SXM",
    hbmGB: 80,
    hbmBandwidthGiBs: 3120,
    bf16TFLOPs: 989.5,
    peerName: "NVLink",
    peerBandwidthGiBs: 838,
  },
  h200: {
    name: "NVIDIA H200 SXM",
    hbmGB: 141,
    hbmBandwidthGiBs: 4470,
    bf16TFLOPs: 989.5,
    peerName: "NVLink",
    peerBandwidthGiBs: 838,
  },
  blackwell: {
    name: "NVIDIA Blackwell-Class GPU",
    hbmGB: 180,
    hbmBandwidthGiBs: 7450,
    bf16TFLOPs: 2500,
    peerName: "NVLink",
    peerBandwidthGiBs: 1675,
  },
  mi300x: {
    name: "AMD MI300X",
    hbmGB: 192,
    hbmBandwidthGiBs: 4937,
    bf16TFLOPs: 1300,
    peerName: "Infinity Fabric",
    peerBandwidthGiBs: 896,
  },
  tpu_v6e: {
    name: "Google TPU v6e",
    hbmGB: 32,
    hbmBandwidthGiBs: 1490,
    bf16TFLOPs: 918,
    peerName: "ICI",
    peerBandwidthGiBs: 745,
  },
  trainium2: {
    name: "AWS Trainium2",
    hbmGB: 96,
    hbmBandwidthGiBs: 2700,
    bf16TFLOPs: 667,
    peerName: "NeuronLink",
    peerBandwidthGiBs: 1190,
  },
};

const WORKLOADS = {
  chat: { label: "Chat", addedTokens: 2500, minBranches: 1, baseScratchGiB: 2 },
  rag: { label: "RAG", addedTokens: 9000, minBranches: 1, baseScratchGiB: 4 },
  agent: { label: "Agent", addedTokens: 18000, minBranches: 3, baseScratchGiB: 8 },
  planner_workers: { label: "Planner + Workers", addedTokens: 24000, minBranches: 5, baseScratchGiB: 12 },
};

function bytesToGiB(bytes) {
  return bytes / (2 ** 30);
}

function formatGiB(v) {
  return `${v.toFixed(2)} GiB`;
}

function formatKiB(v) {
  return `${v.toFixed(2)} KiB`;
}

function formatNum(v) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function weightGiB(paramsB, bytesPerParam) {
  return bytesToGiB(paramsB * 1e9 * bytesPerParam);
}

function kvPerTokenBytes(model, kvBytes) {
  if (model.kvMode === "mla") {
    return model.layers * (model.kvLoraRank + model.qkRopeHeadDim) * kvBytes;
  }
  return 2 * model.layers * model.kvHeads * model.kvHeadDim * kvBytes;
}

function allocateSequential(parts, tiers) {
  const remaining = tiers.map((tier) => ({ ...tier, remaining: tier.capacityGiB }));
  const allocation = {};

  parts.forEach((part) => {
    allocation[part.key] = {};
    let need = part.sizeGiB;
    remaining.forEach((tier) => {
      if (need <= 0) return;
      const placed = Math.max(0, Math.min(need, tier.remaining));
      allocation[part.key][tier.key] = placed;
      tier.remaining -= placed;
      need -= placed;
    });
    allocation[part.key].unplaced = Math.max(0, need);
  });

  const tierUsage = {};
  remaining.forEach((tier) => {
    tierUsage[tier.key] = tier.capacityGiB - tier.remaining;
  });

  return { allocation, tierUsage, remaining };
}

function weightedBandwidthForPart(partAllocation, tierMap) {
  const entries = Object.entries(partAllocation).filter(([k, v]) => k !== "unplaced" && v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return 0;
  const time = entries.reduce((sum, [k, v]) => sum + v / tierMap[k].bandwidthGiBs, 0);
  return total / time;
}

function perTokenTrafficFromAllocation(partAllocation, partTrafficGiB, totalPartGiB) {
  const out = {};
  if (totalPartGiB <= 0) return out;
  Object.entries(partAllocation).forEach(([tier, placed]) => {
    if (tier === "unplaced" || placed <= 0) return;
    out[tier] = partTrafficGiB * (placed / totalPartGiB);
  });
  return out;
}

export default function LlmMemoryRooflineInteractive() {
  const [modelKey, setModelKey] = useState("llama31_70b");
  const [acceleratorKey, setAcceleratorKey] = useState("h200");
  const [weightBits, setWeightBits] = useState("16");
  const [kvBits, setKvBits] = useState("16");
  const [basePrompt, setBasePrompt] = useState([24000]);
  const [sessions, setSessions] = useState([3]);
  const [gpuCount, setGpuCount] = useState([4]);
  const [workloadKey, setWorkloadKey] = useState("agent");
  const [extraScratchGiB, setExtraScratchGiB] = useState("8");
  const [customActive, setCustomActive] = useState(false);
  const [activeParamsText, setActiveParamsText] = useState("37");
  const [poolPeerHbm, setPoolPeerHbm] = useState(true);
  const [enableCpuTier, setEnableCpuTier] = useState(true);
  const [cpuCapacity, setCpuCapacity] = useState("512");
  const [cpuBandwidth, setCpuBandwidth] = useState("200");
  const [enableCxlTier, setEnableCxlTier] = useState(false);
  const [cxlCapacity, setCxlCapacity] = useState("1024");
  const [cxlBandwidth, setCxlBandwidth] = useState("80");
  const [enableSsdTier, setEnableSsdTier] = useState(false);
  const [ssdCapacity, setSsdCapacity] = useState("8192");
  const [ssdBandwidth, setSsdBandwidth] = useState("14");
  const [placementPolicy, setPlacementPolicy] = useState("weights_first");

  const model = MODELS[modelKey];
  const accelerator = ACCELERATORS[acceleratorKey];
  const workload = WORKLOADS[workloadKey];

  const derived = useMemo(() => {
    const weightBytes = Number(weightBits) / 8;
    const kvBytes = Number(kvBits) / 8;
    const totalParamsB = model.totalParamsB;
    const activeParamsB = customActive ? Number(activeParamsText || model.activeParamsB) : model.activeParamsB;
    const liveTokens = basePrompt[0] + workload.addedTokens;
    const effectiveSessions = Math.max(sessions[0], workload.minBranches);
    const scratchGiB = Number(extraScratchGiB || 0) + workload.baseScratchGiB;

    const weightsGiB = weightGiB(totalParamsB, weightBytes);
    const activeWeightTrafficGiB = weightGiB(activeParamsB, weightBytes);
    const kvTokenBytes = kvPerTokenBytes(model, kvBytes);
    const kvTokenGiB = bytesToGiB(kvTokenBytes);
    const kvPerSessionGiB = kvTokenGiB * liveTokens;
    const kvTotalGiB = kvPerSessionGiB * effectiveSessions;

    const localHbmCapacityGiB = accelerator.hbmGB;
    const peerHbmCapacityGiB = poolPeerHbm ? Math.max(0, (gpuCount[0] - 1) * accelerator.hbmGB) : 0;

    const tiers = [
      {
        key: "local_hbm",
        label: "Local HBM",
        capacityGiB: localHbmCapacityGiB,
        bandwidthGiBs: accelerator.hbmBandwidthGiBs,
      },
      ...(peerHbmCapacityGiB > 0
        ? [{
            key: "peer_hbm",
            label: `${accelerator.peerName} Peer HBM`,
            capacityGiB: peerHbmCapacityGiB,
            bandwidthGiBs: Math.min(accelerator.hbmBandwidthGiBs, accelerator.peerBandwidthGiBs),
          }]
        : []),
      ...(enableCxlTier
        ? [{ key: "cxl", label: "CXL.mem", capacityGiB: Number(cxlCapacity || 0), bandwidthGiBs: Number(cxlBandwidth || 1) }]
        : []),
      ...(enableCpuTier
        ? [{ key: "cpu", label: "CPU Memory", capacityGiB: Number(cpuCapacity || 0), bandwidthGiBs: Number(cpuBandwidth || 1) }]
        : []),
      ...(enableSsdTier
        ? [{ key: "ssd", label: "SSD Backup", capacityGiB: Number(ssdCapacity || 0), bandwidthGiBs: Number(ssdBandwidth || 1) }]
        : []),
    ];

    const parts = placementPolicy === "kv_first"
      ? [
          { key: "kv", label: "KV Cache", sizeGiB: kvTotalGiB },
          { key: "weights", label: "Weights", sizeGiB: weightsGiB },
          { key: "scratch", label: "Scratch", sizeGiB: scratchGiB },
        ]
      : [
          { key: "weights", label: "Weights", sizeGiB: weightsGiB },
          { key: "kv", label: "KV Cache", sizeGiB: kvTotalGiB },
          { key: "scratch", label: "Scratch", sizeGiB: scratchGiB },
        ];

    const { allocation, tierUsage } = allocateSequential(parts, tiers);
    const tierMap = Object.fromEntries(tiers.map((t) => [t.key, t]));

    const weightTrafficByTier = perTokenTrafficFromAllocation(allocation.weights || {}, activeWeightTrafficGiB, weightsGiB);
    const kvTrafficByTier = perTokenTrafficFromAllocation(allocation.kv || {}, kvPerSessionGiB, kvTotalGiB);

    const trafficByTier = {};
    Object.entries(weightTrafficByTier).forEach(([tier, v]) => {
      trafficByTier[tier] = (trafficByTier[tier] || 0) + v;
    });
    Object.entries(kvTrafficByTier).forEach(([tier, v]) => {
      trafficByTier[tier] = (trafficByTier[tier] || 0) + v;
    });

    const effectiveDecodeSeconds = Object.entries(trafficByTier).reduce((sum, [tier, traffic]) => {
      return sum + traffic / tierMap[tier].bandwidthGiBs;
    }, 0);
    const effectiveTokPerSec = effectiveDecodeSeconds > 0 ? 1 / effectiveDecodeSeconds : 0;

    const ridge = accelerator.bf16TFLOPs / (accelerator.hbmBandwidthGiBs / 1000);
    const decodeIntensity = 2 / weightBytes;

    const totalPlacedGiB = Object.values(tierUsage).reduce((sum, v) => sum + v, 0);
    const totalDemandGiB = weightsGiB + kvTotalGiB + scratchGiB;
    const unplacedGiB = Math.max(0, totalDemandGiB - totalPlacedGiB);

    const fitClass = unplacedGiB > 0 ? "overflow" : Object.keys(trafficByTier).some((k) => ["cxl", "cpu", "ssd"].includes(k)) ? "spill" : Object.keys(trafficByTier).includes("peer_hbm") ? "scaleup" : "local";

    const weightWeightedBw = weightedBandwidthForPart(allocation.weights || {}, tierMap);
    const kvWeightedBw = weightedBandwidthForPart(allocation.kv || {}, tierMap);

    return {
      totalParamsB,
      activeParamsB,
      liveTokens,
      effectiveSessions,
      scratchGiB,
      weightsGiB,
      activeWeightTrafficGiB,
      kvTokenBytes,
      kvTokenGiB,
      kvPerSessionGiB,
      kvTotalGiB,
      tiers,
      allocation,
      tierUsage,
      tierMap,
      trafficByTier,
      effectiveTokPerSec,
      ridge,
      decodeIntensity,
      totalDemandGiB,
      totalPlacedGiB,
      unplacedGiB,
      fitClass,
      weightWeightedBw,
      kvWeightedBw,
      localHbmCapacityGiB,
      peerHbmCapacityGiB,
    };
  }, [
    model,
    accelerator,
    weightBits,
    kvBits,
    basePrompt,
    sessions,
    gpuCount,
    workload,
    extraScratchGiB,
    customActive,
    activeParamsText,
    poolPeerHbm,
    enableCpuTier,
    cpuCapacity,
    cpuBandwidth,
    enableCxlTier,
    cxlCapacity,
    cxlBandwidth,
    enableSsdTier,
    ssdCapacity,
    ssdBandwidth,
    placementPolicy,
  ]);

  const capacityChartData = derived.tiers.map((tier) => ({
    name: tier.label,
    capacity: tier.capacityGiB,
    used: derived.tierUsage[tier.key] || 0,
  }));

  const trafficChartData = derived.tiers.map((tier) => ({
    name: tier.label,
    traffic: derived.trafficByTier[tier.key] || 0,
  })).filter((x) => x.traffic > 0);

  const placementRows = [
    { name: "Weights", alloc: derived.allocation.weights || {} },
    { name: "KV Cache", alloc: derived.allocation.kv || {} },
    { name: "Scratch", alloc: derived.allocation.scratch || {} },
  ];

  const ruleShifts = [
    {
      title: "Old rule: if the model fits on one device, the memory story is finished",
      body: "Now false. Scale-up with peer HBM can preserve fit, but the interconnect becomes part of the memory hierarchy and changes the effective decode roof.",
    },
    {
      title: "Old rule: offloading is only a capacity patch",
      body: "Now false. Once CXL.mem, CPU memory, or SSD enters the hot path, the system is no longer riding the HBM roof. The memory roof itself changes.",
    },
    {
      title: "Old rule: weight compression is the main lever",
      body: "Increasingly incomplete. In multi-session or agent workloads, KV growth and branch-induced state duplication can outrun the saved weight bytes.",
    },
    {
      title: "Old rule: more GPUs simply add more capacity",
      body: "Only when the model and serving stack can exploit peer memory and tolerate the interconnect tax. Capacity and locality are now separate design variables.",
    },
    {
      title: "Old rule: tokens per second is enough",
      body: "Not for agent systems. Useful comparisons increasingly require state-aware measures such as bytes per useful step or tokens per second per resident GiB.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">LLM Memory Hierarchy and Roofline Explorer</h1>
          <p className="max-w-5xl text-sm text-slate-600">
            This version treats serving as a tiered memory system. Choose accelerator count, peer memory over NVLink-class links, CXL.mem, CPU memory, and SSD backup. The tool then places weights, KV cache, and scratch across tiers and estimates how that placement changes fit and decode speed.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Cpu className="h-5 w-5" /> Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelKey} onValueChange={setModelKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">{model.notes}</p>
              </div>

              <div className="space-y-2">
                <Label>Accelerator</Label>
                <Select value={acceleratorKey} onValueChange={setAcceleratorKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCELERATORS).map(([k, v]) => <SelectItem key={k} value={k}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Accelerator Count</span>
                  <span className="font-medium">{gpuCount[0]}</span>
                </div>
                <Slider value={gpuCount} onValueChange={setGpuCount} min={1} max={16} step={1} />
              </div>

              <div className="rounded-xl border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="peer-hbm">Pool Peer HBM Over {accelerator.peerName}</Label>
                  <Switch id="peer-hbm" checked={poolPeerHbm} onCheckedChange={setPoolPeerHbm} disabled={gpuCount[0] === 1} />
                </div>
                <p className="text-xs text-slate-500">When enabled, the model may shard across multiple accelerators. Peer memory increases capacity, but remote accesses are limited by the interconnect, not by local HBM bandwidth.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Weight Precision</Label>
                  <Select value={weightBits} onValueChange={setWeightBits}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16">bf16 / fp16</SelectItem>
                      <SelectItem value="8">fp8 / int8</SelectItem>
                      <SelectItem value="4">int4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>KV Precision</Label>
                  <Select value={kvBits} onValueChange={setKvBits}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16">bf16 / fp16</SelectItem>
                      <SelectItem value="8">fp8 / int8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Workload Preset</Label>
                <Select value={workloadKey} onValueChange={setWorkloadKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKLOADS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Base Prompt Tokens</span>
                  <span className="font-medium">{basePrompt[0].toLocaleString()}</span>
                </div>
                <Slider value={basePrompt} onValueChange={setBasePrompt} min={1000} max={128000} step={1000} />
                <p className="text-xs text-slate-500">Effective live tokens = base prompt + workload overhead = {derived.liveTokens.toLocaleString()} tokens</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Concurrent Sessions</span>
                  <span className="font-medium">{sessions[0]}</span>
                </div>
                <Slider value={sessions} onValueChange={setSessions} min={1} max={16} step={1} />
                <p className="text-xs text-slate-500">Effective session count respects minimum workload branch count = {derived.effectiveSessions}</p>
              </div>

              <div className="space-y-2">
                <Label>Placement Policy</Label>
                <Select value={placementPolicy} onValueChange={setPlacementPolicy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weights_first">Place Weights First</SelectItem>
                    <SelectItem value="kv_first">Place KV First</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">This controls which state stays closest to HBM when total demand exceeds fast-tier capacity.</p>
              </div>

              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-active">Override Active Params</Label>
                  <Switch id="custom-active" checked={customActive} onCheckedChange={setCustomActive} />
                </div>
                <Input value={activeParamsText} onChange={(e) => setActiveParamsText(e.target.value)} disabled={!customActive} placeholder="Active params in billions" />
                <p className="text-xs text-slate-500">Use this to test routing sparsity, speculative decode, or partial-activation experiments.</p>
              </div>

              <div className="space-y-2">
                <Label>Extra Scratch / Runtime Overhead (GiB)</Label>
                <Input value={extraScratchGiB} onChange={(e) => setExtraScratchGiB(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-5"><div className="text-xs text-slate-500">Weights</div><div className="mt-2 text-2xl font-semibold">{formatGiB(derived.weightsGiB)}</div></CardContent></Card>
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-5"><div className="text-xs text-slate-500">KV Per Token</div><div className="mt-2 text-2xl font-semibold">{formatKiB(derived.kvTokenBytes / 1024)}</div></CardContent></Card>
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-5"><div className="text-xs text-slate-500">Total KV Across Sessions</div><div className="mt-2 text-2xl font-semibold">{formatGiB(derived.kvTotalGiB)}</div></CardContent></Card>
              <Card className="rounded-2xl shadow-sm"><CardContent className="p-5"><div className="text-xs text-slate-500">Effective Decode Ceiling</div><div className="mt-2 text-2xl font-semibold">{formatNum(derived.effectiveTokPerSec)} tok/s</div></CardContent></Card>
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Network className="h-5 w-5" /> Tiered Memory System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Local HBM</div>
                    <div className="mt-2 text-2xl font-semibold">{formatNum(derived.localHbmCapacityGiB)} GiB</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Peer HBM Pool</div>
                    <div className="mt-2 text-2xl font-semibold">{formatNum(derived.peerHbmCapacityGiB)} GiB</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Total Demand</div>
                    <div className="mt-2 text-2xl font-semibold">{formatGiB(derived.totalDemandGiB)}</div>
                  </div>
                  <div className={`rounded-xl border p-3 ${derived.fitClass === "overflow" ? "border-red-200 bg-red-50" : derived.fitClass === "spill" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="text-xs text-slate-500">Placement Result</div>
                    <div className="mt-2 text-2xl font-semibold">{derived.fitClass === "overflow" ? "Unplaced Spill" : derived.fitClass === "spill" ? "Slow-Tier Spill" : derived.fitClass === "scaleup" ? "Scale-Up Fit" : "Local Fit"}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Unplaced</div>
                    <div className="mt-2 text-2xl font-semibold">{formatGiB(derived.unplacedGiB)}</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="mb-3 font-medium">Capacity by Tier</div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capacityChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${Number(value).toFixed(2)} GiB`} />
                          <Bar dataKey="capacity" stackId="a" fill="#cbd5e1" />
                          <Bar dataKey="used" stackId="b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="mb-3 font-medium">Per-Token Traffic by Tier</div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trafficChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${Number(value).toFixed(2)} GiB/token`} />
                          <Bar dataKey="traffic" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="rounded-2xl shadow-sm md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><MemoryStick className="h-5 w-5" /> CXL.mem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-cxl">Enable</Label>
                    <Switch id="enable-cxl" checked={enableCxlTier} onCheckedChange={setEnableCxlTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity (GiB)</Label>
                    <Input value={cxlCapacity} onChange={(e) => setCxlCapacity(e.target.value)} disabled={!enableCxlTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bandwidth (GiB/s)</Label>
                    <Input value={cxlBandwidth} onChange={(e) => setCxlBandwidth(e.target.value)} disabled={!enableCxlTier} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Cpu className="h-5 w-5" /> CPU Memory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-cpu">Enable</Label>
                    <Switch id="enable-cpu" checked={enableCpuTier} onCheckedChange={setEnableCpuTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity (GiB)</Label>
                    <Input value={cpuCapacity} onChange={(e) => setCpuCapacity(e.target.value)} disabled={!enableCpuTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bandwidth (GiB/s)</Label>
                    <Input value={cpuBandwidth} onChange={(e) => setCpuBandwidth(e.target.value)} disabled={!enableCpuTier} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><HardDrive className="h-5 w-5" /> SSD Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-ssd">Enable</Label>
                    <Switch id="enable-ssd" checked={enableSsdTier} onCheckedChange={setEnableSsdTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity (GiB)</Label>
                    <Input value={ssdCapacity} onChange={(e) => setSsdCapacity(e.target.value)} disabled={!enableSsdTier} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bandwidth (GiB/s)</Label>
                    <Input value={ssdBandwidth} onChange={(e) => setSsdBandwidth(e.target.value)} disabled={!enableSsdTier} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="placement" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="placement">Placement</TabsTrigger>
                <TabsTrigger value="roofline">Roofline</TabsTrigger>
                <TabsTrigger value="rules">Rule Shifts</TabsTrigger>
              </TabsList>

              <TabsContent value="placement">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5" /> State Placement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {placementRows.map((row) => (
                      <div key={row.name} className="rounded-xl border p-4">
                        <div className="font-medium">{row.name}</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {derived.tiers.map((tier) => (
                            <div key={tier.key} className="rounded-lg border p-3">
                              <div className="text-xs text-slate-500">{tier.label}</div>
                              <div className="mt-1 text-lg font-semibold">{formatGiB(row.alloc[tier.key] || 0)}</div>
                            </div>
                          ))}
                          {row.alloc.unplaced > 0 && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                              <div className="text-xs text-slate-500">Unplaced</div>
                              <div className="mt-1 text-lg font-semibold">{formatGiB(row.alloc.unplaced || 0)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                      This simulator uses a simple sequential placement model. Its purpose is not to mimic one runtime exactly. Its purpose is to show how the active memory roof changes once weights or KV stop being local to one HBM domain.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roofline">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5" /> Roofline and Effective Memory Roof</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-slate-500">Ridge Point</div>
                        <div className="mt-2 text-2xl font-semibold">{formatNum(derived.ridge)} FLOP/byte</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-slate-500">Decode Intensity</div>
                        <div className="mt-2 text-2xl font-semibold">{formatNum(derived.decodeIntensity)} FLOP/byte</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-slate-500">Weight Weighted Bandwidth</div>
                        <div className="mt-2 text-2xl font-semibold">{formatNum(derived.weightWeightedBw)} GiB/s</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-slate-500">KV Weighted Bandwidth</div>
                        <div className="mt-2 text-2xl font-semibold">{formatNum(derived.kvWeightedBw)} GiB/s</div>
                      </div>
                    </div>
                    <div className={`rounded-xl border p-4 text-sm ${derived.decodeIntensity < derived.ridge ? "border-amber-200 bg-amber-50 text-slate-700" : "border-emerald-200 bg-emerald-50 text-slate-700"}`}>
                      {derived.decodeIntensity < derived.ridge
                        ? "Decode remains memory-bound. The key question is no longer only whether state fits, but whether the hot fraction of that state stays on local HBM or moves onto a slower tier."
                        : "This configuration is entering a more compute-efficient region, which is unusual for single-token decode and typically requires very aggressive batching or unusual placement assumptions."}
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                      Multi-GPU scale-up changes the roofline in two ways. It adds capacity through peer HBM, and it inserts an interconnect ceiling between local and remote state. CXL.mem, CPU memory, and SSD extend capacity further, but they also create successively lower effective memory roofs if hot state spills into them.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5" /> Which Older Design Rules Start to Fail</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ruleShifts.map((item) => (
                      <div key={item.title} className="rounded-xl border p-4">
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-2 text-sm text-slate-700">{item.body}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
