"""
Experiment. FP8 is a bandwidth play wearing a numerics costume.

The usual story about FP8 training is about dynamic range and stability. That story is
real but it buries the lede. The reason low precision matters so much is that most of
the time you are memory and bandwidth bound (see roofline.py), and halving the bytes per
number halves the memory traffic and doubles your effective bandwidth. This experiment
shows both halves. First the numerics, what FP8 can and cannot represent. Then the
bandwidth consequence, plugged back into the roofline ridge point.

Stdlib only. No frameworks. We reason about the formats directly.
"""

def fmt(exp_bits, man_bits, name):
    """Report the reach of a floating point format from its exponent and mantissa bits.
    We use the common bias of 2**(exp_bits-1) - 1 and ignore denormal and special code
    subtleties, which does not change the picture."""
    bias = 2 ** (exp_bits - 1) - 1
    max_exp = (2 ** exp_bits - 2) - bias        # reserve all ones for specials
    min_exp = 1 - bias
    max_normal = (2 - 2 ** -man_bits) * (2 ** max_exp)
    min_normal = 2 ** min_exp
    ulp_at_one = 2 ** -man_bits                 # spacing of representable values near 1.0
    steps_in_01 = int(1.0 / ulp_at_one)         # distinct values between 1.0 and 2.0
    return name, exp_bits, man_bits, max_normal, min_normal, ulp_at_one, steps_in_01

formats = [
    fmt(8, 23, "FP32"),
    fmt(8, 7,  "BF16"),
    fmt(5, 10, "FP16"),
    fmt(5, 2,  "FP8 E5M2"),
    fmt(4, 3,  "FP8 E4M3"),
]

print("=" * 84)
print("What each format can represent")
print("=" * 84)
header = f"{'format':<10}{'exp':>5}{'man':>5}{'max normal':>16}{'min normal':>16}{'step at 1.0':>14}{'levels 1..2':>13}"
print(header)
print("-" * len(header))
for name, e, m, mx, mn, ulp, steps in formats:
    print(f"{name:<10}{e:>5}{m:>5}{mx:>16.3e}{mn:>16.3e}{ulp:>14.4f}{steps:>13}")

print("""
Reading the numerics.
BF16 keeps FP32 exponent range (8 bits) and throws away mantissa, so it barely
overflows but is coarse. That trade is exactly why it won for training. FP8 E5M2 keeps
range and has almost no precision. FP8 E4M3 keeps precision and has almost no range,
which is why FP8 training needs per tensor or per block scaling to keep values inside
the tiny window. This is the stability tightrope everyone talks about.
""")

# ---- the part everyone under weights, the bandwidth consequence ----
peak_flops = 990e12
hbm_bw     = 3.35e12
print("=" * 84)
print("The consequence nobody puts on the slide. Bytes move the ridge point.")
print("=" * 84)
print(f"\npeak compute {peak_flops/1e12:.0f} TFLOP/s fixed. Ridge point scales with bytes per value.\n")
header2 = f"{'format':<10}{'bytes':>7}{'FLOP per value at ridge':>26}{'relative memory traffic':>26}"
print(header2)
print("-" * len(header2))
for name, bytes_per in [("FP32", 4), ("BF16", 2), ("FP8", 1)]:
    ridge = peak_flops / hbm_bw          # ridge in FLOP per byte is fixed by the chip
    # relative bandwidth a given tensor consumes, versus fp32
    rel = bytes_per / 4.0
    # FLOP you must do per value moved to stay compute bound. fewer bytes, easier to feed.
    flop_per_value = ridge * bytes_per
    print(f"{name:<10}{bytes_per:>7}{flop_per_value:>26.0f}{rel:>25.0%}")

print(f"""
Reading the bandwidth.
The chip ridge point of {peak_flops/hbm_bw:.0f} FLOP per byte is fixed. But a value in FP8
carries a quarter of the bytes of FP32, so moving the same tensor costs a quarter of the
bandwidth, and any memory bound kernel runs up to four times faster purely from touching
fewer bytes. In the regimes that are memory bound, which is most of serving and a good
part of training, precision reduction is not mainly buying FLOPs. It is buying bandwidth.
That is why FP8 delivers speedups larger than its arithmetic throughput alone would predict,
and why the roadmap keeps pushing toward FP4. The scarce resource is the wire, not the math.
""")
