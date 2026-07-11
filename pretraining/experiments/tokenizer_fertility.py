"""
Experiment. Tokenizer fertility, the hidden tax that a tokenizer levies for the life of a model.

A tokenizer trained mostly on english learns merges that compress english well and
everything else badly. Fertility is how many tokens it takes to encode a given piece of
text. High fertility means a fixed context window holds less real content, training costs
more per unit of information, and the tax falls hardest on code and on non latin scripts.
This is a real and consequential source of unfairness and cost that most people never see.

We train a byte level BPE from scratch on an english corpus, then measure fertility on
english prose, source code, and two non latin scripts. Stdlib only, deterministic.
"""

from collections import Counter

# ---- training corpus, english (repeated to give the merges a frequency signal) ----
_train_text = (
    "the model predicts the next token from all the tokens before it. that is the whole "
    "objective. compute has grown faster than memory bandwidth for decades, so the chip is "
    "usually starved. the data pipeline removes duplicates and low quality pages before the "
    "model ever sees them. attention lets every position read from earlier positions under a "
    "causal mask. the tokenizer decides how many tokens a piece of text becomes, and that "
    "number is a tax paid on every training step and every request for the life of the model. "
) * 12

NUM_MERGES = 600

def words_of(text):
    return text.split()

def train_bpe(text, num_merges):
    freqs = Counter(words_of(text))
    # each word starts as a tuple of its utf-8 bytes, wrapped as single byte symbols
    splits = {w: [bytes([b]) for b in w.encode("utf-8")] for w in freqs}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for w, f in freqs.items():
            s = splits[w]
            for i in range(len(s) - 1):
                pairs[(s[i], s[i + 1])] += f
        if not pairs:
            break
        best = max(pairs, key=lambda p: (pairs[p], p))
        merges.append(best)
        merged = best[0] + best[1]
        for w in splits:
            s = splits[w]
            out, i = [], 0
            while i < len(s):
                if i < len(s) - 1 and s[i] == best[0] and s[i + 1] == best[1]:
                    out.append(merged)
                    i += 2
                else:
                    out.append(s[i])
                    i += 1
            splits[w] = out
    return merges

def encode(word, merges):
    s = [bytes([b]) for b in word.encode("utf-8")]
    for a, b in merges:
        out, i = [], 0
        while i < len(s):
            if i < len(s) - 1 and s[i] == a and s[i + 1] == b:
                out.append(a + b)
                i += 2
            else:
                out.append(s[i])
                i += 1
        s = out
    return s

def fertility(text, merges):
    toks = sum(len(encode(w, merges)) for w in words_of(text))
    chars = len(text.replace(" ", ""))
    return toks, chars

merges = train_bpe(_train_text, NUM_MERGES)
vocab_size = 256 + len(merges)

samples = {
    "english prose": "the pretraining recipe is the real moat and almost nobody publishes it",
    "source code":   "def forward(self, x): return self.norm(x + self.attention(self.ln(x)))",
    "russian text":  "модель предсказывает следующий токен по всем предыдущим токенам подряд",
    "chinese text":  "模型根据之前的所有词元来预测下一个词元这是全部的训练目标",
}

print("=" * 74)
print(f"Byte level BPE trained on english, vocab size {vocab_size}")
print("Fertility is tokens per 100 characters. Lower is cheaper.")
print("=" * 74)
header = f"{'sample':<16}{'chars':>8}{'tokens':>9}{'tok/100 char':>15}{'vs english':>13}"
print(header)
print("-" * len(header))

base = None
for name, text in samples.items():
    toks, chars = fertility(text, merges)
    f100 = 100.0 * toks / chars
    if base is None:
        base = f100
    print(f"{name:<16}{chars:>8}{toks:>9}{f100:>15.1f}{f100 / base:>12.2f}x")

print("""
Reading the result.
English, the language the merges were trained on, compresses best. Code pays more because
identifiers, punctuation, and indentation fragment into many tokens. The non latin scripts
pay the most, because each character is several utf-8 bytes and almost none of the learned
merges apply, so the tokenizer falls back toward raw bytes. A speaker of the last language
in this table pays several times the tokens, and therefore several times the cost and
several times the context pressure, for saying the same thing. The tokenizer is chosen once
and taxes every token forever, which is why vocabulary design is a quiet act of policy.
""")
