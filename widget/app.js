// Strata Edge - Strata's Monitor tab (serve/web/app.js, MIT) for the XENEON EDGE.
// Read-only: the data comes from the local helper (127.0.0.1:5199/api/snapshot), which only GETs Strata's /health and
// /metrics. No load, unload or inference request is ever sent.
"use strict";
(function () {
  const HELPER = "http://127.0.0.1:5199/api/snapshot";
  const STALE_MS = 10000;
  const $ = (id) => document.getElementById(id);
  const icon = (name, cls = "st-icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("en-US", {maximumFractionDigits: d, minimumFractionDigits: d}));
  const kfmt = (n) => (n == null ? "–" : n >= 1000 ? `${fmt(n / 1000, n >= 10000 ? 0 : 1)}k` : fmt(n));
  const ctxfmt = (n) => (n && n % 1024 === 0 ? `${fmt(n / 1024)}K` : kfmt(n));
  const gb = (b, d = 1) => (b == null ? "–" : fmt(b / 1073741824, d));   // memory: binary GB, as Windows shows it

  // ---------------------------------------------------------------- theme (dark until the user picks one)
  const THEME_KEY = "strata.edge.theme";
  function setTheme(t, save) {
    document.documentElement.dataset.theme = t;
    if (save) try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignore */ }
    $("theme-icon").setAttribute("href", `#i-${t === "dark" ? "sun" : "moon"}`);
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  setTheme(savedTheme === "light" ? "light" : "dark", false);
  $("theme-btn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);

  // iCUE also calls onDataUpdated without changing settings. Only a changed
  // property should override a theme chosen with the header button.
  let lastIcueTheme = null;
  function applyIcueProperties() {
    try {
      const val = window.widgetTheme;
      if ((val === 'light' || val === 'dark') && val !== lastIcueTheme) {
        if (lastIcueTheme !== null || savedTheme === null) setTheme(val, true);
        lastIcueTheme = val;
      }
    } catch (_) {}
  }
  window.icueEvents = {
    onICUEInitialized: applyIcueProperties,
    onDataUpdated: applyIcueProperties
  };
  applyIcueProperties();

  // ---------------------------------------------------------------- the eight metric cards (as in Strata)
  const METRICS = [
    {key: "speed", label: "Speed", icon: "gauge", unit: "t/s", series: "tok_s"},
    {key: "gpu", label: "GPU load", icon: "gpu", unit: "%", series: "gpu_util", max: 100},
    {key: "vram", label: "VRAM", icon: "layers", unit: "GB", series: "gpu_mem_used"},
    {key: "temp", label: "GPU temp", icon: "thermometer", unit: "°C", series: "gpu_temp", tone: "warn"},
    {key: "power", label: "Power", icon: "bolt", unit: "W", series: "gpu_power"},
    {key: "pcie", label: "PCIe", icon: "link", unit: "", series: "gpu_pcie_rx_mb", tone: "info"},
    {key: "cpu", label: "CPU", icon: "cpu", unit: "%", series: "cpu", max: 100},
    {key: "disk", label: "Disk read", icon: "disk", unit: "MB/s", series: "disk_read_mb", tone: "info"},
  ];
  $("metrics").innerHTML = METRICS.map((m) => `
    <div class="st-card metric-card"><div class="st-metric">
      <span class="st-metric__label">${icon(m.icon, "st-icon st-icon--sm")}${esc(m.label)}</span>
      ${m.key === "speed" ? `<div class="speed-values">
        <div><span class="st-metric__value" id="mv-speed">-</span><span class="st-metric__sub" id="ms-speed">Decode</span></div>
        <div class="speed-prefill"><span class="st-metric__value" id="mv-prefill">-</span><span class="st-metric__sub" id="ms-prefill">Prefill</span></div>
      </div>` : `<span class="st-metric__value" id="mv-${m.key}">–</span>
      <span class="st-metric__sub" id="ms-${m.key}"></span>`}
      <svg class="st-metric__spark" id="sp-${m.key}" viewBox="0 0 100 32" preserveAspectRatio="none"${m.tone ? ` data-tone="${m.tone}"` : ""}>
        <path class="area" fill="currentColor" opacity=".12"/><path class="line" fill="none" stroke="currentColor"
        stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        ${m.key === "speed" ? `<g id="sp-prefill" class="speed-prefill"><path class="area" fill="currentColor" opacity=".12"/>
          <path class="line" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
          stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>` : ""}</svg>
    </div></div>`).join("");

  function spark(id, values, max) {
    const svg = $(id);
    // Match the official Strata Monitor's handling of idle/missing samples.
    const v = (values || []).map((x) => (x == null ? 0 : x));
    if (v.length < 2) { svg.querySelector(".line").setAttribute("d", ""); svg.querySelector(".area").setAttribute("d", ""); return; }
    const top = Math.max(max || 0, ...v, 1e-9);
    const pts = v.map((x, i) => [(i / (v.length - 1)) * 100, 30 - (x / top) * 26]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("");
    svg.querySelector(".line").setAttribute("d", line);
    svg.querySelector(".area").setAttribute("d", `${line}L100,32L0,32Z`);
  }
  function setMetric(key, value, unit, sub) {
    $(`mv-${key}`).innerHTML = value == null ? "–" : `${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ""}`;
    $(`ms-${key}`).textContent = sub || "";
  }
  function setPill(state, text) {
    $("pill").dataset.state = state === "error" ? "queued" : state;
    $("pill-text").textContent = text;
  }

  // ---------------------------------------------------------------- render (Strata's render + renderMonitor)
  function render(m, health) {
    const live = m.live || {}, hw = m.hardware || {}, st = m.hardware_static || {}, eng = m.engine || {}, h = m.history || {};
    const requests = m.requests || [], last = requests[0];
    const model = (health && health.model) || eng.model || "–";
    $("model").textContent = model; $("model").title = model;
    if (health && health.loaded === false) setPill("idle", "Model not loaded");
    else if (live.state === "reading") {
      const pct = live.prompt_total ? Math.round((100 * live.prompt_read) / live.prompt_total) : null;
      setPill("reading", pct != null ? `Reading prompt · ${pct}%` : "Reading prompt");
    } else if (live.state === "generating") setPill("generating", `Generating · ${fmt(live.tok_s, 1)} tok/s`);
    else setPill("idle", "Idle");
    if (live.queued > 0) setPill("queued", `${live.queued} queued`);
    renderMonitor(live, hw, st, eng, h, last, requests, m.totals, m.requests_kept);
  }

  function renderTotals(t) {
    if (!t || !t.requests) return "";
    const since = new Date(t.since * 1000).toLocaleString("en-GB", {weekday: "short", hour: "2-digit", minute: "2-digit"});
    const read = t.prompt_tokens - t.reused;
    const pSpeed = t.prompt_ms > 0 && read > 0 ? ` at ${fmt(read / (t.prompt_ms / 1000))} tok/s` : "";
    const oSpeed = t.decode_ms > 0 && t.output_tokens > 0 ? ` at ${fmt(t.output_tokens / (t.decode_ms / 1000), 1)} tok/s` : "";
    return `Since ${since}: ${fmt(t.requests)} requests · ${fmt(read)} prompt tokens read${pSpeed} (${fmt(t.reused)} reused) · ` +
           `${fmt(t.output_tokens)} written${oSpeed}`;
  }

  function renderMonitor(live, hw, st, eng, h, last, requests, totals, kept) {
    // model state
    const on = live.queued > 0 ? "queued" : live.state;
    for (const b of document.querySelectorAll("#state-badges .st-badge")) b.classList.toggle("on", b.dataset.s === on || b.dataset.s === live.state);
    const prog = $("state-progress");
    let label = "Waiting for a request", detail = "", pct = 0;
    if (live.state === "reading") {
      label = "Reading prompt";
      prog.dataset.tone = "info";
      if (live.prompt_total) {
        pct = (100 * live.prompt_read) / live.prompt_total;
        detail = `${fmt(live.prompt_read)} / ${fmt(live.prompt_total)} tokens · ${fmt(pct)}%`;
      } else {
        detail = `${fmt(live.prompt_tokens)} tokens`;
      }
    } else if (live.state === "generating") {
      label = live.phase ? live.phase[0].toUpperCase() + live.phase.slice(1) : "Generating";
      delete prog.dataset.tone;
      pct = live.max_tokens ? Math.min(100, (100 * live.generated) / live.max_tokens) : 0;
      detail = `${fmt(live.generated)} tokens · ${fmt(live.tok_s, 1)} tok/s`;
    } else if (last) {
      delete prog.dataset.tone;
      detail = `last: ${fmt(last.output_tokens)} tokens${last.decode_tok_s ? ` at ${fmt(last.decode_tok_s, 1)} tok/s` : ""}`;
    }
    $("state-label").textContent = label;
    $("state-detail").textContent = detail;
    $("state-bar").style.width = `${pct}%`;

    // the eight cards
    const speed = live.state === "generating" ? live.tok_s : last ? last.decode_tok_s : null;
    setMetric("speed", speed == null ? null : fmt(speed, 1), "t/s",
              live.state === "generating" ? "Decode now" : last ? "Decode last request" : "Decode");
    const prefill = live.state && live.state !== "idle" ? live.prefill_tok_s_mean
                  : last && last.prompt_ms > 0 ? Math.max(0, last.prompt_tokens - (last.reused || 0)) / (last.prompt_ms / 1000) : null;
    setMetric("prefill", prefill == null ? null : fmt(prefill), "t/s",
              live.state === "reading" ? "Prefill now" : live.state === "generating" ? "Prefill this request" : last ? "Prefill last request" : "Prefill");
    spark("sp-speed", h.tok_s);
    spark("sp-prefill", h.prefill_tok_s_mean);
    const per = (f) => (hw.gpus || []).map((g) => `GPU ${g.index} ${f(g)}`).join(" · ");
    const multi = (hw.gpus || []).length > 1;
    setMetric("gpu", hw.gpu_util == null ? null : fmt(hw.gpu_util), "%",
              multi ? per((g) => (g.util == null ? "–" : `${fmt(g.util)}%`)) : st.gpu_name || "");
    spark("sp-gpu", h.gpu_util, 100);
    setMetric("vram", hw.gpu_mem_used == null ? null : gb(hw.gpu_mem_used), hw.gpu_mem_total ? `/ ${gb(hw.gpu_mem_total, 0)} GB` : "GB",
              multi ? per((g) => (g.mem_used == null ? "–" : `${gb(g.mem_used)} GB`))
                    : eng.expert_slots ? `${fmt(eng.expert_slots)} experts cached` : "");
    spark("sp-vram", h.gpu_mem_used, hw.gpu_mem_total);
    setMetric("temp", hw.gpu_temp == null ? null : fmt(hw.gpu_temp), "°C",
              multi ? per((g) => (g.temp == null ? "–" : `${fmt(g.temp)}°`)) : "");
    spark("sp-temp", h.gpu_temp, 90);
    setMetric("power", hw.gpu_power == null ? null : fmt(hw.gpu_power), "W", hw.gpu_power_limit ? `of ${fmt(hw.gpu_power_limit)} W limit` : "");
    spark("sp-power", h.gpu_power, hw.gpu_power_limit);
    const gen = hw.gpu_pcie_gen_max || hw.gpu_pcie_gen;
    setMetric("pcie", gen ? `Gen${gen}` : null, hw.gpu_pcie_width ? `x${hw.gpu_pcie_width}` : "",
              hw.gpu_pcie_rx_mb == null ? "" : `to GPU ${fmt(hw.gpu_pcie_rx_mb, hw.gpu_pcie_rx_mb < 10 ? 1 : 0)} MB/s` +
              (hw.gpu_pcie_gen && gen && hw.gpu_pcie_gen < gen ? ` · idle Gen${hw.gpu_pcie_gen}` : ""));
    spark("sp-pcie", h.gpu_pcie_rx_mb);
    setMetric("cpu", hw.cpu == null ? null : fmt(hw.cpu), "%", st.threads ? `${st.cores ? `${st.cores} cores · ` : ""}${st.threads} threads` : "");
    spark("sp-cpu", h.cpu, 100);
    if (hw.disk_read_mb == null) {
      setMetric("disk", null, "", st.psutil === false ? "needs psutil in Strata" : "");
    } else {
      const big = hw.disk_read_mb >= 1000;
      setMetric("disk", big ? fmt(hw.disk_read_mb / 1024, 2) : fmt(hw.disk_read_mb, hw.disk_read_mb < 10 ? 1 : 0), big ? "GB/s" : "MB/s",
                hw.disk_write_mb == null ? "" : `write ${fmt(hw.disk_write_mb, 1)} MB/s`);
    }
    spark("sp-disk", h.disk_read_mb);

    // context fill: the running request, else the last one
    const ctx = eng.max_context || 0;
    let used = 0;
    if (live.state && live.state !== "idle") used = (live.prompt_tokens || 0) + (live.generated || 0);
    else if (last) used = (last.prompt_tokens || 0) + (last.output_tokens || 0);
    const frac = ctx ? Math.min(1, used / ctx) : 0;
    $("ctx-fill").setAttribute("stroke-dasharray", `${(235.6 * frac).toFixed(1)} 314.2`);
    $("ctx-fill").style.opacity = 235.6 * frac >= 3 ? "1" : "0";         // a near-zero arc would draw just its round cap
    $("ctx-pct").textContent = `${Math.round(frac * 100)}%`;
    $("ctx-sub").textContent = ctx ? `${kfmt(used)} / ${ctxfmt(ctx)}` : "–";
    const cacheBytes = (eng.expert_cache_mib || 0) * 1048576;
    $("slots-text").textContent = eng.expert_slots ? `${fmt(eng.expert_slots)} · ${gb(cacheBytes)} GB` : "–";
    $("slots-bar").style.width = hw.gpu_mem_total ? `${Math.min(100, (100 * cacheBytes) / hw.gpu_mem_total)}%` : "0%";
    $("ram-text").textContent = hw.ram_total ? `${gb(hw.ram_used)} / ${gb(hw.ram_total, 0)} GB` : "–";
    const ramPct = hw.ram_total ? (100 * hw.ram_used) / hw.ram_total : 0;
    $("ram-bar").style.width = `${ramPct}%`;
    if (ramPct > 92) $("ram-progress").dataset.tone = "danger"; else delete $("ram-progress").dataset.tone;
    $("temp-text").textContent = hw.gpu_temp == null ? "–" : `${fmt(hw.gpu_temp)} °C`;
    $("temp-bar").style.width = hw.gpu_temp == null ? "0%" : `${Math.min(100, hw.gpu_temp)}%`;

    // recent requests: as many of the last 12 as fit the card
    const body = $("req-body");
    if (!requests.length) {
      body.innerHTML = `<tr><td colspan="8" class="muted">No requests yet</td></tr>`;
    } else {
      const badge = {stop: ["", "Done"], length: ["", "Max tokens"], cancel: ["st-badge--queued", "Stopped"],
                     disconnect: ["st-badge--queued", "Closed"], error: ["st-badge--error", "Error"]};
      body.innerHTML = requests.slice(0, 12).map((r) => {
        const [cls, text] = badge[r.finish] || ["", r.finish || "–"];
        const t = r.time ? new Date(r.time * 1000).toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", second: "2-digit"}) : "–";
        const proj = r.projection == null ? "" : `<span class="st-badge${r.projection ? " st-badge--reading" : ""}" title="experimental speed projection ${r.projection ? "on" : "off"}">${r.projection ? "ESP" : "stock"}</span>`;
        const hit = r.hit_rate == null ? "–" : `${(r.hit_rate * 100).toFixed(1)}%` +
          (r.pcie_share ? ` <span class="muted">+${(r.pcie_share * 100).toFixed(1)}% PCIe</span>` : "");
        return `<tr><td>${esc(t)}</td><td><span class="st-badge ${cls}">${esc(text)}</span>${proj}</td><td class="num">${fmt(r.prompt_tokens)}</td>
          <td class="num">${fmt(r.reused)}</td><td class="num">${fmt(r.output_tokens)}</td><td class="num">${fmt(r.decode_tok_s, 1)}</td>
          <td class="num">${hit}</td><td class="num">${fmt(r.duration_s, 1)} s</td></tr>`;
      }).join("");
    }
    $("req-totals").textContent = renderTotals(totals);
    const wrap = body.closest(".table-wrap");
    while (body.rows.length > 1 && wrap.scrollHeight > wrap.clientHeight) body.deleteRow(-1);
    kept = kept == null ? requests.length : kept;
    $("req-count").textContent = requests.length ? `Latest ${body.rows.length} of ${fmt(kept)}` : "";
  }

  function offline(reason) {
    setPill("error", reason === "auth_required" ? "API key needed" : "Server not reachable");
    renderMonitor({}, {}, {}, {}, {}, null, [], null, 0);
    $("state-label").textContent = reason === "auth_required" ? "Strata requires an API key" : "Strata is not reachable";
    $("state-detail").textContent = "retrying every 2 s";
    $("req-body").innerHTML = `<tr><td colspan="8" class="muted">Connection unavailable</td></tr>`;
    $("model").textContent = "–"; $("model").title = "";
    $("ms-disk").textContent = "";
  }

  // ---------------------------------------------------------------- polling, clock, fit
  let lastSuccess = 0;
  async function poll() {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 6000);
    try {
      const r = await fetch(HELPER, {cache: "no-store", signal: controller.signal});
      if (!r.ok) throw new Error("helper_unavailable");
      const s = await r.json();
      const fresh = s.available === true && typeof s.timestamp === "number" && Date.now() - s.timestamp < STALE_MS && s.timestamp <= Date.now() + 5000;
      if (fresh && s.metrics) { render(s.metrics, s.health); lastSuccess = s.timestamp; }
      else { lastSuccess = 0; offline(s.error); }
    } catch (e) {
      lastSuccess = 0; offline();
    } finally {
      clearTimeout(timer); setTimeout(poll, 2000);
    }
  }
  setInterval(() => { if (lastSuccess && Date.now() - lastSuccess >= STALE_MS) { lastSuccess = 0; offline(); } }, 1000);

  const W = 2048, H = 576;
  let lastFitSize = "";
  function fit() {
    const w = document.documentElement.clientWidth, h = document.documentElement.clientHeight, scale = Math.min(w / W, h / H);
    const size = `${w}x${h}`;
    if (size === lastFitSize) return;
    lastFitSize = size;
    const scene = $("scene");
    scene.style.transform = `scale(${scale})`;
    scene.style.left = `${(w - W * scale) / 2}px`;
    scene.style.top = `${(h - H * scale) / 2}px`;
  }
  function clock() { $("clock").textContent = new Date().toLocaleTimeString("en-GB"); }
  window.addEventListener("resize", fit); fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(document.documentElement);
  else setInterval(fit, 1000); // Compatibility with older embedded browsers.
  clock(); setInterval(clock, 1000);
  offline("connecting"); setPill("idle", "Connecting…");
  poll();

})();
