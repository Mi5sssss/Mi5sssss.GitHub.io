---
layout: page
title: Publications
menutitle: Publications
menuorder: 2
excerpt: "Recent Publications"
---
<!-- [8] **Rui Xie**, Asad Ul Haq, Yunhua Fang, Linsen Ma, Sanchari Sen, Swagath Venkataramani, Liu Liu, Tong Zhang, "Breaking the HBM Bit Cost Barrier: Domain-Specific ECC for AI Inference Infrastructure", arXiv preprint arXiv:2507.02654 ([paper](https://arxiv.org/abs/2507.02654))

[7] **Rui Xie**, Asad Ul Haq, Linsen Ma, Yunhua Fang, Zirak Burzin Engineer, Liu Liu, Tong Zhang, "Reimagining Memory Access for LLM Inference: Compression-Aware Memory Controller Design", arXiv preprint ([paper](https://arxiv.org/abs/2503.18869))

[6] **Rui Xie**, Linsen Ma, Alex Zhong, Feng Chen, Tong Zhang, "ZipCache: A Hybrid-DRAM/SSD Cache with Built-in Transparent Compression", 10th International Symposium on Memory Systems ([paper](doc/ZipCache_v1-2.pdf)) ([slides](doc/2024-10-01-zipcache.pdf))

[5] **Rui Xie**, Asad Ul Haq, Linsen Ma, Krystal Sun, Sanchari Sen, Swagath Venkataramani, Liu Liu, Tong Zhang, "SmartQuant: CXL-based AI Model Store in Support of Runtime Configurable Weight Quantization", arXiv preprint ([paper](https://arxiv.org/abs/2407.15866))

[4] Linsen Ma, **Rui Xie**, Tong Zhang, "ZipKV: In-Memory Key-Value Store with Built-In Data Compression", 2023 International Symposium on Memory Management ([Link](https://dl.acm.org/doi/abs/10.1145/3591195.3595273))

[3] Ziyi Guan, Wenyong Zhou, Yuan Ren, **Rui Xie**, Hao Yu, Ngai Wong, "A Hardware-Aware Neural Architecture Search Pareto Front Exploration for In-Memory Computing," in Proc. 2022 IEEE 16th Int. Conf. Solid-State and Integrated Circuit Technology (ICSICT), Oct 2022 (Invited Paper)

[2] Yuan Ren, Wenyong Zhou, Ziyi Guan, **Rui Xie**, Quan Chen, Hao Yu, Ngai Wong, "XMAS: An Efficient Customizable Flow for Crossbarred-Memristor Architecture Search", 59th Design Automation Conference Engineering Track ([Link](https://59dac.conference-program.com/presentation/?id=ETPOST157&sess=sess187))

[1] **Rui Xie**, Mingyang Song, Junzhuo Zhou, Jie Mei, Quan Chen, "A Fast Method for Steady-State Memristor Crossbar Array Circuit Simulation", 2021 IEEE International Conference on Integrated Circuits Technologies and Applications ([Link](https://ieeexplore.ieee.org/document/9661817))
 -->

<div id="publications-list">
  <p>Loading publications...</p>
  <noscript>
    <p>Please enable JavaScript to view the latest publications. You can also visit <a href="https://scholar.google.com/citations?user=kFFMzkQAAAAJ&hl=en&sortby=pubdate" target="_blank" rel="noopener">my Google Scholar profile</a>.</p>
  </noscript>
  </div>

<script src="/assets/js/publications.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    // Load a larger list on the dedicated Publications page
    if (typeof loadScholarPublications === 'function') {
      loadScholarPublications({
        userId: 'kFFMzkQAAAAJ',
        targetId: 'publications-list',
        maxItems: 50
      });
    } else {
      var t = document.getElementById('publications-list');
      if (t) t.innerHTML = '<p>Unable to load publications. <a href="https://scholar.google.com/citations?user=kFFMzkQAAAAJ&hl=en&sortby=pubdate" target="_blank" rel="noopener">View on Google Scholar</a>.</p>';
    }
  });
</script>
