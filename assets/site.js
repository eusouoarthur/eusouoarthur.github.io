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
  // Janela de prévia: ao passar o mouse numa peça (só computador), abre ao lado uma janela com a mídia maior e a ficha.
  // Não cobre a peça, fica dentro da tela, some ao sair. Celular não tem.
  var janelaEl = null, janelaTimer = 0, semMouse = window.matchMedia('(hover: none), (max-width: 599px)');
  function janelaMostrar(alvo, d) {
    if (semMouse.matches) return;
    clearTimeout(janelaTimer);
    janelaTimer = setTimeout(function () {
      if (!janelaEl) { janelaEl = document.createElement('div'); janelaEl.className = 'janela'; janelaEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(janelaEl); }
      var midia = d.video
        ? '<video src="' + caminho(d.video) + '" muted loop playsinline autoplay preload="auto"></video>'
        : (d.img ? pic(d.img, '380px') : '');
      janelaEl.innerHTML = '<div class="janela-m">' + midia + '</div><div class="janela-f"><span class="janela-t">' + esc(d.titulo || '') + '</span>' +
        (d.meta ? '<span class="janela-meta">' + esc(d.meta) + '</span>' : '') + (d.papel ? '<span class="janela-p">' + esc(d.papel) + '</span>' : '') + '</div>';
      var v = janelaEl.querySelector('video');
      if (v) { v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      janelaEl.style.setProperty('--cor', getComputedStyle(alvo).getPropertyValue('--cor') || 'var(--fg2)');
      var r = alvo.getBoundingClientRect(), W = 380, M = 16;
      var maxH = innerHeight - 2 * M;
      janelaEl.style.maxHeight = maxH + 'px';
      janelaEl.classList.add('on');
      var h = janelaEl.offsetHeight, x, y;
      var pieceArea = r.width * r.height;
      var viewportArea = innerWidth * innerHeight;
      var pieceLarge = pieceArea / viewportArea > 0.35;
      var viewportShort = innerHeight < 850;
      if (pieceLarge) {
        var reducedMaxH = viewportShort ? 180 : 300;
        janelaEl.style.maxHeight = reducedMaxH + 'px';
        maxH = reducedMaxH;
      }
      var hMax = Math.max(h, pieceLarge ? (viewportShort ? 180 : 300) : 450);
      function sobrepoe(x, y, hh) {
        var H = hh || hMax;
        return !(x + W <= r.left || x >= r.right || y + H <= r.top || y >= r.bottom);
      }
      var candidatos = [];
      // 1. Lado direito da peça (mesmo topo) - seguro: não sobrepõe horizontalmente
      if (r.right + M + W <= innerWidth - M) candidatos.push({ x: r.right + M, y: r.top, safe: true });
      // 2. Lado esquerdo da peça (mesmo topo) - seguro
      if (r.left - M - W >= M) candidatos.push({ x: r.left - M - W, y: r.top, safe: true });
      // 3. Abaixo da peça, alinhado à direita - seguro se couber
      if (r.bottom + M + hMax <= innerHeight - M && r.right + M + W <= innerWidth - M) candidatos.push({ x: r.right + M, y: r.bottom + M, safe: true });
      // 4. Abaixo da peça, alinhado à esquerda - seguro se couber
      if (r.bottom + M + hMax <= innerHeight - M && r.left - M - W >= M) candidatos.push({ x: r.left - M - W, y: r.bottom + M, safe: true });
      // 5. Lado direito da tela, topo da peça
      if (r.right + M + W <= innerWidth - M) candidatos.push({ x: innerWidth - W - M, y: r.top });
      // 6. Lado esquerdo da tela, topo da peça
      if (r.left - M - W >= M) candidatos.push({ x: M, y: r.top });
      // 7. Lado direito da tela, base da peça
      if (r.bottom + M + hMax <= innerHeight - M) candidatos.push({ x: innerWidth - W - M, y: r.bottom + M });
      // 8. Lado esquerdo da tela, base da peça
      if (r.bottom + M + hMax <= innerHeight - M) candidatos.push({ x: M, y: r.bottom + M });
      // 9. Topo da tela, alinhado à esquerda da peça
      if (r.top - M - hMax >= M) candidatos.push({ x: Math.max(M, Math.min(innerWidth - W - M, r.left)), y: M });
      // 10. Base da tela, alinhado à esquerda da peça
      if (r.bottom + M + hMax <= innerHeight - M) candidatos.push({ x: Math.max(M, Math.min(innerWidth - W - M, r.left)), y: innerHeight - hMax - M });
      // 11. Canto superior esquerdo da tela
      candidatos.push({ x: M, y: M });
      // 12. Canto superior direito da tela
      candidatos.push({ x: innerWidth - W - M, y: M });
      // 13. Canto inferior esquerdo da tela
      if (innerHeight - hMax - M >= M) candidatos.push({ x: M, y: innerHeight - hMax - M });
      // 14. Canto inferior direito da tela
      if (innerHeight - hMax - M >= M) candidatos.push({ x: innerWidth - W - M, y: innerHeight - hMax - M });
      // 15. Lado oposto horizontal (longe da peça)
      if (r.left < innerWidth / 2) candidatos.push({ x: innerWidth - W - M, y: Math.max(M, Math.min(innerHeight - hMax - M, r.top)) });
      else candidatos.push({ x: M, y: Math.max(M, Math.min(innerHeight - hMax - M, r.top)) });
      // 16. Lado oposto vertical (longe da peça)
      if (r.top < innerHeight / 2) candidatos.push({ x: Math.max(M, Math.min(innerWidth - W - M, r.left)), y: innerHeight - hMax - M });
      else candidatos.push({ x: Math.max(M, Math.min(innerWidth - W - M, r.left)), y: M });
      // Escolhe o primeiro que não sobrepõe (usando hMax para garantir segurança após crescimento)
      var escolhido = candidatos.find(function (c) { return !sobrepoe(c.x, c.y); });
      if (!escolhido) {
        // Fallback garantido: canto mais distante do centro da peça
        var pcx = r.left + r.width / 2, pcy = r.top + r.height / 2;
        var cantos = [
          { x: M, y: M },
          { x: innerWidth - W - M, y: M },
          { x: M, y: innerHeight - hMax - M },
          { x: innerWidth - W - M, y: innerHeight - hMax - M }
        ];
        escolhido = cantos.reduce(function (melhor, c) {
          var dMelhor = Math.hypot(melhor.x + W/2 - pcx, melhor.y + hMax/2 - pcy);
          var dC = Math.hypot(c.x + W/2 - pcx, c.y + hMax/2 - pcy);
          return dC > dMelhor ? c : melhor;
        });
      }
      x = escolhido.x;
      y = escolhido.y;
      y = Math.max(M, Math.min(innerHeight - h - M, y));
      janelaEl.style.left = x + 'px';
      janelaEl.style.top = y + 'px';
    }, 250);
  }
  function janelaEsconder() {
    clearTimeout(janelaTimer);
    if (!janelaEl) return;
    janelaEl.classList.remove('on');
    var v = janelaEl.querySelector('video'); if (v) v.pause();
  }
  window.addEventListener('scroll', janelaEsconder, { passive: true });
  window.AR = { janelaMostrar: janelaMostrar, janelaEsconder: janelaEsconder, pic: pic, ROOT: ROOT, HOME: HOME, S: S, esc: esc, caminho: caminho, thumb: thumb, fmtData: fmtData, codificar: codificar, decodificar: decodificar, ordemAtual: ordemAtual, alternarTema: alternarTema, renderTopo: renderTopo, renderRodape: renderRodape };

  document.addEventListener('DOMContentLoaded', function () {
    renderTopo(document.body.getAttribute('data-sala'));
    renderRodape();
    atualizarBotoesTema();
  });
})();
