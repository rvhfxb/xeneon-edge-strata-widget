// Development-only diagnostics, injected by the browser test driver.
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
    setInterval(() => {
      const bad = [];
      const over = (el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      for (const el of document.querySelectorAll(".st-card, .table-wrap, .st-header, .monitor")) if (over(el)) bad.push(`overflow:${el.className}`);
      for (const el of document.querySelectorAll(".st-metric__sub, .bar-row, .state-card__row span, .st-metric__value")) {
        if (el.scrollWidth > el.clientWidth + 1) bad.push(`clipped:${el.id || el.className}:${el.textContent.trim()}`);
      }
      const b = [...document.querySelectorAll("#state-badges .st-badge")].map((x) => x.offsetTop);
      if (new Set(b).size > 1) bad.push("badges-wrap");
      const colLeft = document.querySelector(".col--left")?.offsetWidth;
      const metricsW = document.querySelector(".metrics")?.offsetWidth;
      const reqW = document.querySelector(".req-card")?.offsetWidth;
      const cards = [...document.querySelectorAll(".metric-card")].map(c => c.offsetWidth);
      document.body.dataset.check = JSON.stringify({rows: $("req-body").rows.length, pill: $("pill-text").textContent, bad, widths: { colLeft, metricsW, reqW, cards: cards.slice(0, 4) }});
    }, 500);
});
