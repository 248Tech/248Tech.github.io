// Visual effects layer. Purely decorative: the page works without it, and every effect is off
// when the visitor prefers reduced motion.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = s => document.querySelector(s);

  // ---- scroll progress bar ----
  const bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = 'scaleX(' + (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + ')';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---- hero: particle network that reacts to the pointer ----
  const hero = $('.hero');
  if (hero) {
    const cv = document.createElement('canvas');
    cv.className = 'hero-canvas'; cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, pts = [], raf = 0, visible = true;
    const mouse = { x: -999, y: -999 };
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#ffb020';

    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(90, Math.round(W * H / 14000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .7,
      }));
    };

    const frame = () => {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      const a = css('--accent'), b = css('--accent2');
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
          if (d2 < 22000) { p.x -= dx * .0016; p.y -= dy * .0016; }
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < 15000) {
            ctx.globalAlpha = (1 - d2 / 15000) * .35;
            ctx.strokeStyle = a;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < 170) {
          ctx.globalAlpha = (1 - dm / 170) * .8;
          ctx.strokeStyle = b;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.globalAlpha = .9; ctx.fillStyle = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    size(); kick();
    addEventListener('resize', () => { size(); kick(); });
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(hero);
  }

  // ---- headline: rotating phrase ----
  const g = $('h1 .grad');
  if (g && !reduce) {
    const words = ['where you do.', 'on your terms.', 'privately.', 'offline.', 'in your browser.'];
    let i = 0;
    g.classList.add('swap');
    setInterval(() => {
      g.classList.add('out');
      setTimeout(() => { i = (i + 1) % words.length; g.textContent = words[i]; g.classList.remove('out'); }, 350);
    }, 3200);
  }

  // ---- terminal types itself ----
  const term = $('.win-body');
  if (term && !reduce) {
    const lines = term.innerHTML.split('\n');
    term.innerHTML = lines.map((l, i) => '<span class="ln" style="--i:' + i + '">' + l + '</span>').join('\n');
  }

  // ---- scroll reveal ----
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => {
      let n = 0;
      for (const e of es) if (e.isIntersecting) {
        e.target.style.setProperty('--d', (n++ * 70) + 'ms');
        e.target.classList.add('in'); io.unobserve(e.target);
      }
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    const watch = el => { if (el.nodeType === 1 && !el.classList.contains('reveal')) { el.classList.add('reveal'); io.observe(el); } };
    document.querySelectorAll('.sec-head,.pillar,.contact,.loc,.foot').forEach(watch);
    // cards are created by app.js after it fetches projects.json
    for (const id of ['grid', 'feature']) {
      const host = document.getElementById(id); if (!host) continue;
      host.childNodes.forEach(watch);
      new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(watch))).observe(host, { childList: true });
    }
  }

  // ---- stat count-up (stats are created by app.js) ----
  const stats = document.getElementById('stats');
  if (stats && !reduce) {
    new MutationObserver((_, mo) => {
      if (!stats.children.length) return;
      mo.disconnect();
      stats.querySelectorAll('dd').forEach(dd => {
        const target = parseInt(dd.textContent, 10);
        if (!/^\d+$/.test(dd.textContent) || !target) return;
        const t0 = performance.now(), dur = 1400;
        const tick = now => { const p = Math.min(1, (now - t0) / dur); dd.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
        dd.textContent = '0'; requestAnimationFrame(tick);
      });
    }).observe(stats, { childList: true });
  }

  // ---- card tilt + cursor spotlight ----
  if (fine && !reduce) {
    const tilt = e => {
      const c = e.target.closest && e.target.closest('.card,.feature'); if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
      if (c.classList.contains('card')) {
        c.style.setProperty('--ry', ((x - .5) * 9) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 7) + 'deg');
      }
    };
    const reset = e => { const c = e.target; if (c.classList && c.classList.contains('card')) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } };
    for (const id of ['grid', 'feature']) {
      const host = document.getElementById(id); if (!host) continue;
      host.addEventListener('pointermove', tilt);
      host.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) reset({ target: c }); });
    }
  }
})();
