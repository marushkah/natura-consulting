(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Motion is opt-in: without JS, or with reduced motion, everything simply shows.
  var motion = !reduce && 'requestAnimationFrame' in window;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var each = function (sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); };

  // ---------- Perlin noise (Ken Perlin's improved 3D noise) ----------
  var perm = new Uint8Array(512);
  (function () {
    var p = [], i, j, t, seed = 20261117;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      j = seed % (i + 1); t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  var fade = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
  var mix = function (a, b, t) { return a + t * (b - a); };
  var grad = function (h, x, y, z) {
    h &= 15;
    var u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  var noise = function (x, y, z) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    var u = fade(x), v = fade(y), w = fade(z);
    var A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    var B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return mix(
      mix(mix(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
          mix(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      mix(mix(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
          mix(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };

  // ---------- Words ----------
  each('[data-words]', function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w'; s.textContent = w; s.style.setProperty('--i', i);
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  // ---------- Noise waves: flowing lines drawn from the noise field ----------
  var LIGHT = ['rgba(109,63,209,.45)', 'rgba(24,160,105,.55)', 'rgba(31,95,208,.45)'];
  var DARK = ['rgba(240,238,252,.3)', 'rgba(124,232,181,.6)', 'rgba(167,139,250,.65)'];
  var waves = [].map.call(document.querySelectorAll('canvas.waves'), function (c) {
    var w = { c: c, ctx: c.getContext('2d'), colors: c.getAttribute('data-waves') === 'dark' ? DARK : LIGHT, mx: -9999, my: -9999, W: 0, H: 0 };
    var host = c.parentElement;
    host.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(); w.mx = e.clientX - r.left; w.my = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', function () { w.mx = w.my = -9999; });
    return w;
  });
  var sizeWaves = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    waves.forEach(function (w) {
      var r = w.c.getBoundingClientRect();
      w.W = r.width; w.H = r.height;
      w.c.width = Math.round(r.width * dpr); w.c.height = Math.round(r.height * dpr);
      w.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  };
  var drawWaves = function (w, t) {
    var ctx = w.ctx, W = w.W, H = w.H;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var rows = Math.max(6, Math.min(26, Math.round(H / 30)));
    var step = 16, z = t * 0.00016 + window.scrollY * 0.0005;
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (var r = 0; r < rows; r++) {
      var base = (r + 0.5) * H / rows;
      ctx.beginPath();
      for (var x = -step; x <= W + step; x += step) {
        var dx = x - w.mx, dy = base - w.my;
        var bump = Math.exp(-(dx * dx + dy * dy) / 26000);
        var y = base + noise(x * 0.0034, r * 0.23, z) * (30 + 70 * bump) + noise(x * 0.012, r * 0.6, z * 2.2) * 6;
        if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = w.colors[r % 3];
      ctx.stroke();
    }
  };
  var onScreen = function (el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };

  // ---------- Noise blobs: soft shapes whose outline is bent by the noise field ----------
  var blobs = [].map.call(document.querySelectorAll('[data-blob]'), function (el, i) {
    el.innerHTML = '<svg viewBox="-100 -100 200 200" aria-hidden="true"><path/></svg>';
    return { el: el, path: el.querySelector('path'), seed: 7.3 * (i + 1) };
  });
  var drawBlob = function (b, t) {
    var n = 10, pts = [], i, a, r;
    for (i = 0; i < n; i++) {
      a = i / n * Math.PI * 2;
      r = 66 + 26 * noise(Math.cos(a) * 0.9 + b.seed, Math.sin(a) * 0.9 + b.seed, t * 0.00028);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    var m = mid(pts[n - 1], pts[0]);
    var d = 'M' + m[0].toFixed(1) + ' ' + m[1].toFixed(1);
    for (i = 0; i < n; i++) {
      m = mid(pts[i], pts[(i + 1) % n]);
      d += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1);
    }
    b.path.setAttribute('d', d + 'Z');
  };

  // ---------- Marquee ----------
  var marquees = [].map.call(document.querySelectorAll('.marquee-track'), function (tr) {
    var html = tr.innerHTML;
    tr.innerHTML = html + html + html + html;
    return { el: tr, half: 0 };
  });
  var sizeMarquees = function () { marquees.forEach(function (m) { m.half = m.el.scrollWidth / 4; }); };

  // First still frame, so the page is complete even with no motion.
  sizeWaves(); sizeMarquees();
  waves.forEach(function (w) { drawWaves(w, 0); });
  blobs.forEach(function (b) { drawBlob(b, 0); });
  window.addEventListener('resize', function () {
    sizeWaves(); sizeMarquees();
    if (!motion) waves.forEach(function (w) { drawWaves(w, 0); });
  });

  if (motion) {
    root.classList.add('motion');

    // Ambient loop: waves, blobs and the marquee drift with time (about 30 frames a second).
    var odd = false;
    var loop = function (t) {
      requestAnimationFrame(loop);
      odd = !odd; if (odd) return;
      waves.forEach(function (w) { if (onScreen(w.c)) drawWaves(w, t); });
      blobs.forEach(function (b) { if (onScreen(b.el)) drawBlob(b, t); });
      marquees.forEach(function (m) {
        if (m.half) m.el.style.transform = 'translate3d(' + (-((window.scrollY * 0.2 + t * 0.018) % m.half)).toFixed(1) + 'px,0,0)';
      });
    };
    requestAnimationFrame(loop);

    // Scroll work: parallax, the manifesto and the pop-in reveals share one handler.
    var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'));
    var pimgs = [].slice.call(document.querySelectorAll('[data-parallax-img]'));
    var man = document.querySelector('.manifesto');
    var lines = man ? [].map.call(man.querySelectorAll('.line'), function (l) {
      return { el: l, words: [].slice.call(l.querySelectorAll('.w')) };
    }) : [];
    var tide = man && man.querySelector('.tide-draw path');
    var cue = man && man.querySelector('.scroll-cue');
    each('.lanes, .why, .work, .steps, .menu-grid', function (g) {
      [].forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i % 3) * 90 + 'ms'; });
    });
    var pending = [].slice.call(document.querySelectorAll('[data-reveal], .tide'));

    var queued = false;
    var update = function () {
      queued = false;
      var vh = window.innerHeight;

      parallax.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var d = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (d * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px,0)';
      });
      pimgs.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var d = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = 'translate3d(0,' + (d * -7).toFixed(2) + '%,0) scale(1.18)';
      });

      if (man) {
        var mr = man.getBoundingClientRect();
        var lead = vh * 0.35;
        var p = clamp((lead - mr.top) / (man.offsetHeight - vh + lead));
        var n = lines.length;
        lines.forEach(function (line, i) {
          var local = (p - i / n) * n;
          var out = i < n - 1 ? clamp((local - 0.84) / 0.16) : 0;
          line.el.style.opacity = String(1 - out);
          var count = line.words.length;
          line.words.forEach(function (w, k) {
            var a = clamp((local - (k / count) * 0.6) / 0.16);
            w.style.opacity = a.toFixed(3);
            w.style.filter = a < 1 ? 'blur(' + ((1 - a) * 5).toFixed(2) + 'px)' : 'none';
            w.style.transform = a < 1 ? 'translateY(' + ((1 - a) * 0.25).toFixed(3) + 'em)' : 'none';
          });
        });
        if (tide) tide.style.strokeDashoffset = String(700 * (1 - p));
        if (cue) cue.style.opacity = String(clamp(1 - p * 5));
      }

      if (pending.length) {
        var edge = vh * 0.92;
        pending = pending.filter(function (el) {
          if (el.getBoundingClientRect().top < edge) { el.classList.add('in'); return false; }
          return true;
        });
      }
    };
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  // ---------- Copy the email address, with a select-text fallback ----------
  each('[data-copy]', function (b) {
    var label = b.textContent;
    var done = b.getAttribute('data-done') || 'Copied';
    b.addEventListener('click', function () {
      var el = document.getElementById(b.getAttribute('data-copy'));
      var text = el.textContent.trim();
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            b.textContent = done;
            setTimeout(function () { b.textContent = label; }, 1600);
          }, fallback);
        } else { fallback(); }
      } catch (e) { fallback(); }
    });
  });
})();
