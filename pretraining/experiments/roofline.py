"""
Experiment. Why training is compute bound and decode is memory bound, on one chart of numbers.

The roofline model says a kernel is limited either by arithmetic (the flat roof, peak
FLOP per second) or by memory bandwidth (the slanted roof, bytes per second times
arithmetic intensity). The crossover is the ridge point. Arithmetic intensity is FLOPs
divided by bytes moved. Anything below the ridge is memory bound, no matter how much
compute you own.

We compute arithmetic intensity for the two regimes that dominate a model's life.
A big training matmul, and a batch 1 decode step. The gap explains almost everything
about why the hardware and the architecture look the way they do.

Stdlib only. Accelerator peaks are illustrative, H100 class.
"""

# ---- accelerator peaks (illustrative, H100 class, bf16 dense) ----
peak_flops = 990e12        # 990 TFLOP/s
hbm_bw     = 3.35e12       # 3.35 TB/s
ridge = peak_flops / hbm_bw   # FLOP per byte needed to be compute bound

dtype_bytes = 2

def gemm_intensity(M, K, N, bytes_per=dtype_bytes):
    """A single matmul C[MxN] = A[MxK] @ B[KxN]. FLOPs and bytes moved."""
    flops = 2.0 * M * K * N
    bytes_moved = (M * K + K * N + M * N) * bytes_per
    return flops, bytes_moved, flops / bytes_moved

def attainable(ai):
    """Roofline. min of compute roof and memory roof at this arithmetic intensity."""
    return min(peak_flops, hbm_bw * ai)

print("=" * 74)
print("Roofline. Ridge point is the arithmetic intensity where a chip flips")
print("from memory bound to compute bound.")
print("=" * 74)
print(f"\npeak compute   {peak_flops/1e12:6.0f} TFLOP/s")
print(f"peak bandwidth {hbm_bw/1e12:6.2f} TB/s")
print(f"ridge point    {ridge:6.0f} FLOP per byte")
print("Below the ridge you are memory bound. Owning more FLOPs buys you nothing.\n")

# ---- three workloads ----
# 1. training matmul. large batch times sequence collapses into a big M dimension.
tokens = 8192 * 4        # micro batch times sequence, illustrative
d = 8192
train = gemm_intensity(tokens, d, 4 * d)      # the FFN up projection, a fat matmul

# 2. decode step. batch 1, one token. the weight matrix is read once, used once.
decode = gemm_intensity(1, d, 4 * d)

# 3. prefill of a long prompt. many tokens at once, closer to training.
prefill = gemm_intensity(4096, d, 4 * d)

rows = [
    ("training matmul (many tokens)", train),
    ("prefill (4096 tokens at once)", prefill),
    ("decode step (batch 1, one token)", decode),
]

header = f"{'workload':<36}{'AI FLOP/byte':>14}{'bound by':>14}{'% of peak':>12}"
print(header)
print("-" * len(header))
for name, (flops, byts, ai) in rows:
    att = attainable(ai)
    bound = "compute" if ai >= ridge else "memory"
    pct = 100.0 * att / peak_flops
    print(f"{name:<36}{ai:>14.1f}{bound:>14}{pct:>11.1f}%")

print(f"""
Reading the result.
Training and prefill push many tokens through the same weights at once, so each byte
of weight is reused across many tokens. Arithmetic intensity climbs above the ridge of
{ridge:.0f} and the chip runs near its compute peak. Decode processes one token at a time,
so every weight is read from HBM and used once. Arithmetic intensity is order 1, far
below the ridge, and the expensive tensor cores sit idle waiting on memory. The same
silicon is compute bound in training and memory bound in serving. That single fact is
why inference chips are designed differently, why batching matters so much, why the KV
cache dominates, and why FP8 (fewer bytes per number) helps more than its FLOP count
suggests. The bottleneck was never the multiplier. It was the wire to memory.
""")
