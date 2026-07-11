"""
Experiment. The communication tax, and why the network is a first class part of the model.

A data parallel training step ends with an all reduce of the gradients across every
replica. With the ring algorithm each GPU sends and receives about 2(P-1)/P times the
gradient size, which for large P is close to twice the gradient bytes, independent of
how many GPUs you add. So the all reduce time is roughly fixed per step, and whether it
is free or ruinous depends entirely on the bandwidth of the wire between chips.

This is where the difference between a fast local fabric (NVLink class) and a slower
cross node network (InfiniBand class) stops being a footnote and starts deciding your
training efficiency. We compute the gradient all reduce time against compute time and
report the fraction of the step lost to communication if it were not overlapped.

Stdlib only. Peaks illustrative, H100 class chip on two fabric tiers.
"""

# ---- model and step ----
params      = 70e9         # 70B parameters
grad_bytes_per_param = 2   # bf16 gradient
tokens_per_step = 4e6      # global batch times sequence, illustrative

# ---- chip and fabrics ----
peak_flops = 990e12
mfu        = 0.45          # realistic model flops utilization
fabrics = {
    "NVLink class (intra node) 900 GB/s": 900e9,
    "InfiniBand class (cross node) 50 GB/s": 50e9,   # about 400 Gb/s per direction
}

def allreduce_bytes(P):
    grad = params * grad_bytes_per_param
    return 2.0 * (P - 1) / P * grad     # ring all reduce, bytes moved per GPU

def step_compute_seconds(P):
    """Total step work is split across P data parallel GPUs, so wall time divides by P.
    The all reduce that follows does not divide by P. That asymmetry is the whole story."""
    flops = 6.0 * params * tokens_per_step    # 6 N D rule for fwd plus bwd, total work
    return flops / (P * peak_flops * mfu)

total_flops = 6.0 * params * tokens_per_step
print("=" * 78)
print("Gradient all reduce time versus compute time per step, by fabric and scale")
print("=" * 78)
print(f"\nmodel {params/1e9:.0f}B, gradient {params*grad_bytes_per_param/1e9:.0f} GB, "
      f"global batch {tokens_per_step/1e6:.0f}M tokens per step, {int(mfu*100)} percent MFU")
print("Compute time shrinks as you add GPUs. All reduce time does not. Watch the fraction.\n")

for fname, bw in fabrics.items():
    print(fname)
    header = f"  {'GPUs P':>8}{'compute s':>11}{'allreduce GB':>14}{'comm s':>9}{'comm % if not hidden':>22}"
    print(header)
    print("  " + "-" * (len(header) - 2))
    for P in [64, 512, 4096, 16384]:
        comp = step_compute_seconds(P)
        ar = allreduce_bytes(P)
        t = ar / bw
        frac = 100.0 * t / (comp + t)
        print(f"  {P:>8}{comp:>11.2f}{ar/1e9:>14.1f}{t:>9.2f}{frac:>21.1f}%")
    print()

print(f"""
Reading the result.
The all reduce volume barely changes as you add GPUs, which is the good news about the
ring algorithm. The bad news is the wire. On a fast local fabric the gradient exchange
hides comfortably under compute. On a slower cross node network the same exchange can
rival or exceed the compute it is supposed to overlap, which is why large runs fight so
hard to keep data parallel groups inside a fast domain, to overlap communication with the
backward pass, and to shrink gradient bytes with lower precision. The model architecture,
the parallelism layout, and the network topology are one joint optimization problem. You
cannot design the model without designing the cluster it lives on.
""")
