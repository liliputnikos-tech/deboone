(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- boot ---------- */
  const finishBoot = () => { document.body.classList.remove('is-loading'); document.body.classList.add('is-ready'); };
  window.addEventListener('load', () => setTimeout(finishBoot, reduce ? 0 : 900));
  setTimeout(finishBoot, 3500); // safety net

  /* ---------- nav ---------- */
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.nav__burger');
  const toggleMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open); $('.menu').setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  $$('.menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  const observe = el => io.observe(el);
  $$('.reveal').forEach((el, i) => { const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal')); el.style.setProperty('--d', (sib.indexOf(el) * 0.08) + 's'); observe(el); });

  /* ---------- cursor ---------- */
  if (fine) {
    const cur = $('.cursor'); let x = innerWidth / 2, y = innerHeight / 2, gx = x, gy = y;
    const dot = $('.cursor__dot'), glow = $('.cursor__glow');
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    const loop = () => { gx += (x - gx) * .12; gy += (y - gy) * .12;
      dot.style.transform = `translate(${x}px,${y}px)`; glow.style.transform = `translate(${gx}px,${gy}px)`;
      requestAnimationFrame(loop); };
    dot.style.position = 'fixed'; dot.style.left = '0'; dot.style.top = '0';
    glow.style.position = 'fixed'; glow.style.left = '0'; glow.style.top = '0';
    loop();
    document.addEventListener('mouseover', e => cur.classList.toggle('is-hover', !!e.target.closest('a,button,[role=slider],.grid__item')));
  }

  /* ---------- glitch hot on hover ---------- */
  $$('.glitch').forEach(g => { g.addEventListener('mouseenter', () => g.classList.add('is-hot')); g.addEventListener('mouseleave', () => g.classList.remove('is-hot')); });

  /* ---------- parallax ---------- */
  const heroImg = $('.hero__img img'), bookImg = $('.booking__bg img'), booking = $('.booking');
  if (!reduce) {
    let ticking = false;
    addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => {
      const y = scrollY; if (y < innerHeight * 1.2) heroImg.style.transform = `translateY(${y * .25}px) scale(1.08)`;
      const r = booking.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) bookImg.style.transform = `translateY(${(r.top / innerHeight) * -60 - 40}px) scale(1.1)`;
      ticking = false; }); }, { passive: true });
  }

  /* ---------- gallery + lightbox ---------- */
  const G = window.GALLERY || [], grid = $('#grid');
  G.forEach((g, i) => {
    const b = document.createElement('button'); b.className = 'grid__item reveal'; b.setAttribute('aria-label', 'Open photo ' + (i + 1));
    b.innerHTML = `<picture><source srcset="${g.src}-thumb.webp" type="image/webp"><img src="${g.src}-thumb.jpg" alt="${g.alt}" loading="lazy" width="${g.w}" height="${g.h}"></picture>`;
    b.style.setProperty('--d', (i % 3) * 0.08 + 's');
    b.addEventListener('click', () => openLB(i)); grid.appendChild(b); observe(b);
  });
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'); let cur = 0, lastFocus;
  const webp = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  const show = i => { cur = (i + G.length) % G.length; lbImg.src = G[cur].src + (webp ? '.webp' : '.jpg'); lbImg.alt = G[cur].alt; lbCap.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(G.length).padStart(2, '0')}`; };
  function openLB(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; requestAnimationFrame(() => lb.classList.add('is-open')); document.body.style.overflow = 'hidden'; $('.lb__close').focus(); }
  const closeLB = () => { lb.classList.remove('is-open'); setTimeout(() => { lb.hidden = true; }, 300); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  $('.lb__close').onclick = closeLB; $('.lb__prev').onclick = () => show(cur - 1); $('.lb__next').onclick = () => show(cur + 1);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  let tx = null; lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); tx = null; });

  /* ---------- audio player ---------- */
  const audio = $('#audio'), playBtn = $('#playBtn'), wave = $('#wave'), wc = $('#waveCanvas'), vc = $('#vizCanvas');
  const tCur = $('#tCur'), tDur = $('#tDur'), vol = $('#vol'), mini = $('#mini'), miniProg = $('#miniProg'), miniTime = $('#miniTime');
  const peaks = window.TRACK_PEAKS || Array.from({ length: 300 }, (_, i) => .3 + .5 * Math.abs(Math.sin(i * .21)));
  let duration = window.TRACK_DURATION || 382;
  let ctx, analyser, freq, actx;
  tDur.textContent = fmt(Math.round(duration));

  const initAudioGraph = () => {
    if (actx) return; try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(audio); analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .8;
      src.connect(analyser); analyser.connect(actx.destination); freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { analyser = null; }
  };
  const toggle = async () => {
    initAudioGraph(); if (actx && actx.state === 'suspended') { try { await actx.resume(); } catch (e) {} }
    if (audio.paused) { try { await audio.play(); } catch (e) { console.warn('Playback blocked', e); } } else audio.pause();
  };
  playBtn.addEventListener('click', toggle); $('#miniPlay').addEventListener('click', toggle);
  $('[data-play-jump]').addEventListener('click', () => { $('#release').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); if (audio.paused) toggle(); });
  vol.addEventListener('input', () => audio.volume = +vol.value); audio.volume = +vol.value;
  audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) { duration = audio.duration; tDur.textContent = fmt(Math.round(duration)); wave.setAttribute('aria-valuemax', Math.round(duration)); } });
  audio.addEventListener('play', () => { document.body.classList.add('is-playing'); playBtn.setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', () => { document.body.classList.remove('is-playing'); playBtn.setAttribute('aria-label', 'Play'); });
  audio.addEventListener('ended', () => { audio.currentTime = 0; });

  // mini player visibility: when playing & player off-screen
  let playerVisible = true;
  new IntersectionObserver(es => { playerVisible = es[0].isIntersecting; updMini(); }, { threshold: .15 }).observe($('#player'));
  const updMini = () => { const on = !playerVisible && (!audio.paused || audio.currentTime > 0); mini.classList.toggle('is-visible', on); mini.setAttribute('aria-hidden', !on); };
  audio.addEventListener('play', updMini); audio.addEventListener('pause', updMini);

  // seeking
  const seekFromEvent = e => { const r = wave.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); audio.currentTime = p * duration; drawWave(); };
  let dragging = false;
  wave.addEventListener('pointerdown', e => { dragging = true; wave.setPointerCapture(e.pointerId); seekFromEvent(e); });
  wave.addEventListener('pointermove', e => { const r = wave.getBoundingClientRect(); $('#waveHover').style.left = (e.clientX - r.left) + 'px'; if (dragging) seekFromEvent(e); });
  wave.addEventListener('pointerup', () => dragging = false); wave.addEventListener('pointercancel', () => dragging = false);
  wave.addEventListener('keydown', e => { if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 5); if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5); if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } drawWave(); });

  const fit = c => { const d = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect(); if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); } return d; };
  function drawWave() {
    const d = fit(wc), g = wc.getContext('2d'), W = wc.width, H = wc.height; g.clearRect(0, 0, W, H);
    const bw = 3 * d, gap = 2 * d, n = Math.floor(W / (bw + gap)), prog = (audio.currentTime || 0) / duration;
    const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#ff2a4a'); grad.addColorStop(.55, '#ff7a1a'); grad.addColorStop(1, '#00e5ff');
    for (let i = 0; i < n; i++) {
      const p = peaks[Math.floor(i / n * peaks.length)] || 0, h = Math.max(2 * d, p * H * .92), x = i * (bw + gap), played = i / n < prog;
      g.fillStyle = played ? grad : 'rgba(255,255,255,.18)';
      g.fillRect(x, (H - h) / 2, bw, h);
    }
    const px = prog * W; g.fillStyle = '#fff'; g.shadowColor = '#00e5ff'; g.shadowBlur = 12 * d; g.fillRect(px - d, 0, 2 * d, H); g.shadowBlur = 0;
    wave.setAttribute('aria-valuenow', Math.round(audio.currentTime || 0));
  }
  function drawViz(level) {
    const d = fit(vc), g = vc.getContext('2d'), W = vc.width, H = vc.height; g.clearRect(0, 0, W, H);
    const bars = 32, bw = W / bars;
    for (let i = 0; i < bars; i++) {
      let v; if (analyser && freq && !audio.paused) v = freq[Math.floor(i * freq.length * .7 / bars)] / 255;
      else v = audio.paused ? .06 + .04 * Math.sin(performance.now() / 600 + i * .5) : .3 + .3 * Math.abs(Math.sin(performance.now() / 180 + i));
      const h = Math.max(2 * d, v * H);
      const f = i / (bars - 1); g.fillStyle = f < .6 ? `rgba(255,${42 + f * 130},${74 - f * 80},${.45 + v * .55})` : `rgba(${255 - (f - .6) * 637},${120 + (f - .6) * 270},${(f - .6) * 637},${.45 + v * .55})`;
      g.fillRect(i * bw + 1 * d, H - h, bw - 2 * d, h);
    }
  }

  /* ---------- hero audio-reactive canvas ---------- */
  const hc = $('.hero__canvas'), hg = hc.getContext('2d');
  const P = Array.from({ length: innerWidth < 700 ? 40 : 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), s: .2 + Math.random() * .8 }));
  let heroVisible = true; new IntersectionObserver(es => heroVisible = es[0].isIntersecting).observe($('.hero'));
  function drawHero(bass, t) {
    const d = fit(hc), W = hc.width, H = hc.height; hg.clearRect(0, 0, W, H);
    // particles
    for (const p of P) {
      p.y -= (.0006 + bass * .006) * p.s; if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
      const r = (1 + p.z * 1.8 + bass * 3) * d; hg.fillStyle = p.z > .6 ? `rgba(0,229,255,${.25 + p.z * .5})` : `rgba(255,42,74,${.2 + p.z * .5})`;
      hg.beginPath(); hg.arc(p.x * W, p.y * H, r, 0, 6.283); hg.fill();
    }
    // audio ring / scan line
    const cy = H * .5 + Math.sin(t / 1400) * H * .25;
    hg.fillStyle = `rgba(0,229,255,${.05 + bass * .25})`; hg.fillRect(0, cy, W, (1 + bass * 4) * d);
    if (analyser && !audio.paused) {
      hg.strokeStyle = `rgba(255,42,74,${.25 + bass * .6})`; hg.lineWidth = 1.5 * d; hg.beginPath();
      const n = freq.length * .6;
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * W, y = H * .78 - (freq[i | 0] / 255) * H * .22; i ? hg.lineTo(x, y) : hg.moveTo(x, y); }
      hg.stroke();
    }
  }

  let lastBeat = 1;
  function frame(t) {
    let bass = 0;
    if (analyser && !audio.paused) { analyser.getByteFrequencyData(freq); for (let i = 0; i < 6; i++) bass += freq[i]; bass = bass / (6 * 255); bass = Math.max(0, (bass - .45) / .55); }
    const beat = 1 + bass * .06; lastBeat += (beat - lastBeat) * .4; document.documentElement.style.setProperty('--beat', lastBeat.toFixed(3));
    if (!audio.paused || dragging) { drawWave(); const p = audio.currentTime / duration; miniProg.style.width = (p * 100) + '%'; tCur.textContent = fmt(audio.currentTime); miniTime.textContent = fmt(audio.currentTime); }
    drawViz(bass);
    if (heroVisible && !reduce) drawHero(bass, t);
    requestAnimationFrame(frame);
  }
  audio.addEventListener('timeupdate', () => { tCur.textContent = fmt(audio.currentTime); miniTime.textContent = fmt(audio.currentTime); if (audio.paused) drawWave(); });
  addEventListener('resize', drawWave);
  drawWave(); requestAnimationFrame(frame);
  /* ---------- live clips: play only when visible ---------- */
  const vids = $$('.clip video');
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduce) { v.preload = 'auto'; const p = v.play(); p && p.catch(() => {}); } else v.pause(); }), { threshold: .25 });
  vids.forEach(v => vio.observe(v));
  // expose for testing
  window.__deboone = { audio };
})();
