// Funções compartilhadas: tema, cabeçalho, rodapé e a ordem personalizada dos temas.
(function () {
  var html = document.documentElement;
  var ROOT = html.getAttribute('data-root') || '';
  var HOME = ROOT || './';
  var S = window.SITE || { temas: [], salas: [], contato: {} };

  // Tema: escuro por padrão; o visitante pode trocar e a escolha fica no navegador dele.
  var tema = null;
  try { tema = localStorage.getItem('tema'); } catch (e) {}
  html.setAttribute('data-theme', 'dark'); // Só modo escuro (decisão do Arthur, 17/11/2026).
  function alternarTema() {
    var novo = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novo);
    try { localStorage.setItem('tema', novo); } catch (e) {}
    atualizarBotoesTema();
  }
  function atualizarBotoesTema() {
    var escuro = html.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.tema').forEach(function (b) { b.textContent = escuro ? 'Modo claro' : 'Modo escuro'; });
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', escuro ? '#0D1B2A' : '#F3EFE6');
  }

  // Ordem dos temas codificada no link (?r=xxxx). Código de Lehmer em base 36, com um caractere aleatório na frente.
  var B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
  function codificar(perm) {
    var n = perm.length, num = 0, pool = [];
    for (var i = 0; i < n; i++) pool.push(i);
    for (var k = 0; k < n; k++) {
      var idx = pool.indexOf(perm[k]);
      num = num * (n - k) + idx;
      pool.splice(idx, 1);
    }
    var s = num.toString(36);
    while (s.length < 3) s = '0' + s;
    return B36[Math.floor(Math.random() * 36)] + s;
  }
  function decodificar(code, n) {
    if (!code || code.length !== 4 || !/^[0-9a-z]+$/.test(code)) return null;
    var num = parseInt(code.slice(1), 36);
    if (isNaN(num)) return null;
    var fat = 1;
    for (var i = 2; i <= n; i++) fat *= i;
    if (num >= fat) return null;
    var idxs = new Array(n), m = num;
    for (var k = n - 1; k >= 0; k--) { var r = n - k; idxs[k] = m % r; m = Math.floor(m / r); }
    var pool = [], perm = [];
    for (var j = 0; j < n; j++) pool.push(j);
    for (var q = 0; q < n; q++) perm.push(pool.splice(idxs[q], 1)[0]);
    return perm;
  }
  function ordemAtual() {
    var n = S.temas.length;
    var p = new URLSearchParams(location.search).get('r');
    if (p) {
      var perm = decodificar(p, n);
      if (perm) { try { sessionStorage.setItem('ordem', JSON.stringify(perm)); } catch (e) {} return perm; }
    }
    try {
      var s = sessionStorage.getItem('ordem');
      if (s) { var arr = JSON.parse(s); if (Array.isArray(arr) && arr.length === n) return arr; }
    } catch (e) {}
    var base = [];
    for (var i = 0; i < n; i++) base.push(i);
    return base;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function caminho(p) { return /^https?:/.test(p) ? p : ROOT + p; }
  function thumb(p) { return p.indexOf('/img/') >= 0 ? p.replace(/\.(jpg|png)$/, '.t.$1') : p; }
  function fmtData(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return parseInt(m[3], 10) + ' de ' + meses[parseInt(m[2], 10) - 1] + ' de ' + m[1];
  }

  function renderTopo(ativa) {
    var el = document.querySelector('.topo');
    if (!el) return;
    var links = S.salas.map(function (s) {
      return '<a href="' + ROOT + s.pasta + '/" style="--cor:var(--' + s.id + ')"' + (s.id === ativa ? ' aria-current="page"' : '') + '>' + esc(s.nome) + '</a>';
    }).join('');
    links += '<a href="' + ROOT + 'sobre/" style="--cor:var(--fg2)"' + (ativa === 'sobre' ? ' aria-current="page"' : '') + '>Sobre</a>';
    el.innerHTML = '<a class="pular" href="#conteudo">Pular para o conteúdo</a><a class="marca" href="' + HOME + '#site">' + esc(S.nome) + '</a><nav class="nav" aria-label="Salas">' + links + '</nav>';
    atualizarBotoesTema();
  }
  function renderRodape() {
    var el = document.querySelector('.rodape');
    if (!el) return;
    el.innerHTML = '<span>' + esc(S.nome) + ' · Brasília</span><span><a href="' + HOME + '#historia">Ver a história</a></span>';
  }

  // <picture> com AVIF e WebP (tamanhos de data/imagens.js), carregamento sob demanda e width/height.
  // Sem entrada em IMAGENS, cai para a imagem simples.
  function pic(img, sizes, original) {
    var d = window.IMAGENS && window.IMAGENS[img];
    var fallback = caminho(original ? img : thumb(img));
    if (!d) return '<img src="' + fallback + '" alt="" loading="lazy">';
    function srcset(ext) { return d[2].map(function (L) { return caminho(img.replace(/\.(jpg|png)$/, '.' + L + '.' + ext)) + ' ' + L + 'w'; }).join(', '); }
    return '<picture><source type="image/avif" srcset="' + srcset('avif') + '" sizes="' + sizes + '"><source type="image/webp" srcset="' + srcset('webp') + '" sizes="' + sizes + '">' +
      '<img src="' + fallback + '" alt="" loading="lazy" width="' + d[0] + '" height="' + d[1] + '"></picture>';
  }
  // Prévia ao passar o mouse (só computador).
  // Peça com imagens: janela ao lado folheando as páginas sozinha (1,2 s cada), com contador e a ficha.
  // Peça com vídeo: a própria miniatura cresce (~1,6x, mínimo 380 px de largura) e o vídeo toca mudo ali.
  var janelaEl = null, janelaTimer = 0, janelaGiro = 0, vivoEl = null, semMouse = window.matchMedia('(hover: none), (max-width: 599px)');
  var reduzMov = window.matchMedia('(prefers-reduced-motion: reduce)');
  function janelaMostrar(alvo, d) {
    if (semMouse.matches) return;
    clearTimeout(janelaTimer);
    janelaTimer = setTimeout(function () {
      if (d.video) { vivoMostrar(alvo, d.video); return; }
      if (!janelaEl) { janelaEl = document.createElement('div'); janelaEl.className = 'janela'; janelaEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(janelaEl); }
      var todas = (d.imgs && d.imgs.length ? d.imgs : (d.img ? [d.img] : []));
      var imgs = todas.slice(0, 6), resto = todas.length - imgs.length;
      var paginas = imgs.map(function (src, i) {
        var mais = (i === imgs.length - 1 && resto > 0) ? '<span class="janela-mais">+' + resto + '</span>' : '';
        return '<div class="janela-pg" style="--i:' + i + '">' + pic(src, i === 0 ? '340px' : '170px') + mais + '</div>';
      }).join('');
      janelaEl.dataset.n = String(imgs.length);
      janelaEl.innerHTML = '<div class="janela-m">' + paginas + '</div><div class="janela-f"><span class="janela-t">' + esc(d.titulo || '') + '</span>' +
        (d.meta ? '<span class="janela-meta">' + esc(d.meta) + '</span>' : '') + (d.papel ? '<span class="janela-p">' + esc(d.papel) + '</span>' : '') +
        (todas.length > 1 ? '<span class="janela-n">' + todas.length + ' páginas</span>' : '') + '</div>';
      janelaEl.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
      janelaEl.style.setProperty('--cor', getComputedStyle(alvo).getPropertyValue('--cor') || 'var(--fg2)');
      var r = alvo.getBoundingClientRect(), W = janelaEl.offsetWidth || 380, M = 16;
      janelaEl.style.maxHeight = (innerHeight - 2 * M) + 'px';
      janelaEl.classList.add('on');
      var h = janelaEl.offsetHeight, x, y;
      if (r.right + M + W <= innerWidth - M) { x = r.right + M; y = r.top; }
      else if (r.left - M - W >= M) { x = r.left - M - W; y = r.top; }
      else {
        x = Math.max(M, Math.min(innerWidth - W - M, r.left));
        y = (r.bottom + M + h <= innerHeight - M) ? r.bottom + M : r.top - M - h;
      }
      y = Math.max(M, Math.min(innerHeight - h - M, y));
      janelaEl.style.left = x + 'px';
      janelaEl.style.top = y + 'px';
      clearInterval(janelaGiro);
    }, 250);
  }
  function vivoMostrar(alvo, src) {
    var fig = alvo.querySelector('figure') || alvo, r = fig.getBoundingClientRect(), M = 16;
    if (!vivoEl) {
      vivoEl = document.createElement('div'); vivoEl.className = 'vivo'; vivoEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(vivoEl);
      vivoEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') janelaEsconder(); });
      vivoEl.addEventListener('click', function () { if (vivoEl._alvo) vivoEl._alvo.click(); janelaEsconder(); });
    }
    vivoEl._alvo = alvo;
    var w = Math.min(innerWidth - 2 * M, Math.max(380, r.width * 1.6)), h = w * (r.height / r.width);
    if (h > innerHeight - 2 * M) { h = innerHeight - 2 * M; w = h * (r.width / r.height); }
    var x = Math.max(M, Math.min(innerWidth - w - M, r.left + r.width / 2 - w / 2));
    var y = Math.max(M, Math.min(innerHeight - h - M, r.top + r.height / 2 - h / 2));
    vivoEl.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;--cor:' + (getComputedStyle(alvo).getPropertyValue('--cor') || 'var(--fg2)') +
      ';--de-x:' + (r.left - x) + 'px;--de-y:' + (r.top - y) + 'px;--de-s:' + (r.width / w);
    vivoEl.innerHTML = '<video src="' + caminho(src) + '" muted loop playsinline autoplay preload="auto"></video>';
    var v = vivoEl.querySelector('video'); v.muted = true;
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    vivoEl.classList.remove('on'); void vivoEl.offsetWidth; vivoEl.classList.add('on');
  }
  function janelaEsconder() {
    clearTimeout(janelaTimer); clearInterval(janelaGiro);
    if (janelaEl) janelaEl.classList.remove('on');
    if (vivoEl) { vivoEl.classList.remove('on'); var v = vivoEl.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } vivoEl.innerHTML = ''; }
  }
  window.addEventListener('scroll', janelaEsconder, { passive: true });
  window.AR = { janelaMostrar: janelaMostrar, janelaEsconder: janelaEsconder, pic: pic, ROOT: ROOT, HOME: HOME, S: S, esc: esc, caminho: caminho, thumb: thumb, fmtData: fmtData, codificar: codificar, decodificar: decodificar, ordemAtual: ordemAtual, alternarTema: alternarTema, renderTopo: renderTopo, renderRodape: renderRodape };

  document.addEventListener('DOMContentLoaded', function () {
    renderTopo(document.body.getAttribute('data-sala'));
    renderRodape();
    atualizarBotoesTema();
  });
})();
